// 結果: 2枚から選ぶ・押している間は元の写真・保存・共有・もう一度・問題を報告
// 仕上げ（MARUMIE の LUT・グレイン・ロゴ）は次の段階で端末内にのせる
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, RoundAction, shadow } from '@/components/ui';
import { C, f, fl } from '@/constants/theme';
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
  // 写真の縦横比に合わせてカードの大きさを決める（切り取らずに全体を見せる）
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [ratio, setRatio] = useState(3 / 4);

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
      <View style={s.bar}>
        <Pressable onPress={() => router.dismissTo('/')} hitSlop={12} style={s.close}>
          <Text style={[fl(600), { fontSize: 18, color: C.ink, marginTop: -1 }]}>✕</Text>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={[fl(800), { fontSize: 15, color: C.ink, letterSpacing: -0.2 }]}>{result.style.name.en}</Text>
          {result.images.length > 1 && <Text style={[f(500), { fontSize: 11, color: C.sub }]}>{t.pickOne}</Text>}
        </View>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.stage} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <View style={[shadow, { borderRadius: 22, width: Math.min(box.w, box.h * ratio), height: Math.min(box.h, box.w / ratio) }]}>
        <Pressable style={s.main} onPressIn={() => setHold(true)} onPressOut={() => setHold(false)}>
          <Image
            source={{ uri: hold ? result.original : current.uri }}
            style={StyleSheet.absoluteFill}
            contentFit={hold ? 'cover' : 'contain'}
            transition={0}
            onLoad={(e) => !hold && setRatio(e.source.width / e.source.height)}
          />
          <View style={s.holdTag}>
            <Text style={[fl(800), { fontSize: 10, letterSpacing: 1, color: C.ink }]}>HOLD</Text>
            <Text style={[f(700), { fontSize: 11, color: C.ink }]}>{t.hold}</Text>
          </View>
          {!hold && <Text style={[fl(700), s.ai]}>AI · MARUMIE</Text>}
        </Pressable>
      </View>
      </View>

      {result.images.length > 1 && (
        <View style={s.thumbs}>
          {result.images.map((im, i) => (
            <Pressable key={im.variant} onPress={() => setSel(i)} style={[s.thumb, i === sel && s.thumbOn]}>
              <Image source={{ uri: im.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            </Pressable>
          ))}
        </View>
      )}

      <View style={s.actions}>
        <RoundAction icon="↓" label={t.save} onPress={save} dark busy={saving} />
        <RoundAction icon="↗" label={t.share} onPress={share} />
        <RoundAction icon="↻" label={t.again} onPress={() => router.dismissTo({ pathname: '/style/[id]', params: { id: result.style.id } })} />
      </View>
      <Pressable onPress={() => setReporting(true)} hitSlop={8}>
        <Text style={[f(500), s.report]}>{t.report}</Text>
      </Pressable>

      <Modal visible={reporting} transparent animationType="slide" onRequestClose={() => setReporting(false)}>
        <Pressable style={s.backdrop} onPress={() => setReporting(false)}>
          <Pressable style={s.sheet}>
            <View style={s.grabber} />
            <Text style={[f(800), { fontSize: 22, color: C.ink, letterSpacing: -0.3, marginBottom: 12 }]}>{t.reportTitle}</Text>
            <View style={{ backgroundColor: C.fill, borderRadius: 16 }}>
              {Object.entries(t.reasons).map(([k, label], i) => (
                <Pressable key={k} onPress={() => send(k)} style={[s.reason, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line }]}>
                  <Text style={[f(700), { fontSize: 15, color: C.ink }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Button title={t.cancel} kind="soft" onPress={() => setReporting(false)} style={{ marginTop: 12 }} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 20, paddingBottom: 8, backgroundColor: C.bg },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  stage: { flex: 1, marginTop: 6, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, borderRadius: 22, overflow: 'hidden', backgroundColor: C.fill },
  holdTag: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14, paddingHorizontal: 10, height: 28 },
  ai: { position: 'absolute', right: 14, bottom: 12, fontSize: 10, letterSpacing: 1.2, color: '#fff', opacity: 0.85 },
  thumbs: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 16 },
  thumb: { width: 54, height: 72, borderRadius: 12, overflow: 'hidden', opacity: 0.45 },
  thumbOn: { opacity: 1, borderWidth: 2, borderColor: C.ink },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 18 },
  report: { textAlign: 'center', color: C.sub, fontSize: 12, marginTop: 14, marginBottom: 4, textDecorationLine: 'underline' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 36, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, marginBottom: 14 },
  reason: { paddingVertical: 15, paddingHorizontal: 16 },
});
