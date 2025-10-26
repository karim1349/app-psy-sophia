/**
 * Guest account conversion screen
 * Preserves all existing child data using the convertGuest API
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { isGuestUser } from '../../src/api/auth';
import { appStorage } from '../../src/lib/storage';
import { useI18n } from '@app-psy-sophia/i18n';
import { GuestConversionForm } from '../../src/components/GuestConversionForm';

export default function ConvertAccountScreen() {
  const router = useRouter();
  const { t } = useI18n();

  // Check if user is already a full account
  useEffect(() => {
    async function checkAccountStatus() {
      const isGuest = await isGuestUser();

      if (isGuest === false) {
        // User is already a full account, redirect to home
        console.log('✅ User is already a full account, redirecting to home');
        await appStorage.setOnboardingDone(true);
        router.replace('/(authed)/home');
      } else if (isGuest === null) {
        // Not authenticated, redirect to login
        console.log('❌ User not authenticated, redirecting to login');
        router.replace('/(public)/login');
      } else {
        // User is a guest, show conversion form
        console.log('👤 User is a guest, showing conversion form');
      }
    }

    checkAccountStatus();
  }, [router]);

  const handleConversionSuccess = async () => {
    console.log('✅ Guest converted to full account');
    await appStorage.setOnboardingDone(true);
    router.replace('/(authed)/home');
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logo} />
          <Text style={styles.title}>{t('auth.register.title')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.register.subtitle')}
          </Text>
        </View>

        <GuestConversionForm
          onSuccess={handleConversionSuccess}
          onCancel={handleCancel}
          showSkipButton={false}
          showLoginPrompt={false}
          showInfoBox={true}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 24,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    textAlign: 'center',
  },
});
