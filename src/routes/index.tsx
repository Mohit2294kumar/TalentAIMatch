import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Brain, FileText, Sparkles, Target, TrendingUp, Zap, Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TalentRank — AI Resume Analyzer & Candidate Ranking" },
      { name: "description", content: "Upload resumes, analyze candidates with AI, rank applicants instantly, and hire smarter." },
      { property: "og:title", content: "TalentRank — AI Resume Analyzer" },
      { property: "og:description", content: "Hire smarter with AI-powered candidate ranking." },
    ],
  }),
  component: Index,
});

function Index() {
  const features = [
    { icon: Upload, title: "Multi-Resume Upload", desc: "Drag, drop, and process hundreds of PDFs and DOCX files in seconds." },
    { icon: Brain, title: "AI Matching Engine", desc: "Semantic embeddings + cosine similarity for accurate JD-to-resume matching." },
    { icon: Target, title: "Section-Wise Scoring", desc: "Granular scores for skills, experience, education, projects, and certifications." },
    { icon: TrendingUp, title: "Live Ranking", desc: "Candidates re-rank in real time as new resumes are processed." },
    { icon: Sparkles, title: "AI Insights", desc: "Strengths, gaps, and tailored hiring recommendations for every candidate." },
    { icon: FileText, title: "PDF Reports", desc: "Export polished candidate reports with one click." },
  ];
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">TalentRank</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
            <Link to="/auth"><Button className="shadow-[var(--shadow-glow)]">Get started</Button></Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 pt-24 pb-32">
        <div className="absolute inset-0 -z-10 opacity-40" style={{ background: "var(--gradient-hero)", maskImage: "radial-gradient(ellipse at top, black, transparent 70%)" }} />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Powered by AI embeddings
          </div>
          <h1 className="mt-6 text-5xl font-bold tracking-tight md:text-6xl">
            AI Resume Analyzer &<br /><span className="gradient-text">Candidate Ranking Platform</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Upload resumes, analyze candidates using AI, rank applicants instantly, and hire smarter.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth"><Button size="lg" className="shadow-[var(--shadow-glow)]">Start free <Zap className="ml-1 h-4 w-4" /></Button></Link>
            <Link to="/auth"><Button size="lg" variant="outline">Sign in</Button></Link>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }} className="glass rounded-2xl p-6 shadow-[var(--shadow-soft)]">
              <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "var(--gradient-primary)" }}>
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="glass rounded-3xl p-10 text-center shadow-[var(--shadow-soft)]">
          <h2 className="text-3xl font-bold tracking-tight">Built for modern hiring teams</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">Stop reading 500 resumes. Let AI rank them so you can focus on the top 10.</p>
          <ul className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
            {["Semantic JD-to-resume matching", "Section-level scoring", "Live candidate ranking", "Downloadable PDF reports", "Search by skill or experience", "Bulk upload with progress"].map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 text-primary" />{t}</li>
            ))}
          </ul>
          <Link to="/auth"><Button size="lg" className="mt-8 shadow-[var(--shadow-glow)]">Get started free</Button></Link>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} TalentRank. Built By Mohit Kumar.
      </footer>
    </div>
  );
}
