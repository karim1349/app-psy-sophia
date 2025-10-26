/**
 * Command palette / Quick actions modal
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const ACTIONS = [
  { id: 'special-time', label: '⏱️ Log Special Time', action: 'log-special-time' },
  { id: 'timeout', label: '⏸️ Start Time-out', action: 'start-timeout' },
  { id: 'breathing', label: '🌬️ Breathing Exercise', action: 'breathing' },
  { id: 'timer', label: '⏲️ Timer', action: 'timer' },
  { id: 'thermometer', label: '🌡️ Emotion Thermometer', action: 'thermometer' },
];

export default function CommandModal() {
  const router = useRouter();

  const handleAction = (action: string) => {
    console.log('Action:', action);
    // TODO: Implement actions
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Actions rapides</Text>

        <View style={styles.actions}>
          {ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionCard}
              onPress={() => handleAction(action.action)}
            >
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 24,
  },
  actions: {
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
});
