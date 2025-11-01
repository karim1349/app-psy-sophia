/**
 * Root index route - Redirects to appropriate screen based on auth state
 * This is the initial route when the app first launches
 */

import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ensureGuestSession, isAuthenticated, isGuestUser } from '../src/api/auth';
import { appStorage } from '../src/lib/storage';

export default function Index() {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    async function determineRoute() {
      try {
        // Check if we're already on a route (not on index)
        // If we're already on a route, don't redirect to avoid duplicate stacks
        const currentSegment = segments && segments.length > 0 ? segments[0] : null;
        
        // If already on a route segment (public, authed, modals, etc.), skip redirect
        // Only redirect if we're actually on the index route
        if (currentSegment && currentSegment !== 'index' && currentSegment !== '(index)') {
          console.log('⚠️ Already on a route, skipping redirect to avoid duplicate stack');
          setIsReady(true);
          return;
        }

        // Small delay to ensure navigation state is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Ensure guest session exists
        await ensureGuestSession();

        // Check if user is authenticated
        const hasAuth = await isAuthenticated();

        if (!hasAuth) {
          // No valid session - redirect to login using replace to remove index from stack
          console.log('❌ No valid session, redirecting to login');
          router.replace('/(public)/login');
          setIsReady(true);
          return;
        }

        // Check if user is a guest or full account
        const isGuest = await isGuestUser();

        // Check if onboarding is done
        const onboardingDone = await appStorage.getOnboardingDone();

        console.log(
          '🔐 Index route - isGuest:',
          isGuest,
          'onboardingDone:',
          onboardingDone
        );

        // If user is a full account (not a guest), skip onboarding entirely
        if (isGuest === false) {
          console.log('✅ User is a full account, redirecting to home');
          router.replace('/(authed)/home');
        } else if (!onboardingDone) {
          // Guest user without onboarding, go to onboarding
          console.log(
            '📝 Guest user without onboarding, redirecting to onboarding'
          );
          router.replace('/(public)/onboarding/age');
        } else {
          // Onboarded guest, go to home
          console.log('✅ Onboarded guest, redirecting to home');
          router.replace('/(authed)/home');
        }
      } catch (error) {
        console.error('Index route error:', error);
        // On error, redirect to login as fallback
        router.replace('/(public)/login');
      } finally {
        setIsReady(true);
      }
    }

    determineRoute();
  }, [router, segments]);

  // Show loading while determining route
  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#5B4BCC" />
      </View>
    );
  }

  // Render nothing - navigation is handled by router.replace
  return null;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
});

