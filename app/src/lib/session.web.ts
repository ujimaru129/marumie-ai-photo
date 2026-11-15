// Web 版（開発時の画面確認用）。SecureStore は Web にないので localStorage を使う
const KEY = 'marumie.session.v1';
const UNDERAGE_KEY = 'marumie.underage.v1';

export type Session = { deviceId: string; token: string };

export async function loadSession(): Promise<Session | null> {
  const v = localStorage.getItem(KEY);
  return v ? (JSON.parse(v) as Session) : null;
}

export async function saveSession(s: Session): Promise<void> {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export async function isUnderage(): Promise<boolean> {
  return localStorage.getItem(UNDERAGE_KEY) === '1';
}

export async function markUnderage(): Promise<void> {
  localStorage.setItem(UNDERAGE_KEY, '1');
}
