// ガラスの部品。iOS 26 以降は本物の Liquid Glass（expo-glass-effect）、それ以外はすりガラス（expo-blur）＋光の縁で近づける
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

const LIQUID = isLiquidGlassAvailable();

export function Glass({ children, tint = 'light', radius = 22, style, strong }: {
  children?: ReactNode; tint?: 'light' | 'dark'; radius?: number; style?: ViewStyle | ViewStyle[]; strong?: boolean;
}) {
  if (LIQUID) {
    return (
      <GlassView
        glassEffectStyle="regular"
        tintColor={tint === 'dark' ? 'rgba(15,15,16,0.55)' : undefined}
        isInteractive
        style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
        {children}
      </GlassView>
    );
  }
  const dark = tint === 'dark';
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      <BlurView intensity={strong ? 60 : 40} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      {/* ガラスの厚み: 色の薄い膜＋上から下への光 */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? 'rgba(14,14,16,0.84)' : 'rgba(255,255,255,0.55)' }]} />
      <LinearGradient
        colors={dark ? ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.02)'] : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.15)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.9)' }]} />
      {children}
    </View>
  );
}
