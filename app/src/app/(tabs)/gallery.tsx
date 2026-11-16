// ギャラリー: この端末で作った写真（端末の中だけに保存）
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ambient } from '@/components/ambient';
import { Glass } from '@/components/glass';
import { Lift, Press, Title, Wordmark } from '@/components/ui';
import { C, f } from '@/constants/theme';
import { listGallery, type GalleryItem } from '@/lib/files';
import { t } from '@/lib/i18n';

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  // 写真ごとの縦横比（読み込んだときに分かる）。切り取らずにそのままの形で並べる
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const { width } = useWindowDimensions();
  const w = (width - 24 * 2 - 12) / 2;

  useFocusEffect(
    useCallback(() => {
      listGallery().then(setItems);
    }, []),
  );

  return (
    <View style={{ flex: 1 }}>
      <Ambient uri={items[0]?.uri} veil={0.7} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.bar}><Wordmark /></View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 }}>
          <Title title={t.galleryTitle} sub={t.gallerySub} style={{ marginTop: 8, marginBottom: 22 }} />
          {items.length === 0 ? (
            <Glass radius={24} style={{ padding: 20 }}>
              <Text style={[f(500), { fontSize: 14, lineHeight: 22, color: C.ink }]}>{t.galleryEmpty}</Text>
            </Glass>
          ) : (
            <>
              <View style={s.grid}>
                {masonry(items, ratios, w).map((col, ci) => (
                  <View key={ci} style={{ width: w, gap: 12 }}>
                    {col.map((it) => (
                      <Press key={it.uri} onPress={() => Sharing.shareAsync(it.uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg' })}>
                        <Lift radius={14} style={{ width: w, height: w / (ratios[it.uri] ?? 3 / 4) }}>
                          <Image
                            source={{ uri: it.uri }}
                            style={StyleSheet.absoluteFill}
                            contentFit="contain"
                            onLoad={(e) => {
                              const r = e.source.width / e.source.height;
                              if (r && ratios[it.uri] !== r) setRatios((prev) => ({ ...prev, [it.uri]: r }));
                            }}
                          />
                        </Lift>
                      </Press>
                    ))}
                  </View>
                ))}
              </View>
              <Text style={[f(500), { fontSize: 11, color: C.sub, textAlign: 'center', marginTop: 8 }]}>{t.galleryNote}</Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** 2列に、低い方の列へ順に積む（写真の形がばらばらでも隙間が少ない） */
function masonry(items: GalleryItem[], ratios: Record<string, number>, w: number): GalleryItem[][] {
  const cols: GalleryItem[][] = [[], []];
  const hs = [0, 0];
  for (const it of items) {
    const i = hs[0] <= hs[1] ? 0 : 1;
    cols[i].push(it);
    hs[i] += w / (ratios[it.uri] ?? 3 / 4) + 12;
  }
  return cols;
}

const s = StyleSheet.create({
  bar: { height: 48, paddingHorizontal: 24, justifyContent: 'center' },
  grid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
});
