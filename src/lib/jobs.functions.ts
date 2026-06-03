import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const JobInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  company: z.string().max(200).optional().default(""),
  department: z.string().max(200).optional().default(""),
  experience_required: z.string().max(200).optional().default(""),
  skills_required: z.array(z.string().min(1).max(80)).max(50).default([]),
  education_required: z.string().max(200).optional().default(""),
  description: z.string().min(10).max(20000),
});

export const saveJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => JobInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { embed } = await import("./ai.server");
    const blob = [
      data.title,
      data.company,
      data.department,
      `Experience: ${data.experience_required}`,
      `Education: ${data.education_required}`,
      `Skills: ${data.skills_required.join(", ")}`,
      data.description,
    ]
      .filter(Boolean)
      .join("\n");
    const embedding = await embed(blob);
    const row = {
      user_id: userId,
      title: data.title,
      company: data.company,
      department: data.department,
      experience_required: data.experience_required,
      skills_required: data.skills_required,
      education_required: data.education_required,
      description: data.description,
      jd_embedding: embedding as unknown as string,
    };
    if (data.id) {
      const { error } = await supabase.from("jobs").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await supabase
      .from("jobs")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

export const deleteJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("jobs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });