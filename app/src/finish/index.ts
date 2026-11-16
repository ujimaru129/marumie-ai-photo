// 仕上げの入口。Skia を使う中身（pipeline.ts）は使うときに読み込む
// （Web 版では Skia の読み込みが終わる前にモジュールを読むと動かないため。ネイティブでも起動が軽くなる）
import type { Style } from '@/lib/api';

export { finishOf } from './settings';

export async function finishPhoto(uri: string, style: Style, options: Record<string, string>, name: string): Promise<string> {
  const { finishPhoto: run } = await import('./pipeline');
  return run(uri, style, options, name);
}
