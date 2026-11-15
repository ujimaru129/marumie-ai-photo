// 初回 2/2: 外部の AI に写真を送ることへの同意（App Store 審査ガイドライン 5.1.2、GDPR）→ 端末を登録
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Check, Wordmark } from '@/components/ui';
import { C } from '@/constants/theme';
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
    <SafeAreaView style={s.wrap}>
      <Wordmark />
      <Text style={s.title}>{t.consentTitle}</Text>
      <ScrollView style={{ flex: 1 }}>
        <Text style={s.body}>{t.consentBody}</Text>
      </ScrollView>
      <Check checked={ok} label={t.consentCheck} onToggle={() => setOk(!ok)} />
      <Button title={t.agree} onPress={agree} disabled={!ok} busy={busy} style={{ marginTop: 12 }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 24, backgroundColor: C.paper },
  title: { fontSize: 26, fontWeight: '700', color: C.ink, marginTop: 32, marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 24, color: C.ink },
});
