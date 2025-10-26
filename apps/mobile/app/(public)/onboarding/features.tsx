/**
 * Features screen - shows available app features based on child's age
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../../../src/components/Button';
import { appStorage } from '../../../src/lib/storage';

const FEATURES = [
  {
    id: 'special-time',
    title: 'Moment spécial',
    description: 'Temps de qualité avec votre enfant',
    icon: '⏰',
  },
  {
    id: 'anger-management',
    title: 'Gestion de la colère',
    description: 'Techniques pour gérer les crises',
    icon: '😤',
  },
  {
    id: 'child-attention',
    title: 'Attention à l\'enfant',
    description: 'Stratégies pour capter l\'attention',
    icon: '👀',
  },
  {
    id: 'effective-orders',
    title: 'Ordre efficace',
    description: 'Donner des consignes claires',
    icon: '📋',
  },
  {
    id: 'timeout',
    title: 'Time out',
    description: 'Technique de pause et réflexion',
    icon: '⏸️',
  },
  {
    id: 'point-system',
    title: 'Système de points',
    description: 'Récompenses et motivation',
    icon: '⭐',
  },
  {
    id: 'time-management',
    title: 'Gestion du temps',
    description: 'Organisation et routines',
    icon: '⏱️',
  },
  {
    id: 'homework',
    title: 'Devoirs scolaires',
    description: 'Aide pour les devoirs',
    icon: '📚',
  },
];

export default function FeaturesScreen() {
  const router = useRouter();

  const handleContinue = async () => {
    // Navigate to account creation/login before accessing authenticated area
    router.push('/(public)/onboarding/account');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image source={require('../../../assets/images/logo.png')} style={styles.logo} />
          <Text style={styles.title}>Fonctionnalités disponibles</Text>
          <Text style={styles.subtitle}>
            Voici les outils que vous pouvez utiliser pour accompagner votre enfant
          </Text>
        </View>

        <View style={styles.featuresList}>
          {FEATURES.map((feature) => (
            <View key={feature.id} style={styles.featureCard}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Button
            title="Commencer"
            onPress={handleContinue}
            size="large"
          />
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
    padding: 24,
  },
  header: {
    marginTop: 40,
    marginBottom: 32,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresList: {
    flex: 1,
    gap: 12,
    marginBottom: 24,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  footer: {
    paddingTop: 24,
  },
});

