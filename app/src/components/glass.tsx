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
        tintColor={tint === 'dark' ? 'rgba(255,255,255,0.85)' : undefined}
        isInteractive
        style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
        {children}
      </GlassView>
    );
  }
  // tint 'dark' は「目立たせるガラス」（明るい白いガラス）、'light' は暗い地の上のすりガラス
  const bright = tint === 'dark';
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      <BlurView intensity={strong ? 60 : 40} tint={bright ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
      {/* ガラスの厚み: 色の薄い膜＋上から下への光 */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: bright ? 'rgba(255,255,255,0.9)' : strong ? 'rgba(30,30,34,0.62)' : 'rgba(40,40,46,0.42)' }]} />
      <LinearGradient
        colors={bright ? ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.3)'] : ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: bright ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.2)' }]} />
      {children}
    </View>
  );
}
