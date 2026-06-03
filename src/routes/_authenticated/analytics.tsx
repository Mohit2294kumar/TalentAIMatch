import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({ component: Analytics });

const COLORS = ["#4F46E5", "#7C3AED", "#06B6D4", "#22d3ee", "#a78bfa"];

function Analytics() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { supabase.from("resumes").select("*").then(({ data }) => setRows(data ?? [])); }, []);

  const bins = [0, 20, 40, 60, 80, 100];
  const dist = bins.slice(0, -1).map((b, i) => ({
    range: `${b}-${bins[i + 1]}`,
    count: rows.filter((r) => r.score != null && r.score >= b && r.score < bins[i + 1]).length,
  }));
  const skillCounts: Record<string, number> = {};
  rows.forEach((r) => (r.parsed_data?.skills ?? []).forEach((s: string) => { skillCounts[s] = (skillCounts[s] || 0) + 1; }));
  const topSkills = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  const funnel = [
    { name: "Total", value: rows.length },
    { name: "Processed", value: rows.filter((r) => r.status === "completed").length },
    { name: "Score ≥ 70", value: rows.filter((r) => (r.score ?? 0) >= 70).length },
    { name: "Score ≥ 85", value: rows.filter((r) => (r.score ?? 0) >= 85).length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Insights across your candidate pool</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6 shadow-[var(--shadow-soft)]">
          <h2 className="font-semibold">Score distribution</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer><BarChart data={dist}><XAxis dataKey="range" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#4F46E5" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-2xl p-6 shadow-[var(--shadow-soft)]">
          <h2 className="font-semibold">Hiring funnel</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer><BarChart data={funnel} layout="vertical"><XAxis type="number" /><YAxis type="category" dataKey="name" /><Tooltip /><Bar dataKey="value" fill="#7C3AED" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-2xl p-6 shadow-[var(--shadow-soft)] lg:col-span-2">
          <h2 className="font-semibold">Top skills in candidate pool</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer><PieChart><Pie data={topSkills} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>{topSkills.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}