// 中継サーバーの手元テスト。本物の画像 AI は呼ばない（偽の Meta / Gemini をこのスクリプトの中で立てる）。
// 1. 偽の画像 AI を 127.0.0.1:8788 で起動
// 2. ローカルの D1 に schema.sql を入れ、wrangler dev（ローカル）を 127.0.0.1:8787 で起動
// 3. 端末登録 → スタイル一覧 → 生成 → 結果の取得 → 報告、と失敗時の返金・予備モデル・他人の結果が取れないこと、を確かめる
import { spawn, execFileSync } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.NO_PROXY = process.env.no_proxy = "127.0.0.1,localhost";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Buffer.alloc(200)]);

// 偽の画像 AI。mode で挙動を切り替える
let mode = "ok";
const calls = [];
const upstream = http.createServer((req, res) => {
  let body = [];
  req.on("data", (c) => body.push(c));
  req.on("end", () => {
    body = Buffer.concat(body);
    const isMeta = req.url.startsWith("/v1/images/edits");
    const reasoning = isMeta ? (/name="reasoning_strength"\r\n\r\n(\w+)/.exec(body.toString("latin1"))?.[1] ?? "") : "";
    const size = isMeta ? (/name="size"\r\n\r\n([\dx]+)/.exec(body.toString("latin1"))?.[1] ?? "") : "";
    calls.push({ model: isMeta ? "meta" : "gemini", auth: req.headers.authorization ?? req.headers["x-goog-api-key"], reasoning, size });
    const fail = (code) => { res.writeHead(code); res.end("upstream error"); };
    if (isMeta) {
      if (mode === "meta_fail" || mode === "all_fail") return fail(502);
      if (mode === "meta_high_fail" && reasoning === "high") return fail(502);
      if (mode === "blocked") { res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ data: [{}] })); }
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ data: [{ b64_json: PNG.toString("base64") }] }));
    }
    if (mode === "all_fail") return fail(500);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: PNG.toString("base64") } }] } }] }));
  });
});
await new Promise((r) => upstream.listen(8788, "127.0.0.1", r));

fs.writeFileSync(path.join(root, ".dev.vars"), "META_API_KEY=test-meta-key\nGEMINI_API_KEY=test-gemini-key\n");
fs.rmSync(path.join(root, ".wrangler", "state"), { recursive: true, force: true });
const wr = path.join(root, "node_modules", ".bin", "wrangler");
execFileSync(wr, ["d1", "execute", "marumie-ai-photo", "--local", "--file", "schema.sql"], { cwd: root, stdio: "ignore" });
const dev = spawn(wr, ["dev", "--local", "--port", "8787", "--ip", "127.0.0.1",
  "--var", "META_BASE_URL:http://127.0.0.1:8788", "--var", "GEMINI_BASE_URL:http://127.0.0.1:8788"], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
let log = "";
dev.stdout.on("data", (d) => (log += d));
dev.stderr.on("data", (d) => (log += d));

const BASE = "http://127.0.0.1:8787";
for (let i = 0; ; i++) {
  try { if ((await fetch(`${BASE}/v1/styles`)).ok) break; } catch {}
  if (i > 120) { console.log(log); throw new Error("wrangler dev did not start"); }
  await new Promise((r) => setTimeout(r, 500));
}

let failed = 0;
function check(name, cond, extra = "") {
  console.log(`${cond ? "OK  " : "NG  "} ${name}${extra ? "  " + extra : ""}`);
  if (!cond) failed++;
}
const api = async (p, { method = "GET", token, body, form } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  const r = await fetch(BASE + p, { method, headers, body: form ?? (body ? JSON.stringify(body) : undefined) });
  const type = r.headers.get("content-type") ?? "";
  return { status: r.status, type, data: type.includes("json") ? await r.json() : Buffer.from(await r.arrayBuffer()) };
};
const gen = (token, style, extra = {}) => {
  const f = new FormData();
  f.append("image", new Blob([JPEG], { type: "image/jpeg" }), "in.jpg");
  f.append("style", style);
  for (const [k, v] of Object.entries(extra)) f.append(k, v);
  return api("/v1/generate", { method: "POST", token, form: f });
};

try {
  // 登録
  check("18歳以上の確認がないと登録できない", (await api("/v1/devices", { method: "POST", body: { consentVersion: "2026-11" } })).status === 403);
  check("同意がないと登録できない", (await api("/v1/devices", { method: "POST", body: { adult: true } })).status === 400);
  const d = (await api("/v1/devices", { method: "POST", body: { adult: true, consentVersion: "2026-11" } })).data;
  const token = `${d.deviceId}.${d.token}`;
  check("登録すると無料1回", d.freeLeft === 1 && d.credits === 0, JSON.stringify({ freeLeft: d.freeLeft, credits: d.credits }));
  check("トークンが違うと 401", (await api("/v1/me", { token: `${d.deviceId}.${"0".repeat(64)}` })).status === 401);

  // スタイル一覧に指示文が入っていない
  const st = await api("/v1/styles");
  const text = JSON.stringify(st.data);
  check("スタイル一覧は17種", st.data.styles.length === 17);
  check("スタイル一覧に指示文が入っていない", !text.includes("Using this photo") && !text.includes('"prompt"'));
  const booth = st.data.styles.find((s) => s.id === "korean_booth");
  check("セルフ写真館は枠の色の選択肢を返す（左右反転はしない）", booth.mirror === false && Object.keys(booth.options.frame.choices).join() === "red,black");

  // 生成（初回無料）
  calls.length = 0;
  let r = await gen(token, "korean_booth", { "option.frame": "black" });
  check("初回の無料生成で2枚できる", r.status === 200 && r.data.images.length === 2, `status ${r.status}`);
  check("生成後は無料0・クレジット0", r.data.freeLeft === 0 && r.data.credits === 0);
  check("Meta にキーと縦横比が渡る", calls.length === 2 && calls.every((c) => c.auth === "Bearer test-meta-key" && c.size === "1024x1536" && c.reasoning === "high"), JSON.stringify(calls[0]));
  const img = await api(r.data.images[0].url, { token });
  check("結果の画像を取得できる", img.status === 200 && img.type === "image/png" && img.data.equals(PNG));
  const genId = r.data.id;

  // 2回目はクレジットが足りない
  r = await gen(token, "sakura");
  check("クレジットがなければ 402", r.status === 402 && r.data.error === "no_credits");

  // 他人の端末からは結果が見えない
  const d2 = (await api("/v1/devices", { method: "POST", body: { adult: true, consentVersion: "2026-11" } })).data;
  const token2 = `${d2.deviceId}.${d2.token}`;
  check("他人の結果は取れない", (await api(`/v1/results/${genId}/0`, { token: token2 })).status === 404);
  check("他人の生成は報告できない", (await api("/v1/reports", { method: "POST", token: token2, body: { generationId: genId, reason: "quality" } })).status === 404);

  // 報告
  check("報告できる", (await api("/v1/reports", { method: "POST", token, body: { generationId: genId, variant: 1, reason: "inappropriate", note: "test" } })).status === 200);
  check("報告の理由が決まった値でないと 400", (await api("/v1/reports", { method: "POST", token, body: { generationId: genId, reason: "x" } })).status === 400);

  // 予備: high が失敗 → low でやり直し
  mode = "meta_high_fail"; calls.length = 0;
  r = await gen(token2, "sakura");
  check("high が失敗したら low でやり直す", r.status === 200 && r.data.images.every((x) => x.model === "meta") && calls.filter((c) => c.reasoning === "low").length === 2, JSON.stringify(calls.map((c) => c.model + ":" + c.reasoning)));

  // 予備: Meta が全部失敗 → Gemini
  const d3 = (await api("/v1/devices", { method: "POST", body: { adult: true, consentVersion: "2026-11" } })).data;
  const token3 = `${d3.deviceId}.${d3.token}`;
  mode = "meta_fail"; calls.length = 0;
  r = await gen(token3, "beach_day");
  check("Meta が失敗したら Gemini で作る", r.status === 200 && r.data.images.every((x) => x.model === "gemini") && calls.some((c) => c.model === "gemini" && c.auth === "test-gemini-key"));

  // 全部失敗 → 返金
  const d4 = (await api("/v1/devices", { method: "POST", body: { adult: true, consentVersion: "2026-11" } })).data;
  const token4 = `${d4.deviceId}.${d4.token}`;
  mode = "all_fail";
  r = await gen(token4, "beach_day");
  check("全部失敗したら 502", r.status === 502);
  check("失敗したら無料の回数を返す", (await api("/v1/me", { token: token4 })).data.freeLeft === 1);

  // 安全チェックで止められた → 別のモデルで作り直さない・返金
  mode = "blocked"; calls.length = 0;
  r = await gen(token4, "beach_day");
  check("止められたら 422、Gemini で作り直さない", r.status === 422 && !calls.some((c) => c.model === "gemini"));
  check("止められたら無料の回数を返す", (await api("/v1/me", { token: token4 })).data.freeLeft === 1);

  // 入力のチェック
  mode = "ok";
  const f = new FormData();
  f.append("image", new Blob([Buffer.from("not a jpeg")]), "x.png");
  f.append("style", "sakura");
  check("JPEG 以外は 415", (await api("/v1/generate", { method: "POST", token: token4, form: f })).status === 415);
  check("知らないスタイルは 400", (await gen(token4, "nope")).status === 400);
  check("知らない枠の色は 400", (await gen(token4, "korean_booth", { "option.frame": "green" })).status === 400);
} finally {
  dev.kill();
  upstream.close();
}
console.log(failed ? `\n${failed} 件 NG` : "\nすべて OK");
process.exit(failed ? 1 : 0);
