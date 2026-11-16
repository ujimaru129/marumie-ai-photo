import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { C, FONTS } from '@/constants/theme';
import { loadSkia } from '@/lib/skiaReady';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts(FONTS);
  const [skia, setSkia] = useState(false);
  useEffect(() => {
    loadSkia().then(() => setSkia(true));
  }, []);
  if (!loaded || !skia) return null;
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding/age" />
        <Stack.Screen name="onboarding/consent" />
        <Stack.Screen name="style/[id]" />
        <Stack.Screen name="generating" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="result" options={{ gestureEnabled: false, animation: 'fade' }} />
      </Stack>
    </>
  );
}
