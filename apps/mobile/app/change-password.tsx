import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { useChangePassword } from '@app-psy-sophia/queries';
import { config } from '@/constants/config';
import { useI18n } from '@app-psy-sophia/i18n';
import { useTheme, FormField, TextField, Button } from '@app-psy-sophia/ui';
import { StackScreen } from '@/components/stack-screen';

interface ChangePasswordForm {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const theme = useTheme();
  const styles = createStyles(theme);

  const changePassword = useChangePassword({
    env: 'native',
    baseURL: config.baseURL,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ChangePasswordForm>({
    defaultValues: {
      current_password: '',
      new_password: '',
      new_password_confirm: '',
    },
  });

  const newPassword = watch('new_password');

  const onSubmit = (data: ChangePasswordForm) => {
    changePassword.mutate(data, {
      onSuccess: () => {
        router.back();
      },
    });
  };

  return (
    <StackScreen>
      <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('common.changePassword')}</Text>
            <Text style={styles.subtitle}>
              Enter your current password and choose a new one
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="current_password"
              rules={{
                required: t('validation.required'),
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField 
                  label={t('common.currentPassword')} 
                  error={errors.current_password?.message}
                >
                  <TextField
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    placeholder="••••••••"
                    hasError={!!errors.current_password}
                  />
                </FormField>
              )}
            />

            <Controller
              control={control}
              name="new_password"
              rules={{
                required: t('validation.required'),
                minLength: {
                  value: 8,
                  message: t('validation.passwordMinLength'),
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                  message: 'Password must contain uppercase, lowercase, digit and special character',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField 
                  label={t('common.newPassword')} 
                  error={errors.new_password?.message}
                  hint="Must be at least 8 characters with uppercase, lowercase, digit and special character"
                >
                  <TextField
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    placeholder="••••••••"
                    hasError={!!errors.new_password}
                  />
                </FormField>
              )}
            />

            <Controller
              control={control}
              name="new_password_confirm"
              rules={{
                required: t('validation.required'),
                validate: (value) =>
                  value === newPassword || t('validation.passwordMismatch'),
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <FormField 
                  label={t('common.confirmNewPassword')} 
                  error={errors.new_password_confirm?.message}
                >
                  <TextField
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    placeholder="••••••••"
                    hasError={!!errors.new_password_confirm}
                  />
                </FormField>
              )}
            />

            <Button
              title={t('common.save')}
              onPress={handleSubmit(onSubmit)}
              loading={changePassword.isPending}
              disabled={changePassword.isPending}
              variant="solid"
              tone="brand"
              size="md"
            />

            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
      </View>
    </StackScreen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    header: {
      marginBottom: 32,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.fgDefault,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.fgMuted,
      lineHeight: 24,
    },
    form: {
      gap: 20,
    },
    cancelButton: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    cancelButtonText: {
      fontSize: 16,
      color: theme.colors.fgMuted,
      fontWeight: '500',
    },
  });
