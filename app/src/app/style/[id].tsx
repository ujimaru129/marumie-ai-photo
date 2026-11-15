// スタイルの画面: 枠の色などを選ぶ → 写真を選ぶ／撮る →「本人の写真です」を確認 → 作成
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Check } from '@/components/ui';
import { C } from '@/constants/theme';
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
    <SafeAreaView style={s.wrap}>
      <Pressable onPress={() => router.back()} hitSlop={12}><Text style={s.back}>‹</Text></Pressable>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={s.title}>{style.name[lang]}</Text>

        {Object.entries(style.options ?? {}).map(([key, opt]) => (
          <View key={key} style={{ marginTop: 16 }}>
            <Text style={s.label}>{opt.label[lang]}</Text>
            <View style={s.row}>
              {Object.entries(opt.choices).map(([cid, c]) => (
                <Pressable key={cid} onPress={() => setOptions({ ...options, [key]: cid })} style={[s.chip, options[key] === cid && s.chipOn]}>
                  <Text style={[s.chipText, options[key] === cid && { color: C.paper }]}>{c.label[lang]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <View style={s.photo}>
          {picked ? <Image source={{ uri: picked.uri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={s.hint}>{t.pickPhoto}</Text>}
        </View>
        <View style={[s.row, { marginTop: 12 }]}>
          <Button title={t.pickPhoto} kind="ghost" onPress={() => pick(false)} style={{ flex: 1 }} />
          <Button title={t.takePhoto} kind="ghost" onPress={() => pick(true)} style={{ flex: 1 }} />
        </View>
      </ScrollView>
      <Check checked={own} label={t.ownPhoto} onToggle={() => setOwn(!own)} />
      <Button title={t.create} onPress={create} disabled={!picked || !own} style={{ marginTop: 8 }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: C.paper },
  back: { fontSize: 34, color: C.ink, lineHeight: 40 },
  title: { fontSize: 26, fontWeight: '700', color: C.ink },
  label: { fontSize: 13, color: C.sub, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  chip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: C.ink },
  chipOn: { backgroundColor: C.ink },
  chipText: { fontSize: 14, color: C.ink },
  photo: { marginTop: 20, aspectRatio: 3 / 4, borderRadius: 16, backgroundColor: C.line, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  hint: { color: C.sub },
});
