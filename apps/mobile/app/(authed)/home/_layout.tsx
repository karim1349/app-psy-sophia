/**
 * Home tab stack layout - handles navigation within the home tab
 */

import { Stack } from 'expo-router';

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
