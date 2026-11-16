// Web 版（開発時の画面確認用）: Skia（CanvasKit の wasm）を読み込んでから画面を出す。wasm は public/ に置く（npx setup-skia-web public）
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

export async function loadSkia(): Promise<void> {
  await LoadSkiaWeb({ locateFile: (file: string) => `/${file}` });
}
