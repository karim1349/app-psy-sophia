import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from 'react-native';
import { useThemeStore } from '@qiima/state';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { I18nProvider } from '@/components/providers/I18nProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider, ToastContainer } from '@qiima/ui';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const themeStore = useThemeStore();
  const systemColorScheme = useColorScheme();
  const colorScheme = themeStore.mode === 'system' ? systemColorScheme : themeStore.mode;

  return (
    <I18nProvider>
      <ThemeProvider>
        <ToastProvider>
          <QueryProvider>
            <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack screenOptions={{ headerTransparent: true, headerTitle: '', navigationBarHidden: true}}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                <Stack.Screen name="toast-demo" options={{ title: 'Toast Demo' }} />
              </Stack>
              <StatusBar style="auto" />
              <ToastContainer />
            </NavigationThemeProvider>
          </QueryProvider>
        </ToastProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
