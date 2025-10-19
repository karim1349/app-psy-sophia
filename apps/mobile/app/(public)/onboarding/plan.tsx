/**
 * Starter plan overview - Special Time module
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../../src/components/Button';

export default function PlanScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Votre plan personnalisé</Text>
          <Text style={styles.subtitle}>
            Commençons par le "Moment Spécial"
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎯 Moment Spécial</Text>
          <Text style={styles.cardDescription}>
            Passez 10-20 minutes par jour en tête-à-tête avec votre enfant, en
            le laissant choisir l'activité.
          </Text>

          <View style={styles.benefits}>
            <Text style={styles.benefitsTitle}>Bienfaits :</Text>
            <Text style={styles.benefit}>• Renforce le lien parent-enfant</Text>
            <Text style={styles.benefit}>• Améliore l'estime de soi</Text>
            <Text style={styles.benefit}>• Réduit les comportements difficiles</Text>
          </View>

          <View style={styles.goal}>
            <Text style={styles.goalTitle}>Objectif de départ :</Text>
            <Text style={styles.goalText}>
              6 sessions sur 21 jours, dont 4 appréciées par l'enfant
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Configurer les rappels"
            onPress={() => router.push('/(public)/onboarding/notifications')}
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
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 20,
  },
  benefits: {
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  benefit: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 4,
  },
  goal: {
    backgroundColor: '#EDE9FE',
    borderRadius: 8,
    padding: 16,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5B4BCC',
    marginBottom: 4,
  },
  goalText: {
    fontSize: 14,
    color: '#7C3AED',
  },
  footer: {
    marginTop: 16,
  },
});
