// シグネチャー仕上げの中身（端末内）。Skia を引数で受け取るので、アプリでも Node（headless の検証）でも同じコードが動く。
// 検証で決めた処理（eval/finish.py・booth_frame.py・cover.py）と同じことをする:
//   1. LUT（MARUMIE の Day / Night、33³）を強さを決めてかける＋グレイン
//   2. セルフ写真館: 枠の下の余白を枠の色で塗り、「MARUMIE PHOTO」を置く
//   3. 雑誌の表紙: 人物の大きさをそろえて切り出し、題字を人物の後ろに置く
import type { SkImage, Skia as SkiaApi } from '@shopify/react-native-skia';

type S = typeof SkiaApi;

// Skia の列挙値（react-native-skia の型定義と同じ数値。Node でも読み込めるように数値で持つ）
const TILE_CLAMP = 0;
const FILTER_NEAREST = 0;
const FILTER_LINEAR = 1;
const MIPMAP_NONE = 0;
const COLOR_RGBA8888 = 4;
const ALPHA_UNPREMUL = 3;
const BLEND_DST_IN = 6;
export const FORMAT_JPEG = 3;

export const LUT_SIZE = 33;

const LOOK_SKSL = `
uniform shader image;
uniform shader lut;
uniform float lutSize;
uniform float lutBlend;
uniform float grain;
uniform float cell;
uniform float mirror;
uniform float width;

half3 sampleLUT(float ri, float gi, float bi) {
  return lut.eval(float2(bi * lutSize + ri + 0.5, gi + 0.5)).rgb;
}
half3 applyLUT(half3 c0) {
  float3 c = clamp(float3(c0), 0.0, 1.0);
  float3 pos = c * (lutSize - 1.0);
  float3 i0 = floor(pos);
  float3 i1 = min(i0 + 1.0, lutSize - 1.0);
  float3 f = pos - i0;
  half3 a00 = mix(sampleLUT(i0.x, i0.y, i0.z), sampleLUT(i1.x, i0.y, i0.z), f.x);
  half3 a10 = mix(sampleLUT(i0.x, i1.y, i0.z), sampleLUT(i1.x, i1.y, i0.z), f.x);
  half3 a01 = mix(sampleLUT(i0.x, i0.y, i1.z), sampleLUT(i1.x, i0.y, i1.z), f.x);
  half3 a11 = mix(sampleLUT(i0.x, i1.y, i1.z), sampleLUT(i1.x, i1.y, i1.z), f.x);
  return mix(mix(a00, a10, f.y), mix(a01, a11, f.y), f.z);
}
float hash(float2 p) {
  p = fract(p * float2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}
half4 main(float2 xy) {
  float2 src = mirror > 0.5 ? float2(width - xy.x, xy.y) : xy;
  half3 c = image.eval(src).rgb;
  if (lutBlend > 0.0) c = mix(c, applyLUT(c), half(lutBlend));
  if (grain > 0.0) {
    // 細かい白黒のノイズ。暗い所ほど目立つ（フィルムやセンサーのノイズと同じ傾向）。正規分布に近い値を3つの乱数の和で作る
    float2 q = floor(xy / cell);
    float n = (hash(q) + hash(q + 17.31) + hash(q + 41.77) - 1.5) * 2.0;
    float lum = dot(float3(c), float3(0.2126, 0.7152, 0.0722));
    c += half3(n * 0.045 * grain * (1.0 - 0.6 * lum));
  }
  return half4(clamp(c, 0.0, 1.0), 1.0);
}`;

export type Look = { lut: SkImage | null; strength: number; grain: number };

function surface(Sk: S, w: number, h: number) {
  const s = Sk.Surface.MakeOffscreen(w, h) ?? Sk.Surface.Make(w, h);
  if (!s) throw new Error('surface');
  return s;
}

function snapshot(s: ReturnType<S['Surface']['Make']>): SkImage {
  s!.flush();
  const img = s!.makeImageSnapshot().makeNonTextureImage();
  if (!img) throw new Error('snapshot');
  return img;
}

/** 1. LUT とグレインをかける（mirror なら左右反転もここで戻す） */
export function applyLook(Sk: S, img: SkImage, look: Look, mirror = false): SkImage {
  const w = img.width();
  const h = img.height();
  const effect = Sk.RuntimeEffect.Make(LOOK_SKSL);
  if (!effect) throw new Error('shader');
  const lutImg = look.lut ?? img; // LUT なしのときは使わない（lutBlend = 0）
  const shader = effect.makeShaderWithChildren(
    [LUT_SIZE, look.lut ? look.strength : 0, look.grain, Math.max(1, Math.round(Math.max(w, h) / 1400)), mirror ? 1 : 0, w],
    [
      img.makeShaderOptions(TILE_CLAMP, TILE_CLAMP, FILTER_NEAREST, MIPMAP_NONE),
      lutImg.makeShaderOptions(TILE_CLAMP, TILE_CLAMP, FILTER_NEAREST, MIPMAP_NONE),
    ],
  );
  const s = surface(Sk, w, h);
  const paint = Sk.Paint();
  paint.setShader(shader);
  s.getCanvas().drawRect(Sk.XYWHRect(0, 0, w, h), paint);
  return snapshot(s);
}

function pixels(img: SkImage): Uint8Array {
  const p = img.readPixels(0, 0, { width: img.width(), height: img.height(), colorType: COLOR_RGBA8888, alphaType: ALPHA_UNPREMUL });
  if (!p) throw new Error('readPixels');
  return p as Uint8Array;
}

/** 枠の色（四隅の中央値）と、下から見て「枠の色だけの行」が続く範囲（下の余白の上端）を返す（booth_frame.py と同じ） */
export function bottomMargin(img: SkImage): { frame: [number, number, number]; top: number } {
  const w = img.width();
  const h = img.height();
  const px = pixels(img);
  const k = Math.max(4, Math.floor(w / 60));
  const ch: number[][] = [[], [], []];
  for (const [x0, y0] of [[0, 0], [w - k, 0], [0, h - k], [w - k, h - k]]) {
    for (let y = y0; y < y0 + k; y++) for (let x = x0; x < x0 + k; x++) for (let c = 0; c < 3; c++) ch[c].push(px[(y * w + x) * 4 + c]);
  }
  const frame = ch.map((v) => v.sort((a, b) => a - b)[v.length >> 1]) as [number, number, number];
  const x0 = Math.floor(w * 0.1);
  const x1 = Math.floor(w * 0.9);
  const plain = (y: number) => {
    let ok = 0;
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4;
      if (Math.max(Math.abs(px[i] - frame[0]), Math.abs(px[i + 1] - frame[1]), Math.abs(px[i + 2] - frame[2])) < 40) ok++;
    }
    return ok / (x1 - x0) > 0.97;
  };
  let y = h - 1;
  while (y > 0 && plain(y)) y--;
  return { frame, top: y + 1 };
}

const lum = (c: number[]) => c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;

/** 2. セルフ写真館: 下の余白を枠の色で塗り（AI が描いた四角などを消す）、中央に「MARUMIE PHOTO」を置く */
export function boothLogo(Sk: S, img: SkImage, lockups: { ink: SkImage; paper: SkImage }, wordmarkShare: number): SkImage {
  const w = img.width();
  const h = img.height();
  const { frame, top } = bottomMargin(img);
  const margin = h - top;
  const s = surface(Sk, w, h);
  const cv = s.getCanvas();
  cv.drawImage(img, 0, 0);
  if (margin < h * 0.03) return snapshot(s); // 余白が見つからなければ何もしない
  const fill = Sk.Paint();
  fill.setColor(Sk.Color(`rgb(${frame[0]},${frame[1]},${frame[2]})`));
  cv.drawRect(Sk.XYWHRect(0, top, w, margin), fill);
  const lockup = lum(frame) < 140 ? lockups.paper : lockups.ink;
  // ワードマークの部分を横幅の28%に（余白が狭いときは余白の高さの45%に収める）
  let lw = (w * 0.28) / wordmarkShare;
  let lh = (lw * lockup.height()) / lockup.width();
  if (lh > margin * 0.45) {
    lh = margin * 0.45;
    lw = (lh * lockup.width()) / lockup.height();
  }
  cv.drawImageRectOptions(lockup, Sk.XYWHRect(0, 0, lockup.width(), lockup.height()), Sk.XYWHRect((w - lw) / 2, top + (margin - lh) / 2, lw, lh), FILTER_LINEAR, MIPMAP_NONE, null);
  return snapshot(s);
}

// ---- 3. 雑誌の表紙 ----

/** 人物の部位の分類（selfie_multiclass、256×256）。写真を cover で 256×256 に縮めたときの座標 */
export type ClassMap = { classMap: Uint8Array; size: number };

/** ClassMap の座標 → 写真の座標への変換（cover で縮めた逆） */
function mapper(cm: ClassMap, w: number, h: number) {
  const scale = Math.max(cm.size / w, cm.size / h);
  const dx = (cm.size - w * scale) / 2;
  const dy = (cm.size - h * scale) / 2;
  return { scale, dx, dy, x: (u: number) => (u + 0.5 - dx) / scale, y: (v: number) => (v + 0.5 - dy) / scale };
}

/** 人物の大きさと位置をそろえる切り出し範囲（cover.py の frame と同じ: 顔の高さ22%、頭の上8%、拡大は1.5倍まで、3:4） */
export function coverCrop(cm: ClassMap, w: number, h: number, out = { w: 1344, h: 1792 }) {
  const m = mapper(cm, w, h);
  let fy0 = Infinity, fy1 = -Infinity, fxSum = 0, fn = 0, hy0 = Infinity;
  for (let v = 0; v < cm.size; v++) {
    for (let u = 0; u < cm.size; u++) {
      const c = cm.classMap[v * cm.size + u];
      if (c === 3) {
        fy0 = Math.min(fy0, v); fy1 = Math.max(fy1, v); fxSum += u; fn++;
      }
      if (c === 1 || c === 3) hy0 = Math.min(hy0, v);
    }
  }
  const base = Math.min(w / out.w, h / out.h);
  let zoom = 1;
  let top: number | null = null;
  let cx = w / 2;
  let tooBig = false;
  if (fn > 0) {
    const faceH = (m.y(fy1) - m.y(fy0)) / (out.h * base);
    zoom = Math.min(Math.max(0.22 / faceH, 1), 1.5);
    tooBig = faceH > 0.22 * 1.2;
    top = m.y(hy0);
    cx = m.x(fxSum / fn);
  }
  const cw = (out.w * base) / zoom;
  const chh = (out.h * base) / zoom;
  const x0 = Math.min(Math.max(cx - cw / 2, 0), w - cw);
  const y0 = top === null ? 0 : Math.min(Math.max(top - 0.08 * chh, 0), h - chh);
  return { x: x0, y: y0, w: cw, h: chh, zoom, tooBig };
}

export function crop(Sk: S, img: SkImage, r: { x: number; y: number; w: number; h: number }, out = { w: 1344, h: 1792 }): SkImage {
  const s = surface(Sk, out.w, out.h);
  s.getCanvas().drawImageRectOptions(img, Sk.XYWHRect(r.x, r.y, r.w, r.h), Sk.XYWHRect(0, 0, out.w, out.h), FILTER_LINEAR, MIPMAP_NONE, null);
  return snapshot(s);
}

/** 題字の色: 上の帯（12%）の平均の明るさで、Ink（黒）か Paper（白）かを決める（cover.py と同じ考え方） */
export function coverVariant(img: SkImage): 'ink' | 'paper' {
  const w = img.width();
  const px = pixels(img);
  const rows = Math.floor(img.height() * 0.12);
  const sum = [0, 0, 0];
  for (let i = 0; i < w * rows; i += 7) for (let c = 0; c < 3; c++) sum[c] += px[i * 4 + c];
  const n = Math.ceil((w * rows) / 7);
  const top = sum.map((v) => v / n);
  const color = lum(top) > 140 ? top.map((c) => c * 0.55) : top.map((c) => c + (255 - c) * 0.7);
  return lum(color) < 128 ? 'ink' : 'paper';
}

/** 背景 → 題字 → 人物 の順に重ねる（人物の頭が題字の一部を隠す）。cm がなければ題字を上にのせるだけ */
export function coverCompose(Sk: S, img: SkImage, wordmark: SkImage, cm: ClassMap | null): SkImage {
  const w = img.width();
  const h = img.height();
  const s = surface(Sk, w, h);
  const cv = s.getCanvas();
  cv.drawImage(img, 0, 0);
  const ww = w * 0.94;
  const wh = (ww * wordmark.height()) / wordmark.width();
  cv.drawImageRectOptions(wordmark, Sk.XYWHRect(0, 0, wordmark.width(), wordmark.height()), Sk.XYWHRect((w - ww) / 2, h * 0.025, ww, wh), FILTER_LINEAR, MIPMAP_NONE, null);
  if (cm) {
    // 人物のマスク（256×256 のアルファ画像）を写真の大きさに広げ、人物だけをもう一度上に重ねる
    const n = cm.size * cm.size;
    const rgba = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) rgba[i * 4 + 3] = cm.classMap[i] > 0 ? 255 : 0;
    const mask = Sk.Image.MakeImage(
      { width: cm.size, height: cm.size, colorType: COLOR_RGBA8888, alphaType: ALPHA_UNPREMUL },
      Sk.Data.fromBytes(rgba),
      cm.size * 4,
    );
    if (mask) {
      const m = mapper(cm, w, h);
      cv.saveLayer();
      cv.drawImage(img, 0, 0);
      const p = Sk.Paint();
      p.setBlendMode(BLEND_DST_IN);
      p.setImageFilter(Sk.ImageFilter.MakeBlur(1.5, 1.5, TILE_CLAMP, null));
      cv.drawImageRectOptions(mask, Sk.XYWHRect(0, 0, cm.size, cm.size), Sk.XYWHRect(-m.dx / m.scale, -m.dy / m.scale, cm.size / m.scale, cm.size / m.scale), FILTER_LINEAR, MIPMAP_NONE, p);
      cv.restore();
    }
  }
  return snapshot(s);
}
