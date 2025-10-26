/**
 * Enable notifications and complete onboarding
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Button } from '../../../src/components/Button';
import { appStorage } from '../../../src/lib/storage';

export default function NotificationsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const requestPermissionsAndFinish = async () => {
    setLoading(true);

    try {
      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync();

      if (status === 'granted') {
        // Schedule morning notification (8:00 AM)
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '☀️ Bonjour !',
            body: 'N\'oubliez pas votre Moment Spécial aujourd\'hui',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour: 8,
            minute: 0,
            repeats: true,
          },
        });

        // Schedule evening notification (7:00 PM)
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🌙 Check-in du soir',
            body: 'Comment s\'est passée la journée ?',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour: 19,
            minute: 0,
            repeats: true,
          },
        });
      }

      // Navigate to account creation (final onboarding step)
      router.push('/(public)/onboarding/account');
    } catch (error) {
      console.error('Notification setup error:', error);

      // Still continue to account creation
      router.push('/(public)/onboarding/account');
    } finally {
      setLoading(false);
    }
  };

  const skipAndFinish = async () => {
    router.push('/(public)/onboarding/account');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Image source={require('../../../assets/images/logo.png')} style={styles.logo} />
          <Text style={styles.icon}>🔔</Text>
          <Text style={styles.title}>Restez motivé(e)</Text>
          <Text style={styles.subtitle}>
            Recevez des rappels quotidiens pour maintenir vos routines
          </Text>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>☀️</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Rappel du matin</Text>
              <Text style={styles.featureText}>
                8h00 - Moment Spécial de la journée
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🌙</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Check-in du soir</Text>
              <Text style={styles.featureText}>
                19h00 - Bilan de la journée
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Activer les notifications"
            onPress={requestPermissionsAndFinish}
            loading={loading}
            size="large"
          />
          <Button
            title="Plus tard"
            onPress={skipAndFinish}
            variant="outline"
            size="large"
          />
        </View>
      </View>
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
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
    resizeMode: 'contain',
  },
  icon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  features: {
    gap: 16,
  },
  feature: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 16,
  },
  featureIcon: {
    fontSize: 32,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 14,
    color: '#6B7280',
  },
  footer: {
    gap: 12,
    marginBottom: 24,
  },
});
