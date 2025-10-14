import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useMeQuery, useLogout } from '@qiima/queries';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { config } from '@/constants/config';
import { LanguageSwitcher } from '@qiima/ui';
import { useI18n } from '@qiima/i18n';

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { t, currentLanguage } = useI18n();
  
  // Debug: Log current language
  console.log('ProfileScreen: Current language:', currentLanguage);

  // Check if user is authenticated
  const { data: user, isLoading, error } = useMeQuery({
    env: 'native',
    baseURL: config.baseURL,
  });

  const logoutMutation = useLogout({
    env: 'native',
    baseURL: config.baseURL,
  });

  const handleLogout = async () => {
    Alert.alert(
      t('common.logout'),
      t('common.logoutConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.logout'),
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logoutMutation.mutateAsync();
              // Navigation will be handled by auth state change
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert(t('common.error'), t('common.logoutFailed'));
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  // If not authenticated, show login/register options
  if (error || (!isLoading && !user)) {
    return (
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        <LinearGradient
          pointerEvents="none"
          colors={
            scheme === 'dark'
              ? ['#21110D', '#28180F', '#17120A']
              : ['#FFECE5', '#FFE3CC', '#FFF6D6']
          }
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <ScrollView style={styles.content} contentContainerStyle={styles.centerContent}>
          <View style={styles.authContainer}>
            <Text style={styles.title}>{t('common.welcome')}</Text>
            <Text style={styles.subtitle}>{t('common.welcomeSubtitle')}</Text>
            
            <View style={styles.authButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]}
                onPress={() => router.push('/(auth)/login')}
              >
                <Text style={styles.primaryButtonText}>{t('common.login')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]}
                onPress={() => router.push('/(auth)/register')}
              >
                <Text style={styles.secondaryButtonText}>{t('common.createAccount')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.features}>
              <View style={styles.feature}>
                <Text style={styles.featureIcon}>🔥</Text>
                <Text style={styles.featureText}>{t('common.shareHotDeals')}</Text>
              </View>
              <View style={styles.feature}>
                <Text style={styles.featureIcon}>💬</Text>
                <Text style={styles.featureText}>{t('common.commentAndDiscuss')}</Text>
              </View>
              <View style={styles.feature}>
                <Text style={styles.featureIcon}>⭐</Text>
                <Text style={styles.featureText}>{t('common.voteOnDeals')}</Text>
              </View>
            </View>

            <View style={styles.languageSection}>
              <Text style={styles.sectionTitle}>{t('common.language')}</Text>
              <LanguageSwitcher style={styles.languageSwitcher} />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  // Authenticated user profile
  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <LinearGradient
        pointerEvents="none"
        colors={
          scheme === 'dark'
            ? ['#21110D', '#28180F', '#17120A']
            : ['#FFECE5', '#FFE3CC', '#FFF6D6']
        }
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('common.profile')}</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.username}>{user?.username}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              <Text style={styles.memberSince}>
                {t('common.memberSince')} {new Date(user?.created_at || '').toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.languageSection}>
          <Text style={styles.sectionTitle}>{t('common.language')}</Text>
          <LanguageSwitcher style={styles.languageSwitcher} />
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>📝</Text>
            <Text style={styles.menuText}>{t('common.myDeals')}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>💬</Text>
            <Text style={styles.menuText}>{t('common.myComments')}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>⭐</Text>
            <Text style={styles.menuText}>{t('common.votedDeals')}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>⚙️</Text>
            <Text style={styles.menuText}>{t('common.settings')}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logoutSection}>
          <TouchableOpacity 
            style={[styles.button, styles.logoutButton]}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            <Text style={styles.logoutButtonText}>
              {isLoggingOut ? t('common.loggingOut') : t('common.logout')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
  },
  header: {
    marginBottom: 32,
    marginTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  authContainer: {
    alignItems: 'center',
    maxWidth: 300,
  },
  authButtons: {
    width: '100%',
    gap: 16,
    marginBottom: 48,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#FF6A00',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: '#FF6A00',
  },
  secondaryButtonText: {
    color: '#FF6A00',
    fontSize: 16,
    fontWeight: '600',
  },
  features: {
    gap: 20,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6A00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 12,
    color: '#999',
  },
  menuSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  menuArrow: {
    fontSize: 20,
    color: '#999',
  },
  languageSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  languageSwitcher: {
    alignSelf: 'flex-start',
  },
  logoutSection: {
    marginTop: 20,
  },
  logoutButton: {
    backgroundColor: '#ff4444',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
