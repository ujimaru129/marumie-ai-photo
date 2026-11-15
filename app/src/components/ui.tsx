// 共通の見た目（MARUMIE のブランドの色）
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { C } from '@/constants/theme';

export function Wordmark({ size = 22 }: { size?: number }) {
  // 正式なワードマークは SVG（assets/brand）。試作では文字で代わりにする
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      <Text style={{ fontSize: size, letterSpacing: size * 0.08, color: C.ink, fontWeight: '300' }}>MARUMIE</Text>
      <View style={{ width: size * 0.22, height: size * 0.22, borderRadius: size, backgroundColor: C.red, marginLeft: 2 }} />
      <Text style={{ fontSize: size * 0.45, letterSpacing: size * 0.12, color: C.sub, fontWeight: '700', marginLeft: 8, alignSelf: 'flex-end', marginBottom: size * 0.12 }}>
        AI PHOTO
      </Text>
    </View>
  );
}

export function Button({ title, onPress, disabled, busy, kind = 'primary', style }: {
  title: string; onPress: () => void; disabled?: boolean; busy?: boolean; kind?: 'primary' | 'ghost'; style?: ViewStyle;
}) {
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [s.btn, primary ? s.primary : s.ghost, (disabled || busy) && { opacity: 0.4 }, pressed && { opacity: 0.7 }, style]}>
      {busy ? <ActivityIndicator color={primary ? C.paper : C.ink} /> : <Text style={[s.btnText, { color: primary ? C.paper : C.ink }]}>{title}</Text>}
    </Pressable>
  );
}

export function Check({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onToggle} style={s.check}>
      <View style={[s.box, checked && { backgroundColor: C.ink }]}>{checked && <Text style={{ color: C.paper, fontSize: 14 }}>✓</Text>}</View>
      <Text style={s.checkText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  primary: { backgroundColor: C.ink },
  ghost: { borderWidth: 1, borderColor: C.ink },
  btnText: { fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  box: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  checkText: { flex: 1, fontSize: 14, color: C.ink },
});
