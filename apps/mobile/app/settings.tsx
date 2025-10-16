import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useI18n } from '@qiima/i18n';
import { useTheme, LanguageSwitcher, ThemeSwitcher } from '@qiima/ui';
import { useMeQuery } from '@qiima/queries';
import { config } from '@/constants/config';
import { StackScreen } from '@/components/stack-screen';

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const theme = useTheme();
  const styles = createStyles(theme);

  // Fetch current user data
  const { data: user } = useMeQuery({
    env: 'native',
    baseURL: config.baseURL,
  });

  const handleChangePassword = () => {
    router.push('/change-password');
  };

  return (
    <StackScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('common.settingsTitle')}</Text>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.appearance')}</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t('common.theme')}</Text>
            <ThemeSwitcher />
          </View>
        </View>

        {/* Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.language')}</Text>
          
          <View style={styles.settingItem}>
            <LanguageSwitcher />
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.account')}</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleChangePassword}
          >
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>{t('common.changePassword')}</Text>
              <Text style={styles.settingDescription}>
                Update your account password
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>{t('common.email')}</Text>
              <Text style={styles.settingValue}>
                {user?.email || 'Loading...'}
              </Text>
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>{t('common.username')}</Text>
              <Text style={styles.settingValue}>
                {user?.username || 'Loading...'}
              </Text>
            </View>
          </View>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Version</Text>
              <Text style={styles.settingValue}>1.0.0</Text>
            </View>
          </View>
        </View>
      </View>
    </StackScreen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      marginBottom: 32,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.fgDefault,
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.fgDefault,
      marginBottom: 16,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radius.md,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    settingContent: {
      flex: 1,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.fgDefault,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 14,
      color: theme.colors.fgMuted,
    },
    settingValue: {
      fontSize: 14,
      color: theme.colors.fgMuted,
      marginTop: 4,
    },
    chevron: {
      fontSize: 20,
      color: theme.colors.fgMuted,
      marginLeft: 12,
    },
  });
