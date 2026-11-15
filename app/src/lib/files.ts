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

// ギャラリー: 作った写真を端末の中だけに残す（サーバーには残らない）
export type GalleryItem = { uri: string; style: string; time: number };

function galleryDir() {
  const dir = new Directory(Paths.document, 'gallery');
  if (!dir.exists) dir.create();
  return dir;
}

export async function addToGallery(uri: string, style: string): Promise<string> {
  const dest = new File(galleryDir(), `${Date.now()}__${style}.jpg`);
  new File(uri).copy(dest);
  return dest.uri;
}

export async function listGallery(): Promise<GalleryItem[]> {
  return galleryDir()
    .list()
    .filter((x): x is File => x instanceof File && x.name.endsWith('.jpg'))
    .map((x) => {
      const [time, style] = x.name.replace('.jpg', '').split('__');
      return { uri: x.uri, style, time: Number(time) };
    })
    .sort((a, b) => b.time - a.time);
}
