// 共通の部品
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';

import { C, f, fl } from '@/constants/theme';

/** MARUMIE のワードマーク（正式な SVG は assets/brand。試作では文字で） */
export function Wordmark() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={[fl(800), { fontSize: 15, letterSpacing: 3.2, color: C.ink }]}>MARUMIE</Text>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.red, marginLeft: 2, marginTop: -8 }} />
      <Text style={[fl(700), { fontSize: 9, letterSpacing: 1.6, color: C.sub, marginLeft: 7 }]}>AI PHOTO</Text>
    </View>
  );
}

/** Must のような2行の見出し（黒の見出し＋グレーの副題、同じ大きさ） */
export function Title({ title, sub, style }: { title: string; sub?: string; style?: ViewStyle }) {
  return (
    <View style={style}>
      <Text style={[f(800), s.title]}>{title}</Text>
      {sub ? <Text style={[f(800), s.title, { color: C.faint }]}>{sub}</Text> : null}
    </View>
  );
}

export function Button({ title, sub, onPress, disabled, busy, kind = 'primary', style }: {
  title: string; sub?: string; onPress: () => void; disabled?: boolean; busy?: boolean; kind?: 'primary' | 'soft'; style?: ViewStyle;
}) {
  const primary = kind === 'primary';
  const color = primary ? '#fff' : C.ink;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [s.btn, { backgroundColor: primary ? C.ink : C.fill }, (disabled || busy) && { opacity: 0.35 }, pressed && { transform: [{ scale: 0.98 }] }, style]}>
      {busy ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          <Text style={[f(700), { fontSize: 16, color }]}>{title}</Text>
          {sub ? <Text style={[f(500), { fontSize: 11, color, opacity: 0.6, marginTop: 1 }]}>{sub}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

export function Pill({ label, on, onPress, style }: { label: string; on?: boolean; onPress: () => void; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} style={[s.pill, { backgroundColor: on ? C.ink : C.fill }, style]}>
      <Text style={[f(700), { fontSize: 14, color: on ? '#fff' : C.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function Check({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onToggle} style={s.check} hitSlop={6}>
      <View style={[s.box, checked && { backgroundColor: C.ink, borderColor: C.ink }]}>
        {checked && <Text style={[fl(800), { color: '#fff', fontSize: 12 }]}>✓</Text>}
      </View>
      <Text style={[f(500), { flex: 1, fontSize: 13, color: C.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function Caption({ children, style }: { children: string; style?: TextStyle }) {
  return <Text style={[f(700), { fontSize: 12, color: C.sub, letterSpacing: 0.2 }, style]}>{children}</Text>;
}

/** 丸いアイコンのボタン（結果の画面） */
export function RoundAction({ icon, label, onPress, dark, busy }: { icon: string; label: string; onPress: () => void; dark?: boolean; busy?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={busy} style={({ pressed }) => [{ alignItems: 'center', gap: 6, width: 72 }, pressed && { opacity: 0.6 }]}>
      <View style={[s.round, { backgroundColor: dark ? C.ink : C.fill }]}>
        {busy ? <ActivityIndicator color={dark ? '#fff' : C.ink} /> : <Text style={[fl(700), { fontSize: 20, color: dark ? '#fff' : C.ink }]}>{icon}</Text>}
      </View>
      <Text style={[f(700), { fontSize: 12, color: C.ink }]}>{label}</Text>
    </Pressable>
  );
}

export const shadow: ViewStyle = { shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 };

const s = StyleSheet.create({
  title: { fontSize: 32, lineHeight: 38, letterSpacing: -0.6, color: C.ink },
  btn: { minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 8 },
  pill: { paddingHorizontal: 18, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  box: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: C.faint, alignItems: 'center', justifyContent: 'center' },
  round: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
