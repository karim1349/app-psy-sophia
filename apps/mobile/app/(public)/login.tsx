/**
 * Login screen - For users who already have an account
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../../src/components/Button';
import { login } from '../../src/api/auth';
import { appStorage } from '../../src/lib/storage';
import { useI18n } from '@app-psy-sophia/i18n';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loginMutation = useMutation({
    mutationFn: () => login(email.trim(), password),
    onSuccess: async () => {
      console.log('🔐 ========== LOGIN SUCCESS ==========');
      console.log('📞 About to fetch user children...');

      // Fetch user's children to restore childId
      try {
        const { getChildren } = await import('../../src/api/onboarding');
        console.log('📞 Calling GET /api/children/...');
        const childrenResponse = await getChildren();
        console.log('📦 Received children response:', childrenResponse);
        const userChildren = childrenResponse.results;

        console.log('👶 User has', userChildren.length, 'children');

        if (userChildren.length > 0) {
          // User has completed onboarding, restore their data
          const childId = userChildren[0].id;
          console.log('💾 Setting childId in storage:', childId);
          await appStorage.setChildId(childId);
          await appStorage.setOnboardingDone(true);
          console.log('✅ Successfully restored child ID:', childId);
          console.log('🚀 Navigating to home...');
          router.replace('/(authed)/home');
        } else {
          // User has no children, needs to complete onboarding
          console.log('⚠️ User has NO children, redirecting to onboarding');
          router.replace('/(public)/onboarding/age');
        }
      } catch (error) {
        console.error('❌ ========== ERROR FETCHING CHILDREN ==========');
        console.error('Error details:', error);
        console.error('Error message:', error instanceof Error ? error.message : String(error));
        console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack');

        // Don't navigate - stay on login and show error
        throw error;
      }
    },
    // Error handling is done globally by QueryClient
  });

  const handleSubmit = () => {
    // Backend will handle validation and return proper i18n error messages
    loginMutation.mutate();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </TouchableOpacity>
          <Image source={require('../../assets/images/logo.png')} style={styles.logo} />
          <Text style={styles.title}>{t('auth.login.title')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.login.subtitle')}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>{t('auth.login.email')}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="votre@email.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('auth.login.password')}</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoComplete="password"
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title={t('auth.login.loginButton')}
            onPress={handleSubmit}
            loading={loginMutation.isPending}
            size="large"
          />
        </View>

        <View style={styles.signupPrompt}>
          <Text style={styles.signupPromptText}>{t('auth.login.noAccount')}</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.signupLink}>{t('auth.register.signUp')}</Text>
          </TouchableOpacity>
        </View>
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
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  backText: {
    fontSize: 16,
    color: '#5B4BCC',
    fontWeight: '600',
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
  form: {
    gap: 20,
    marginBottom: 32,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  footer: {
    gap: 16,
    marginBottom: 24,
  },
  signupPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  signupPromptText: {
    fontSize: 15,
    color: '#6B7280',
  },
  signupLink: {
    fontSize: 15,
    color: '#5B4BCC',
    fontWeight: '600',
  },
});
