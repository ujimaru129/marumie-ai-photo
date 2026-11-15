// 下のタブ（AI / 編集 / ギャラリー）。写真の上に浮かぶガラスのバー
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import type { Ref } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/glass';
import { Icon, type IconName } from '@/components/icon';
import { depth } from '@/components/ui';
import { C, f } from '@/constants/theme';
import { t } from '@/lib/i18n';

type TabProps = TabTriggerSlotProps & { icon: IconName; label: string; ref?: Ref<View> };

function TabButton({ icon, label, isFocused, ...props }: TabProps) {
  return (
    <Pressable {...props} style={s.tab}>
      <View style={[s.iconWrap, isFocused && s.iconOn]}>
        <Icon name={icon} size={19} color={isFocused ? '#fff' : C.ink} />
      </View>
      <Text style={[f(700), { fontSize: 10, color: isFocused ? C.ink : C.sub }]}>{label}</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs>
      <TabSlot />
      <View pointerEvents="box-none" style={[s.barWrap, { bottom: Math.max(insets.bottom, 12) }]}>
        <View style={[depth.button, { borderRadius: 30 }]}>
          <Glass radius={30} strong style={s.bar}>
            <TabTrigger name="ai" href="/" asChild>
              <TabButton icon="ai" label={t.tabAI} />
            </TabTrigger>
            <TabTrigger name="edit" href="/edit" asChild>
              <TabButton icon="edit" label={t.tabEdit} />
            </TabTrigger>
            <TabTrigger name="gallery" href="/gallery" asChild>
              <TabButton icon="gallery" label={t.tabGallery} />
            </TabTrigger>
          </Glass>
        </View>
      </View>
      <TabList style={{ display: 'none' }}>
        <TabTrigger name="ai" href="/" />
        <TabTrigger name="edit" href="/edit" />
        <TabTrigger name="gallery" href="/gallery" />
      </TabList>
    </Tabs>
  );
}

const s = StyleSheet.create({
  barWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 7, gap: 6 },
  tab: { width: 74, alignItems: 'center', gap: 3 },
  iconWrap: { width: 44, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: C.ink },
});
