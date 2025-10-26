/**
 * Settings screen - Account management, profile, etc.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/Button';
import { logout, isGuestUser } from '../../src/api/auth';
import { appStorage, tokenStorage } from '../../src/lib/storage';
import { useMeQuery } from '@app-psy-sophia/queries';
import { config } from '../../constants/config';

export default function SettingsScreen() {
  const router = useRouter();
  const [isGuest, setIsGuest] = useState<boolean | null | undefined>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current user data for full accounts only
  const { data: user, isLoading: userLoading, error: userError, refetch: refetchUser } = useMeQuery({
    env: 'native',
    baseURL: config.baseURL,
  });


  // Enhanced guest detection that combines JWT and API data
  const determineGuestStatus = (jwtIsGuest: boolean | null | undefined, apiUser: any): boolean | null => {
    if (jwtIsGuest === null) {
      return null;
    }
    
    // If JWT token doesn't have is_guest field (undefined), rely on API data
    if (jwtIsGuest === undefined) {
      if (apiUser) {
        const apiSaysGuest = apiUser.is_guest === true;
        const hasNoProfileData = !apiUser.email && !apiUser.username;
        
        if (apiSaysGuest || hasNoProfileData) {
          return true;
        } else {
          return false;
        }
      } else {
        return null;
      }
    }
    
    if (jwtIsGuest === true) {
      return true;
    }
    
    // JWT says not guest, but check API data as backup
    if (apiUser) {
      const hasNoProfileData = !apiUser.email && !apiUser.username;
      const apiSaysGuest = apiUser.is_guest === true;
      
      if (apiSaysGuest || hasNoProfileData) {
        return true;
      }
    }
    
    return false;
  };


  useEffect(() => {
    async function checkGuestStatus() {
      try {
        const jwtGuestStatus = await isGuestUser();
        const finalGuestStatus = determineGuestStatus(jwtGuestStatus, user);
        setIsGuest(finalGuestStatus);
      } catch (error) {
        console.error('Error in guest status check:', error);
        setIsGuest(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkGuestStatus();
  }, [user]);

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ? Vous perdrez vos données si vous êtes en mode invité.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
            await appStorage.clearAppData();
            router.replace('/(public)/onboarding/age');
          },
        },
      ]
    );
  };


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Réglages</Text>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte</Text>

          {isLoading ? (
            <View style={styles.card}>
              <Text style={styles.cardText}>Vérification du statut du compte...</Text>
            </View>
          ) : isGuest === true ? (
            <>
              <View style={styles.card}>
                <Text style={styles.cardText}>
                  Vous utilisez actuellement un compte invité. Créez un compte permanent pour
                  sauvegarder vos données.
                </Text>
                <Button
                  title="Créer un compte"
                  onPress={() => router.push('/modals/convert-account')}
                  size="small"
                  style={{ marginTop: 12 }}
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardSubtitle}>Déjà un compte ?</Text>
                <Button
                  title="Se connecter"
                  variant="outline"
                  onPress={() => router.push('/(public)/login')}
                  size="small"
                  style={{ marginTop: 12 }}
                />
              </View>
            </>
          ) : isGuest === false ? (
            userLoading ? (
              <View style={styles.card}>
                <Text style={styles.cardText}>Chargement des informations du compte...</Text>
              </View>
            ) : user && !user.is_guest ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>👋 Bonjour {user.username || 'Utilisateur'}!</Text>
                <View style={styles.userInfo}>
                  <View style={styles.userInfoRow}>
                    <Text style={styles.userInfoLabel}>Email:</Text>
                    <Text style={styles.userInfoValue}>{user.email || 'Non fourni'}</Text>
                  </View>
                  <View style={styles.userInfoRow}>
                    <Text style={styles.userInfoLabel}>Nom d'utilisateur:</Text>
                    <Text style={styles.userInfoValue}>{user.username || 'Non fourni'}</Text>
                  </View>
                  <View style={styles.userInfoRow}>
                    <Text style={styles.userInfoLabel}>Compte créé:</Text>
                    <Text style={styles.userInfoValue}>
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : 'Inconnu'}
                    </Text>
                  </View>
                  <View style={styles.userInfoRow}>
                    <Text style={styles.userInfoLabel}>Statut:</Text>
                    <Text style={[styles.userInfoValue, styles.statusActive]}>
                      ✅ Compte permanent actif
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardText}>
                  ✅ Vous avez un compte permanent. Vos données sont sauvegardées.
                </Text>
              </View>
            )
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardText}>
                ❌ Erreur lors de la vérification du statut du compte.
              </Text>
            </View>
          )}
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Données</Text>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Exporter mes données</Text>
            <Text style={styles.menuItemIcon}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Text style={[styles.menuItemText, styles.dangerText]}>Déconnexion</Text>
            <Text style={styles.menuItemIcon}>→</Text>
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
  },
  header: {
    padding: 24,
    paddingTop: 12,
  },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    fontSize: 16,
    color: '#5B4BCC',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  menuItemText: {
    fontSize: 16,
    color: '#1F2937',
  },
  menuItemIcon: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  dangerText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  userInfo: {
    gap: 12,
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  userInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  userInfoValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  statusActive: {
    color: '#059669',
  },
});
