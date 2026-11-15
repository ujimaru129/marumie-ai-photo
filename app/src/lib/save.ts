// 写真ライブラリに保存する（保存だけなので書き込みの許可だけを求める）
import { Asset, requestPermissionsAsync } from 'expo-media-library';

export async function saveToPhotos(uri: string): Promise<boolean> {
  const { status } = await requestPermissionsAsync(true, ['photo']);
  if (status !== 'granted') return false;
  await Asset.create(uri);
  return true;
}
