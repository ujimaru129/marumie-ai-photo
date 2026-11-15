// スタイル一覧（起動時の画面）。初回は年齢の確認へ
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Wordmark } from '@/components/ui';
import { C } from '@/constants/theme';
import { getBalance, getStyles, hasSession, type Style } from '@/lib/api';
import { lang, t } from '@/lib/i18n';
import { setState, useStore } from '@/lib/store';

// 見本の画像ができるまでの仮の色（スタイルの雰囲気に合わせる）
const SWATCH: Record<string, string> = {
  digicam_flash: '#2B2A33', golden_hour: '#C98A4B', day_flash: '#D9D2C3', neon_night: '#3B2147', korean_studio: '#EDE6DA',
  cafe_window: '#B9A38A', photobooth: '#E8E2D6', magazine_cover: '#C9C2B6', tokyo_crossing: '#59606B', strobe_black: '#141414',
  rooftop_night: '#2C3A55', beach_day: '#9CC3CF', sakura: '#E9C8CF', korean_booth: '#7D1A1A',
};

export default function Styles() {
  const styles = useStore((s) => s.styles);
  const balance = useStore((s) => s.balance);
  const [kind, setKind] = useState<'effect' | 'template'>('template');
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);

  const load = async () => {
    setError(false);
    try {
      const [st, b] = await Promise.all([getStyles(), getBalance()]);
      setState({ styles: st, balance: b });
    } catch {
      setError(true);
    }
  };

  useEffect(() => {
    (async () => {
      const ok = await hasSession();
      await SplashScreen.hideAsync();
      if (!ok) return router.replace('/onboarding/age');
      setReady(true);
      load();
    })();
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: C.paper }} />;

  const list = styles.filter((s) => s.kind === kind);
  return (
    <SafeAreaView style={s.wrap} edges={['top']}>
      <View style={s.header}>
        <Wordmark />
        {balance && (
          <Text style={s.balance}>{balance.freeLeft > 0 ? t.freeLeft(balance.freeLeft) : t.credits(balance.credits)}</Text>
        )}
      </View>
      <View style={s.tabs}>
        {(['template', 'effect'] as const).map((k) => (
          <Pressable key={k} onPress={() => setKind(k)} style={[s.tab, kind === k && s.tabOn]}>
            <Text style={[s.tabText, kind === k && { color: C.paper }]}>{k === 'effect' ? t.effects : t.templates}</Text>
          </Pressable>
        ))}
      </View>
      {error ? (
        <View style={s.center}>
          <Text style={s.err}>{t.errNetwork}</Text>
          <Button title={t.again} kind="ghost" onPress={load} />
        </View>
      ) : styles.length === 0 ? (
        <View style={s.center}><ActivityIndicator color={C.ink} /></View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(x) => x.id}
          numColumns={2}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          renderItem={({ item }) => <Card style={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function Card({ style }: { style: Style }) {
  return (
    <Pressable onPress={() => router.push({ pathname: '/style/[id]', params: { id: style.id } })} style={({ pressed }) => [s.card, pressed && { opacity: 0.8 }]}>
      <View style={[s.swatch, { backgroundColor: SWATCH[style.id] ?? C.line }]} />
      <Text style={s.name} numberOfLines={1}>{style.name[lang]}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.paper },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  balance: { fontSize: 12, color: C.ink, borderWidth: 1, borderColor: C.ink, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 16 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: C.ink },
  tabOn: { backgroundColor: C.ink },
  tabText: { fontSize: 14, color: C.ink, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  err: { fontSize: 14, color: C.ink, textAlign: 'center' },
  card: { flex: 1, margin: 6 },
  swatch: { aspectRatio: 3 / 4, borderRadius: 14 },
  name: { fontSize: 14, color: C.ink, marginTop: 6, fontWeight: '600' },
});
