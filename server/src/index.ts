// MARUMIE AI PHOTO の中継サーバー（Cloudflare Workers）
//
// アプリ → このサーバー → 画像 AI（Meta Muse Image、予備に Gemini）
// - APIキーと指示文（プロンプト）はここだけに置く
// - 端末は匿名ID＋トークン（アカウントなし）。初回の無料生成とクレジットをここで数える
// - 写真は生成にだけ使い、保存しない。結果は R2 に置いて24時間で消す
//
// API（すべて JSON。認証は Authorization: Bearer <deviceId>.<token>）
//   POST /v1/devices                { adult: true, consentVersion }       → { deviceId, token, freeLeft, credits }
//   GET  /v1/me                                                           → { freeLeft, credits }
//   GET  /v1/styles                                                       → { styles: [...] }（指示文は含めない）
//   POST /v1/generate  multipart    image(JPEG), style, option.<key>=<choice>
//                                                                         → { id, images: [{ variant, url, model }], freeLeft, credits }
//   GET  /v1/results/:id/:variant                                         → 画像（本人の端末からだけ）
//   POST /v1/reports                { generationId, variant, reason, note } → { ok: true }

import { generateOne, type ModelEnv } from "./models";
import { PROMPTS, STYLES } from "./styles.generated";

export interface Env extends ModelEnv {
  DB: D1Database;
  RESULTS: R2Bucket;
  VARIANTS: string;
  CREDITS_PER_GENERATION: string;
  FREE_GENERATIONS: string;
  META_REASONING: string;
  /** 開発時だけ: Web 版の画面確認のために許可するオリジン（本番は設定しない。アプリはネイティブなので CORS は不要） */
  DEV_ALLOW_ORIGIN?: string;
}

const CONSENT_VERSION = "2026-11";
const RESULT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_UPLOAD = 4 * 1024 * 1024;
const REPORT_REASONS = ["not_me", "inappropriate", "minor", "quality", "other"];

class HttpError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message ?? code);
  }
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

function randomHex(bytes: number): string {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

interface Device {
  id: string;
  free_left: number;
  credits: number;
  blocked: number;
}

async function auth(req: Request, env: Env): Promise<Device> {
  const h = req.headers.get("Authorization") ?? "";
  const m = /^Bearer ([0-9a-f]{32})\.([0-9a-f]{64})$/.exec(h);
  if (!m) throw new HttpError(401, "unauthorized");
  const row = await env.DB.prepare("SELECT id, token_hash, free_left, credits, blocked FROM devices WHERE id = ?").bind(m[1]).first<Device & { token_hash: string }>();
  if (!row || !timingSafeEqual(row.token_hash, await sha256(m[2]))) throw new HttpError(401, "unauthorized");
  if (row.blocked) throw new HttpError(403, "blocked");
  return row;
}

/** アプリに返すスタイルの一覧（指示文は入れない） */
function publicStyles() {
  return STYLES.map((s: any) => {
    const out: any = { id: s.id, kind: s.kind, name: s.name, desc: s.desc, post: s.post, mirror: s.mirror, season: s.season, sample: `/v1/samples/${s.id}` };
    if (s.options) {
      out.options = {};
      for (const [k, o] of Object.entries<any>(s.options)) {
        out.options[k] = { label: o.label, default: o.default, choices: {} };
        for (const [cid, c] of Object.entries<any>(o.choices)) out.options[k].choices[cid] = { label: c.label, finish: c.finish };
      }
    } else {
      out.finish = s.finish;
    }
    return out;
  });
}

/** スタイルと選んだオプションから、使う指示文の名前を決める */
function resolvePrompt(styleId: string, form: FormData): string {
  const s: any = STYLES.find((x: any) => x.id === styleId);
  if (!s) throw new HttpError(400, "unknown_style");
  if (!s.options) return s.prompt;
  // 今はオプションが1つ（枠の色）だけなので、その選択で指示文が決まる
  const [key, opt] = Object.entries<any>(s.options)[0];
  const choice = String(form.get(`option.${key}`) ?? opt.default);
  const c = opt.choices[choice];
  if (!c) throw new HttpError(400, "unknown_option");
  return c.prompt;
}

/** 無料の回数 → クレジットの順で消費する。足りなければ 402。どちらで払ったかを返す（失敗したら返金するため） */
async function charge(env: Env, deviceId: string, cost: number): Promise<"free" | "credits"> {
  const free = await env.DB.prepare("UPDATE devices SET free_left = free_left - 1 WHERE id = ? AND free_left > 0").bind(deviceId).run();
  if (free.meta.changes === 1) return "free";
  const paid = await env.DB.prepare("UPDATE devices SET credits = credits - ? WHERE id = ? AND credits >= ?").bind(cost, deviceId, cost).run();
  if (paid.meta.changes === 1) return "credits";
  throw new HttpError(402, "no_credits");
}

async function refund(env: Env, deviceId: string, paidWith: "free" | "credits", cost: number) {
  if (paidWith === "free") await env.DB.prepare("UPDATE devices SET free_left = free_left + 1 WHERE id = ?").bind(deviceId).run();
  else await env.DB.prepare("UPDATE devices SET credits = credits + ? WHERE id = ?").bind(cost, deviceId).run();
}

async function balance(env: Env, deviceId: string) {
  const r = await env.DB.prepare("SELECT free_left, credits FROM devices WHERE id = ?").bind(deviceId).first<{ free_left: number; credits: number }>();
  return { freeLeft: r?.free_left ?? 0, credits: r?.credits ?? 0 };
}

async function handle(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(req.url);
  const p = url.pathname;

  if (req.method === "POST" && p === "/v1/devices") {
    const body: any = await req.json().catch(() => ({}));
    // 18歳以上の確認と、外部の AI に写真を送ることへの同意（アプリの初回画面）。生年そのものは受け取らない
    if (body.adult !== true) throw new HttpError(403, "adult_required");
    if (body.consentVersion !== CONSENT_VERSION) throw new HttpError(400, "consent_required");
    const id = randomHex(16);
    const token = randomHex(32);
    const now = Date.now();
    const free = Number(env.FREE_GENERATIONS);
    await env.DB.prepare(
      "INSERT INTO devices (id, token_hash, created_at, adult_confirmed_at, consent_version, consent_at, free_left, credits) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
    ).bind(id, await sha256(token), now, now, CONSENT_VERSION, now, free).run();
    return json({ deviceId: id, token, freeLeft: free, credits: 0 });
  }

  // テスト版アプリの配布（R2 の dist/<名前>.apk）。名前にランダムな文字列を入れて、知っている人だけが取れるようにする
  const dist = /^\/dl\/([A-Za-z0-9_-]{16,}\.apk)$/.exec(p);
  if (req.method === "GET" && dist) {
    const obj = await env.RESULTS.get(`dist/${dist[1]}`);
    if (!obj) throw new HttpError(404, "not_found");
    return new Response(obj.body, {
      headers: { "Content-Type": "application/vnd.android.package-archive", "Content-Disposition": 'attachment; filename="marumie-ai-photo-test.apk"', "Cache-Control": "no-store" },
    });
  }

  // スタイルの見本画像（R2 の samples/<id>.jpg。誰でも見られる）
  const sample = /^\/v1\/samples\/([a-z0-9_]+)$/.exec(p);
  if (req.method === "GET" && sample) {
    const obj = await env.RESULTS.get(`samples/${sample[1]}.jpg`);
    if (!obj) throw new HttpError(404, "not_found");
    return new Response(obj.body, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400" } });
  }

  if (req.method === "GET" && p === "/v1/styles") {
    return json({ styles: publicStyles() }, 200);
  }

  const device = await auth(req, env);

  if (req.method === "GET" && p === "/v1/me") return json(await balance(env, device.id));

  if (req.method === "POST" && p === "/v1/generate") {
    const form = await req.formData();
    const image = form.get("image");
    if (!image || typeof image === "string") throw new HttpError(400, "image_required");
    if (image.size > MAX_UPLOAD) throw new HttpError(413, "image_too_large");
    const jpeg = await image.arrayBuffer();
    const head = new Uint8Array(jpeg.slice(0, 2));
    if (head[0] !== 0xff || head[1] !== 0xd8) throw new HttpError(415, "jpeg_required");
    const styleId = String(form.get("style") ?? "");
    const promptName = resolvePrompt(styleId, form);
    const prompt = PROMPTS[promptName];

    const cost = Number(env.CREDITS_PER_GENERATION);
    const paidWith = await charge(env, device.id, cost);
    const id = randomHex(16);
    await env.DB.prepare("INSERT INTO generations (id, device_id, style, prompt, status, paid_with, cost, created_at) VALUES (?, ?, ?, ?, 'running', ?, ?, ?)")
      .bind(id, device.id, styleId, promptName, paidWith, cost, Date.now()).run();

    // バリエーションは同時に作る（待ち時間は1枚分）
    const n = Number(env.VARIANTS);
    const runs = await Promise.all(Array.from({ length: n }, () => generateOne(env, jpeg, prompt.text, prompt.size, env.META_REASONING)));
    const images: { variant: number; url: string; model: string }[] = [];
    for (const [i, { result }] of runs.entries()) {
      if (!result.ok) continue;
      await env.RESULTS.put(`results/${device.id}/${id}/${i}`, result.bytes, {
        httpMetadata: { contentType: result.type },
        customMetadata: { model: result.model, created: String(Date.now()) },
      });
      images.push({ variant: i, url: `/v1/results/${id}/${i}`, model: result.model });
    }
    const failures = runs.filter((r) => !r.result.ok).map((r) => r.tries.map((t) => (t.ok ? t.model : `${t.model}:${t.kind}`)).join(">"));
    if (failures.length) console.log(JSON.stringify({ generation: id, style: styleId, failures }));

    if (images.length === 0) {
      // 1枚もできなければクレジットを返す
      await refund(env, device.id, paidWith, cost);
      const blocked = runs.some((r) => !r.result.ok && r.result.kind === "blocked");
      await env.DB.prepare("UPDATE generations SET status = 'failed', finished_at = ? WHERE id = ?").bind(Date.now(), id).run();
      throw new HttpError(blocked ? 422 : 502, blocked ? "blocked" : "generation_failed");
    }
    await env.DB.prepare("UPDATE generations SET status = 'ok', images = ?, models = ?, finished_at = ? WHERE id = ?")
      .bind(images.length, images.map((x) => x.model).join(","), Date.now(), id).run();
    return json({ id, images, ...(await balance(env, device.id)) });
  }

  const res = /^\/v1\/results\/([0-9a-f]{32})\/(\d)$/.exec(p);
  if (req.method === "GET" && res) {
    // 本人の端末のフォルダだけを見る（他人の結果は ID が分かっても取れない）
    const obj = await env.RESULTS.get(`results/${device.id}/${res[1]}/${res[2]}`);
    if (!obj) throw new HttpError(404, "not_found");
    if (Date.now() - Number(obj.customMetadata?.created ?? 0) > RESULT_TTL_MS) throw new HttpError(410, "expired");
    return new Response(obj.body, { headers: { "Content-Type": obj.httpMetadata?.contentType ?? "image/webp", "Cache-Control": "private, max-age=3600" } });
  }

  if (req.method === "POST" && p === "/v1/reports") {
    const body: any = await req.json().catch(() => ({}));
    const reason = String(body.reason ?? "");
    if (!REPORT_REASONS.includes(reason)) throw new HttpError(400, "unknown_reason");
    const gen = await env.DB.prepare("SELECT id FROM generations WHERE id = ? AND device_id = ?").bind(String(body.generationId ?? ""), device.id).first();
    if (!gen) throw new HttpError(404, "not_found");
    await env.DB.prepare("INSERT INTO reports (id, generation_id, device_id, variant, reason, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(randomHex(16), gen.id, device.id, Number.isInteger(body.variant) ? body.variant : null, reason, String(body.note ?? "").slice(0, 500), Date.now()).run();
    return json({ ok: true });
  }

  throw new HttpError(404, "not_found");
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = env.DEV_ALLOW_ORIGIN;
    if (origin && req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET, POST" } });
    }
    let res: Response;
    try {
      res = await handle(req, env, ctx);
    } catch (e) {
      if (e instanceof HttpError) res = json({ error: e.code }, e.status);
      else {
        console.error(e);
        res = json({ error: "internal" }, 500);
      }
    }
    if (origin) {
      res = new Response(res.body, res);
      res.headers.set("Access-Control-Allow-Origin", origin);
    }
    return res;
  },
} satisfies ExportedHandler<Env>;
