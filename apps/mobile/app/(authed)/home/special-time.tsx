/**
 * Special Time (Moment Spécial) Module Screen
 *
 * 4 sections: Learn, Goal, Practice, Review
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
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSpecialTimeSession,
  getModules,
  getSpecialTimeSessions,
  updateModuleGoal,
} from '../../../src/api/modules';
import { appStorage } from '../../../src/lib/storage';
import { Button } from '../../../src/components/Button';

export default function SpecialTimeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [childId, setChildId] = React.useState<number | null>(null);

  // Form state
  const [durationMin, setDurationMin] = useState('15');
  const [activity, setActivity] = useState('');
  const [childEnjoyed, setChildEnjoyed] = useState(true);
  const [notes, setNotes] = useState('');
  const [goalPerWeek, setGoalPerWeek] = useState(5);

  // Load child ID
  React.useEffect(() => {
    async function loadChildId() {
      // Ensure we have auth tokens before loading
      const { isAuthenticated } = await import('../../../src/api/auth');
      const hasAuth = await isAuthenticated();

      if (!hasAuth) {
        console.error('❌ No auth token. Redirecting to onboarding.');
        await appStorage.clearAppData();
        router.replace('/(public)/onboarding/age');
        return;
      }

      const id = await appStorage.getChildId();
      setChildId(id);
    }
    loadChildId();
  }, []);

  // Fetch modules and progress
  const { data: modules, isLoading: isLoadingModules, error: modulesError } = useQuery({
    queryKey: ['modules', childId],
    queryFn: () => {
      console.log('🔄 Fetching modules for child:', childId);
      return getModules(childId!);
    },
    enabled: !!childId,
    retry: 2,
  });

  React.useEffect(() => {
    console.log('🔍 Query state - isLoading:', isLoadingModules, 'childId:', childId, 'enabled:', !!childId);
    if (modulesError) {
      console.error('❌ Error fetching modules:', modulesError);
    }
    if (modules !== undefined) {
      console.log('📦 Modules received:', modules);
      console.log('📦 Module count:', modules.length);
      console.log('📦 Module keys:', modules.map(m => m.key));
      console.log('📦 Full module data:', JSON.stringify(modules, null, 2));
    }
  }, [modules, modulesError, isLoadingModules, childId]);

  const specialTimeModule = modules?.find((m) => m.key === 'special_time');

  React.useEffect(() => {
    if (specialTimeModule) {
      console.log('✅ Special Time module found:', specialTimeModule);
    } else if (modules && modules.length > 0) {
      console.log('❌ Special Time module NOT found in:', modules);
    }
  }, [specialTimeModule, modules]);

  // Fetch sessions
  const { data: sessionsData, isLoading: isLoadingSessions } = useQuery({
    queryKey: ['special-time-sessions', childId],
    queryFn: () => getSpecialTimeSessions(childId!, '21d'),
    enabled: !!childId,
    retry: 2,
  });

  const sessions = sessionsData?.results || [];

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: createSpecialTimeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      queryClient.invalidateQueries({ queryKey: ['special-time-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      // Reset form
      setActivity('');
      setNotes('');
      setDurationMin('15');
      setChildEnjoyed(true);
    },
    // Success and error handling done globally by QueryClient
    meta: {
      showSuccessToast: true,
      action: 'special-time-session-created',
    },
  });

  // Update goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: (goal: number) => {
      if (!specialTimeModule) throw new Error('Module not found');
      return updateModuleGoal(specialTimeModule.id, goal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
    // Success and error handling done globally by QueryClient
    meta: {
      showSuccessToast: true,
      action: 'module-goal-updated',
    },
  });

  const handleSubmit = () => {
    if (!childId) return;

    const duration = parseInt(durationMin, 10);

    createSessionMutation.mutate({
      child: childId,
      duration_min: duration,
      activity,
      child_enjoyed: childEnjoyed,
      notes,
    });
  };

  const handleUpdateGoal = () => {
    // Backend will handle validation
    updateGoalMutation.mutate(goalPerWeek);
  };

  // Show loading while child ID is being loaded or queries are running
  if (!childId || isLoadingModules) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If module not found after loading, show error
  if (!specialTimeModule) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.errorText}>Module introuvable</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { counters, state, passed_at } = specialTimeModule;
  const progress = (counters.sessions_21d / 6) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Moment Spécial</Text>
          {state === 'passed' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✓ Complété</Text>
            </View>
          )}
        </View>

        {/* 1. LEARN Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Qu'est-ce que le Moment Spécial ?</Text>
          <View style={styles.card}>
            <Text style={styles.cardText}>
              Le <Text style={styles.bold}>Moment Spécial</Text> est un temps de qualité de 10-20 minutes avec votre enfant, où{' '}
              <Text style={styles.bold}>il choisit l'activité</Text> et dirige le jeu.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardSubtitle}>✅ À faire</Text>
            <Text style={styles.cardText}>
              • Laissez votre enfant choisir l'activité{'\n'}
              • Suivez son imagination{'\n'}
              • Commentez ce qu'il fait{'\n'}
              • Montrez votre enthousiasme
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardSubtitle}>❌ À éviter</Text>
            <Text style={styles.cardText}>
              • Donner des ordres ou des consignes{'\n'}
              • Poser trop de questions{'\n'}
              • Corriger ou critiquer{'\n'}
              • Utiliser les écrans (TV, tablette)
            </Text>
          </View>
        </View>

        {/* 2. GOAL Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Mon Objectif</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Sessions par semaine</Text>
            <View style={styles.goalRow}>
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.goalButton,
                    goalPerWeek === num && styles.goalButtonActive,
                  ]}
                  onPress={() => setGoalPerWeek(num)}
                >
                  <Text
                    style={[
                      styles.goalButtonText,
                      goalPerWeek === num && styles.goalButtonTextActive,
                    ]}
                  >
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {goalPerWeek !== counters.goal_per_week && (
              <Button
                title="Enregistrer l'objectif"
                onPress={handleUpdateGoal}
                size="small"
                style={{ marginTop: 12 }}
              />
            )}
          </View>
        </View>

        {/* 3. PRACTICE Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✏️ Enregistrer une Session</Text>
          <View style={styles.card}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Durée (minutes)</Text>
              <TextInput
                style={styles.input}
                value={durationMin}
                onChangeText={setDurationMin}
                keyboardType="number-pad"
                placeholder="15"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Activité (optionnel)</Text>
              <TextInput
                style={styles.input}
                value={activity}
                onChangeText={setActivity}
                placeholder="Ex: Lego, dessin, cache-cache..."
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Votre enfant a-t-il apprécié ?</Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>{childEnjoyed ? 'Oui ✓' : 'Non'}</Text>
                <Switch
                  value={childEnjoyed}
                  onValueChange={setChildEnjoyed}
                  trackColor={{ false: '#E5E7EB', true: '#8B7FE8' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Commentaires..."
                multiline
                numberOfLines={3}
              />
            </View>

            <Button
              title="Enregistrer la session"
              onPress={handleSubmit}
              disabled={createSessionMutation.isPending}
              size="large"
            />
          </View>
        </View>

        {/* 4. REVIEW Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Ma Progression</Text>

          <View style={styles.card}>
            <Text style={styles.progressLabel}>Critères de réussite</Text>
            <View style={styles.criteriaRow}>
              <Text style={styles.criteriaText}>
                Sessions (21 jours): <Text style={styles.bold}>{counters.sessions_21d}/6</Text>
              </Text>
              {counters.sessions_21d >= 6 ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <View style={styles.criteriaRow}>
              <Text style={styles.criteriaText}>
                Appréciées (6 dernières): <Text style={styles.bold}>{counters.liked_last6}/4</Text>
              </Text>
              {counters.liked_last6 >= 4 ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>

            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}% complété</Text>

            {state === 'passed' && passed_at && (
              <View style={styles.successBanner}>
                <Text style={styles.successText}>
                  🎉 Module complété le {new Date(passed_at).toLocaleDateString()} !
                </Text>
              </View>
            )}
          </View>

          {sessions.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardSubtitle}>Dernières sessions</Text>
              {sessions.slice(0, 5).map((session) => (
                <View key={session.id} style={styles.sessionRow}>
                  <Text style={styles.sessionDate}>
                    {new Date(session.datetime).toLocaleDateString()}
                  </Text>
                  <Text style={styles.sessionActivity}>
                    {session.activity || 'Sans titre'} ({session.duration_min} min)
                  </Text>
                  <Text style={styles.sessionIcon}>{session.child_enjoyed ? '😊' : '😐'}</Text>
                </View>
              ))}
            </View>
          )}
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
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
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
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
    marginBottom: 8,
  },
  cardText: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  bold: {
    fontWeight: '600',
    color: '#1F2937',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
  goalRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  goalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  goalButtonActive: {
    backgroundColor: '#5B4BCC',
    borderColor: '#5B4BCC',
  },
  goalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  goalButtonTextActive: {
    color: '#FFFFFF',
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  criteriaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  criteriaText: {
    fontSize: 15,
    color: '#6B7280',
  },
  checkmark: {
    fontSize: 20,
    color: '#10B981',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#5B4BCC',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  successBanner: {
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  successText: {
    fontSize: 15,
    color: '#047857',
    fontWeight: '600',
    textAlign: 'center',
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sessionDate: {
    fontSize: 14,
    color: '#6B7280',
    width: 80,
  },
  sessionActivity: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  sessionIcon: {
    fontSize: 20,
  },
});
