import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Brain, LayoutDashboard, Briefcase, Users, BarChart3, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Shell,
});

function Shell() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const nav = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/jobs", icon: Briefcase, label: "Jobs" },
    { to: "/candidates", icon: Users, label: "Candidates" },
    { to: "/analytics", icon: BarChart3, label: "Analytics" },
  ] as const;
  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-border/60 bg-sidebar px-4 py-6 md:flex md:flex-col">
        <Link to="/dashboard" className="mb-8 flex items-center gap-2 px-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
            <Brain className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">TalentRank</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => {
            const active = path.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"}`}>
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto">
          <Button variant="ghost" className="w-full justify-start" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
        </div>
      </aside>
      <main className="flex-1">
        <div className="mx-auto max-w-7xl p-6 md:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}