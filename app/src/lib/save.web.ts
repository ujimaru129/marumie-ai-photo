// Web 版（開発時の画面確認用）: 写真ライブラリがないのでダウンロードにする
export async function saveToPhotos(uri: string): Promise<boolean> {
  const a = document.createElement('a');
  a.href = uri;
  a.download = 'marumie.jpg';
  a.click();
  return true;
}
