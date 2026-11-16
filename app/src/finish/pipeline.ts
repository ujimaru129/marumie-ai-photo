// 生成した写真に MARUMIE の仕上げをかけて、JPEG のファイルにする（端末内）
import { Skia, type SkImage } from '@shopify/react-native-skia';
import { Asset } from 'expo-asset';

import type { Style } from '@/lib/api';
import { storeResult } from '@/lib/files';

import { applyLook, boothLogo, coverCompose, coverCrop, coverVariant, crop, FORMAT_JPEG } from './core';
import { finishOf } from './settings';
import { segment } from './segment';

const ASSETS = {
  day: require('@/assets/luts/MARUMIE_Day.png'),
  night: require('@/assets/luts/MARUMIE_Night.png'),
  lockupInk: require('@/assets/brand/booth-lockup-ink.png'),
  lockupPaper: require('@/assets/brand/booth-lockup-paper.png'),
  wordmarkInk: require('@/assets/brand/wordmark-ink.png'),
  wordmarkPaper: require('@/assets/brand/wordmark-paper.png'),
};
const LOCKUP_WORDMARK_SHARE = 1200 / 1722; // ロゴ画像の中でワードマークが占める横幅の割合

const cache = new Map<number, Promise<SkImage>>();

async function loadUri(uri: string): Promise<SkImage> {
  const data = await Skia.Data.fromURI(uri);
  const img = Skia.Image.MakeImageFromEncoded(data);
  if (!img) throw new Error('decode');
  return img;
}

function asset(mod: number): Promise<SkImage> {
  if (!cache.has(mod)) {
    cache.set(
      mod,
      (async () => {
        const a = Asset.fromModule(mod);
        await a.downloadAsync();
        return loadUri(a.localUri ?? a.uri);
      })(),
    );
  }
  return cache.get(mod)!;
}

/** 仕上げをかけて保存し、そのファイルの場所を返す */
export async function finishPhoto(uri: string, style: Style, options: Record<string, string>, name: string): Promise<string> {
  let img = await loadUri(uri);
  const f = finishOf(style, options);
  const lut = f?.lut ? await asset(/Night/i.test(f.lut) ? ASSETS.night : ASSETS.day) : null;
  img = applyLook(Skia, img, { lut, strength: f?.strength ?? 0, grain: f?.grain ?? 0 }, style.mirror);

  if (style.post === 'booth') {
    img = boothLogo(Skia, img, { ink: await asset(ASSETS.lockupInk), paper: await asset(ASSETS.lockupPaper) }, LOCKUP_WORDMARK_SHARE);
  } else if (style.post === 'cover') {
    // 人物の大きさをそろえて切り出し、切り出した写真でもう一度人物を見つけて、題字を後ろに置く
    const cm = await segment(img).catch(() => null);
    if (cm) img = crop(Skia, img, coverCrop(cm, img.width(), img.height()));
    const cm2 = cm ? await segment(img).catch(() => null) : null;
    const v = coverVariant(img);
    img = coverCompose(Skia, img, await asset(v === 'ink' ? ASSETS.wordmarkInk : ASSETS.wordmarkPaper), cm2);
  }
  return storeResult(img.encodeToBytes(FORMAT_JPEG, 95), `${name}.jpg`);
}
