import { Tabs } from 'expo-router';
import React from 'react';

import { CustomTabBar } from '@/components/custom-tab-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useI18n } from '@app-psy-sophia/i18n';

export default function TabLayout() {
  const { t } = useI18n();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('common.home'),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
