/**
 * Select target behaviors to track (max 3)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../../../src/components/Button';
import { createTargets } from '../../../src/api/onboarding';
import { appStorage } from '../../../src/lib/storage';

const SUGGESTED_BEHAVIORS = [
  'Se brosser les dents',
  'Aller au lit à l\'heure',
  'Faire les devoirs',
  'Ranger sa chambre',
  'S\'habiller le matin',
  'Manger proprement',
  'Écouter en classe',
  'Finir ce qu\'il commence',
];

export default function PrioritiesScreen() {
  const router = useRouter();
  const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([]);
  const [customBehavior, setCustomBehavior] = useState('');

  const createTargetsMutation = useMutation({
    mutationFn: async (behaviors: string[]) => {
      const childId = await appStorage.getChildId();
      if (!childId) throw new Error('No child ID');
      return createTargets(
        childId,
        behaviors.map((name) => ({ name }))
      );
    },
    onSuccess: () => {
      router.push('/(public)/onboarding/plan');
    },
  });

  const toggleBehavior = (behavior: string) => {
    if (selectedBehaviors.includes(behavior)) {
      setSelectedBehaviors((prev) => prev.filter((b) => b !== behavior));
    } else if (selectedBehaviors.length < 3) {
      setSelectedBehaviors((prev) => [...prev, behavior]);
    }
  };

  const addCustomBehavior = () => {
    if (
      customBehavior.trim() &&
      !selectedBehaviors.includes(customBehavior.trim()) &&
      selectedBehaviors.length < 3
    ) {
      setSelectedBehaviors((prev) => [...prev, customBehavior.trim()]);
      setCustomBehavior('');
    }
  };

  const handleNext = () => {
    if (selectedBehaviors.length > 0) {
      createTargetsMutation.mutate(selectedBehaviors);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Quelles sont vos priorités ?</Text>
          <Text style={styles.subtitle}>
            Choisissez jusqu'à 3 comportements à améliorer
          </Text>
          <Text style={styles.count}>
            {selectedBehaviors.length}/3 sélectionnés
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggestions</Text>
          <View style={styles.chips}>
            {SUGGESTED_BEHAVIORS.map((behavior) => (
              <TouchableOpacity
                key={behavior}
                style={[
                  styles.chip,
                  selectedBehaviors.includes(behavior) && styles.chipSelected,
                  selectedBehaviors.length >= 3 &&
                    !selectedBehaviors.includes(behavior) &&
                    styles.chipDisabled,
                ]}
                onPress={() => toggleBehavior(behavior)}
                disabled={
                  selectedBehaviors.length >= 3 &&
                  !selectedBehaviors.includes(behavior)
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedBehaviors.includes(behavior) && styles.chipTextSelected,
                  ]}
                >
                  {behavior}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comportement personnalisé</Text>
          <View style={styles.customInput}>
            <TextInput
              style={styles.input}
              value={customBehavior}
              onChangeText={setCustomBehavior}
              placeholder="Ex: Ranger ses jouets"
              placeholderTextColor="#9CA3AF"
              editable={selectedBehaviors.length < 3}
              onSubmitEditing={addCustomBehavior}
              returnKeyType="done"
            />
            <Button
              title="Ajouter"
              onPress={addCustomBehavior}
              disabled={
                !customBehavior.trim() || selectedBehaviors.length >= 3
              }
              size="small"
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Continuer"
            onPress={handleNext}
            disabled={selectedBehaviors.length === 0}
            loading={createTargetsMutation.isPending}
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
    marginTop: 20,
    marginBottom: 24,
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
    marginBottom: 12,
  },
  count: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5B4BCC',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    borderColor: '#5B4BCC',
    backgroundColor: '#EDE9FE',
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    fontSize: 15,
    color: '#6B7280',
  },
  chipTextSelected: {
    color: '#5B4BCC',
    fontWeight: '600',
  },
  customInput: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  footer: {
    marginTop: 16,
    marginBottom: 24,
  },
});
