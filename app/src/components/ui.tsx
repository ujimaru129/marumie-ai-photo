// 共通の部品
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';

import { Glass } from '@/components/glass';
import { Icon, type IconName } from '@/components/icon';
import { C, f } from '@/constants/theme';

const tap = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/** 押すと少し沈む（ばねの動き） */
export function Press({ children, onPress, onPressIn, onPressOut, disabled, style, haptic }: {
  children: ReactNode; onPress?: () => void; onPressIn?: () => void; onPressOut?: () => void; disabled?: boolean; style?: ViewStyle | ViewStyle[]; haptic?: boolean;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable
      disabled={disabled}
      onPress={() => { if (haptic) tap(); onPress?.(); }}
      onPressIn={() => { to(0.96); onPressIn?.(); }}
      onPressOut={() => { to(1); onPressOut?.(); }}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** MARUMIE の正式なワードマーク（assets/brand の SVG から書き出した画像） */
export function Wordmark({ height = 19, paper = true }: { height?: number; paper?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
      <Image
        source={paper ? require('@/assets/brand/wordmark-paper.png') : require('@/assets/brand/wordmark-ink.png')}
        style={{ height, width: height * (900 / 157) }}
        contentFit="contain"
      />
      <Text style={[f(800), { fontFamily: 'Inter-800', fontSize: height * 0.52, letterSpacing: 1.4, color: C.sub, marginBottom: 1 }]}>AI PHOTO</Text>
    </View>
  );
}

/** Must のような2行の見出し（黒の見出し＋薄い副題、同じ大きさ） */
export function Title({ title, sub, style, light }: { title: string; sub?: string; style?: ViewStyle; light?: boolean }) {
  return (
    <View style={style}>
      <Text style={[f(800), s.title, light && { color: '#fff' }]}>{title}</Text>
      {sub ? <Text style={[f(800), s.title, { color: light ? 'rgba(255,255,255,0.55)' : C.faint }]}>{sub}</Text> : null}
    </View>
  );
}

/** ガラスのボタン。primary は濃いガラス、soft は明るいガラス */
export function Button({ title, sub, onPress, disabled, busy, kind = 'primary', icon, style }: {
  title: string; sub?: string; onPress: () => void; disabled?: boolean; busy?: boolean; kind?: 'primary' | 'soft'; icon?: IconName; style?: ViewStyle;
}) {
  const dark = kind === 'primary';
  const color = dark ? C.dark : C.ink;
  return (
    <Press onPress={onPress} disabled={disabled || busy} haptic style={[dark ? depth.button : depth.soft, disabled || busy ? { opacity: 0.35 } : {}, { borderRadius: 20 }, style ?? {}]}>
      <Glass tint={dark ? 'dark' : 'light'} radius={20} style={s.btn}>
        {busy ? (
          <ActivityIndicator color={color} />
        ) : (
          <View style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {icon && <Icon name={icon} size={17} color={color} />}
              <Text style={[f(700), { fontSize: 16, color }]}>{title}</Text>
            </View>
            {sub ? <Text style={[f(500), { fontSize: 11, color, opacity: 0.6, marginTop: 1 }]}>{sub}</Text> : null}
          </View>
        )}
      </Glass>
    </Press>
  );
}

export function Pill({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  return (
    <Press onPress={onPress} style={on ? depth.soft : {}}>
      <Glass tint={on ? 'dark' : 'light'} radius={18} style={s.pill}>
        <Text style={[f(700), { fontSize: 14, color: on ? C.dark : C.ink }]}>{label}</Text>
      </Glass>
    </Press>
  );
}

export function Check({ checked, label, onToggle, light }: { checked: boolean; label: string; onToggle: () => void; light?: boolean }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onToggle} style={s.check} hitSlop={6}>
      <View style={[s.box, checked && { backgroundColor: C.ink, borderColor: C.ink }]}>
        {checked && <Icon name="check" size={12} color={C.dark} />}
      </View>
      <Text style={[f(500), { flex: 1, fontSize: 13, color: light ? '#fff' : C.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function Caption({ children, style }: { children: string; style?: TextStyle }) {
  return <Text style={[f(700), { fontSize: 12, color: C.sub, letterSpacing: 0.2 }, style]}>{children}</Text>;
}

/** 丸いガラスのアイコンボタン */
export function RoundAction({ icon, label, onPress, dark, busy, size = 58, light }: { icon: IconName; label?: string; onPress: () => void; dark?: boolean; busy?: boolean; size?: number; light?: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 7 }}>
      <Press onPress={onPress} disabled={busy} haptic style={[depth.soft, { borderRadius: size / 2 }]}>
        <Glass tint={dark ? 'dark' : 'light'} radius={size / 2} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {busy ? <ActivityIndicator color={dark ? C.dark : C.ink} /> : <Icon name={icon} size={size * 0.36} color={dark ? C.dark : C.ink} />}
        </Glass>
      </Press>
      {label ? <Text style={[f(700), { fontSize: 12, color: light ? '#fff' : C.ink }]}>{label}</Text> : null}
    </View>
  );
}

/** 影を2層に重ねて、浮いて見せる（近くの濃い影＋遠くのやわらかい影） */
export function Lift({ children, radius, style }: { children: ReactNode; radius: number; style?: ViewStyle | ViewStyle[] }) {
  return (
    <View style={[depth.far, { borderRadius: radius }, style]}>
      <View style={[depth.near, { borderRadius: radius, flex: 1 }]}>
        <View style={{ borderRadius: radius, overflow: 'hidden', flex: 1, backgroundColor: '#2A2A2E' }}>{children}</View>
      </View>
    </View>
  );
}

export const depth = StyleSheet.create({
  near: { shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  far: { shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 28, shadowOffset: { width: 0, height: 18 }, elevation: 12 },
  button: { shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  soft: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
});

const s = StyleSheet.create({
  title: { fontSize: 32, lineHeight: 46, letterSpacing: -0.6, color: C.ink },
  btn: { minHeight: 58, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 8 },
  pill: { paddingHorizontal: 18, height: 38, alignItems: 'center', justifyContent: 'center' },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  box: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: C.faint, alignItems: 'center', justifyContent: 'center' },
});
