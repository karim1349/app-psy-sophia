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
import { VerifyEmailSchema, type VerifyEmailInput } from '@qiima/schemas';
import { useVerifyEmail, useResendVerification } from '@qiima/queries';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, FormField, TextField, useTheme } from '@qiima/ui';
import { config } from '@/constants/config';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [resendSuccess, setResendSuccess] = useState(false);
  const theme = useTheme();

  const styles = createStyles(theme);

  const verifyEmail = useVerifyEmail({
    env: 'native',
    baseURL: config.baseURL,
  });

  const resendVerification = useResendVerification({
    env: 'native',
    baseURL: config.baseURL,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyEmailInput>({
    resolver: zodResolver(VerifyEmailSchema),
    defaultValues: {
      email: params.email || '',
      code: '',
    },
  });

  const onSubmit = (data: VerifyEmailInput) => {
    verifyEmail.mutate(data, {
      onSuccess: () => {
        router.replace('/(tabs)');
      },
    });
  };

  const handleResend = () => {
    if (!params.email) return;
    resendVerification.mutate(
      { email: params.email },
      {
        onSuccess: () => {
          setResendSuccess(true);
          setTimeout(() => setResendSuccess(false), 3000);
        },
      }
    );
  };

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
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            We&apos;ve sent a verification code to{'\n'}
            <Text style={styles.emailText}>{params.email}</Text>
          </Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="code"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField label="Verification Code" error={errors.code?.message} hint="Enter the 6-digit code from your email">
                <TextField
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="number-pad"
                  placeholder="123456"
                  hasError={!!errors.code}
                />
              </FormField>
            )}
          />



          <Button
            title="Verify"
            onPress={handleSubmit(onSubmit)}
            loading={verifyEmail.isPending}
            disabled={verifyEmail.isPending}
            variant="solid"
            tone="brand"
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Didn&apos;t receive the code? </Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendVerification.isPending || resendSuccess}
            >
              <Text
                style={[
                  styles.footerLink,
                  (resendVerification.isPending || resendSuccess) && styles.footerLinkDisabled,
                ]}
              >
                {resendVerification.isPending ? 'Sending...' : 'Resend code'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgCanvas,
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
    color: theme.colors.fgDefault,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.fgMuted,
    lineHeight: 24,
  },
  emailText: {
    fontWeight: '600',
    color: theme.colors.fgDefault,
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
    color: theme.colors.fgDefault,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.bgSurface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: theme.colors.fgDefault,
  },
  codeInput: {
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: '600',
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 12,
    marginTop: 4,
  },
  hint: {
    color: theme.colors.fgMuted,
    fontSize: 12,
    marginTop: 4,
  },

  button: {
    backgroundColor: theme.colors.brand,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    color: theme.colors.fgMuted,
    fontSize: 14,
  },
  footerLink: {
    color: theme.colors.brand,
    fontSize: 14,
    fontWeight: '600',
  },
  footerLinkDisabled: {
    opacity: 0.5,
  },
});

