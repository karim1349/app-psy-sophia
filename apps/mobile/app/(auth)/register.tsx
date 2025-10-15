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
import { RegisterSchema, type RegisterInput } from '@qiima/schemas';
import { useRegister } from '@qiima/queries';
import { useRouter } from 'expo-router';
import { Button, FormField, TextField, useTheme } from '@qiima/ui';
import { config } from '@/constants/config';

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();
  const register_mutation = useRegister({
    env: 'native',
    baseURL: config.baseURL,
  });

  const styles = createStyles(theme);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  });

  const onSubmit = (data: RegisterInput) => {
    register_mutation.mutate(data, {
      onSuccess: () => {
        router.push(`/(auth)/verify-email?email=${encodeURIComponent(data.email)}`);
      },
    });
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
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Sign up to start finding great deals</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField label="Username" error={errors.username?.message}>
                <TextField
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Choose a username"
                  hasError={!!errors.username}
                />
              </FormField>
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField label="Email" error={errors.email?.message}>
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

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField label="Password" error={errors.password?.message} hint="Must be at least 8 characters">
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


          <Button
            title="Sign up"
            onPress={handleSubmit(onSubmit)}
            loading={register_mutation.isPending}
            disabled={register_mutation.isPending}
            variant="solid"
            tone="brand"
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.footerLink}>Login</Text>
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
});
