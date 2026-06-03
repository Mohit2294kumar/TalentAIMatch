// Server-only helpers for Lovable AI Gateway.
// Never import from client code.

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const EMBED_DIMS = 1536;

function key() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("LOVABLE_API_KEY is not configured");
  return k;
}

export async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${GATEWAY}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-embedding-001",
      input: text.slice(0, 8000),
      dimensions: EMBED_DIMS,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`embed failed ${res.status}: ${t}`);
  }
  const j = await res.json();
  return j.data[0].embedding as number[];
}

export function cosineSim(a: number[], b: number[]): number {
  let dot = 0,
    na = 0,
    nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function chatJSON<T>(opts: {
  system: string;
  user: string;
  toolName: string;
  toolDescription: string;
  parameters: Record<string, unknown>;
  model?: string;
}): Promise<T> {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model ?? "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: opts.toolName,
            description: opts.toolDescription,
            parameters: opts.parameters,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: opts.toolName } },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`chat failed ${res.status}: ${t}`);
  }
  const j = await res.json();
  const call = j.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw new Error("No tool call returned");
  return JSON.parse(call.function.arguments) as T;
}

export async function extractText(buf: ArrayBuffer, fileName: string): Promise<string> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const { extractText: pdfExtract, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await pdfExtract(pdf, { mergePages: true });
    return (Array.isArray(text) ? text.join("\n") : text) || "";
  }
  if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return result.value || "";
  }
  // fallback plain text
  return new TextDecoder().decode(buf);
}