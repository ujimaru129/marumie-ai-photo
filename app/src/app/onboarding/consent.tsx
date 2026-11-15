// 初回 2/2: 外部の AI に写真を送ることへの同意（App Store 審査ガイドライン 5.1.2、GDPR）→ 端末を登録
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ambient } from '@/components/ambient';
import { Glass } from '@/components/glass';
import { Button, Check, Title, Wordmark } from '@/components/ui';
import { C, f, fl } from '@/constants/theme';
import { register } from '@/lib/api';
import { t } from '@/lib/i18n';
import { setState } from '@/lib/store';

export default function Consent() {
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const agree = async () => {
    setBusy(true);
    try {
      setState({ balance: await register() });
      router.replace('/');
    } catch {
      Alert.alert(t.errNetwork);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
    <Ambient />
    <SafeAreaView style={s.wrap}>
      <Wordmark />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 28, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <Title title={t.consentTitle} sub={t.consentSub} />
        <View style={{ marginTop: 24, gap: 10 }}>
          {t.consentItems.map(([head, body], i) => (
            <Glass key={head} radius={20} style={s.item}>
              <Text style={[fl(800), s.num]}>{String(i + 1).padStart(2, '0')}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[f(800), { fontSize: 15, color: C.ink }]}>{head}</Text>
                <Text style={[f(500), { fontSize: 13, lineHeight: 20, color: C.sub, marginTop: 3 }]}>{body}</Text>
              </View>
            </Glass>
          ))}
        </View>
      </ScrollView>
      <Check checked={ok} label={t.consentCheck} onToggle={() => setOk(!ok)} />
      <Button title={t.agree} onPress={agree} disabled={!ok} busy={busy} style={{ marginTop: 6 }} />
    </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 },
  item: { flexDirection: 'row', gap: 14, padding: 16 },
  num: { fontSize: 13, color: C.red, marginTop: 2, letterSpacing: 0.5 },
});
