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
import { ResetPasswordSchema, type PasswordResetConfirmInput } from '@qiima/schemas';
import { usePasswordReset } from '@qiima/queries';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, FormField, TextField } from '@qiima/ui';
import { config } from '@/constants/config';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const [resetSuccess, setResetSuccess] = useState(false);
  const passwordReset = usePasswordReset({
    env: 'native',
    baseURL: config.baseURL,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetConfirmInput>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      token: params.token || '',
    },
  });

  const onSubmit = (data: PasswordResetConfirmInput) => {
    passwordReset.mutate(data, {
      onSuccess: () => {
        setResetSuccess(true);
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 3000);
      },
    });
  };

  if (!params.token) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Invalid reset link</Text>
            <Text style={styles.errorMessage}>
              This password reset link is invalid or has expired.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push('/(auth)/forgot-password')}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>Request a new reset link</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (resetSuccess) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>Password reset successful</Text>
            <Text style={styles.successMessage}>
              Your password has been reset. Redirecting to login...
            </Text>
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
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>Enter your new password below</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField
                label="New Password"
                error={errors.password?.message}
                hint="Must be at least 8 characters with uppercase, lowercase, digit and special character"
              >
                <TextField
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  placeholder="••••••••"
                  hasError={!!errors.password}
                />
              </FormField>
            )}
          />

          <Controller
            control={control}
            name="passwordConfirm"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField label="Confirm Password" error={errors.passwordConfirm?.message}>
                <TextField
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  placeholder="••••••••"
                  hasError={!!errors.passwordConfirm}
                />
              </FormField>
            )}
          />

          {passwordReset.error && (
            <View style={styles.apiErrorContainer}>
              <Text style={styles.apiError}>
                {passwordReset.error.message ||
                  'Failed to reset password. Please try again.'}
              </Text>
            </View>
          )}

          <Button
            title="Reset password"
            onPress={handleSubmit(onSubmit)}
            loading={passwordReset.isPending}
            disabled={passwordReset.isPending}
            variant="solid"
            tone="brand"
          />

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.backButtonText}>Back to login</Text>
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
  errorContainer: {
    alignItems: 'center',
    gap: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#c33',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
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
  },
});
