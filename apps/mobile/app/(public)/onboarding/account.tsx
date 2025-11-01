/**
 * Account creation screen - Convert guest to full account
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
import { isGuestUser } from '../../../src/api/auth';
import { appStorage } from '../../../src/lib/storage';
import { useI18n } from '@app-psy-sophia/i18n';
import { GuestConversionForm } from '../../../src/components/GuestConversionForm';

export default function AccountScreen() {
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
      }
    }

    checkAccountStatus();
  }, [router]);

  const handleConversionSuccess = async () => {
    console.log('✅ Guest converted to full account');
    await appStorage.setOnboardingDone(true);
    router.replace('/(authed)/home');
  };

  const handleLoginRedirect = () => {
    // User wants to login instead, redirect to login screen
    router.push('/(public)/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Image source={require('../../../assets/images/logo.png')} style={styles.logo} />
          <Text style={styles.title}>{t('auth.register.title')}</Text>
          <Text style={styles.subtitle}>
            Créez votre compte pour sauvegarder vos données
          </Text>
        </View>

        <GuestConversionForm
          onSuccess={handleConversionSuccess}
          onCancel={handleLoginRedirect}
          showSkipButton={false}
          showLoginPrompt={true}
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
