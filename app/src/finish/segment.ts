// 人物の部位の分類（MediaPipe selfie_multiclass、Apache 2.0）を端末内で動かす。MARUMIE CAMERA の multiclassSegmentation.ts と同じ
// 入力 [1,256,256,3] float32（写真を cover で 256×256 に）、出力 [1,256,256,6] の生スコア → 画素ごとに一番高いクラス
import { AlphaType, ColorType, Skia, type SkImage } from '@shopify/react-native-skia';
import { loadTensorflowModel, type TensorflowModel } from 'react-native-fast-tflite';

import type { ClassMap } from './core';

const SIZE = 256;
let model: Promise<TensorflowModel> | null = null;

export async function segment(img: SkImage): Promise<ClassMap | null> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  model ??= loadTensorflowModel(require('@/assets/models/selfie_multiclass_256x256.tflite'), []);
  const m = await model;
  const w = img.width();
  const h = img.height();
  const scale = Math.max(SIZE / w, SIZE / h);
  const surface = Skia.Surface.Make(SIZE, SIZE);
  if (!surface) return null;
  surface.getCanvas().drawImageRect(img, Skia.XYWHRect(0, 0, w, h), Skia.XYWHRect((SIZE - w * scale) / 2, (SIZE - h * scale) / 2, w * scale, h * scale), Skia.Paint());
  surface.flush();
  const px = surface.makeImageSnapshot().readPixels(0, 0, { width: SIZE, height: SIZE, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul }) as Uint8Array | null;
  if (!px) return null;
  const n = SIZE * SIZE;
  const input = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    input[i * 3] = px[i * 4] / 255;
    input[i * 3 + 1] = px[i * 4 + 1] / 255;
    input[i * 3 + 2] = px[i * 4 + 2] / 255;
  }
  const out = new Float32Array((await m.run([input.buffer]))[0] as ArrayBuffer);
  const classMap = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    let best = 0;
    for (let c = 1; c < 6; c++) if (out[i * 6 + c] > out[i * 6 + best]) best = c;
    classMap[i] = best;
  }
  return { classMap, size: SIZE };
}
