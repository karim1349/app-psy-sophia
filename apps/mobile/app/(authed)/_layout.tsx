/**
 * Authenticated layout - Stack only (no tabs)
 */

import { Stack } from 'expo-router';

export default function AuthedLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F9FAFB' },
      }}
    />
  );
}
