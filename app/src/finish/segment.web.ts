// Web 版（開発時の画面確認用）: 人物の切り抜きはしない（題字は人物の上にのせる）
import type { SkImage } from '@shopify/react-native-skia';

import type { ClassMap } from './core';

export async function segment(_img: SkImage): Promise<ClassMap | null> {
  return null;
}
