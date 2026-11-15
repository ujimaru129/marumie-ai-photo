// アイコン（iOS は SF Symbols、Android と Web は Material Symbols）
import { SymbolView } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';

const NAMES = {
  back: { ios: 'chevron.left', android: 'arrow_back_ios_new', web: 'arrow_back_ios_new' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  save: { ios: 'arrow.down.to.line', android: 'download', web: 'download' },
  share: { ios: 'square.and.arrow.up', android: 'ios_share', web: 'ios_share' },
  again: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  ai: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  edit: { ios: 'slider.horizontal.3', android: 'tune', web: 'tune' },
  gallery: { ios: 'square.grid.2x2', android: 'grid_view', web: 'grid_view' },
  photo: { ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' },
  camera: { ios: 'camera', android: 'photo_camera', web: 'photo_camera' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  flag: { ios: 'flag', android: 'flag', web: 'flag' },
  arrow: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
} as const;

export type IconName = keyof typeof NAMES;

export function Icon({ name, size = 20, color = '#0F0F10' }: { name: IconName; size?: number; color?: string }) {
  return <SymbolView name={NAMES[name] as any} size={size} tintColor={color} weight={{ ios: 'semibold', android: medium }} />;
}
