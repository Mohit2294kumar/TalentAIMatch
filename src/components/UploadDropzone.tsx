import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { createResumeRecord, processResume } from "@/lib/resumes.functions";
import { Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function UploadDropzone({ jobId, onDone }: { jobId?: string | null; onDone?: () => void }) {
  const create = useServerFn(createResumeRecord);
  const process = useServerFn(processResume);
  const [items, setItems] = useState<{ name: string; pct: number; status: string }[]>([]);
  const [drag, setDrag] = useState(false);

  async function upload(files: File[]) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return toast.error("Not signed in");
    const valid = files.filter((f) => /\.(pdf|docx)$/i.test(f.name));
    if (valid.length === 0) return toast.error("Only PDF or DOCX files allowed");
    const initial = valid.map((f) => ({ name: f.name, pct: 0, status: "uploading" }));
    setItems((p) => [...p, ...initial]);
    for (let i = 0; i < valid.length; i++) {
      const f = valid[i];
      const idx = items.length + i;
      const path = `${u.user.id}/${Date.now()}-${f.name.replace(/[^\w.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("resumes").upload(path, f);
      if (upErr) { toast.error(upErr.message); continue; }
      setItems((p) => p.map((it, k) => k === idx ? { ...it, pct: 50, status: "parsing" } : it));
      try {
        const { id } = await create({ data: { file_name: f.name, file_path: path, job_id: jobId ?? null } });
        await process({ data: { resume_id: id } });
        setItems((p) => p.map((it, k) => k === idx ? { ...it, pct: 100, status: "done" } : it));
      } catch (e) {
        setItems((p) => p.map((it, k) => k === idx ? { ...it, status: "failed" } : it));
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    }
    toast.success("Processing complete");
    onDone?.();
  }

  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload(Array.from(e.dataTransfer.files)); }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-colors ${drag ? "border-primary bg-primary/5" : "border-border bg-card/50"}`}
      >
        <Upload className="h-8 w-8 text-primary" />
        <p className="mt-3 font-medium">Drop resumes here or click to upload</p>
        <p className="text-xs text-muted-foreground">PDF or DOCX, up to 20MB each</p>
        <input type="file" accept=".pdf,.docx" multiple className="hidden" onChange={(e) => e.target.files && upload(Array.from(e.target.files))} />
      </label>
      {items.length > 0 && (
        <div className="mt-4 space-y-2">
          {items.map((it, i) => (
            <div key={i} className="glass flex items-center gap-3 rounded-lg p-3 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate">{it.name}</span>
              {it.status !== "done" && it.status !== "failed" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              <span className="text-xs text-muted-foreground">{it.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}