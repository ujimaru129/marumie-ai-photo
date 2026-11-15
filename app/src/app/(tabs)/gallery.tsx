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
                {items.map((it) => (
                  <Press key={it.uri} onPress={() => Sharing.shareAsync(it.uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg' })} style={{ width: w, marginBottom: 12 }}>
                    <Lift radius={16} style={{ aspectRatio: 3 / 4 }}>
                      <Image source={{ uri: it.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    </Lift>
                  </Press>
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

const s = StyleSheet.create({
  bar: { height: 48, paddingHorizontal: 24, justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
