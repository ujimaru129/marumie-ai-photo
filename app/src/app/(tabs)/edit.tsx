// 編集（無料）。次の段階で MARUMIE CAMERA のフィルター・調整をのせる
// 今は本物のフィルターをかけた見本で、何ができるかを見せる（左右にドラッグして比べられる）
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, PanResponder, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ambient } from '@/components/ambient';
import { Glass } from '@/components/glass';
import { Button, Caption, Lift, Press, Title, Wordmark } from '@/components/ui';
import { C, f, fl } from '@/constants/theme';
import { API_URL } from '@/lib/api';
import { t } from '@/lib/i18n';

const FILTERS = ['MARUMIE Day', 'MARUMIE Night', 'Portra', 'Golden', 'Milky', 'Latte', 'Neon Noir', 'Moody', 'Pastel', 'HP5'];
const S = (name: string) => `${API_URL}/v1/samples/${name}`;

export default function Edit() {
  const { width } = useWindowDimensions();
  const w = width - 48;
  const h = (w * 4) / 3;
  const [split, setSplit] = useState(w * 0.5);
  const [sel, setSel] = useState(0);
  const [pan] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (e) => setSplit(Math.min(w - 8, Math.max(8, e.nativeEvent.locationX))),
    }),
  );
  const after = sel === 0 ? S('edit_after') : S(`filter_${sel}`);

  return (
    <View style={{ flex: 1 }}>
      <Ambient uri={after} veil={0.6} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.bar}><Wordmark /></View>
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          <Title title={t.editTitle} sub={t.editSub} style={{ paddingHorizontal: 24, marginTop: 8 }} />

          {/* 比べる: 左が元の写真、右がフィルター。境目をドラッグ */}
          <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
            <Lift radius={24} style={{ width: w, height: h }}>
              <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
                <Image source={{ uri: S('edit_before') }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <View style={[StyleSheet.absoluteFill, { left: split, overflow: 'hidden' }]} pointerEvents="none">
                  <Image source={{ uri: after }} style={{ position: 'absolute', left: -split, top: 0, width: w, height: h }} contentFit="cover" transition={150} />
                </View>
                <View pointerEvents="none" style={[s.divider, { left: split - 1 }]} />
                <View pointerEvents="none" style={[s.knobWrap, { left: split - 22, top: h / 2 - 22 }]}>
                  <Glass radius={22} style={s.knob}>
                    <Text style={[fl(800), { fontSize: 13, color: C.ink, letterSpacing: -1 }]}>‹ ›</Text>
                  </Glass>
                </View>
                <Glass radius={12} style={[s.tag, { left: 12 }]}><Text style={[fl(800), s.tagText]}>{t.before}</Text></Glass>
                <Glass radius={12} style={[s.tag, { right: 12 }]}><Text style={[fl(800), s.tagText]}>{t.after}</Text></Glass>
              </View>
            </Lift>
          </View>

          <Caption style={{ marginHorizontal: 24, marginTop: 26 }}>{t.editFilters}</Caption>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 18, gap: 12 }}>
            {FILTERS.map((name, i) => (
              <Press key={name} onPress={() => setSel(i)} style={{ alignItems: 'center' }}>
                <Lift radius={14} style={[{ width: 64, height: 86 }, i === sel ? s.on : {}]}>
                  <Image source={{ uri: S(`filter_${i}`) }} style={StyleSheet.absoluteFill} contentFit="cover" />
                </Lift>
                <Text style={[fl(i === sel ? 800 : 600), { fontSize: 11, marginTop: 7, color: i === sel ? C.ink : C.sub }]} numberOfLines={1}>{name}</Text>
              </Press>
            ))}
          </ScrollView>

          <View style={{ paddingHorizontal: 24 }}>
            <Button title={t.editPick} icon="photo" onPress={() => Alert.alert(t.editNotYet)} />
            <Text style={[f(500), { fontSize: 11, color: C.sub, textAlign: 'center', marginTop: 10 }]}>{t.editFree}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { height: 48, paddingHorizontal: 24, justifyContent: 'center' },
  divider: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,255,255,0.9)' },
  knobWrap: { position: 'absolute', width: 44, height: 44, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  knob: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  tag: { position: 'absolute', top: 12, paddingHorizontal: 10, height: 24, justifyContent: 'center' },
  tagText: { fontSize: 10, letterSpacing: 1.4, color: C.ink },
  on: { borderWidth: 2, borderColor: C.ink },
});
