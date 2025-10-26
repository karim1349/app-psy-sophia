/**
 * Shared component for converting guest users to full accounts
 * Preserves all existing child data using the convertGuest API
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Button } from './Button';
import { convertGuest } from '../api/auth';
import { useI18n } from '@app-psy-sophia/i18n';

interface GuestConversionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  showSkipButton?: boolean;
  showLoginPrompt?: boolean;
  showInfoBox?: boolean;
  style?: any;
}

export function GuestConversionForm({
  onSuccess,
  onCancel,
  showSkipButton = false,
  showLoginPrompt = false,
  showInfoBox = false,
  style,
}: GuestConversionFormProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const convertMutation = useMutation({
    mutationFn: () =>
      convertGuest({
        email: email.trim(),
        username: username.trim(),
        password,
        password_confirm: passwordConfirm,
      }),
    onSuccess: async () => {
      console.log('✅ Guest converted to full account');
      onSuccess?.();
    },
    // Error handling is done globally by QueryClient
  });

  const handleSubmit = () => {
    // Backend will handle validation and return proper i18n error messages
    convertMutation.mutate();
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>{t('auth.register.email')}</Text>
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
          <Text style={styles.label}>{t('auth.register.username')}</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="nom_utilisateur"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoComplete="username"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('auth.register.password')}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            autoComplete="password"
          />
          <Text style={styles.hint}>{t('auth.register.passwordHint')}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('auth.register.passwordConfirm')}</Text>
          <TextInput
            style={styles.input}
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            autoComplete="password"
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title={t('auth.register.registerButton')}
          onPress={handleSubmit}
          loading={convertMutation.isPending}
          size="large"
        />
        
        {showSkipButton && (
          <TouchableOpacity style={styles.skipButton} onPress={onCancel}>
            <Text style={styles.skipText}>{t('common.skip')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {showLoginPrompt && (
        <View style={styles.loginPrompt}>
          <Text style={styles.loginPromptText}>{t('auth.register.hasAccount')}</Text>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.loginLink}>{t('auth.register.signIn')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {showInfoBox && (
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            {t('auth.register.accountInfo')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
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
  hint: {
    fontSize: 14,
    color: '#6B7280',
  },
  footer: {
    gap: 16,
    marginBottom: 24,
  },
  skipButton: {
    alignItems: 'center',
    padding: 12,
  },
  skipText: {
    fontSize: 16,
    color: '#5B4BCC',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#5B4BCC',
    lineHeight: 20,
  },
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  loginPromptText: {
    fontSize: 15,
    color: '#6B7280',
  },
  loginLink: {
    fontSize: 15,
    color: '#5B4BCC',
    fontWeight: '600',
  },
});
