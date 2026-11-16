// 画面の色と文字（参考: Must の、白地に太い見出し・写真が主役・薄いグレーのボタン）
import { lang } from '@/lib/i18n';

// 暗いグレーの地に白い文字（写真の色をにじませた背景でも文字が読めるように）
export const C = {
  bg: '#1B1B1E',
  ink: '#FFFFFF', // 文字
  sub: 'rgba(255,255,255,0.62)',
  faint: 'rgba(255,255,255,0.5)',
  fill: 'rgba(255,255,255,0.09)',
  line: 'rgba(255,255,255,0.14)',
  dark: '#111113', // 明るいガラスの上の文字
  red: '#E05252', // MARUMIE の赤い丸
} as const;

type W = 500 | 600 | 700 | 800;

const JA: Record<W, string> = { 500: 'NotoSansJP-500', 600: 'NotoSansJP-700', 700: 'NotoSansJP-700', 800: 'NotoSansJP-800' };
const EN: Record<W, string> = { 500: 'Inter-500', 600: 'Inter-600', 700: 'Inter-700', 800: 'Inter-800' };

/** 画面の言語に合わせた書体（日本語は Noto Sans JP、英語は Inter） */
export const f = (w: W) => ({ fontFamily: (lang === 'ja' ? JA : EN)[w] });
/** 英数字だけの文字（英語のスタイル名・数字など） */
export const fl = (w: W) => ({ fontFamily: EN[w] });

export const FONTS = {
  'Inter-500': require('@/assets/fonts/Inter-500Medium.ttf'),
  'Inter-600': require('@/assets/fonts/Inter-600SemiBold.ttf'),
  'Inter-700': require('@/assets/fonts/Inter-700Bold.ttf'),
  'Inter-800': require('@/assets/fonts/Inter-800ExtraBold.ttf'),
  'NotoSansJP-500': require('@/assets/fonts/NotoSansJP-500Medium.ttf'),
  'NotoSansJP-700': require('@/assets/fonts/NotoSansJP-700Bold.ttf'),
  'NotoSansJP-800': require('@/assets/fonts/NotoSansJP-800ExtraBold.ttf'),
};
