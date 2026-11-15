// 生成中: 写真を下ごしらえして送り、2枚の結果を端末に保存してから結果の画面へ
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { C } from '@/constants/theme';
import { ApiError, downloadResult, generate } from '@/lib/api';
import { removeFile, storeResult } from '@/lib/files';
import { t } from '@/lib/i18n';
import { prepareUpload, toJpeg } from '@/lib/photo';
import { getState, setState } from '@/lib/store';

export default function Generating() {
  const params = useLocalSearchParams<{ style: string; options: string }>();
  const [error, setError] = useState<string | null>(null);
  const [fade] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // チェキが浮かび上がる演出（白から少しずつ色が出る）
    Animated.loop(
      Animated.sequence([
        Animated.timing(fade, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0.15, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();

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
        images.push({ variant: im.variant, uri: await toJpeg(raw, style.mirror) });
        await removeFile(raw);
      }
      setState({ balance: { freeLeft: g.freeLeft, credits: g.credits }, result: { id: g.id, style, original: picked.uri, images } });
      if (alive) router.replace('/result');
    })().catch((e) => {
      console.warn('generate failed', e);
      const code = e instanceof ApiError ? e.code : 'failed';
      if (alive) setError(code === 'no_credits' ? t.errNoCredits : code === 'blocked' ? t.errBlocked : code === 'network' ? t.errNetwork : t.errFailed);
    });
    return () => {
      alive = false;
    };
  }, [fade, params.style, params.options]);

  return (
    <View style={s.wrap}>
      <View style={s.cheki}>
        <Animated.View style={[s.photo, { opacity: fade }]} />
      </View>
      {error ? (
        <>
          <Text style={s.err}>{error}</Text>
          <Button title={t.cancel} kind="ghost" onPress={() => router.back()} style={{ marginTop: 16, alignSelf: 'stretch' }} />
        </>
      ) : (
        <>
          <Text style={s.title}>{t.developing}</Text>
          <Text style={s.sub}>{t.developingSub}</Text>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: C.paper },
  cheki: { width: 200, backgroundColor: '#fff', padding: 12, paddingBottom: 44, borderRadius: 4, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  photo: { aspectRatio: 3 / 4, backgroundColor: '#3A3530' },
  title: { fontSize: 18, fontWeight: '600', color: C.ink, marginTop: 32 },
  sub: { fontSize: 13, color: C.sub, marginTop: 8 },
  err: { fontSize: 15, color: C.ink, marginTop: 32, textAlign: 'center', lineHeight: 22 },
});
