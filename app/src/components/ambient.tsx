// 写真の色を画面全体ににじませた背景（ガラスの下に色があると立体的に見える）
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

// veil: 写真の上にかける暗いグレーの濃さ（0〜1）。白い文字が読める濃さにする
export function Ambient({ uri, veil = 0.55 }: { uri?: string | null; veil?: number; dark?: boolean }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={['#2A2A2F', '#141416']} style={StyleSheet.absoluteFill} />
      {uri ? <Image source={{ uri }} style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.3 }] }]} contentFit="cover" blurRadius={60} /> : null}
      <LinearGradient colors={[`rgba(22,22,25,${Math.min(veil, 0.9)})`, `rgba(14,14,16,${Math.min(veil + 0.25, 0.95)})`]} style={StyleSheet.absoluteFill} />
    </View>
  );
}
