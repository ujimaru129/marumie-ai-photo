// 初回 1/2: 18歳以上の確認。生年はサーバーに送らず、端末にも残さない（18歳未満だったことだけを残す）
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Wordmark } from '@/components/ui';
import { C } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { isUnderage, markUnderage } from '@/lib/session';

export default function Age() {
  const now = new Date();
  const thisYear = now.getFullYear();
  const years = useMemo(() => Array.from({ length: 90 }, (_, i) => thisYear - 10 - i), [thisYear]);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    isUnderage().then((v) => v && setBlocked(true));
  }, []);

  // 18歳になる年に生まれた人だけ、月も聞く（誕生日の日付までは聞かない。月が同じなら18歳未満として扱う）
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
        <Text style={[s.body, { marginTop: 40 }]}>{t.under18}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.wrap}>
      <Wordmark />
      <Text style={s.title}>{t.ageTitle}</Text>
      <Text style={s.body}>{t.ageBody}</Text>
      <Text style={s.label}>{t.ageYear}</Text>
      <FlatList
        style={s.list}
        data={years}
        keyExtractor={(y) => String(y)}
        numColumns={4}
        renderItem={({ item }) => (
          <Pressable onPress={() => { setYear(item); setMonth(null); }} style={[s.chip, item === year && s.chipOn]}>
            <Text style={[s.chipText, item === year && { color: C.paper }]}>{item}</Text>
          </Pressable>
        )}
      />
      {needMonth && (
        <View style={s.months}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <Pressable key={m} onPress={() => setMonth(m)} style={[s.chip, s.month, m === month && s.chipOn]}>
              <Text style={[s.chipText, m === month && { color: C.paper }]}>{m}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Button title={t.next} onPress={next} disabled={!ready} style={{ marginTop: 16 }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 24, backgroundColor: C.paper },
  title: { fontSize: 26, fontWeight: '700', color: C.ink, marginTop: 32 },
  body: { fontSize: 15, lineHeight: 23, color: C.ink, marginTop: 12 },
  label: { fontSize: 13, color: C.sub, marginTop: 24, marginBottom: 8 },
  list: { flexGrow: 0, maxHeight: 280 },
  chip: { flex: 1, margin: 4, paddingVertical: 10, borderRadius: 18, borderWidth: 1, borderColor: C.line, alignItems: 'center', backgroundColor: C.card },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontSize: 15, color: C.ink },
  months: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  month: { flexBasis: '14%', flexGrow: 0 },
});
