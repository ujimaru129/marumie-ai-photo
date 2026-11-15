// 初回 1/2: 18歳以上の確認。生年はサーバーに送らず、端末にも残さない（18歳未満だったことだけを残す）
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ambient } from '@/components/ambient';
import { Glass } from '@/components/glass';
import { Button, Caption, Title, Wordmark } from '@/components/ui';
import { C, f, fl } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { isUnderage, markUnderage } from '@/lib/session';

const ROW = 52;

export default function Age() {
  const now = new Date();
  const thisYear = now.getFullYear();
  const years = useMemo(() => Array.from({ length: 80 }, (_, i) => thisYear - 14 - i), [thisYear]);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    isUnderage().then((v) => v && setBlocked(true));
  }, []);

  // 18歳になる年に生まれた人だけ、月も聞く（月が今月なら18歳未満として扱う）
  const needMonth = year === thisYear - 18;
  const ready = year !== null && (!needMonth || month !== null);

  const next = async () => {
    if (year === null) return;
    const adult = year < thisYear - 18 || (needMonth && month !== null && month < now.getMonth() + 1);
    if (!adult) {
      await markUnderage();
      setBlocked(true);
      return;
    }
    router.replace('/onboarding/consent');
  };

  if (blocked) {
    return (
      <SafeAreaView style={s.wrap}>
        <Wordmark />
        <Text style={[f(700), s.blocked]}>{t.under18}</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <Ambient />
    <SafeAreaView style={s.wrap}>
      <Wordmark />
      <Title title={t.ageTitle} sub={t.ageSub} style={{ marginTop: 28 }} />
      <Text style={[f(500), s.body]}>{t.ageBody}</Text>
      <Glass radius={24} style={s.wheel}>
        <FlatList
          data={years}
          keyExtractor={(y) => String(y)}
          initialScrollIndex={Math.max(0, years.indexOf(2000) - 2)}
          getItemLayout={(_, i) => ({ length: ROW, offset: ROW * i, index: i })}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const on = item === year;
            return (
              <Pressable onPress={() => { setYear(item); setMonth(null); }} style={[s.row, on && s.rowOn]}>
                <Text style={[fl(on ? 800 : 600), { fontSize: on ? 26 : 20, color: on ? C.ink : C.faint, letterSpacing: -0.4 }]}>{item}</Text>
              </Pressable>
            );
          }}
        />
      </Glass>
      {needMonth && (
        <View style={{ marginTop: 12 }}>
          <Caption>{t.ageYear}</Caption>
          <View style={s.months}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <Pressable key={m} onPress={() => setMonth(m)} style={[s.month, m === month && { backgroundColor: C.ink }]}>
                <Text style={[fl(700), { fontSize: 15, color: m === month ? '#fff' : C.ink }]}>{m}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      <Button title={t.next} onPress={next} disabled={!ready} style={{ marginTop: 16 }} />
    </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 },
  body: { fontSize: 14, lineHeight: 21, color: C.sub, marginTop: 12 },
  wheel: { flex: 1, marginTop: 20, paddingHorizontal: 8 },
  row: { height: ROW, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  rowOn: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  months: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  month: { width: 44, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  blocked: { fontSize: 18, lineHeight: 28, color: C.ink, marginTop: 40 },
});
