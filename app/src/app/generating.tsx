// 生成中: 写真を下ごしらえして送り、2枚の結果を端末に保存してから結果の画面へ
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Ambient } from '@/components/ambient';
import { Button, Lift } from '@/components/ui';
import { C, f } from '@/constants/theme';
import { ApiError, downloadResult, generate } from '@/lib/api';
import { addToGallery, removeFile, storeResult } from '@/lib/files';
import { t } from '@/lib/i18n';
import { prepareUpload, toJpeg } from '@/lib/photo';
import { getState, setState } from '@/lib/store';

export default function Generating() {
  const params = useLocalSearchParams<{ style: string; options: string }>();
  const [error, setError] = useState<string | null>(null);
  const [veil] = useState(() => new Animated.Value(1));
  const [slide] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // 20秒かけて白から写真が浮かび上がる。下の線は行ったり来たり
    Animated.timing(veil, { toValue: 0.15, duration: 20000, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    Animated.loop(Animated.timing(slide, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true })).start();

    let alive = true;
    const { picked, styles } = getState();
    const style = styles.find((s) => s.id === params.style);
    if (!picked || !style) {
      router.back();
      return;
    }
    (async () => {
      const jpeg = await prepareUpload(picked.uri, picked.width, picked.height, style.mirror);
      const g = await generate(jpeg, style.id, JSON.parse(params.options ?? '{}'));
      const images = [];
      for (const im of g.images) {
        const raw = await storeResult(await downloadResult(im.url), `${g.id}_${im.variant}.img`);
        images.push({ variant: im.variant, uri: await addToGallery(await toJpeg(raw, style.mirror), style.id) });
        await removeFile(raw);
      }
      setState({ balance: { freeLeft: g.freeLeft, credits: g.credits }, result: { id: g.id, style, original: picked.uri, images } });
      if (alive) router.replace('/result');
    })().catch((e) => {
      const code = e instanceof ApiError ? e.code : 'failed';
      if (alive) setError(code === 'no_credits' ? t.errNoCredits : code === 'blocked' ? t.errBlocked : code === 'network' ? t.errNetwork : t.errFailed);
    });
    return () => {
      alive = false;
    };
  }, [veil, slide, params.style, params.options]);

  const picked = getState().picked;
  return (
    <View style={s.wrap}>
      <Ambient uri={picked?.uri} veil={0.6} />
      <Lift radius={4} style={s.cheki}>
        <View style={{ flex: 1, backgroundColor: '#fff', padding: 12, paddingBottom: 48 }}>
        <View style={s.photo}>
          {picked && <Image source={{ uri: picked.uri }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={6} />}
          {/* 白から少しずつ写真が浮かび上がる（チェキの現像） */}
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#F4F2EE', opacity: veil }]} />
        </View>
        </View>
      </Lift>
      {error ? (
        <>
          <Text style={[f(700), s.err]}>{error}</Text>
          <Button title={t.cancel} kind="soft" onPress={() => router.back()} style={{ marginTop: 20, alignSelf: 'stretch' }} />
        </>
      ) : (
        <>
          <Text style={[f(800), s.title]}>{t.developing}</Text>
          <View style={s.track}>
            <Animated.View style={[s.bar, { transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [-120, 240] }) }] }]} />
          </View>
          <Text style={[f(500), s.sub]}>{t.developingSub}</Text>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: C.bg },
  cheki: { width: 230, aspectRatio: 230 / (12 + 206 * 4 / 3 + 48), transform: [{ perspective: 800 }, { rotate: '-4deg' }, { rotateX: '6deg' }] },
  photo: { aspectRatio: 3 / 4, backgroundColor: '#E9E6E0', overflow: 'hidden' },
  title: { fontSize: 24, color: C.ink, marginTop: 44, letterSpacing: -0.4 },
  track: { width: 240, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 18, overflow: 'hidden' },
  bar: { width: 120, height: 3, borderRadius: 2, backgroundColor: C.ink },
  sub: { fontSize: 13, color: C.sub, marginTop: 14 },
  err: { fontSize: 15, lineHeight: 23, color: C.ink, marginTop: 40, textAlign: 'center' },
});
