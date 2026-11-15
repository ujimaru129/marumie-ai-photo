// 匿名の端末ID＋トークンを端末の安全な保管場所に置く（アカウントなし）
import * as SecureStore from 'expo-secure-store';

const KEY = 'marumie.session.v1';
const UNDERAGE_KEY = 'marumie.underage.v1';

export type Session = { deviceId: string; token: string };

export async function loadSession(): Promise<Session | null> {
  const v = await SecureStore.getItemAsync(KEY);
  return v ? (JSON.parse(v) as Session) : null;
}

export async function saveSession(s: Session): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(s), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

/** 18歳未満と答えた端末の印（もう一度答え直せないようにする） */
export async function isUnderage(): Promise<boolean> {
  return (await SecureStore.getItemAsync(UNDERAGE_KEY)) === '1';
}

export async function markUnderage(): Promise<void> {
  await SecureStore.setItemAsync(UNDERAGE_KEY, '1');
}
