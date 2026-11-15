// 端末のファイルの読み書き（ネイティブ）
import { Directory, File, Paths } from 'expo-file-system';

/** 送る写真（FormData に入れる形） */
export async function uploadPart(uri: string): Promise<Blob> {
  return new File(uri) as unknown as Blob;
}

/** 生成結果を端末に保存し、その場所を返す（サーバーの画像は24時間で消えるため） */
export async function storeResult(bytes: Uint8Array, name: string): Promise<string> {
  const dir = new Directory(Paths.document, 'results');
  if (!dir.exists) dir.create();
  const f = new File(dir, name);
  f.write(bytes);
  return f.uri;
}

export async function removeFile(uri: string): Promise<void> {
  const f = new File(uri);
  if (f.exists) f.delete();
}
