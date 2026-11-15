// 中継サーバー（server/）とのやりとり。APIキーと指示文はサーバーにあり、アプリには入れない
import Constants from 'expo-constants';
import { fetch } from 'expo/fetch';

import { uploadPart } from './files';
import type { Lang } from './i18n';
import { loadSession, saveSession, type Session } from './session';

export const API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? (Constants.expoConfig?.extra?.apiUrl as string) ?? 'http://localhost:8787';
export const CONSENT_VERSION = '2026-11';

export type Label = Record<Lang, string>;
export type Finish = { lut: string | null; strength: number; grain: number } | null;
export type Style = {
  id: string;
  kind: 'effect' | 'template';
  name: Label;
  desc: Label | null;
  sample: string;
  post: 'cover' | 'booth' | null;
  mirror: boolean;
  season: string | null;
  finish?: Finish;
  options?: Record<string, { label: Label; default: string; choices: Record<string, { label: Label; finish: Finish }> }>;
};
export type Balance = { freeLeft: number; credits: number };
export type Generation = Balance & { id: string; images: { variant: number; url: string; model: string }[] };

export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

let session: Session | null = null;

async function authHeader(): Promise<Record<string, string>> {
  session ??= await loadSession();
  if (!session) throw new ApiError(401, 'no_session');
  return { Authorization: `Bearer ${session.deviceId}.${session.token}` };
}

async function call<T>(path: string, init: { method?: string; body?: any; auth?: boolean; json?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = init.auth === false ? {} : await authHeader();
  if (init.json) headers['Content-Type'] = 'application/json';
  let r: Response;
  try {
    r = (await fetch(API_URL + path, { method: init.method ?? 'GET', headers, body: init.body })) as unknown as Response;
  } catch {
    throw new ApiError(0, 'network');
  }
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, data.error ?? 'error');
  return data as T;
}

export async function hasSession(): Promise<boolean> {
  session ??= await loadSession();
  return !!session;
}

/** 初回: 18歳以上の確認と同意のあとで端末を登録する（生年はサーバーに送らない） */
export async function register(): Promise<Balance> {
  const r = await call<Session & Balance>('/v1/devices', {
    method: 'POST',
    auth: false,
    json: true,
    body: JSON.stringify({ adult: true, consentVersion: CONSENT_VERSION }),
  });
  session = { deviceId: r.deviceId, token: r.token };
  await saveSession(session);
  return { freeLeft: r.freeLeft, credits: r.credits };
}

export const getBalance = () => call<Balance>('/v1/me');
export const getStyles = () => call<{ styles: Style[] }>('/v1/styles', { auth: false }).then((r) => r.styles);

export async function generate(jpegUri: string, style: string, options: Record<string, string>): Promise<Generation> {
  const form = new FormData();
  form.append('image', (await uploadPart(jpegUri)) as any, 'photo.jpg');
  form.append('style', style);
  for (const [k, v] of Object.entries(options)) form.append(`option.${k}`, v);
  return call<Generation>('/v1/generate', { method: 'POST', body: form });
}

/** 結果の画像を受け取る */
export async function downloadResult(url: string): Promise<Uint8Array> {
  const r = await fetch(API_URL + url, { headers: await authHeader() });
  if (!r.ok) throw new ApiError(r.status, 'download_failed');
  return r.bytes();
}

export const report = (generationId: string, variant: number, reason: string) =>
  call<{ ok: true }>('/v1/reports', { method: 'POST', json: true, body: JSON.stringify({ generationId, variant, reason }) });
