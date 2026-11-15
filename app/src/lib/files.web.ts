// Web 版（開発時の画面確認用）: ファイルの代わりに Blob と object URL を使う
export async function uploadPart(uri: string): Promise<Blob> {
  return (await fetch(uri)).blob();
}

export async function storeResult(bytes: Uint8Array, _name: string): Promise<string> {
  return URL.createObjectURL(new Blob([bytes as BlobPart]));
}

export async function removeFile(_uri: string): Promise<void> {}

// Web 版: ページを開いている間だけ覚えておく
export type GalleryItem = { uri: string; style: string; time: number };
const items: GalleryItem[] = [];

export async function addToGallery(uri: string, style: string): Promise<string> {
  items.unshift({ uri, style, time: Date.now() });
  return uri;
}

export async function listGallery(): Promise<GalleryItem[]> {
  return [...items];
}
