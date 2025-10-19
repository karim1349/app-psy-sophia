/**
 * Age/Schooling stage selection screen
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../../../src/components/Button';
import { createChild } from '../../../src/api/onboarding';
import { appStorage } from '../../../src/lib/storage';
import type { SchoolingStage } from '../../../src/types/api';

const STAGES: { value: SchoolingStage; label: string; description: string }[] = [
  {
    value: 'preK',
    label: 'Préscolaire (0-6 ans)',
    description: 'Maternelle ou avant',
  },
  {
    value: '6-13',
    label: 'Primaire/Collège (6-13 ans)',
    description: 'Élémentaire et collège',
  },
  {
    value: '13-18',
    label: 'Secondaire (13-18 ans)',
    description: 'Lycée',
  },
];

export default function AgeScreen() {
  const router = useRouter();
  const [selectedStage, setSelectedStage] = useState<SchoolingStage | null>(null);

  const createChildMutation = useMutation({
    mutationFn: (stage: SchoolingStage) =>
      createChild({
        schooling_stage: stage,
        diagnosed_adhd: 'unknown',
      }),
    onSuccess: async (data) => {
      // Store child ID
      await appStorage.setChildId(data.id);
      // Navigate to screener
      router.push('/(public)/onboarding/screener');
    },
  });

  const handleNext = () => {
    if (selectedStage) {
      createChildMutation.mutate(selectedStage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Quel âge a votre enfant ?</Text>
          <Text style={styles.subtitle}>
            Choisissez le niveau scolaire correspondant
          </Text>
        </View>

        <View style={styles.options}>
          {STAGES.map((stage) => (
            <TouchableOpacity
              key={stage.value}
              style={[
                styles.option,
                selectedStage === stage.value && styles.optionSelected,
              ]}
              onPress={() => setSelectedStage(stage.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionLabel,
                  selectedStage === stage.value && styles.optionLabelSelected,
                ]}
              >
                {stage.label}
              </Text>
              <Text
                style={[
                  styles.optionDescription,
                  selectedStage === stage.value && styles.optionDescriptionSelected,
                ]}
              >
                {stage.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Button
            title="Suivant"
            onPress={handleNext}
            disabled={!selectedStage}
            loading={createChildMutation.isPending}
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
  options: {
    flex: 1,
    gap: 12,
  },
  option: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minHeight: 80,
  },
  optionSelected: {
    borderColor: '#5B4BCC',
    backgroundColor: '#EDE9FE',
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: '#5B4BCC',
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  optionDescriptionSelected: {
    color: '#7C3AED',
  },
  footer: {
    paddingTop: 24,
  },
});
