// スタイル一覧（起動時の画面）。初回は年齢の確認へ
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Caption, Pill, shadow, Title, Wordmark } from '@/components/ui';
import { C, f, fl } from '@/constants/theme';
import { API_URL, getBalance, getStyles, hasSession, type Style } from '@/lib/api';
import { lang, t } from '@/lib/i18n';
import { setState, useStore } from '@/lib/store';

// 「いま人気」に大きく出すスタイル（運用で入れ替える想定）
const FEATURED = ['korean_booth', 'magazine_cover', 'digicam_flash'];

export default function Styles() {
  const styles = useStore((s) => s.styles);
  const balance = useStore((s) => s.balance);
  const [kind, setKind] = useState<'template' | 'effect'>('template');
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const { width } = useWindowDimensions();

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

  if (!ready) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const featured = FEATURED.map((id) => styles.find((x) => x.id === id)).filter((x): x is Style => !!x);
  const list = styles.filter((s) => s.kind === kind);
  const cardW = (width - 24 * 2 - 14) / 2;

  return (
    <SafeAreaView style={s.wrap} edges={['top']}>
      <View style={s.bar}>
        <Wordmark />
        {balance && (
          <View style={s.balance}>
            <Text style={[f(700), { fontSize: 12, color: C.ink }]}>{balance.freeLeft > 0 ? t.freeLeft(balance.freeLeft) : t.credits(balance.credits)}</Text>
          </View>
        )}
      </View>

      {error ? (
        <View style={s.center}>
          <Text style={[f(700), { fontSize: 15, color: C.ink, textAlign: 'center' }]}>{t.errNetwork}</Text>
          <Button title={t.again} kind="soft" onPress={load} style={{ alignSelf: 'stretch' }} />
        </View>
      ) : styles.length === 0 ? (
        <View style={s.center}><ActivityIndicator color={C.ink} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          <Title title={t.stylesTitle2} sub={t.stylesSub} style={{ paddingHorizontal: 24, marginTop: 18 }} />

          <Caption style={{ marginHorizontal: 24, marginTop: 26, marginBottom: 12 }}>{t.featured}</Caption>
          <FlatList
            horizontal
            data={featured}
            keyExtractor={(x) => x.id}
            showsHorizontalScrollIndicator={false}
            snapToInterval={width * 0.72 + 14}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 24, gap: 14, paddingBottom: 24 }}
            renderItem={({ item }) => <Hero style={item} w={width * 0.72} />}
          />

          <View style={s.tabs}>
            <Pill label={t.templates} on={kind === 'template'} onPress={() => setKind('template')} />
            <Pill label={t.effects} on={kind === 'effect'} onPress={() => setKind('effect')} />
          </View>
          <View style={s.grid}>
            {list.map((item) => <Card key={item.id} style={item} w={cardW} />)}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const open = (id: string) => router.push({ pathname: '/style/[id]', params: { id } });

function Hero({ style, w }: { style: Style; w: number }) {
  return (
    <Pressable onPress={() => open(style.id)} style={({ pressed }) => [{ width: w }, pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={[shadow, { borderRadius: 22 }]}>
        <View style={s.heroImg}>
          <Image source={{ uri: API_URL + style.sample }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        </View>
      </View>
      <Text style={[fl(800), { fontSize: 20, color: C.ink, marginTop: 14, letterSpacing: -0.3 }]}>{style.name.en}</Text>
      <Text style={[f(500), { fontSize: 13, color: C.sub, marginTop: 2 }]} numberOfLines={1}>{style.desc?.[lang] ?? style.name[lang]}</Text>
    </Pressable>
  );
}

function Card({ style, w }: { style: Style; w: number }) {
  return (
    <Pressable onPress={() => open(style.id)} style={({ pressed }) => [{ width: w, marginBottom: 22 }, pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={[shadow, { borderRadius: 16, shadowOpacity: 0.1, shadowRadius: 12 }]}>
        <View style={s.cardImg}>
          <Image source={{ uri: API_URL + style.sample }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        </View>
      </View>
      <Text style={[fl(800), { fontSize: 15, color: C.ink, marginTop: 10, letterSpacing: -0.2 }]} numberOfLines={1}>{style.name.en}</Text>
      {lang === 'ja' && <Text style={[f(500), { fontSize: 12, color: C.sub, marginTop: 1 }]} numberOfLines={1}>{style.name.ja}</Text>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, height: 48 },
  balance: { backgroundColor: C.fill, borderRadius: 14, paddingHorizontal: 12, height: 28, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  heroImg: { aspectRatio: 4 / 5, borderRadius: 22, backgroundColor: C.fill, overflow: 'hidden' },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginTop: 8, marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 24 },
  cardImg: { aspectRatio: 3 / 4, borderRadius: 16, backgroundColor: C.fill, overflow: 'hidden' },
});
