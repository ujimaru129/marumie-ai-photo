// スタイルの画面: 見本と説明 → 枠の色などを選ぶ → 写真を選ぶ／撮る →「本人の写真です」を確認 → 作成
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ambient } from '@/components/ambient';
import { Glass } from '@/components/glass';
import { Button, Caption, Check, depth, Lift, Pill, RoundAction } from '@/components/ui';
import { C, f, fl } from '@/constants/theme';
import { API_URL } from '@/lib/api';
import { lang, t } from '@/lib/i18n';
import { setState, useStore } from '@/lib/store';

export default function StyleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const style = useStore((s) => s.styles.find((x) => x.id === id));
  const picked = useStore((s) => s.picked);
  const balance = useStore((s) => s.balance);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [options, setOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(style?.options ?? {}).map(([k, o]) => [k, o.default])),
  );
  const [own, setOwn] = useState(false);

  if (!style) return null;
  const free = (balance?.freeLeft ?? 0) > 0;
  const sample = API_URL + style.sample;

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
    <View style={{ flex: 1 }}>
      <Ambient uri={sample} veil={0.5} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.bar}>
          <RoundAction icon="back" onPress={() => router.back()} size={40} />
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 230 + insets.bottom }} showsVerticalScrollIndicator={false}>
          <View style={{ alignItems: 'center', marginTop: 4 }}>
            <Lift radius={24} style={{ width: width * 0.62, height: width * 0.62 * 4 / 3 }}>
              <Image source={{ uri: sample }} style={StyleSheet.absoluteFill} contentFit="cover" />
            </Lift>
            <Text style={[fl(800), s.name]}>{style.name.en}</Text>
            {lang === 'ja' && <Text style={[f(700), { fontSize: 13, color: C.ink, marginTop: 2 }]}>{style.name.ja}</Text>}
            {style.desc && <Text style={[f(500), s.desc]}>{style.desc[lang]}</Text>}
          </View>

          {Object.entries(style.options ?? {}).map(([key, opt]) => (
            <View key={key} style={{ paddingHorizontal: 24, marginTop: 24 }}>
              <Caption>{opt.label[lang]}</Caption>
              <View style={s.row}>
                {Object.entries(opt.choices).map(([cid, c]) => (
                  <Pill key={cid} label={c.label[lang]} on={options[key] === cid} onPress={() => setOptions({ ...options, [key]: cid })} />
                ))}
              </View>
            </View>
          ))}

          <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
            <Caption>{t.yourPhoto}</Caption>
            <Glass radius={22} style={s.photo}>
              {picked ? (
                <Image source={{ uri: picked.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <Text style={[f(500), { fontSize: 13, color: C.sub }]}>{t.photoHint}</Text>
              )}
            </Glass>
            <View style={[s.row, { marginTop: 12 }]}>
              <Button title={t.pickPhoto} icon="photo" kind="soft" onPress={() => pick(false)} style={{ flex: 1 }} />
              <Button title={t.takePhoto} icon="camera" kind="soft" onPress={() => pick(true)} style={{ flex: 1 }} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* 下に浮かぶガラスのパネル */}
      <View style={[s.footerWrap, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
        <View style={[depth.far, { borderRadius: 28 }]}>
          <Glass radius={28} strong style={s.footer}>
            <Check checked={own} label={t.ownPhoto} onToggle={() => setOwn(!own)} />
            <Button title={free ? t.createFree : t.createCredit} sub={free ? t.createFreeSub : t.createCreditSub} icon="ai" onPress={create} disabled={!picked || !own} />
            <Text style={[f(500), s.note]}>{t.sendNote}</Text>
          </Glass>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { height: 52, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'flex-start' },
  name: { fontSize: 28, letterSpacing: -0.7, color: C.ink, marginTop: 22 },
  desc: { fontSize: 13, lineHeight: 19, color: C.sub, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  photo: { marginTop: 10, aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center' },
  footerWrap: { position: 'absolute', left: 12, right: 12, bottom: 0 },
  footer: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
  note: { fontSize: 10, lineHeight: 15, color: C.sub, textAlign: 'center', marginTop: 8 },
});
