// 編集（無料）。次の段階で MARUMIE CAMERA のフィルター・調整をのせる。今は予告だけ
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ambient } from '@/components/ambient';
import { Glass } from '@/components/glass';
import { Title, Wordmark } from '@/components/ui';
import { C, f, fl } from '@/constants/theme';
import { t } from '@/lib/i18n';

const SWATCHES = ['#E9C8CF', '#C98A4B', '#2C3A55', '#9CC3CF', '#3B2147', '#D9D2C3'];

export default function Edit() {
  return (
    <View style={{ flex: 1 }}>
      <Ambient />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.bar}><Wordmark /></View>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 140 }}>
          <Title title={t.editTitle} sub={t.editSub} style={{ marginTop: 8 }} />
          <View style={s.swatches}>
            {SWATCHES.map((c, i) => (
              <View key={c} style={[s.swatch, { backgroundColor: c, transform: [{ rotate: `${(i - 2.5) * 5}deg` }, { translateY: Math.abs(i - 2.5) * 6 }] }]} />
            ))}
          </View>
          <Glass radius={24} style={s.card}>
            <Text style={[fl(800), { fontSize: 11, letterSpacing: 1.6, color: C.red }]}>{t.editSoon.toUpperCase()}</Text>
            <Text style={[f(500), { fontSize: 14, lineHeight: 22, color: C.ink, marginTop: 8 }]}>{t.editBody}</Text>
            <View style={s.chips}>
              {t.editFeatures.map((x) => (
                <View key={x} style={s.chip}><Text style={[f(700), { fontSize: 12, color: C.ink }]}>{x}</Text></View>
              ))}
            </View>
          </Glass>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { height: 48, paddingHorizontal: 24, justifyContent: 'center' },
  swatches: { flexDirection: 'row', justifyContent: 'center', marginTop: 36, marginBottom: 36 },
  swatch: { width: 52, height: 72, borderRadius: 12, marginHorizontal: -4, borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  card: { padding: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: { paddingHorizontal: 12, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.75)', justifyContent: 'center' },
});
