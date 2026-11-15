// 画面をまたいで使う一時的な状態（スタイル一覧・残り回数・選んだ写真・生成結果）
import { useSyncExternalStore } from 'react';

import type { Balance, Style } from './api';

export type Picked = { uri: string; width: number; height: number };
export type Result = { id: string; style: Style; original: string; images: { variant: number; uri: string }[] };

type State = { styles: Style[]; balance: Balance | null; picked: Picked | null; result: Result | null };

let state: State = { styles: [], balance: null, picked: null, result: null };
const listeners = new Set<() => void>();

export function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getState() {
  return state;
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => select(state),
  );
}
