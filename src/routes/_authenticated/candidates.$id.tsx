import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Mail, Phone, Award, GraduationCap, Briefcase, FolderKanban } from "lucide-react";
import { motion } from "framer-motion";
import jsPDF from "jspdf";

export const Route = createFileRoute("/_authenticated/candidates/$id")({ component: Detail });

function Detail() {
  const { id } = Route.useParams();
  const [r, setR] = useState<any>(null);
  useEffect(() => {
    supabase.from("resumes").select("*").eq("id", id).single().then(({ data }) => setR(data));
  }, [id]);

  if (!r) return <p className="text-muted-foreground">Loading…</p>;
  const p = r.parsed_data || {};
  const ss = r.section_scores || {};
  const ins = r.insights || {};

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text(p.name || r.file_name, 14, 20);
    doc.setFontSize(11);
    let y = 30;
    doc.text(`Email: ${p.email || "—"}`, 14, y); y += 6;
    doc.text(`Phone: ${p.phone || "—"}`, 14, y); y += 6;
    doc.text(`Overall score: ${r.score ?? "—"}%`, 14, y); y += 10;
    doc.setFontSize(13); doc.text("Section scores", 14, y); y += 6;
    doc.setFontSize(11);
    for (const k of ["skills","experience","education","projects","certifications"]) {
      doc.text(`${k}: ${ss[k] ?? "—"}`, 14, y); y += 6;
    }
    y += 4; doc.setFontSize(13); doc.text("Strengths", 14, y); y += 6; doc.setFontSize(11);
    (ins.strengths || []).forEach((s: string) => { doc.text(`• ${s}`, 14, y); y += 6; });
    y += 2; doc.setFontSize(13); doc.text("Improvements", 14, y); y += 6; doc.setFontSize(11);
    (ins.improvements || []).forEach((s: string) => { doc.text(`• ${s}`, 14, y); y += 6; });
    doc.save(`${(p.name || "candidate").replace(/\s+/g, "_")}_report.pdf`);
  }

  const sections = [
    { key: "skills", label: "Skills", icon: Award },
    { key: "experience", label: "Experience", icon: Briefcase },
    { key: "education", label: "Education", icon: GraduationCap },
    { key: "projects", label: "Projects", icon: FolderKanban },
    { key: "certifications", label: "Certifications", icon: Award },
  ];

  return (
    <div className="space-y-6">
      <Link to="/candidates" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="mr-1 h-4 w-4" /> Back to candidates</Link>
      <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6 shadow-[var(--shadow-soft)]">
        <div>
          <h1 className="text-2xl font-bold">{p.name || r.file_name}</h1>
          <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
            {p.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</span>}
            {p.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {r.score != null && (
            <div className="grid h-20 w-20 place-items-center rounded-full text-xl font-bold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>{r.score}%</div>
          )}
          <Button onClick={exportPDF}><Download className="mr-1 h-4 w-4" /> Report</Button>
        </div>
      </div>

      {p.summary && <div className="glass rounded-2xl p-6 shadow-[var(--shadow-soft)]"><h2 className="text-sm font-semibold text-muted-foreground">Summary</h2><p className="mt-2">{p.summary}</p></div>}

      {Object.keys(ss).length > 0 && (
        <div className="glass rounded-2xl p-6 shadow-[var(--shadow-soft)]">
          <h2 className="text-lg font-semibold">Section scores</h2>
          <div className="mt-4 space-y-3">
            {sections.map((s) => (
              <div key={s.key}>
                <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><s.icon className="h-4 w-4 text-primary" />{s.label}</span><span className="font-medium">{ss[s.key] ?? 0}%</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${ss[s.key] ?? 0}%` }} transition={{ duration: 0.8 }} className="h-full" style={{ background: "var(--gradient-primary)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {ins.strengths && (
          <div className="glass rounded-2xl p-6 shadow-[var(--shadow-soft)]">
            <h3 className="font-semibold text-primary">Strengths</h3>
            <ul className="mt-3 space-y-1 text-sm">{ins.strengths.map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul>
          </div>
        )}
        {ins.improvements && (
          <div className="glass rounded-2xl p-6 shadow-[var(--shadow-soft)]">
            <h3 className="font-semibold text-accent">Improvement areas</h3>
            <ul className="mt-3 space-y-1 text-sm">{ins.improvements.map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul>
          </div>
        )}
      </div>

      {p.skills?.length > 0 && (
        <div className="glass rounded-2xl p-6 shadow-[var(--shadow-soft)]">
          <h3 className="font-semibold">Skills</h3>
          <div className="mt-3 flex flex-wrap gap-2">{p.skills.map((s: string) => <span key={s} className="rounded-full bg-secondary px-3 py-1 text-xs">{s}</span>)}</div>
        </div>
      )}

      {p.experience?.length > 0 && (
        <div className="glass rounded-2xl p-6 shadow-[var(--shadow-soft)]">
          <h3 className="font-semibold">Experience</h3>
          <div className="mt-3 space-y-3">
            {p.experience.map((e: any, i: number) => (
              <div key={i} className="border-l-2 border-primary/40 pl-3">
                <div className="font-medium">{e.role} <span className="text-muted-foreground">· {e.company}</span></div>
                <div className="text-xs text-muted-foreground">{e.duration}</div>
                <p className="mt-1 text-sm">{e.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {p.education?.length > 0 && (
        <div className="glass rounded-2xl p-6 shadow-[var(--shadow-soft)]">
          <h3 className="font-semibold">Education</h3>
          <div className="mt-3 space-y-2 text-sm">{p.education.map((e: any, i: number) => <div key={i}>{e.degree} — {e.institution} <span className="text-muted-foreground">({e.year})</span></div>)}</div>
        </div>
      )}

      {p.projects?.length > 0 && (
        <div className="glass rounded-2xl p-6 shadow-[var(--shadow-soft)]">
          <h3 className="font-semibold">Projects</h3>
          <div className="mt-3 space-y-2 text-sm">{p.projects.map((e: any, i: number) => <div key={i}><span className="font-medium">{e.name}</span> — <span className="text-muted-foreground">{e.description}</span></div>)}</div>
        </div>
      )}
    </div>
  );
}