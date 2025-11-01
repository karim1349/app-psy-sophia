/**
 * Authenticated layout - Tab-based navigation
 */

import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';

export default function AuthedLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="home">
        <Icon sf="house.fill" />
        <Label>Accueil</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="toolbox">
        <Icon sf="wrench" />
        <Label>Boîte à outils</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tracking">
        <Icon sf="chart.bar" />
        <Label>Suivi</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <Icon sf="message" />
        <Label>Chat</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf="gearshape" />
        <Label>Réglages</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
