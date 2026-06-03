import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { semanticSearch, deleteResume } from "@/lib/resumes.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/candidates")({
  validateSearch: (s: Record<string, unknown>) => ({ job: (s.job as string) || "" }),
  component: Candidates,
});

type Row = { id: string; file_name: string; score: number | null; status: string; parsed_data: any; job_id: string | null; created_at: string };

function Candidates() {
  const { job } = Route.useSearch();
  const [rows, setRows] = useState<Row[]>([]);
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);
  const [jobFilter, setJobFilter] = useState(job || "");
  const [q, setQ] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [searching, setSearching] = useState(false);
  const [semantic, setSemantic] = useState<Row[] | null>(null);
  const search = useServerFn(semanticSearch);
  const del = useServerFn(deleteResume);

  async function load() {
    const [{ data: r }, { data: j }] = await Promise.all([
      supabase.from("resumes").select("*").order("score", { ascending: false, nullsFirst: false }),
      supabase.from("jobs").select("id, title"),
    ]);
    setRows((r ?? []) as Row[]);
    setJobs((j ?? []) as any);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const ch = supabase.channel("cands").on("postgres_changes", { event: "*", schema: "public", table: "resumes" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    let list = semantic ?? rows;
    if (jobFilter) list = list.filter((r) => r.job_id === jobFilter);
    if (minScore > 0) list = list.filter((r) => (r.score ?? 0) >= minScore);
    if (!semantic && q.trim()) {
      const t = q.toLowerCase();
      list = list.filter((r) => {
        const p = r.parsed_data || {};
        return [r.file_name, p.name, p.email, ...(p.skills || []), ...(p.education?.map((e: any) => e.degree) || [])]
          .filter(Boolean).join(" ").toLowerCase().includes(t);
      });
    }
    return list;
  }, [rows, semantic, jobFilter, minScore, q]);

  async function runSemantic() {
    if (!q.trim()) return setSemantic(null);
    setSearching(true);
    try {
      const { results } = await search({ data: { query: q, limit: 20 } });
      const map = new Map(rows.map((r) => [r.id, r]));
      setSemantic(results.map((r: any) => ({ ...(map.get(r.id) || r), score: Math.round((r.similarity + 1) / 2 * 100) })));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Search failed"); }
    finally { setSearching(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Candidates</h1>
        <p className="text-muted-foreground">Ranked by AI match score</p>
      </div>

      <div className="glass rounded-2xl p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search name, skills, education…" value={q} onChange={(e) => { setQ(e.target.value); setSemantic(null); }} className="pl-9" />
          </div>
          <Button variant="outline" onClick={runSemantic} disabled={searching || !q.trim()}>
            {searching ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} AI search
          </Button>
          <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
            <option value="">All jobs</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Min score</span>
            <Input type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(+e.target.value)} className="w-20" />
          </div>
        </div>
      </div>

      <div className="glass overflow-hidden rounded-2xl shadow-[var(--shadow-soft)]">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Candidate</th>
              <th className="px-4 py-3 font-medium">Skills</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id} className="border-t border-border/60 hover:bg-accent/30">
                <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-3">
                  <Link to="/candidates/$id" params={{ id: r.id }} className="font-medium hover:text-primary">
                    {r.parsed_data?.name || r.file_name}
                  </Link>
                  <div className="text-xs text-muted-foreground">{r.parsed_data?.email}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(r.parsed_data?.skills ?? []).slice(0, 4).map((s: string) => (
                      <span key={s} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{s}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {r.score != null ? (
                    <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>{r.score}%</span>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{r.status}</td>
                <td className="px-4 py-3">
                  <Button size="icon" variant="ghost" onClick={async () => { if (confirm("Delete?")) { await del({ data: { id: r.id } }); load(); } }}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No candidates match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}