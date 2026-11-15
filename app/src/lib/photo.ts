// 写真の下ごしらえ（端末内）
import { FlipType, ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** 送る写真: 長辺1024pxの JPEG（位置情報などの EXIF は付かない）。mirror のスタイルは左右反転して送る */
export async function prepareUpload(uri: string, width: number, height: number, mirror: boolean): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  const long = Math.max(width, height);
  if (long > 1024) ctx.resize(width >= height ? { width: 1024, height: null } : { width: null, height: 1024 });
  if (mirror) ctx.flip(FlipType.Horizontal);
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
  return out.uri;
}

/** 結果の画像（webp など）を、保存・共有しやすい JPEG にする。mirror のスタイルはここで反転を戻す */
export async function toJpeg(uri: string, mirror: boolean): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  if (mirror) ctx.flip(FlipType.Horizontal);
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.95 });
  return out.uri;
}
