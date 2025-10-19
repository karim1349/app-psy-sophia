import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme, View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useThemeStore } from '@app-psy-sophia/state';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { I18nProvider } from '@/components/providers/I18nProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider, ToastContainer } from '@app-psy-sophia/ui';
import { useEffect, useState } from 'react';
import { ensureGuestSession } from '../src/api/auth';
import { appStorage } from '../src/lib/storage';

export const unstable_settings = {
  anchor: '(authed)',
};

export default function RootLayout() {
  const themeStore = useThemeStore();
  const systemColorScheme = useColorScheme();
  const colorScheme = themeStore.mode === 'system' ? systemColorScheme : themeStore.mode;
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    async function bootstrap() {
      try {
        // Ensure guest session exists
        await ensureGuestSession();

        // Check if onboarding is done
        const onboardingDone = await appStorage.getOnboardingDone();

        // Route based on state
        const inPublic = segments[0] === '(public)';
        const inAuthed = segments[0] === '(authed)';

        if (!onboardingDone && !inPublic) {
          // Not onboarded, go to onboarding
          router.replace('/(public)/onboarding/age');
        } else if (onboardingDone && !inAuthed) {
          // Onboarded, go to home
          router.replace('/(authed)/home');
        }
      } catch (error) {
        console.error('Bootstrap error:', error);
      } finally {
        setIsReady(true);
      }
    }

    bootstrap();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#5B4BCC" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <I18nProvider>
          <ThemeProvider>
            <ToastProvider>
              <QueryProvider>
                <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                  <Stack screenOptions={{ headerTransparent: true, headerTitle: '', navigationBarHidden: true}}>
                    <Stack.Screen name="(public)" options={{ headerShown: false }} />
                    <Stack.Screen name="(authed)" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="modals/checkin"
                      options={{
                        presentation: 'modal',
                        headerShown: true,
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
