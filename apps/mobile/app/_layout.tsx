import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { I18nProvider } from '@/components/providers/I18nProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { useThemeStore } from '@app-psy-sophia/state';
import { ToastContainer, ToastProvider } from '@app-psy-sophia/ui';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { appStorage } from '../src/lib/storage';

export const unstable_settings = {
  anchor: '(authed)',
};

export default function RootLayout() {
  const themeStore = useThemeStore();
  const systemColorScheme = useColorScheme();
  const colorScheme =
    themeStore.mode === 'system' ? systemColorScheme : themeStore.mode;
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  // Initial bootstrap - just mark as ready
  // The index.tsx route will handle initial routing
  useEffect(() => {
    setIsReady(true);
  }, []);

  // Continuous route protection
  useEffect(() => {
    if (!isReady) return;

    async function protectRoutes() {
      const currentSegment =
        segments && segments.length > 0 ? segments[0] : null;
      const inAuthed = currentSegment === '(authed)';

      // Check if onboarding is done
      const onboardingDone = await appStorage.getOnboardingDone();

      // If trying to access authenticated routes without completing onboarding
      if (inAuthed && !onboardingDone) {
        console.log(
          '🚫 Unauthorized access to authenticated route, redirecting to onboarding'
        );
        router.replace('/(public)/onboarding/age');
      }
    }

    protectRoutes();
  }, [segments, isReady, router]);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#5B4BCC" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <I18nProvider>
            <ThemeProvider>
              <ToastProvider>
                <QueryProvider>
                  <NavigationThemeProvider
                    value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
                  >
                    <Stack
                      screenOptions={{
                        headerTransparent: true,
                        headerTitle: '',
                        navigationBarHidden: true,
                      }}
                    >
                      <Stack.Screen
                        name="index"
                        options={{ headerShown: false, gestureEnabled: false }}
                      />
                      <Stack.Screen
                        name="(public)"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="(authed)"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="modals/checkin"
                        options={{
                          presentation: 'modal',
                          headerShown: false,
                          title: 'Daily Check-in',
                          headerTransparent: false,
                        }}
                      />
                      <Stack.Screen
                        name="modals/command"
                        options={{
                          presentation: 'modal',
                          headerShown: true,
                          title: 'Quick Actions',
                          headerTransparent: false,
                        }}
                      />
                    </Stack>
                    <StatusBar style="auto" />
                    <ToastContainer />
                  </NavigationThemeProvider>
                </QueryProvider>
              </ToastProvider>
            </ThemeProvider>
          </I18nProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
});
