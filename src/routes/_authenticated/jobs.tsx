import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { saveJob, deleteJob } from "@/lib/jobs.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Briefcase } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/jobs")({ component: Jobs });

type Job = { id: string; title: string; company: string; department: string; experience_required: string; education_required: string; skills_required: string[]; description: string; created_at: string };

function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);
  const save = useServerFn(saveJob);
  const del = useServerFn(deleteJob);

  async function load() {
    const { data } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
    setJobs((data ?? []) as Job[]);
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">Manage job descriptions used for AI ranking</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> New job</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? "Edit job" : "Create job"}</DialogTitle></DialogHeader>
            <JobForm
              initial={editing}
              onSubmit={async (v) => {
                try {
                  await save({ data: { ...v, id: editing?.id } });
                  toast.success("Saved");
                  setOpen(false); setEditing(null); load();
                } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {jobs.map((j) => (
          <div key={j.id} className="glass rounded-2xl p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /><h3 className="font-semibold">{j.title}</h3></div>
                <p className="text-sm text-muted-foreground">{[j.company, j.department].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(j); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={async () => { if (confirm("Delete this job?")) { await del({ data: { id: j.id } }); load(); } }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {(j.skills_required ?? []).slice(0, 6).map((s) => (
                <span key={s} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{s}</span>
              ))}
            </div>
            <Link to="/candidates" search={{ job: j.id } as any} className="mt-3 inline-block text-xs text-primary hover:underline">View candidates →</Link>
          </div>
        ))}
        {jobs.length === 0 && <p className="col-span-full text-sm text-muted-foreground">No jobs yet — create one to start ranking candidates.</p>}
      </div>
    </div>
  );
}

function JobForm({ initial, onSubmit }: { initial: Job | null; onSubmit: (v: any) => Promise<void> }) {
  const [v, setV] = useState({
    title: initial?.title ?? "",
    company: initial?.company ?? "",
    department: initial?.department ?? "",
    experience_required: initial?.experience_required ?? "",
    education_required: initial?.education_required ?? "",
    skills_required: (initial?.skills_required ?? []).join(", "),
    description: initial?.description ?? "",
  });
  const [loading, setLoading] = useState(false);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        await onSubmit({
          ...v,
          skills_required: v.skills_required.split(",").map((s) => s.trim()).filter(Boolean),
        });
        setLoading(false);
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div><Label>Title</Label><Input required value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></div>
        <div><Label>Company</Label><Input value={v.company} onChange={(e) => setV({ ...v, company: e.target.value })} /></div>
        <div><Label>Department</Label><Input value={v.department} onChange={(e) => setV({ ...v, department: e.target.value })} /></div>
        <div><Label>Experience required</Label><Input placeholder="e.g. 3-5 years" value={v.experience_required} onChange={(e) => setV({ ...v, experience_required: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Education required</Label><Input value={v.education_required} onChange={(e) => setV({ ...v, education_required: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Skills (comma separated)</Label><Input value={v.skills_required} onChange={(e) => setV({ ...v, skills_required: e.target.value })} /></div>
      </div>
      <div><Label>Full description</Label><Textarea required rows={6} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></div>
      <Button type="submit" disabled={loading} className="w-full">{loading ? "Saving (generating embedding)…" : "Save job"}</Button>
    </form>
  );
}