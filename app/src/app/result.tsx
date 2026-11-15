// 結果: 2枚から選ぶ・押している間は元の写真・保存・共有・もう一度・問題を報告
// 仕上げ（MARUMIE の LUT・グレイン・ロゴ）は次の段階で端末内にのせる
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { C } from '@/constants/theme';
import { report } from '@/lib/api';
import { t } from '@/lib/i18n';
import { saveToPhotos } from '@/lib/save';
import { useStore } from '@/lib/store';

export default function Result() {
  const result = useStore((s) => s.result);
  const [sel, setSel] = useState(0);
  const [hold, setHold] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!result) return null;
  const current = result.images[sel] ?? result.images[0];

  const save = async () => {
    setSaving(true);
    try {
      Alert.alert((await saveToPhotos(current.uri)) ? t.saved : t.errPermission);
    } finally {
      setSaving(false);
    }
  };

  const share = () => Sharing.shareAsync(current.uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg' });

  const send = async (reason: string) => {
    setReporting(false);
    try {
      await report(result.id, current.variant, reason);
      Alert.alert(t.thanks);
    } catch {
      Alert.alert(t.errNetwork);
    }
  };

  return (
    <SafeAreaView style={s.wrap}>
      <View style={s.top}>
        <Pressable onPress={() => router.dismissTo('/')} hitSlop={12}><Text style={s.close}>×</Text></Pressable>
        <Text style={s.pick}>{result.images.length > 1 ? t.pickOne : ''}</Text>
        <View style={{ width: 24 }} />
      </View>

      <Pressable style={s.main} onPressIn={() => setHold(true)} onPressOut={() => setHold(false)}>
        <Image source={{ uri: hold ? result.original : current.uri }} style={StyleSheet.absoluteFill} contentFit="contain" transition={0} />
        {!hold && <Text style={s.ai}>{t.aiLabel}</Text>}
      </Pressable>
      <Text style={s.hint}>{t.holdToCompare}</Text>

      {result.images.length > 1 && (
        <View style={s.thumbs}>
          {result.images.map((im, i) => (
            <Pressable key={im.variant} onPress={() => setSel(i)} style={[s.thumb, i === sel && s.thumbOn]}>
              <Image source={{ uri: im.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            </Pressable>
          ))}
        </View>
      )}

      <View style={s.row}>
        <Button title={t.save} onPress={save} busy={saving} style={{ flex: 1 }} />
        <Button title={t.share} kind="ghost" onPress={share} style={{ flex: 1 }} />
      </View>
      <View style={[s.row, { marginTop: 10 }]}>
        <Button title={t.again} kind="ghost" onPress={() => router.dismissTo({ pathname: '/style/[id]', params: { id: result.style.id } })} style={{ flex: 1 }} />
      </View>
      <Pressable onPress={() => setReporting(true)} hitSlop={8}><Text style={s.report}>{t.report}</Text></Pressable>

      <Modal visible={reporting} transparent animationType="fade" onRequestClose={() => setReporting(false)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{t.reportTitle}</Text>
            {Object.entries(t.reasons).map(([k, label]) => (
              <Pressable key={k} onPress={() => send(k)} style={s.reason}><Text style={s.reasonText}>{label}</Text></Pressable>
            ))}
            <Button title={t.cancel} kind="ghost" onPress={() => setReporting(false)} style={{ marginTop: 12 }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: C.paper },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  close: { fontSize: 30, color: C.ink },
  pick: { fontSize: 14, color: C.ink, fontWeight: '600' },
  main: { flex: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: C.line },
  ai: { position: 'absolute', right: 10, bottom: 10, fontSize: 11, color: '#fff', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  hint: { fontSize: 12, color: C.sub, textAlign: 'center', marginTop: 6 },
  thumbs: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginVertical: 12 },
  thumb: { width: 64, height: 84, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  thumbOn: { borderColor: C.ink },
  row: { flexDirection: 'row', gap: 10 },
  report: { textAlign: 'center', color: C.sub, fontSize: 13, marginTop: 14, textDecorationLine: 'underline' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.paper, padding: 20, paddingBottom: 36, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginBottom: 8 },
  reason: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line },
  reasonText: { fontSize: 15, color: C.ink },
});
