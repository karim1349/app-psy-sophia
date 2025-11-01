import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme, View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useThemeStore } from '@app-psy-sophia/state';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { I18nProvider } from '@/components/providers/I18nProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider, ToastContainer } from '@app-psy-sophia/ui';
import { useEffect, useState } from 'react';
import { ensureGuestSession, isGuestUser } from '../src/api/auth';
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

  // Initial bootstrap
  useEffect(() => {
    async function bootstrap() {
      try {
        // Ensure guest session exists (or clear expired full account token)
        await ensureGuestSession();

        // Check if user is authenticated
        const { isAuthenticated } = await import('../src/api/auth');
        const hasAuth = await isAuthenticated();

        if (!hasAuth) {
          // No valid session - redirect to login or onboarding
          console.log('❌ No valid session, redirecting to login');
          router.replace('/(public)/login');
          return;
        }

        // Check if user is a guest or full account
        const isGuest = await isGuestUser();

        // Check if onboarding is done
        const onboardingDone = await appStorage.getOnboardingDone();

        // Route based on state
        const inPublic = segments[0] === '(public)';
        const inAuthed = segments[0] === '(authed)';

        console.log('🔐 Bootstrap - isGuest:', isGuest, 'onboardingDone:', onboardingDone);

        // If user is a full account (not a guest), skip onboarding entirely
        if (isGuest === false) {
          console.log('✅ User is a full account, going to home');
          if (!inAuthed) {
            router.replace('/(authed)/home');
          }
        } else if (!onboardingDone && !inPublic) {
          // Guest user without onboarding, go to onboarding
          console.log('📝 Guest user without onboarding, going to onboarding');
          router.replace('/(public)/onboarding/age');
        } else if (onboardingDone && !inAuthed) {
          // Onboarded guest, go to home
          console.log('✅ Onboarded guest, going to home');
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

  // Continuous route protection
  useEffect(() => {
    if (!isReady) return;

    async function protectRoutes() {
      const inPublic = segments[0] === '(public)';
      const inAuthed = segments[0] === '(authed)';
      const inTabs = segments[0] === '(tabs)';

      // Check if onboarding is done
      const onboardingDone = await appStorage.getOnboardingDone();

      // If trying to access authenticated routes without completing onboarding
      if ((inAuthed || inTabs) && !onboardingDone) {
        console.log('🚫 Unauthorized access to authenticated route, redirecting to onboarding');
        router.replace('/(public)/onboarding/age');
      }
    }

    protectRoutes();
  }, [segments, isReady]);

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
                  <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                    <Stack screenOptions={{ headerTransparent: true, headerTitle: '', navigationBarHidden: true}}>
                      <Stack.Screen name="(public)" options={{ headerShown: false }} />
                      <Stack.Screen name="(authed)" options={{ headerShown: false }} />
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
