// 雑誌の表紙の仕上げ（切り出し＋題字を人物の後ろに）を Node で確かめる。分類マップは Python（MediaPipe）で作ったものを使う
// 使い方: npx tsx scripts/check-cover.ts <画像> <分類マップ(.cm, 256×256 の uint8)> <出力>
import fs from 'node:fs';
import path from 'node:path';

import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/commonjs/web/LoadSkiaWeb';
import { getSkiaExports } from '@shopify/react-native-skia/lib/commonjs/headless';

import { coverCompose, coverCrop, coverVariant, crop, FORMAT_JPEG, type ClassMap } from '../src/finish/core';

async function main() {
  await LoadSkiaWeb();
  const { Skia } = getSkiaExports();
  const [imgPath, cmPath, out] = process.argv.slice(2);
  const load = (p: string) => Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(p))))!;
  const img = load(imgPath);
  const cm: ClassMap = { classMap: new Uint8Array(fs.readFileSync(cmPath)), size: 256 };
  const r = coverCrop(cm, img.width(), img.height());
  const framed = crop(Skia, img, r);
  // 切り出した後の分類マップ: アプリではもう一度モデルを動かす。ここでは元の分類マップを使わず、題字の位置だけ確かめるため null にせず元のマップを切り出し範囲に合わせて作り直す
  const s = 256;
  const re = new Uint8Array(s * s);
  const sc = Math.max(s / img.width(), s / img.height());
  const dx = (s - img.width() * sc) / 2, dy = (s - img.height() * sc) / 2;
  const sc2 = Math.max(s / framed.width(), s / framed.height());
  const dx2 = (s - framed.width() * sc2) / 2, dy2 = (s - framed.height() * sc2) / 2;
  for (let v = 0; v < s; v++) for (let u = 0; u < s; u++) {
    const fx = (u + 0.5 - dx2) / sc2, fy = (v + 0.5 - dy2) / sc2; // 切り出し後の写真の座標
    const ox = r.x + (fx * r.w) / framed.width(), oy = r.y + (fy * r.h) / framed.height(); // 元の写真の座標
    const uu = Math.floor(ox * sc + dx), vv = Math.floor(oy * sc + dy);
    re[v * s + u] = uu >= 0 && vv >= 0 && uu < s && vv < s ? cm.classMap[vv * s + uu] : 0;
  }
  const v = coverVariant(framed);
  const res = coverCompose(Skia, framed, load(path.join(__dirname, '..', 'assets', 'brand', `wordmark-${v}.png`)), { classMap: re, size: s });
  fs.writeFileSync(out, res.encodeToBytes(FORMAT_JPEG, 92));
  console.log(`zoom ${r.zoom.toFixed(2)} tooBig ${r.tooBig} variant ${v} size ${res.width()}x${res.height()}`);
}
main();
