/**
 * Effective Commands (Ordres Efficaces) Module Screen
 *
 * 4 sections: Learn, Goal, Practice, Review
 * Follows the same pattern as special-time.tsx
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getModules,
  getEffectiveCommandObjectives,
  createEffectiveCommandObjectives,
  getEffectiveCommandLogs,
  createEffectiveCommandLog,
  updateInitialRepetitions,
} from '../../../src/api/modules';
import { appStorage } from '../../../src/lib/storage';
import { useUIStore } from '../../../src/store/ui';
import type {
  ModuleWithProgress,
  EffectiveCommandObjective,
  EffectiveCommandLog,
  ChildCompletionType,
  FailureReason,
} from '../../../src/types/api';

// Default objective options
const DEFAULT_OBJECTIVES = [
  'Aller se brosser les dents',
  'Se mettre en pyjama',
  'Aller au lit',
  'Mettre la table',
  'Ranger son assiette',
  'Aller prendre son bain',
  'Préparer son cartable',
  'Mettre ses chaussures',
];

export default function EffectiveCommandsScreen() {
  const queryClient = useQueryClient();
  const showToast = useUIStore((state) => state.showToast);
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Get childId from storage
  const [childId, setChildId] = useState<number | null>(null);
  const [isLoadingChild, setIsLoadingChild] = useState(true);

  // Load childId from storage on mount
  React.useEffect(() => {
    async function loadChildId() {
      const id = await appStorage.getChildId();
      if (id) {
        setChildId(id);
      }
      setIsLoadingChild(false);
    }
    loadChildId();
  }, []);

  // State for Learn section
  const [initialRepAverage, setInitialRepAverage] = useState<string>('');
  const [hasSetInitialRep, setHasSetInitialRep] = useState(false);

  // State for Goal section
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);
  const [customObjective, setCustomObjective] = useState('');

  // State for Practice section (question flow)
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<number | null>(null);
  const [step, setStep] = useState<number>(0); // 0 = select objective, 1 = gave command?, 2 = completed?, 3 = details
  const [gaveCommand, setGaveCommand] = useState<boolean | null>(null);
  const [completed, setCompleted] = useState<ChildCompletionType | null>(null);
  const [repetitions, setRepetitions] = useState<string>('');
  const [failureReason, setFailureReason] = useState<FailureReason | null>(null);
  const [notes, setNotes] = useState('');

  // Queries
  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ['modules', childId],
    queryFn: () => getModules(childId!),
    enabled: !!childId,
    retry: 2,
    staleTime: 0, // Always consider data stale
    refetchOnWindowFocus: true,
  });

  const effectiveCommandsModule = modules?.find(m => m.key === 'effective_commands');

  const { data: objectivesData, isLoading: objectivesLoading } = useQuery({
    queryKey: ['effective-command-objectives', childId],
    queryFn: () => getEffectiveCommandObjectives(childId!),
    enabled: !!childId,
    retry: 2,
    staleTime: 0, // Always consider data stale
    refetchOnWindowFocus: true,
  });

  const objectives = objectivesData?.results || [];

  const { data: logsData } = useQuery({
    queryKey: ['effective-command-logs', childId],
    queryFn: () => getEffectiveCommandLogs(childId!, undefined, '30d'),
    enabled: !!childId,
    retry: 2,
    staleTime: 0, // Always consider data stale
    refetchOnWindowFocus: true,
  });

  const logs = logsData?.results || [];

  // Mutations
  const createObjectivesMutation = useMutation({
    mutationFn: createEffectiveCommandObjectives,
    onSuccess: async () => {
      // Force immediate refetch
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['effective-command-objectives', childId] }),
        queryClient.refetchQueries({ queryKey: ['modules', childId] }),
      ]);

      setSelectedObjectives([]);
      setCustomObjective('');
      showToast('success', 'Objectifs créés avec succès !', 'Succès');
    },
    onError: (error: any) => {
      showToast('error', error.message || 'Impossible de créer les objectifs', 'Erreur');
    },
  });

  const createLogMutation = useMutation({
    mutationFn: createEffectiveCommandLog,
    onSuccess: async (data) => {
      console.log('✅ Log created successfully:', data.log);
      console.log('📊 Updated progress from server:', data.progress);
      console.log('📊 Counters:', data.progress.counters);
      console.log('📊 Objectives with 5+ days:', data.progress.counters?.objectives_with_5plus_days);

      // Force immediate refetch of both queries
      const [logsResult, modulesResult] = await Promise.all([
        queryClient.refetchQueries({ queryKey: ['effective-command-logs', childId] }),
        queryClient.refetchQueries({ queryKey: ['modules', childId] }),
      ]);

      console.log('🔄 Queries refetched successfully');
      console.log('📦 Logs refetch result:', logsResult);
      console.log('📦 Modules refetch result:', modulesResult);

      // Log what the queries now return
      const updatedLogs = queryClient.getQueryData(['effective-command-logs', childId]);
      const updatedModules = queryClient.getQueryData(['modules', childId]);
      console.log('📊 Updated logs in cache:', updatedLogs);
      console.log('📊 Updated modules in cache:', updatedModules);

      const updatedModule = (updatedModules as any)?.find((m: any) => m.key === 'effective_commands');
      console.log('📊 Updated effective commands module:', updatedModule);
      console.log('📊 Updated objectivesWithProgress:', updatedModule?.counters?.objectives_with_5plus_days);

      // Reset form first
      resetPracticeForm();

      // Scroll to Goal section to show updated progress
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);

      showToast('success', getSuccessMessage(), 'Bravo !');
    },
    onError: (error: any) => {
      console.error('❌ Failed to create log:', error);
      showToast('error', error.message || 'Impossible d\'enregistrer l\'entrée', 'Erreur');
    },
  });

  const updateInitialRepMutation = useMutation({
    mutationFn: ({ progressId, average }: { progressId: number; average: number }) =>
      updateInitialRepetitions(progressId, average),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      setHasSetInitialRep(true);
      showToast('success', 'Votre moyenne initiale a été enregistrée', 'Enregistré');
    },
  });

  // Handlers
  const handleSetInitialAverage = () => {
    const average = parseInt(initialRepAverage);
    if (!average || average < 1) {
      showToast('error', 'Veuillez entrer un nombre valide', 'Erreur');
      return;
    }
    if (!effectiveCommandsModule) {
      showToast('error', 'Module non trouvé', 'Erreur');
      return;
    }
    updateInitialRepMutation.mutate({
      progressId: effectiveCommandsModule.progress_id,
      average,
    });
  };

  const handleCreateObjectives = () => {
    if (selectedObjectives.length === 0) {
      showToast('error', 'Veuillez sélectionner au moins un objectif', 'Erreur');
      return;
    }

    const labels = [...selectedObjectives];
    if (customObjective.trim()) {
      labels.push(customObjective.trim());
    }

    createObjectivesMutation.mutate({
      child: childId!,
      labels,
    });
  };

  const toggleObjective = (label: string) => {
    if (selectedObjectives.includes(label)) {
      setSelectedObjectives(selectedObjectives.filter(l => l !== label));
    } else {
      setSelectedObjectives([...selectedObjectives, label]);
    }
  };

  const handleStartLog = (objectiveId: number) => {
    setSelectedObjectiveId(objectiveId);
    setStep(1);
  };

  const resetPracticeForm = () => {
    setSelectedObjectiveId(null);
    setStep(0);
    setGaveCommand(null);
    setCompleted(null);
    setRepetitions('');
    setFailureReason(null);
    setNotes('');
  };

  const handleSubmitLog = (
    gaveEffectiveCommand?: boolean,
    childCompleted?: ChildCompletionType | null,
    repsCount?: string,
    failReason?: FailureReason | null
  ) => {
    if (!selectedObjectiveId) return;

    // Use provided params or fall back to state
    const effectiveCommand = gaveEffectiveCommand ?? gaveCommand;
    const completedValue = childCompleted ?? completed;
    const reps = repsCount ?? repetitions;
    const reason = failReason ?? failureReason;

    const today = new Date().toISOString().split('T')[0];

    console.log('📝 Submitting log with:', {
      effectiveCommand,
      completedValue,
      reps,
      reason,
    });

    createLogMutation.mutate({
      child: childId!,
      objective: selectedObjectiveId,
      date: today,
      gave_effective_command: effectiveCommand!,
      child_completed: effectiveCommand ? completedValue : null,
      repetitions_count:
        completedValue === 'not_directly' && reps
          ? parseInt(reps)
          : null,
      failure_reason: completedValue === 'not_completed' ? reason : null,
      notes: notes.trim(),
    });
  };

  const getSuccessMessage = (): string => {
    if (!gaveCommand) {
      return 'Pas de souci, continuez à pratiquer ! Les habitudes changent petit à petit.';
    }
    if (completed === 'first_try') {
      return 'Excellent ! Votre enfant a réussi du premier coup. Continuez comme ça !';
    }
    if (completed === 'not_directly') {
      const avg = effectiveCommandsModule?.counters?.initial_repetition_average || 5;
      const reps = parseInt(repetitions);
      if (reps < avg) {
        return 'Bravo ! C\'est une évolution, les habitudes changent pas à pas. Continuez vos efforts !';
      }
      return 'Continuez à pratiquer, vous êtes sur la bonne voie !';
    }
    return 'Merci d\'avoir partagé cette expérience. Continuez à pratiquer !';
  };

  // Calculate progress for each objective
  const getObjectiveProgress = (objectiveId: number) => {
    const objectiveLogs = logs.filter(log => log.objective === objectiveId);
    const avg = effectiveCommandsModule?.counters?.initial_repetition_average || 5;

    const satisfyingLogs = objectiveLogs.filter(
      log =>
        log.gave_effective_command &&
        (log.child_completed === 'first_try' ||
          (log.child_completed === 'not_directly' &&
            log.repetitions_count !== null &&
            log.repetitions_count < avg))
    );

    const result = {
      total: objectiveLogs.length,
      satisfying: satisfyingLogs.length,
      percentage: satisfyingLogs.length > 0 ? (satisfyingLogs.length / 5) * 100 : 0,
    };

    console.log(`📊 Objective ${objectiveId} progress:`, result,
      `(${satisfyingLogs.length} satisfying out of ${objectiveLogs.length} total logs, threshold: ${avg})`);

    return result;
  };

  if (isLoadingChild || modulesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!childId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Aucun enfant trouvé</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!effectiveCommandsModule) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Module non trouvé</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPassed = effectiveCommandsModule.state === 'passed';
  const objectivesWithProgress = effectiveCommandsModule.counters?.objectives_with_5plus_days || [];

  // Debug logging to see what's being rendered
  console.log('🎨 Rendering with:', {
    objectivesCount: objectives.length,
    logsCount: logs.length,
    objectivesWithProgress,
    moduleState: effectiveCommandsModule.state,
    counters: effectiveCommandsModule.counters,
  });

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Ordres Efficaces</Text>
        {isPassed && (
          <View style={styles.passedBadge}>
            <Text style={styles.passedBadgeText}>✓ Complété</Text>
          </View>
        )}
      </View>

      {/* Section 1: Learn */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📚 Apprendre</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Qu'est-ce qu'un ordre efficace ?</Text>
          <Text style={styles.cardText}>
            Apprendre à formuler un ordre de manière efficace pour ne pas avoir à le répéter plusieurs fois à votre enfant TDAH.
          </Text>
        </View>

        {!hasSetInitialRep && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Question de départ</Text>
            <Text style={styles.cardText}>
              En moyenne, combien de fois devez-vous répéter les choses à votre enfant avant qu'il fasse ce que vous lui demandiez ?
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 5"
              keyboardType="number-pad"
              value={initialRepAverage}
              onChangeText={setInitialRepAverage}
            />
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSetInitialAverage}
              disabled={updateInitialRepMutation.isPending}
            >
              <Text style={styles.primaryButtonText}>
                {updateInitialRepMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>En pratique</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Être sûr de l'ordre que l'on veut donner</Text>
            <Text style={styles.bulletItem}>
              • Un ordre précis à la fois, fragmentez les tâches si nécessaire
            </Text>
            <Text style={styles.bulletItem}>
              • Ce n'est pas une faveur mais un ordre : soyez précis et direct
            </Text>
            <Text style={styles.bulletItem}>• Assurez-vous que l'enfant prête attention</Text>
            <Text style={styles.bulletItem}>
              • Réduisez les distractions (éteindre la télé, mettre la console en pause)
            </Text>
            <Text style={styles.bulletItem}>
              • Maximisez le contact sensoriel (contact visuel, toucher si besoin)
            </Text>
            <Text style={styles.bulletItem}>
              • Demandez à l'enfant de répéter l'ordre pour s'assurer de sa compréhension
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Objectif</Text>
          <Text style={styles.cardText}>
            Ne plus répéter les mêmes choses 15 fois au point d'en arriver aux cris.
          </Text>
        </View>
      </View>

      {/* Section 2: Goal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Objectifs</Text>

        {objectives.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Souhaitez-vous fixer des objectifs pour donner des ordres efficaces ?
            </Text>
            <Text style={styles.cardText}>
              Sélectionnez les domaines dans lesquels vous avez besoin de formuler un ordre efficace (les ordres que vous répétez plusieurs fois) :
            </Text>

            <View style={styles.objectivesList}>
              {DEFAULT_OBJECTIVES.map((obj, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.objectiveChip,
                    selectedObjectives.includes(obj) && styles.objectiveChipSelected,
                  ]}
                  onPress={() => toggleObjective(obj)}
                >
                  <Text
                    style={[
                      styles.objectiveChipText,
                      selectedObjectives.includes(obj) &&
                        styles.objectiveChipTextSelected,
                    ]}
                  >
                    {obj}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Autre objectif personnalisé..."
              value={customObjective}
              onChangeText={setCustomObjective}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCreateObjectives}
              disabled={createObjectivesMutation.isPending}
            >
              <Text style={styles.primaryButtonText}>
                {createObjectivesMutation.isPending
                  ? 'Création...'
                  : 'Créer mes objectifs'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Vos objectifs ({objectives.length})</Text>
            {objectives.map(obj => {
              const progress = getObjectiveProgress(obj.id);
              const hasCompleted = objectivesWithProgress.includes(obj.id);

              return (
                <View key={obj.id} style={styles.objectiveItem}>
                  <Text style={styles.objectiveLabel}>
                    {obj.label} {hasCompleted && '✅'}
                  </Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min(progress.percentage, 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.objectiveProgressText}>
                    {progress.satisfying}/5 jours satisfaisants
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Section 3: Practice */}
      {objectives.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✏️ Pratiquer</Text>

          {step === 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Enregistrer un ordre aujourd'hui</Text>
              <Text style={styles.cardText}>
                Sélectionnez l'objectif pour lequel vous avez donné un ordre aujourd'hui :
              </Text>
              {objectives.map(obj => (
                <TouchableOpacity
                  key={obj.id}
                  style={styles.objectiveButton}
                  onPress={() => handleStartLog(obj.id)}
                >
                  <Text style={styles.objectiveButtonText}>{obj.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {step >= 1 && selectedObjectiveId && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {objectives.find(o => o.id === selectedObjectiveId)?.label}
              </Text>

              {step === 1 && (
                <>
                  <Text style={styles.questionText}>
                    Avez-vous donné un ordre efficace ?
                  </Text>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.choiceButton, styles.choiceButtonYes]}
                      onPress={() => {
                        setGaveCommand(true);
                        setStep(2);
                      }}
                    >
                      <Text style={styles.choiceButtonText}>Oui</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.choiceButton, styles.choiceButtonNo]}
                      onPress={() => {
                        setGaveCommand(false);
                        handleSubmitLog(false, null);
                      }}
                    >
                      <Text style={styles.choiceButtonText}>Non</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {step === 2 && (
                <>
                  <Text style={styles.questionText}>
                    Est-ce que votre enfant a effectué cet ordre ?
                  </Text>
                  <TouchableOpacity
                    style={styles.completionButton}
                    onPress={() => {
                      setCompleted('first_try');
                      handleSubmitLog(true, 'first_try');
                    }}
                  >
                    <Text style={styles.completionButtonText}>
                      OUI, du premier coup ✅
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.completionButton}
                    onPress={() => {
                      setCompleted('not_directly');
                      setStep(3);
                    }}
                  >
                    <Text style={styles.completionButtonText}>
                      Oui, mais pas directement
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.completionButton}
                    onPress={() => {
                      setCompleted('not_completed');
                      setStep(4);
                    }}
                  >
                    <Text style={styles.completionButtonText}>
                      Non, il ne l'a pas effectué
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 3 && completed === 'not_directly' && (
                <>
                  <Text style={styles.questionText}>
                    Combien de fois avez-vous donné l'ordre ?
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 3"
                    keyboardType="number-pad"
                    value={repetitions}
                    onChangeText={setRepetitions}
                  />
                  <TouchableOpacity
                    style={[styles.primaryButton, createLogMutation.isPending && styles.primaryButtonDisabled]}
                    onPress={() => handleSubmitLog(true, 'not_directly', repetitions)}
                    disabled={!repetitions || createLogMutation.isPending}
                  >
                    <Text style={styles.primaryButtonText}>
                      {createLogMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 4 && completed === 'not_completed' && (
                <>
                  <Text style={styles.questionText}>Quelle en était la raison ?</Text>
                  {[
                    { key: 'distractions', label: 'Il y avait des distractions autour' },
                    { key: 'no_contact', label: 'Le contact (visuel et toucher) n\'a pas été fait' },
                    { key: 'no_repeat', label: 'Je n\'ai pas demandé à l\'enfant de répéter l\'ordre' },
                    { key: 'unsure_command', label: 'Je n\'étais pas sûr de mon ordre' },
                    { key: 'too_complex', label: 'L\'ordre était trop complexe' },
                  ].map(reason => (
                    <TouchableOpacity
                      key={reason.key}
                      style={[
                        styles.reasonButton,
                        failureReason === reason.key && styles.reasonButtonSelected,
                      ]}
                      onPress={() => setFailureReason(reason.key as FailureReason)}
                    >
                      <Text
                        style={[
                          styles.reasonButtonText,
                          failureReason === reason.key && styles.reasonButtonTextSelected,
                        ]}
                      >
                        {reason.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.primaryButton, createLogMutation.isPending && styles.primaryButtonDisabled]}
                    onPress={() => handleSubmitLog(true, 'not_completed', undefined, failureReason!)}
                    disabled={!failureReason || createLogMutation.isPending}
                  >
                    <Text style={styles.primaryButtonText}>
                      {createLogMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {step > 0 && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={resetPracticeForm}
                >
                  <Text style={styles.secondaryButtonText}>Annuler</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* Section 4: Review */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Progression</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Critères de réussite</Text>
          <Text style={styles.cardText}>
            Pour débloquer le module suivant, vous devez :
          </Text>
          <View style={styles.criteriaList}>
            <Text style={[styles.criteriaItem, objectivesWithProgress.length >= 3 && styles.criteriaCompleted]}>
              {objectivesWithProgress.length >= 3 ? '✅' : '⭕'} Réussir sur au moins 3 objectifs
            </Text>
            <Text style={styles.criteriaItem}>
              {objectivesWithProgress.length >= 3 ? '✅' : '⭕'} Chaque objectif avec 5+ jours satisfaisants
            </Text>
          </View>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${(objectivesWithProgress.length / 3) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {objectivesWithProgress.length}/3 objectifs complétés
          </Text>

          {isPassed && (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>
                🎉 Félicitations ! Module complété le{' '}
                {new Date(effectiveCommandsModule.passed_at!).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}
        </View>

        {logs.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Entrées récentes</Text>
            {logs.slice(0, 5).map(log => {
              const objective = objectives.find(o => o.id === log.objective);
              return (
                <View key={log.id} style={styles.logItem}>
                  <Text style={styles.logDate}>
                    {new Date(log.date).toLocaleDateString('fr-FR')}
                  </Text>
                  <Text style={styles.logLabel}>{objective?.label}</Text>
                  <Text style={styles.logStatus}>
                    {log.gave_effective_command
                      ? log.child_completed === 'first_try'
                        ? '✅ Premier coup'
                        : log.child_completed === 'not_directly'
                        ? `🔄 ${log.repetitions_count} fois`
                        : '❌ Non effectué'
                      : '⚠️ Ordre non efficace'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  passedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  passedBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  bulletList: {
    marginTop: 8,
  },
  bulletItem: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: '#B0B0B0',
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#E0E0E0',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  objectivesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginBottom: 12,
  },
  objectiveChip: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  objectiveChipSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  objectiveChipText: {
    fontSize: 14,
    color: '#666',
  },
  objectiveChipTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  objectiveItem: {
    marginBottom: 16,
  },
  objectiveLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  objectiveProgressText: {
    fontSize: 14,
    color: '#666',
  },
  objectiveButton: {
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  objectiveButtonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  choiceButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  choiceButtonYes: {
    backgroundColor: '#4CAF50',
  },
  choiceButtonNo: {
    backgroundColor: '#F44336',
  },
  choiceButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  completionButton: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  completionButtonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    textAlign: 'center',
  },
  reasonButton: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#DDD',
  },
  reasonButtonSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  reasonButtonText: {
    fontSize: 15,
    color: '#666',
  },
  reasonButtonTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  criteriaList: {
    marginTop: 12,
    marginBottom: 16,
  },
  criteriaItem: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  criteriaCompleted: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  progressText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  successBanner: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  successBannerText: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
    textAlign: 'center',
  },
  logItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  logDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  logLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  logStatus: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    textAlign: 'center',
    marginTop: 40,
  },
});
