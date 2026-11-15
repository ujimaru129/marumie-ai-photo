// スタイル一覧（起動時の画面）。初回は年齢の確認へ
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ambient } from '@/components/ambient';
import { Glass } from '@/components/glass';
import { Button, Caption, Lift, Pill, Press, Title, Wordmark } from '@/components/ui';
import { C, f, fl } from '@/constants/theme';
import { API_URL, getBalance, getStyles, hasSession, type Style } from '@/lib/api';
import { lang, t } from '@/lib/i18n';
import { setState, useStore } from '@/lib/store';

// 「いま人気」に大きく出すスタイル（運用で入れ替える想定）
const FEATURED = ['korean_booth', 'magazine_cover', 'digicam_flash', 'sakura'];
const GAP = 16;

export default function Styles() {
  const styles = useStore((s) => s.styles);
  const balance = useStore((s) => s.balance);
  const [kind, setKind] = useState<'template' | 'effect'>('template');
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [scrollX] = useState(() => new Animated.Value(0));
  const [active, setActive] = useState(0);
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
  const heroW = width * 0.7;
  const side = (width - heroW) / 2;
  const cardW = (width - 24 * 2 - 14) / 2;

  return (
    <View style={{ flex: 1 }}>
      {/* いま選んでいる見本の色を、画面全体にうっすらにじませる */}
      <Ambient uri={featured[active] ? API_URL + featured[active].sample : null} veil={0.62} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.bar}>
          <Wordmark />
          {balance && (
            <Glass radius={15} style={s.balance}>
              <Text style={[f(700), { fontSize: 12, color: C.ink }]}>{balance.freeLeft > 0 ? t.freeLeft(balance.freeLeft) : t.credits(balance.credits)}</Text>
            </Glass>
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
          <Animated.ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
            <Title title={t.stylesTitle2} sub={t.stylesSub} style={{ paddingHorizontal: 24, marginTop: 14 }} />

            <Caption style={{ marginHorizontal: 24, marginTop: 24 }}>{t.featured}</Caption>
            <Animated.FlatList
              horizontal
              data={featured}
              keyExtractor={(x) => x.id}
              showsHorizontalScrollIndicator={false}
              snapToInterval={heroW + GAP}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: side - GAP / 2, paddingTop: 18, paddingBottom: 30 }}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
              onMomentumScrollEnd={(e) => setActive(Math.round(e.nativeEvent.contentOffset.x / (heroW + GAP)))}
              scrollEventThrottle={16}
              renderItem={({ item, index }) => {
                // 真ん中のカードは大きく正面に、左右のカードは少し小さく奥へ傾ける
                const range = [(index - 1) * (heroW + GAP), index * (heroW + GAP), (index + 1) * (heroW + GAP)];
                const scale = scrollX.interpolate({ inputRange: range, outputRange: [0.86, 1, 0.86], extrapolate: 'clamp' });
                const rotateY = scrollX.interpolate({ inputRange: range, outputRange: ['14deg', '0deg', '-14deg'], extrapolate: 'clamp' });
                const opacity = scrollX.interpolate({ inputRange: range, outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' });
                return (
                  <Animated.View style={{ width: heroW, marginHorizontal: GAP / 2, opacity, transform: [{ perspective: 900 }, { rotateY }, { scale }] }}>
                    <Hero style={item} />
                  </Animated.View>
                );
              }}
            />

            <View style={s.tabs}>
              <Pill label={t.templates} on={kind === 'template'} onPress={() => setKind('template')} />
              <Pill label={t.effects} on={kind === 'effect'} onPress={() => setKind('effect')} />
            </View>
            <View style={s.grid}>
              {list.map((item) => <Card key={item.id} style={item} w={cardW} />)}
            </View>
          </Animated.ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const open = (id: string) => router.push({ pathname: '/style/[id]', params: { id } });

function Hero({ style }: { style: Style }) {
  return (
    <Press onPress={() => open(style.id)}>
      <Lift radius={26} style={{ aspectRatio: 4 / 5 }}>
        <Image source={{ uri: API_URL + style.sample }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        {/* 下にガラスの帯で名前をのせる */}
        <Glass tint="dark" radius={18} style={s.heroLabel}>
          <Text style={[fl(800), { fontSize: 18, color: '#fff', letterSpacing: -0.3 }]} numberOfLines={1}>{style.name.en}</Text>
          <Text style={[f(500), { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 }]} numberOfLines={1}>{style.desc?.[lang] ?? style.name[lang]}</Text>
        </Glass>
      </Lift>
    </Press>
  );
}

function Card({ style, w }: { style: Style; w: number }) {
  return (
    <Press onPress={() => open(style.id)} style={{ width: w, marginBottom: 22 }}>
      <Lift radius={18} style={{ aspectRatio: 3 / 4 }}>
        <Image source={{ uri: API_URL + style.sample }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      </Lift>
      <Text style={[fl(800), { fontSize: 15, color: C.ink, marginTop: 10, letterSpacing: -0.2 }]} numberOfLines={1}>{style.name.en}</Text>
      {lang === 'ja' && <Text style={[f(500), { fontSize: 12, color: C.sub, marginTop: 1 }]} numberOfLines={1}>{style.name.ja}</Text>}
    </Press>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, height: 48 },
  balance: { paddingHorizontal: 12, height: 30, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  heroLabel: { position: 'absolute', left: 10, right: 10, bottom: 10, paddingHorizontal: 14, paddingVertical: 10 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 24 },
});
