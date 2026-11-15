// 写真の色を画面全体ににじませた背景（ガラスの下に色があると立体的に見える）
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

export function Ambient({ uri, veil = 0.55, dark }: { uri?: string | null; veil?: number; dark?: boolean }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={dark ? ['#17161A', '#0B0B0C'] : ['#FFFFFF', '#F0EFF3']} style={StyleSheet.absoluteFill} />
      {uri ? <Image source={{ uri }} style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.3 }] }]} contentFit="cover" blurRadius={60} /> : null}
      <LinearGradient
        colors={dark ? [`rgba(10,10,12,${veil - 0.15})`, `rgba(10,10,12,${veil + 0.25})`] : [`rgba(255,255,255,${veil - 0.1})`, `rgba(255,255,255,${veil + 0.3})`]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
