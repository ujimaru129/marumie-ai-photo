// eval/catalog.json と eval/styles/*.txt と eval/signature.json から、サーバーに入れるスタイルの一覧を作る。
// 指示文（プロンプト）はサーバーの中だけに置き、アプリには名前・仕上げの設定だけを返す。
// 出力: src/styles.generated.ts（git には入れない。dev / deploy / test の前に毎回作り直す）
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const evalDir = path.join(here, "..", "..", "eval");
const catalog = JSON.parse(fs.readFileSync(path.join(evalDir, "catalog.json"), "utf8"));
const signature = JSON.parse(fs.readFileSync(path.join(evalDir, "signature.json"), "utf8"));

const prompts = {};
function load(name) {
  const text = fs.readFileSync(path.join(evalDir, "styles", `${name}.txt`), "utf8").trim();
  // 先頭の [ ] の中の size=WxH は Muse Image の縦横比の設定（検証の run.py と同じ扱い。指示文はそのまま送る）
  const tag = text.startsWith("[") ? text.slice(1, text.indexOf("]")) : "";
  const size = tag.split(/\s+/).find((t) => t.startsWith("size="))?.slice(5) ?? null;
  prompts[name] = { text, size };
}

function finish(promptName) {
  let v = signature.styles[promptName];
  if (v === undefined || v === null) return null;
  if (typeof v === "string") v = { lut: v };
  const base = v.lut ? signature[v.lut] : null;
  return {
    lut: base ? base.lut : null,
    strength: v.strength ?? (base ? base.strength : 0),
    grain: v.grain ?? 0,
  };
}

const styles = catalog.styles.map((s) => {
  const out = { id: s.id, kind: s.kind, name: s.name, post: s.post ?? null, mirror: !!s.mirror, season: s.season ?? null };
  if (s.options) {
    out.options = {};
    for (const [key, opt] of Object.entries(s.options)) {
      out.options[key] = { label: opt.label, default: opt.default, choices: {} };
      for (const [cid, c] of Object.entries(opt.choices)) {
        load(c.prompt);
        out.options[key].choices[cid] = { label: c.label, prompt: c.prompt, finish: finish(c.prompt) };
      }
    }
  } else {
    load(s.prompt);
    out.prompt = s.prompt;
    out.finish = finish(s.prompt);
  }
  return out;
});

const body = `// 自動生成（scripts/build-styles.mjs）。手で直さない
export const STYLES = ${JSON.stringify(styles, null, 2)} as const;
export const PROMPTS: Record<string, { text: string; size: string | null }> = ${JSON.stringify(prompts, null, 2)};
`;
fs.writeFileSync(path.join(here, "..", "src", "styles.generated.ts"), body);
console.log(`styles: ${styles.length}, prompts: ${Object.keys(prompts).length}`);
