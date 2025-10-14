import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ForgotPasswordSchema, type PasswordResetRequestInput } from '@qiima/schemas';
import { usePasswordForgot } from '@qiima/queries';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, FormField, TextField, LanguageSwitcher } from '@qiima/ui';
import { useI18n } from '@qiima/i18n';
import { config } from '@/constants/config';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [emailSent, setEmailSent] = useState(false);
  const { t } = useI18n();
  const passwordForgot = usePasswordForgot({
    env: 'native',
    baseURL: config.baseURL,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetRequestInput>({
    resolver: zodResolver(ForgotPasswordSchema),
  });

  const onSubmit = (data: PasswordResetRequestInput) => {
    passwordForgot.mutate(data, {
      onSuccess: () => {
        setEmailSent(true);
      },
    });
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>{t('auth.forgotPassword.checkEmail')}</Text>
            <Text style={styles.successMessage}>
              {t('auth.forgotPassword.emailSent')}
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>{t('auth.forgotPassword.backToLogin')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.languageSwitcherContainer}>
            <LanguageSwitcher />
          </View>
          <Text style={styles.title}>{t('auth.forgotPassword.title')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.forgotPassword.subtitle')}
          </Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField
                label={t('auth.forgotPassword.email')}
                error={errors.email?.message}
                hint={t('auth.forgotPassword.emailHint')}
              >
                <TextField
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  hasError={!!errors.email}
                />
              </FormField>
            )}
          />

          {passwordForgot.error && (
            <View style={styles.apiErrorContainer}>
              <Text style={styles.apiError}>
                {passwordForgot.error.message ||
                  t('auth.forgotPassword.sendFailed')}
              </Text>
            </View>
          )}

          <Button
            title={t('auth.forgotPassword.sendButton')}
            onPress={handleSubmit(onSubmit)}
            loading={passwordForgot.isPending}
            disabled={passwordForgot.isPending}
            variant="solid"
            tone="brand"
          />

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.backButtonText}>{t('auth.forgotPassword.backToLogin')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
  },
  languageSwitcherContainer: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    gap: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#1a1a1a',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  error: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  hint: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
  apiErrorContainer: {
    backgroundColor: '#fee',
    borderWidth: 1,
    borderColor: '#fcc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  apiError: {
    color: '#c33',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    padding: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    gap: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
});
