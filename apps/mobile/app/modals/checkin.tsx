/**
 * Daily check-in modal
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Slider from '@react-native-community/slider';
import { Button } from '../../src/components/Button';
import { upsertCheckin } from '../../src/api/onboarding';
import { appStorage } from '../../src/lib/storage';
import { ToastContainer } from '../../src/components/Toast';

const MOOD_LABELS = [
  '😞 Très difficile',
  '😕 Difficile',
  '😐 Moyen',
  '🙂 Bien',
  '😄 Excellent',
];

export default function CheckinModal() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mood, setMood] = useState(3);
  const [notes, setNotes] = useState('');
  const [childId, setChildId] = React.useState<number | null>(null);

  React.useEffect(() => {
    appStorage.getChildId().then(setChildId);
  }, []);

  const checkinMutation = useMutation({
    mutationFn: async () => {
      if (!childId) throw new Error('No child ID');

      const today = new Date().toISOString().split('T')[0];

      return upsertCheckin(childId, {
        date: today,
        mood,
        behaviors: [], // Simplified: would include actual behaviors
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.back();
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.title}>Comment s&apos;est passée la journée ?</Text>

          <View style={styles.moodSection}>
            <Text style={styles.label}>Humeur générale</Text>
            <Text style={styles.moodLabel}>{MOOD_LABELS[mood - 1]}</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={5}
              step={1}
              value={mood}
              onValueChange={setMood}
              minimumTrackTintColor="#5B4BCC"
              maximumTrackTintColor="#E5E7EB"
              thumbTintColor="#5B4BCC"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>1</Text>
              <Text style={styles.sliderLabel}>2</Text>
              <Text style={styles.sliderLabel}>3</Text>
              <Text style={styles.sliderLabel}>4</Text>
              <Text style={styles.sliderLabel}>5</Text>
            </View>
          </View>

          <View style={styles.notesSection}>
            <Text style={styles.label}>Notes (optionnel)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Ajoutez des notes sur la journée..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Enregistrer"
            onPress={() => checkinMutation.mutate()}
            loading={checkinMutation.isPending}
            size="large"
          />
          <Button
            title="Annuler"
            variant="outline"
            onPress={() => router.back()}
            size="large"
          />
        </View>
      </ScrollView>
      
      {/* Toast container for modal */}
      <ToastContainer />
    </View>
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
  section: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 24,
  },
  moodSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  moodLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#5B4BCC',
    textAlign: 'center',
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  notesSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },
  notesInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 100,
  },
  footer: {
    gap: 12,
    marginBottom: 24,
  },
});
