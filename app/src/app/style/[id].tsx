// スタイルの画面: 見本と説明 → 枠の色などを選ぶ → 写真を選ぶ／撮る →「本人の写真です」を確認 → 作成
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Caption, Check, Pill, shadow } from '@/components/ui';
import { C, f, fl } from '@/constants/theme';
import { API_URL } from '@/lib/api';
import { lang, t } from '@/lib/i18n';
import { setState, useStore } from '@/lib/store';

export default function StyleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const style = useStore((s) => s.styles.find((x) => x.id === id));
  const picked = useStore((s) => s.picked);
  const balance = useStore((s) => s.balance);
  const [options, setOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(style?.options ?? {}).map(([k, o]) => [k, o.default])),
  );
  const [own, setOwn] = useState(false);

  if (!style) return null;
  const free = (balance?.freeLeft ?? 0) > 0;

  const pick = async (camera: boolean) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert(t.errPermission);
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, cameraType: ImagePicker.CameraType.front };
    const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled) return;
    const a = r.assets[0];
    setState({ picked: { uri: a.uri, width: a.width, height: a.height } });
  };

  const create = () => {
    if (balance && balance.freeLeft <= 0 && balance.credits <= 0) return Alert.alert(t.errNoCredits);
    router.push({ pathname: '/generating', params: { style: style.id, options: JSON.stringify(options) } });
  };

  return (
    <SafeAreaView style={s.wrap} edges={['top', 'bottom']}>
      <View style={s.bar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.back}>
          <Text style={[fl(700), { fontSize: 20, color: C.ink, marginTop: -2 }]}>‹</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={s.top}>
          <View style={[shadow, { borderRadius: 18, width: '46%' }]}>
            <View style={s.sample}>
              <Image source={{ uri: API_URL + style.sample }} style={StyleSheet.absoluteFill} contentFit="cover" />
            </View>
          </View>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Text style={[fl(800), s.name]}>{style.name.en}</Text>
            {lang === 'ja' && <Text style={[f(700), { fontSize: 14, color: C.ink, marginTop: 2 }]}>{style.name.ja}</Text>}
            {style.desc && <Text style={[f(500), { fontSize: 13, lineHeight: 19, color: C.sub, marginTop: 8 }]}>{style.desc[lang]}</Text>}
          </View>
        </View>

        {Object.entries(style.options ?? {}).map(([key, opt]) => (
          <View key={key} style={{ paddingHorizontal: 24, marginTop: 26 }}>
            <Caption>{opt.label[lang]}</Caption>
            <View style={s.row}>
              {Object.entries(opt.choices).map(([cid, c]) => (
                <Pill key={cid} label={c.label[lang]} on={options[key] === cid} onPress={() => setOptions({ ...options, [key]: cid })} />
              ))}
            </View>
          </View>
        ))}

        <View style={{ paddingHorizontal: 24, marginTop: 26 }}>
          <Caption>{t.yourPhoto}</Caption>
          <View style={s.photo}>
            {picked ? (
              <Image source={{ uri: picked.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <Text style={[f(500), { fontSize: 13, color: C.sub }]}>{t.photoHint}</Text>
            )}
          </View>
          <View style={[s.row, { marginTop: 10 }]}>
            <Button title={t.pickPhoto} kind="soft" onPress={() => pick(false)} style={{ flex: 1, minHeight: 48 }} />
            <Button title={t.takePhoto} kind="soft" onPress={() => pick(true)} style={{ flex: 1, minHeight: 48 }} />
          </View>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <Check checked={own} label={t.ownPhoto} onToggle={() => setOwn(!own)} />
        <Button
          title={free ? t.createFree : t.createCredit}
          sub={free ? t.createFreeSub : t.createCreditSub}
          onPress={create}
          disabled={!picked || !own}
        />
        <Text style={[f(500), s.note]}>{t.sendNote}</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  bar: { height: 48, paddingHorizontal: 16, justifyContent: 'center' },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', gap: 18, paddingHorizontal: 24, marginTop: 8 },
  sample: { aspectRatio: 3 / 4, borderRadius: 18, overflow: 'hidden', backgroundColor: C.fill },
  name: { fontSize: 26, lineHeight: 30, letterSpacing: -0.6, color: C.ink },
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
  photo: { marginTop: 10, aspectRatio: 4 / 3, borderRadius: 18, backgroundColor: C.fill, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 24, paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  note: { fontSize: 10, lineHeight: 15, color: C.sub, textAlign: 'center', marginTop: 8 },
});
