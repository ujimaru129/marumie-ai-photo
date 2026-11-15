// 画像 AI の呼び出し。どれも「写真1枚＋指示文 → 画像1枚」の同じ形（検証用の eval/models.py と同じ中身）。
// APIキーはこのサーバーの secret にだけ置く（アプリには入れない）。

export interface ModelEnv {
  META_API_KEY: string;
  GEMINI_API_KEY: string;
  META_BASE_URL: string;
  GEMINI_BASE_URL: string;
}

export type ModelResult =
  | { ok: true; model: "meta" | "gemini"; bytes: ArrayBuffer; type: string; ms: number }
  | { ok: false; model: "meta" | "gemini"; kind: "error" | "blocked"; detail: string; ms: number };

const META_MODEL = "muse-image-1.0";
const GEMINI_MODEL = "gemini-nano-banana-2.1";

function b64(bytes: ArrayBuffer): string {
  const u = new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromB64(s: string): ArrayBuffer {
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u.buffer;
}

function sniff(bytes: ArrayBuffer): string {
  const u = new Uint8Array(bytes.slice(0, 12));
  if (u[0] === 0x89 && u[1] === 0x50) return "image/png";
  if (u[0] === 0xff && u[1] === 0xd8) return "image/jpeg";
  if (u[8] === 0x57 && u[9] === 0x45 && u[10] === 0x42 && u[11] === 0x50) return "image/webp";
  return "application/octet-stream";
}

/** Muse Image（/v1/images/edits、OpenAI Images API と同じ形）。size は縦横比だけを決める。 */
export async function meta(env: ModelEnv, jpeg: ArrayBuffer, prompt: string, opts: { size?: string | null; reasoning?: string; timeoutMs?: number }): Promise<ModelResult> {
  const t = Date.now();
  const form = new FormData();
  form.append("model", META_MODEL);
  form.append("prompt", prompt);
  form.append("n", "1");
  if (opts.size) form.append("size", opts.size);
  // 画像検索・ウェブ検索・シェルの補助機能は使わない（時間が延びるうえ不要）
  form.append("tool_enablement", JSON.stringify({ enable_image_search: false, enable_web_search: false, enable_shell: false }));
  if (opts.reasoning) form.append("reasoning_strength", opts.reasoning);
  form.append("image", new Blob([jpeg], { type: "image/jpeg" }), "in.jpg");
  try {
    const r = await fetch(`${env.META_BASE_URL}/v1/images/edits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.META_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(opts.timeoutMs ?? 90_000),
    });
    const ms = Date.now() - t;
    if (!r.ok) return { ok: false, model: "meta", kind: "error", detail: `HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`, ms };
    const j: any = await r.json();
    const d = j?.data?.[0];
    if (d?.b64_json) {
      const bytes = fromB64(d.b64_json);
      return { ok: true, model: "meta", bytes, type: sniff(bytes), ms };
    }
    return { ok: false, model: "meta", kind: "blocked", detail: JSON.stringify(j).slice(0, 300), ms };
  } catch (e) {
    return { ok: false, model: "meta", kind: "error", detail: String(e), ms: Date.now() - t };
  }
}

/** Nano Banana 2.1（generateContent）。予備のモデル。 */
export async function gemini(env: ModelEnv, jpeg: ArrayBuffer, prompt: string, opts: { timeoutMs?: number } = {}): Promise<ModelResult> {
  const t = Date.now();
  try {
    const r = await fetch(`${env.GEMINI_BASE_URL}/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: "image/jpeg", data: b64(jpeg) } }, { text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 90_000),
    });
    const ms = Date.now() - t;
    if (!r.ok) return { ok: false, model: "gemini", kind: "error", detail: `HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`, ms };
    const j: any = await r.json();
    const cand = j?.candidates?.[0];
    for (const p of cand?.content?.parts ?? []) {
      const d = p.inlineData ?? p.inline_data;
      if (d?.data) {
        const bytes = fromB64(d.data);
        return { ok: true, model: "gemini", bytes, type: d.mimeType ?? d.mime_type ?? sniff(bytes), ms };
      }
    }
    // 画像が返らない＝安全チェックなどで止められた
    return { ok: false, model: "gemini", kind: "blocked", detail: JSON.stringify({ finishReason: cand?.finishReason, promptFeedback: j?.promptFeedback }).slice(0, 300), ms };
  } catch (e) {
    return { ok: false, model: "gemini", kind: "error", detail: String(e), ms: Date.now() - t };
  }
}

/**
 * 1枚作る。Muse Image（既定の reasoning）→ だめなら Muse Image（low。約30秒で 502 になることがあるため）→ だめなら Gemini。
 * どれかが「安全チェックで止めた（blocked）」場合は、別のモデルで作り直さない（止められた内容を回り道で通さないため）。
 */
export async function generateOne(env: ModelEnv, jpeg: ArrayBuffer, prompt: string, size: string | null, reasoning: string): Promise<{ result: ModelResult; tries: ModelResult[] }> {
  const tries: ModelResult[] = [];
  let r = await meta(env, jpeg, prompt, { size, reasoning });
  tries.push(r);
  if (r.ok || r.kind === "blocked") return { result: r, tries };
  if (reasoning !== "low") {
    r = await meta(env, jpeg, prompt, { size, reasoning: "low" });
    tries.push(r);
    if (r.ok || r.kind === "blocked") return { result: r, tries };
  }
  r = await gemini(env, jpeg, prompt);
  tries.push(r);
  return { result: r, tries };
}
