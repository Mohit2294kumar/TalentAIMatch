import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ParsedSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    email: { type: "string" },
    phone: { type: "string" },
    summary: { type: "string" },
    skills: { type: "array", items: { type: "string" } },
    education: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          degree: { type: "string" },
          institution: { type: "string" },
          year: { type: "string" },
        },
        required: ["degree", "institution", "year"],
      },
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          role: { type: "string" },
          company: { type: "string" },
          duration: { type: "string" },
          description: { type: "string" },
        },
        required: ["role", "company", "duration", "description"],
      },
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          description: { type: "string" },
        },
        required: ["name", "description"],
      },
    },
    certifications: { type: "array", items: { type: "string" } },
    years_experience: { type: "number" },
  },
  required: [
    "name",
    "email",
    "phone",
    "summary",
    "skills",
    "education",
    "experience",
    "projects",
    "certifications",
    "years_experience",
  ],
} as const;

const InsightsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    strengths: { type: "array", items: { type: "string" }, maxItems: 5 },
    improvements: { type: "array", items: { type: "string" }, maxItems: 5 },
    skills_score: { type: "number" },
    experience_score: { type: "number" },
    education_score: { type: "number" },
    projects_score: { type: "number" },
    certifications_score: { type: "number" },
    summary: { type: "string" },
  },
  required: [
    "strengths",
    "improvements",
    "skills_score",
    "experience_score",
    "education_score",
    "projects_score",
    "certifications_score",
    "summary",
  ],
} as const;

export const createResumeRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        file_name: z.string().min(1).max(300),
        file_path: z.string().min(1).max(500),
        job_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("resumes")
      .insert({
        user_id: userId,
        file_name: data.file_name,
        file_path: data.file_path,
        job_id: data.job_id ?? null,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const processResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ resume_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { embed, cosineSim, chatJSON, extractText } = await import("./ai.server");

    const { data: resume, error: rerr } = await supabase
      .from("resumes")
      .select("*")
      .eq("id", data.resume_id)
      .single();
    if (rerr || !resume) throw new Error(rerr?.message || "Resume not found");
    if (resume.user_id !== userId) throw new Error("Forbidden");

    await supabase.from("resumes").update({ status: "processing" }).eq("id", resume.id);

    try {
      // Download file
      const { data: file, error: dlErr } = await supabase.storage
        .from("resumes")
        .download(resume.file_path);
      if (dlErr || !file) throw new Error(dlErr?.message || "Download failed");
      const buf = await file.arrayBuffer();
      const text = await extractText(buf, resume.file_name);
      if (!text || text.trim().length < 20) throw new Error("Could not extract text from file");

      // Parse with Gemini structured output
      const parsed = await chatJSON<{
        name: string;
        email: string;
        phone: string;
        summary: string;
        skills: string[];
        education: { degree: string; institution: string; year: string }[];
        experience: { role: string; company: string; duration: string; description: string }[];
        projects: { name: string; description: string }[];
        certifications: string[];
        years_experience: number;
      }>({
        system:
          "You extract structured candidate data from resumes. Be concise and accurate. Use empty strings/arrays/0 when info is missing.",
        user: `Extract structured data from this resume:\n\n${text.slice(0, 15000)}`,
        toolName: "save_resume",
        toolDescription: "Save parsed resume data",
        parameters: ParsedSchema as unknown as Record<string, unknown>,
      });

      // Embed resume
      const embedding = await embed(text);

      // Score against job if any
      let score: number | null = null;
      let section_scores: Record<string, number> | null = null;
      let insights: Record<string, unknown> | null = null;

      if (resume.job_id) {
        const { data: job } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", resume.job_id)
          .single();
        if (job) {
          let overall = 0;
          if (job.jd_embedding) {
            // jd_embedding comes back as string from pgvector
            const jdVec =
              typeof job.jd_embedding === "string"
                ? (JSON.parse(job.jd_embedding) as number[])
                : (job.jd_embedding as unknown as number[]);
            const sim = cosineSim(embedding, jdVec);
            overall = Math.round(Math.max(0, Math.min(1, (sim + 1) / 2)) * 100);
          }

          // Get section scores + insights from Gemini
          const ai = await chatJSON<{
            strengths: string[];
            improvements: string[];
            skills_score: number;
            experience_score: number;
            education_score: number;
            projects_score: number;
            certifications_score: number;
            summary: string;
          }>({
            system:
              "You are an ATS recruiter. Score the candidate against the job on each section from 0-100 and give concise strengths and improvement areas (3-5 bullets each, max 12 words each).",
            user: `JOB:\nTitle: ${job.title}\nRequired skills: ${(job.skills_required ?? []).join(", ")}\nEducation: ${job.education_required ?? ""}\nExperience: ${job.experience_required ?? ""}\nDescription: ${(job.description ?? "").slice(0, 4000)}\n\nCANDIDATE:\n${JSON.stringify(parsed).slice(0, 8000)}`,
            toolName: "score_candidate",
            toolDescription: "Score the candidate against the job description",
            parameters: InsightsSchema as unknown as Record<string, unknown>,
          });

          section_scores = {
            skills: Math.round(ai.skills_score),
            experience: Math.round(ai.experience_score),
            education: Math.round(ai.education_score),
            projects: Math.round(ai.projects_score),
            certifications: Math.round(ai.certifications_score),
          };
          insights = {
            strengths: ai.strengths,
            improvements: ai.improvements,
            summary: ai.summary,
          };
          // Blend semantic similarity with weighted section scores for a stable overall
          const sectionAvg =
            (section_scores.skills * 0.35 +
              section_scores.experience * 0.3 +
              section_scores.education * 0.15 +
              section_scores.projects * 0.15 +
              section_scores.certifications * 0.05);
          score = Math.round(overall * 0.4 + sectionAvg * 0.6);
        }
      }

      const { error: uerr } = await supabase
        .from("resumes")
        .update({
          status: "completed",
          resume_text: text.slice(0, 50000),
          parsed_data: parsed,
          embedding: embedding as unknown as string,
          score,
          section_scores: section_scores as never,
          insights: insights as never,
          error: null,
        })
        .eq("id", resume.id);
      if (uerr) throw new Error(uerr.message);
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      await supabase
        .from("resumes")
        .update({ status: "failed", error: msg })
        .eq("id", resume.id);
      return { ok: false, error: msg };
    }
  });

export const deleteResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: r } = await supabase
      .from("resumes")
      .select("file_path")
      .eq("id", data.id)
      .single();
    if (r?.file_path) {
      await supabase.storage.from("resumes").remove([r.file_path]);
    }
    const { error } = await supabase.from("resumes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const semanticSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ query: z.string().min(2).max(500), limit: z.number().min(1).max(50).default(10) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { embed, cosineSim } = await import("./ai.server");
    const qVec = await embed(data.query);
    const { data: rows } = await supabase
      .from("resumes")
      .select("id, file_name, parsed_data, score, embedding, status")
      .eq("user_id", userId)
      .eq("status", "completed")
      .limit(200);
    const results = (rows ?? [])
      .map((r) => {
        const v =
          typeof r.embedding === "string"
            ? (JSON.parse(r.embedding) as number[])
            : (r.embedding as unknown as number[] | null);
        if (!v) return null;
        return { ...r, embedding: undefined, similarity: cosineSim(qVec, v) };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, data.limit);
    return { results };
  });