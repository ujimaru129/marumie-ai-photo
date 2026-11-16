// 仕上げ（src/finish/core.ts）を Node で動かして、検証の Python（eval/finish.py ほか）と同じ結果になるかを確かめる。
// 使い方: npx tsx scripts/check-finish.ts <入力画像> <出力フォルダ> [booth の画像] [cover の画像]
import fs from 'node:fs';
import path from 'node:path';

import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/commonjs/web/LoadSkiaWeb';
import { getSkiaExports } from '@shopify/react-native-skia/lib/commonjs/headless';

import { applyLook, boothLogo, coverCompose, coverVariant, FORMAT_JPEG } from '../src/finish/core';

const A = path.join(__dirname, '..', 'assets');

async function main() {
  await LoadSkiaWeb();
  const { Skia } = getSkiaExports();
  const load = (p: string) => Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(p))))!;
  const [input, outDir, boothImg, coverImg] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const save = (img: ReturnType<typeof load>, name: string) => fs.writeFileSync(path.join(outDir, name), img.encodeToBytes(FORMAT_JPEG, 95));

  const img = load(input);
  const day = load(path.join(A, 'luts', 'MARUMIE_Day.png'));
  save(applyLook(Skia, img, { lut: day, strength: 0.7, grain: 0 }), 'look_day70.jpg');
  save(applyLook(Skia, img, { lut: day, strength: 0.7, grain: 0.2 }), 'look_day70_grain.jpg');
  save(applyLook(Skia, img, { lut: null, strength: 0, grain: 0 }, true), 'mirror.jpg');

  if (boothImg) {
    const lockups = { ink: load(path.join(A, 'brand', 'booth-lockup-ink.png')), paper: load(path.join(A, 'brand', 'booth-lockup-paper.png')) };
    save(boothLogo(Skia, load(boothImg), lockups, 1200 / 1722), 'booth.jpg');
  }
  if (coverImg) {
    const c = load(coverImg);
    const v = coverVariant(c);
    save(coverCompose(Skia, c, load(path.join(A, 'brand', `wordmark-${v}.png`)), null), `cover_${v}.jpg`);
  }
  console.log('ok');
}
main();
