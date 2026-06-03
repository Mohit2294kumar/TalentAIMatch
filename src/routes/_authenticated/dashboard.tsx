import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Briefcase, Users, Trophy, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@/components/UploadDropzone";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dash });

type Resume = { id: string; file_name: string; score: number | null; status: string; parsed_data: any; created_at: string };
type Job = { id: string; title: string };

function Dash() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>("");

  async function load() {
    const [{ data: r }, { data: j }] = await Promise.all([
      supabase.from("resumes").select("id, file_name, score, status, parsed_data, created_at").order("created_at", { ascending: false }),
      supabase.from("jobs").select("id, title").order("created_at", { ascending: false }),
    ]);
    setResumes((r ?? []) as Resume[]);
    setJobs((j ?? []) as Job[]);
    if (!selectedJob && j && j[0]) setSelectedJob(j[0].id);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const ch = supabase.channel("dashboard").on("postgres_changes", { event: "*", schema: "public", table: "resumes" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const completed = resumes.filter((r) => r.status === "completed");
  const avg = completed.length ? Math.round(completed.reduce((s, r) => s + (r.score ?? 0), 0) / completed.length) : 0;
  const top = [...completed].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];

  const stats = [
    { label: "Total resumes", value: resumes.length, icon: Users },
    { label: "Total jobs", value: jobs.length, icon: Briefcase },
    { label: "Average score", value: `${avg}%`, icon: Sparkles },
    { label: "Top candidate", value: top?.parsed_data?.name || top?.file_name || "—", icon: Trophy },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your hiring pipeline</p>
        </div>
        <Link to="/jobs"><Button><Plus className="mr-1 h-4 w-4" /> New job</Button></Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass rounded-2xl p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 truncate text-2xl font-bold">{s.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6 shadow-[var(--shadow-soft)]">
          <h2 className="text-lg font-semibold">Upload resumes</h2>
          <p className="text-sm text-muted-foreground">Score them against a job description.</p>
          {jobs.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Create a job first to enable AI scoring. <Link to="/jobs" className="text-primary underline">Create a job</Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <select value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
              <UploadDropzone jobId={selectedJob} onDone={load} />
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-6 shadow-[var(--shadow-soft)]">
          <h2 className="text-lg font-semibold">Recent activity</h2>
          <div className="mt-3 space-y-2">
            {resumes.slice(0, 8).map((r) => (
              <Link key={r.id} to="/candidates/$id" params={{ id: r.id }} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-accent/40">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.parsed_data?.name || r.file_name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{r.status}</div>
                </div>
                <div className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>
                  {r.score != null ? `${r.score}%` : "—"}
                </div>
              </Link>
            ))}
            {resumes.length === 0 && <p className="text-sm text-muted-foreground">No resumes yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}