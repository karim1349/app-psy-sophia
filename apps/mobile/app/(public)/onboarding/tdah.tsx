/**
 * TDAH symptom screening screen
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../../../src/components/Button';
import { updateChild } from '../../../src/api/onboarding';
import type { DiagnosedADHD } from '../../../src/types/api';

const TDAH_OPTIONS: { value: DiagnosedADHD; label: string; description: string }[] = [
  {
    value: 'yes',
    label: 'Oui',
    description: 'Mon enfant présente des symptômes de TDAH',
  },
  {
    value: 'no',
    label: 'Non',
    description: 'Mon enfant ne présente pas de symptômes de TDAH',
  },
];

export default function TDAHScreen() {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<DiagnosedADHD | null>(null);

  const updateChildMutation = useMutation({
    mutationFn: (diagnosedAdhd: DiagnosedADHD) => updateChild({ diagnosed_adhd: diagnosedAdhd }),
    onSuccess: async (_, diagnosedAdhd) => {
      // Navigate based on selection
      if (diagnosedAdhd === 'yes') {
        // If TDAH symptoms present, show features
        router.push('/(public)/onboarding/features');
      } else {
        // If no TDAH symptoms, go to screener
        router.push('/(public)/onboarding/screener');
      }
    },
  });

  const handleNext = () => {
    if (selectedOption) {
      updateChildMutation.mutate(selectedOption);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Image source={require('../../../assets/images/logo.png')} style={styles.logo} />
          <Text style={styles.title}>Symptômes de TDAH</Text>
          <Text style={styles.subtitle}>
            Votre enfant présente-t-il des symptômes de TDAH ?
          </Text>
        </View>

        <View style={styles.options}>
          {TDAH_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                selectedOption === option.value && styles.optionSelected,
              ]}
              onPress={() => setSelectedOption(option.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionLabel,
                  selectedOption === option.value && styles.optionLabelSelected,
                ]}
              >
                {option.label}
              </Text>
              <Text
                style={[
                  styles.optionDescription,
                  selectedOption === option.value && styles.optionDescriptionSelected,
                ]}
              >
                {option.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Button
            title="Suivant"
            onPress={handleNext}
            disabled={!selectedOption}
            loading={updateChildMutation.isPending}
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
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
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
