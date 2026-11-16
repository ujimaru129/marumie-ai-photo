import type { Finish, Style } from '@/lib/api';

/** スタイル（と選んだオプション）の仕上げの設定 */
export function finishOf(style: Style, options: Record<string, string>): Finish {
  if (!style.options) return style.finish ?? null;
  const [key, opt] = Object.entries(style.options)[0];
  return opt.choices[options[key] ?? opt.default]?.finish ?? null;
}
