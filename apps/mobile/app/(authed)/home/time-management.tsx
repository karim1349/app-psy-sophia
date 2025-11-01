/**
 * Time Management (La gestion du temps) Module Screen
 *
 * Helps parents create routines and track on-time completion
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
  createRoutine,
  createRoutineCompletion,
  getModules,
  getRoutineCompletions,
  getRoutines,
  getRoutineTemplates,
} from '../../../src/api/modules';
import { appStorage } from '../../../src/lib/storage';
import { Button } from '../../../src/components/Button';
import type { RoutineType } from '../../../src/types/api';

export default function TimeManagementScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [childId, setChildId] = React.useState<number | null>(null);

  // Section state
  const [activeSection, setActiveSection] = useState<'learn' | 'practice' | 'review'>('learn');

  // Routine creation form state
  const [routineType, setRoutineType] = useState<RoutineType>('morning');
  const [routineTitle, setRoutineTitle] = useState('');
  const [routineSteps, setRoutineSteps] = useState('');
  const [targetTime, setTargetTime] = useState('08:00');

  // Completion logging form state
  const [selectedRoutineId, setSelectedRoutineId] = useState<number | null>(null);
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0]);
  const [wasOnTime, setWasOnTime] = useState(true);
  const [completionTime, setCompletionTime] = useState('');

  // Load child ID
  React.useEffect(() => {
    async function loadChildId() {
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
  const { data: modules, isLoading: isLoadingModules } = useQuery({
    queryKey: ['modules', childId],
    queryFn: () => getModules(childId!),
    enabled: !!childId,
    retry: 2,
  });

  const timeManagementModule = modules?.find((m) => m.key === 'time_management');

  // Fetch routines
  const { data: routinesData } = useQuery({
    queryKey: ['routines', childId],
    queryFn: () => getRoutines(childId!),
    enabled: !!childId,
    retry: 2,
  });

  const routines = routinesData?.results || [];

  // Fetch routine completions
  const { data: completionsData } = useQuery({
    queryKey: ['routine-completions', childId],
    queryFn: () => getRoutineCompletions(childId!, '7d'),
    enabled: !!childId,
    retry: 2,
  });

  const completions = completionsData?.results || [];

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ['routine-templates'],
    queryFn: getRoutineTemplates,
  });

  // Create routine mutation
  const createRoutineMutation = useMutation({
    mutationFn: createRoutine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      queryClient.invalidateQueries({ queryKey: ['modules'] });

      // Reset form
      setRoutineTitle('');
      setRoutineSteps('');
      setTargetTime('08:00');
    },
    meta: {
      showSuccessToast: true,
      action: 'routine-created',
    },
  });

  // Create completion mutation
  const createCompletionMutation = useMutation({
    mutationFn: createRoutineCompletion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-completions'] });
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      // Reset form
      setCompletionTime('');
      setWasOnTime(true);
    },
    meta: {
      showSuccessToast: true,
      action: 'routine-completion-logged',
    },
  });

  const handleCreateRoutine = () => {
    if (!childId || !routineTitle || !routineSteps) return;

    const steps = routineSteps.split('\n').filter((s) => s.trim());
    if (steps.length === 0) return;

    createRoutineMutation.mutate({
      child: childId,
      routine_type: routineType,
      title: routineTitle,
      steps,
      target_time: targetTime,
      is_custom: true,
    });
  };

  const handleLogCompletion = () => {
    if (!childId || !selectedRoutineId) return;

    const routine = routines.find((r) => r.id === selectedRoutineId);
    if (!routine) return;

    createCompletionMutation.mutate({
      child: childId,
      routine: selectedRoutineId,
      routine_type: routine.routine_type,
      date: completionDate,
      was_on_time: wasOnTime,
      completion_time: completionTime || undefined,
    });
  };

  const handleUseTemplate = (type: RoutineType) => {
    if (!templates) return;

    const template = templates[type]?.[0];
    if (!template) return;

    setRoutineType(type);
    setRoutineTitle(template.title);
    setRoutineSteps(template.steps.join('\n'));
    setTargetTime(template.target_time);
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
  if (!timeManagementModule) {
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

  const { counters, state } = timeManagementModule;
  const onTimeDays = counters.on_time_days_count || 0;
  const progress = (onTimeDays / 3) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>La gestion du temps</Text>
          {state === 'passed' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✓ Terminé</Text>
            </View>
          )}
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Progression</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {onTimeDays} jours à l'heure sur 5 (besoin: 3)
          </Text>
          {state === 'passed' && (
            <Text style={styles.successText}>🎉 Module terminé !</Text>
          )}
        </View>

        {/* Section Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeSection === 'learn' && styles.tabActive]}
            onPress={() => setActiveSection('learn')}
          >
            <Text style={[styles.tabText, activeSection === 'learn' && styles.tabTextActive]}>
              Apprendre
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeSection === 'practice' && styles.tabActive]}
            onPress={() => setActiveSection('practice')}
          >
            <Text style={[styles.tabText, activeSection === 'practice' && styles.tabTextActive]}>
              Pratiquer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeSection === 'review' && styles.tabActive]}
            onPress={() => setActiveSection('review')}
          >
            <Text style={[styles.tabText, activeSection === 'review' && styles.tabTextActive]}>
              Réviser
            </Text>
          </TouchableOpacity>
        </View>

        {/* Learn Section */}
        {activeSection === 'learn' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pourquoi les routines ?</Text>
            <Text style={styles.sectionText}>
              Les enfants avec TDAH ont souvent des difficultés avec la gestion du temps et
              l'organisation. Les routines visuelles aident à :
            </Text>
            <Text style={styles.bulletPoint}>• Réduire l'anxiété du matin et du soir</Text>
            <Text style={styles.bulletPoint}>• Gagner en autonomie</Text>
            <Text style={styles.bulletPoint}>• Améliorer la ponctualité</Text>
            <Text style={styles.bulletPoint}>• Renforcer la confiance en soi</Text>

            <Text style={styles.sectionTitle}>Types de routines</Text>
            <Text style={styles.sectionText}>
              Créez des routines pour les moments clés de la journée :
            </Text>
            <View style={styles.routineTypeCard}>
              <Text style={styles.routineTypeTitle}>🌅 Routine du matin</Text>
              <Text style={styles.routineTypeDesc}>
                De se réveiller jusqu'au départ pour l'école
              </Text>
            </View>
            <View style={styles.routineTypeCard}>
              <Text style={styles.routineTypeTitle}>🌙 Routine du soir</Text>
              <Text style={styles.routineTypeDesc}>Du dîner jusqu'au coucher</Text>
            </View>
            <View style={styles.routineTypeCard}>
              <Text style={styles.routineTypeTitle}>📋 Routine du dimanche soir</Text>
              <Text style={styles.routineTypeDesc}>
                Préparer la semaine (vêtements, sac, devoirs)
              </Text>
            </View>
          </View>
        )}

        {/* Practice Section - Create Routine */}
        {activeSection === 'practice' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Créer une routine</Text>

            {/* Template Buttons */}
            <View style={styles.templateButtons}>
              <TouchableOpacity
                style={styles.templateButton}
                onPress={() => handleUseTemplate('morning')}
              >
                <Text style={styles.templateButtonText}>📋 Utiliser modèle matin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.templateButton}
                onPress={() => handleUseTemplate('evening')}
              >
                <Text style={styles.templateButtonText}>📋 Utiliser modèle soir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.templateButton}
                onPress={() => handleUseTemplate('sunday')}
              >
                <Text style={styles.templateButtonText}>📋 Utiliser modèle dimanche</Text>
              </TouchableOpacity>
            </View>

            {/* Routine Type */}
            <Text style={styles.label}>Type de routine</Text>
            <View style={styles.routineTypePicker}>
              <TouchableOpacity
                style={[
                  styles.routineTypeOption,
                  routineType === 'morning' && styles.routineTypeOptionActive,
                ]}
                onPress={() => setRoutineType('morning')}
              >
                <Text>Matin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.routineTypeOption,
                  routineType === 'evening' && styles.routineTypeOptionActive,
                ]}
                onPress={() => setRoutineType('evening')}
              >
                <Text>Soir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.routineTypeOption,
                  routineType === 'sunday' && styles.routineTypeOptionActive,
                ]}
                onPress={() => setRoutineType('sunday')}
              >
                <Text>Dimanche</Text>
              </TouchableOpacity>
            </View>

            {/* Title */}
            <Text style={styles.label}>Titre de la routine</Text>
            <TextInput
              style={styles.input}
              placeholder="Ma routine du matin"
              value={routineTitle}
              onChangeText={setRoutineTitle}
            />

            {/* Steps */}
            <Text style={styles.label}>Étapes (une par ligne)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={'Se réveiller\nSe brosser les dents\nS\'habiller'}
              value={routineSteps}
              onChangeText={setRoutineSteps}
              multiline
              numberOfLines={6}
            />

            {/* Target Time */}
            <Text style={styles.label}>Heure cible (HH:MM)</Text>
            <TextInput
              style={styles.input}
              placeholder="08:00"
              value={targetTime}
              onChangeText={setTargetTime}
            />

            <Button
              onPress={handleCreateRoutine}
              disabled={
                !routineTitle || !routineSteps || createRoutineMutation.isPending
              }
              style={{ marginTop: 16 }}
            >
              {createRoutineMutation.isPending ? 'Création...' : 'Créer la routine'}
            </Button>

            {/* Log Completion */}
            <View style={styles.separator} />

            <Text style={styles.sectionTitle}>Enregistrer une completion</Text>

            {routines.length === 0 ? (
              <Text style={styles.emptyText}>
                Créez d'abord une routine pour enregistrer des complétions
              </Text>
            ) : (
              <>
                <Text style={styles.label}>Choisir une routine</Text>
                <View style={styles.routineList}>
                  {routines.map((routine) => (
                    <TouchableOpacity
                      key={routine.id}
                      style={[
                        styles.routineItem,
                        selectedRoutineId === routine.id && styles.routineItemActive,
                      ]}
                      onPress={() => setSelectedRoutineId(routine.id)}
                    >
                      <Text style={styles.routineItemTitle}>{routine.title}</Text>
                      <Text style={styles.routineItemTarget}>
                        Cible: {routine.target_time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={completionDate}
                  onChangeText={setCompletionDate}
                  placeholder="YYYY-MM-DD"
                />

                <View style={styles.switchRow}>
                  <Text style={styles.label}>À l'heure ?</Text>
                  <Switch value={wasOnTime} onValueChange={setWasOnTime} />
                </View>

                <Text style={styles.label}>Heure de completion (optionnel)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM"
                  value={completionTime}
                  onChangeText={setCompletionTime}
                />

                <Button
                  onPress={handleLogCompletion}
                  disabled={!selectedRoutineId || createCompletionMutation.isPending}
                  style={{ marginTop: 16 }}
                >
                  {createCompletionMutation.isPending
                    ? 'Enregistrement...'
                    : 'Enregistrer'}
                </Button>
              </>
            )}
          </View>
        )}

        {/* Review Section */}
        {activeSection === 'review' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historique (7 derniers jours)</Text>

            {completions.length === 0 ? (
              <Text style={styles.emptyText}>Aucune completion enregistrée</Text>
            ) : (
              completions.map((completion) => (
                <View key={completion.id} style={styles.completionCard}>
                  <View style={styles.completionHeader}>
                    <Text style={styles.completionDate}>{completion.date}</Text>
                    <Text
                      style={[
                        styles.completionStatus,
                        completion.was_on_time
                          ? styles.completionStatusOnTime
                          : styles.completionStatusLate,
                      ]}
                    >
                      {completion.was_on_time ? '✓ À l\'heure' : '✗ En retard'}
                    </Text>
                  </View>
                  <Text style={styles.completionType}>{completion.routine_type}</Text>
                  {completion.completion_time && (
                    <Text style={styles.completionTime}>
                      Completé à: {completion.completion_time}
                    </Text>
                  )}
                </View>
              ))
            )}

            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Statistiques</Text>
              <Text style={styles.statsText}>
                Total de complétions: {completions.length}
              </Text>
              <Text style={styles.statsText}>
                À l'heure: {completions.filter((c) => c.was_on_time).length}
              </Text>
              <Text style={styles.statsText}>
                En retard: {completions.filter((c) => !c.was_on_time).length}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 16,
    color: '#4F46E5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  badge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#10b981',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  progressCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  successText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#4F46E5',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#fff',
  },
  section: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1f2937',
  },
  sectionText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 6,
    lineHeight: 20,
  },
  routineTypeCard: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  routineTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  routineTypeDesc: {
    fontSize: 14,
    color: '#6b7280',
  },
  templateButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  templateButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
  },
  templateButtonText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  routineTypePicker: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  routineTypeOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  routineTypeOptionActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
    marginVertical: 16,
  },
  routineList: {
    marginBottom: 16,
  },
  routineItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginBottom: 8,
  },
  routineItemActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#4F46E5',
  },
  routineItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  routineItemTarget: {
    fontSize: 12,
    color: '#6b7280',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  completionCard: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  completionDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  completionStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  completionStatusOnTime: {
    color: '#10b981',
  },
  completionStatusLate: {
    color: '#ef4444',
  },
  completionType: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  completionTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  statsCard: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#ede9fe',
    borderRadius: 8,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
});
