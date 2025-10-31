/**
 * Anger Management (Gestion de la colère) Module Screen
 *
 * 4 sections: Learn, Goal, Practice, Review
 * Follows the same pattern as special-time.tsx and effective-commands.tsx
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
  setAngerFrequency,
  createAngerCrisisLog,
  getAngerCrisisLogs,
} from '../../../src/api/modules';
import { appStorage } from '../../../src/lib/storage';
import { useUIStore } from '../../../src/store/ui';
import type {
  ModuleWithProgress,
  AngerCrisisLog,
  AngerFrequency,
  InterventionStage,
  AngerTechnique,
} from '../../../src/types/api';

// Frequency options for initial question
const FREQUENCY_OPTIONS: { key: AngerFrequency; label: string }[] = [
  { key: 'daily', label: 'Tous les jours' },
  { key: 'weekly_multiple', label: 'Plusieurs fois par semaine' },
  { key: 'weekly_once', label: 'Une fois par semaine' },
  { key: 'monthly_multiple', label: 'Plusieurs fois par mois' },
  { key: 'monthly_once', label: 'Une fois par mois' },
];

// Techniques by intervention stage
const TECHNIQUES_BY_STAGE: Record<InterventionStage, { key: AngerTechnique; label: string }[]> = {
  before: [
    { key: 'observe_signs', label: 'Observer les signes non-verbaux' },
    { key: 'cushion_punch', label: 'Taper dans un coussin' },
    { key: 'sensory_activity', label: 'Activité sensorielle' },
    { key: 'calm_activity', label: 'Activité calme' },
    { key: 'discussion', label: 'Discussion' },
  ],
  during: [
    { key: 'isolate', label: 'Mettre à l\'écart' },
    { key: 'stay_calm', label: 'Rester calme' },
    { key: 'no_escalation', label: 'Éviter l\'escalade' },
  ],
  after: [
    { key: 'awareness', label: 'Faire prendre conscience' },
    { key: 'discuss_alternatives', label: 'Discuter des alternatives' },
    { key: 'teach_techniques', label: 'Enseigner des techniques' },
  ],
  none: [],
};

export default function AngerManagementScreen() {
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
  const [selectedFrequency, setSelectedFrequency] = useState<AngerFrequency | null>(null);
  const [hasSetFrequency, setHasSetFrequency] = useState(false);

  // State for Practice section (multi-step form)
  const [step, setStep] = useState<number>(0); // 0 = start, 1 = date, 2 = stage, 3 = techniques, 4 = success, 5 = notes
  const [logDate, setLogDate] = useState<string>('');
  const [logTime, setLogTime] = useState<string>('');
  const [interventionStage, setInterventionStage] = useState<InterventionStage | null>(null);
  const [selectedTechniques, setSelectedTechniques] = useState<AngerTechnique[]>([]);
  const [wasSuccessful, setWasSuccessful] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');

  // Queries
  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ['modules', childId],
    queryFn: () => getModules(childId!),
    enabled: !!childId,
    retry: 2,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const angerManagementModule = modules?.find(m => m.key === 'anger_management');

  const { data: logsData } = useQuery({
    queryKey: ['anger-crisis-logs', childId],
    queryFn: () => getAngerCrisisLogs(childId!, '30d'),
    enabled: !!childId,
    retry: 2,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const logs = logsData?.results || [];

  // Mutations
  const setFrequencyMutation = useMutation({
    mutationFn: setAngerFrequency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      setHasSetFrequency(true);
      showToast('success', 'Fréquence enregistrée', 'Enregistré');
    },
    onError: (error: any) => {
      showToast('error', error.message || 'Impossible d\'enregistrer', 'Erreur');
    },
  });

  const createLogMutation = useMutation({
    mutationFn: createAngerCrisisLog,
    onSuccess: async (data) => {
      console.log('✅ Anger log created:', data.log);
      console.log('📊 Updated progress:', data.progress);

      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['anger-crisis-logs', childId] }),
        queryClient.refetchQueries({ queryKey: ['modules', childId] }),
      ]);

      resetPracticeForm();
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);

      const message = wasSuccessful
        ? 'Bravo ! Vous avez géré cette crise avec succès. Continuez comme ça !'
        : 'Ce n\'est pas grave, chaque crise est une opportunité d\'apprentissage.';
      showToast('success', message, 'Enregistré');
    },
    onError: (error: any) => {
      console.error('❌ Failed to create anger log:', error);
      showToast('error', error.message || 'Impossible d\'enregistrer', 'Erreur');
    },
  });

  // Handlers
  const handleSetFrequency = (frequency: AngerFrequency) => {
    if (!angerManagementModule) {
      showToast('error', 'Module non trouvé', 'Erreur');
      return;
    }

    setFrequencyMutation.mutate({
      child_id: childId!,
      frequency,
    });
  };

  const toggleTechnique = (technique: AngerTechnique) => {
    if (selectedTechniques.includes(technique)) {
      setSelectedTechniques(selectedTechniques.filter(t => t !== technique));
    } else {
      setSelectedTechniques([...selectedTechniques, technique]);
    }
  };

  const resetPracticeForm = () => {
    setStep(0);
    setLogDate('');
    setLogTime('');
    setInterventionStage(null);
    setSelectedTechniques([]);
    setWasSuccessful(null);
    setNotes('');
  };

  const handleSubmitLog = (success: boolean) => {
    if (!logDate || !interventionStage) {
      showToast('error', 'Veuillez remplir tous les champs requis', 'Erreur');
      return;
    }

    const payload: any = {
      child: childId!,
      date: logDate,
      intervention_stage: interventionStage,
      techniques_used: selectedTechniques,
      was_successful: success,
      notes: notes.trim(),
    };

    // Only include time if it has a value
    if (logTime && logTime.trim()) {
      payload.time = logTime;
    }

    createLogMutation.mutate(payload);
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!angerManagementModule) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Module non trouvé</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPassed = angerManagementModule.state === 'passed';
  const successfulCrisesCount = angerManagementModule.counters?.successful_crises_count || 0;

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Gestion de la colère</Text>
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
          <Text style={styles.cardTitle}>Qu'est-ce que la gestion de la colère ?</Text>
          <Text style={styles.cardText}>
            Les crises de colère peuvent représenter le principal gêne de la famille. Le but est de
            comprendre d'où vient la crise de colère et d'avoir les outils pour aider son enfant à
            mieux gérer ses émotions.
          </Text>
        </View>

        {!hasSetFrequency && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Question de départ</Text>
            <Text style={styles.cardText}>
              En moyenne, combien de crises de colère votre enfant fait-il ?
            </Text>
            {FREQUENCY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.frequencyButton,
                  selectedFrequency === option.key && styles.frequencyButtonSelected,
                ]}
                onPress={() => {
                  setSelectedFrequency(option.key);
                  handleSetFrequency(option.key);
                }}
              >
                <Text
                  style={[
                    styles.frequencyButtonText,
                    selectedFrequency === option.key && styles.frequencyButtonTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>En pratique</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Chez un enfant sans TDAH :</Text>
            <Text style={styles.infoText}>
              La colère monte puis redescend naturellement après chaque frustration.
            </Text>
          </View>
          <View style={[styles.infoBox, styles.infoBoxWarning]}>
            <Text style={styles.infoTitle}>Chez un enfant avec TDAH :</Text>
            <Text style={styles.infoText}>
              Les moments de colère ont tendance à s'accumuler tout au long de la journée. À la fin
              de la journée, sa réaction peut sembler disproportionnée car il exprime toute la
              colère accumulée depuis le matin.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Les 3 étapes de la crise</Text>
          <View style={styles.stageBox}>
            <Text style={styles.stageTitle}>1️⃣ Avant la crise</Text>
            <Text style={styles.stageSubtitle}>Meilleur moment pour prévenir !</Text>
            <Text style={styles.stageText}>
              Apprenez à observer tous les signes non verbaux chez votre enfant (respiration,
              expression du visage, tension dans le cou, poings serrés, etc.)
            </Text>
            <Text style={styles.stageText}>
              Proposez-lui un moyen de décharger : taper dans un coussin, activité sensorielle,
              activité calme, discuter.
            </Text>
          </View>

          <View style={styles.stageBox}>
            <Text style={styles.stageTitle}>2️⃣ Pendant la crise</Text>
            <Text style={styles.stageSubtitle}>Ne pas aggraver</Text>
            <Text style={styles.stageText}>
              On laisse la crise se dérouler sans escalade de la colère. Mettez l'enfant à l'écart
              en attendant le retour au calme.
            </Text>
          </View>

          <View style={styles.stageBox}>
            <Text style={styles.stageTitle}>3️⃣ Après la crise</Text>
            <Text style={styles.stageSubtitle}>2ème meilleur moment pour agir !</Text>
            <Text style={styles.stageText}>
              Moment idéal pour faire prendre conscience à l'enfant de la source de ses colères, et
              évoquer les autres façons de réagir.
            </Text>
          </View>
        </View>

        <View style={[styles.card, styles.warningCard]}>
          <Text style={styles.warningTitle}>⚠️ ATTENTION</Text>
          <Text style={styles.warningText}>
            Votre attitude influence directement la gestion de la colère de votre enfant. Si vous
            êtes énervé(e), votre enfant le ressent et la crise peut s'intensifier.
          </Text>
          <Text style={styles.warningText}>
            Rappelez-vous : la colère de votre enfant n'est pas dirigée contre vous. Il ne sait pas
            encore la gérer, et vous êtes là pour l'accompagner.
          </Text>
        </View>
      </View>

      {/* Section 2: Goal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Objectif</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Votre objectif</Text>
          <Text style={styles.cardText}>
            Réussir à gérer au moins une crise de colère en intervenant au bon moment avec les
            bonnes techniques.
          </Text>
        </View>
      </View>

      {/* Section 3: Practice */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✏️ Pratiquer</Text>

        {step === 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Enregistrer une crise de colère</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                const today = new Date().toISOString().split('T')[0];
                setLogDate(today);
                setStep(1);
              }}
            >
              <Text style={styles.primaryButtonText}>Commencer</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quand la crise a-t-elle eu lieu ?</Text>
            <Text style={styles.cardText}>
              Date sélectionnée : {new Date(logDate).toLocaleDateString('fr-FR')}
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setStep(2)}
            >
              <Text style={styles.primaryButtonText}>Suivant</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={resetPracticeForm}
            >
              <Text style={styles.secondaryButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>À quel moment êtes-vous intervenu(e) ?</Text>
            <TouchableOpacity
              style={styles.stageButton}
              onPress={() => {
                setInterventionStage('before');
                setStep(3);
              }}
            >
              <Text style={styles.stageButtonText}>Avant la crise</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stageButton}
              onPress={() => {
                setInterventionStage('during');
                setStep(3);
              }}
            >
              <Text style={styles.stageButtonText}>Pendant la crise</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stageButton}
              onPress={() => {
                setInterventionStage('after');
                setStep(3);
              }}
            >
              <Text style={styles.stageButtonText}>Après la crise</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stageButton}
              onPress={() => {
                setInterventionStage('none');
                setStep(4);
              }}
            >
              <Text style={styles.stageButtonText}>Je n'ai pas pu intervenir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={resetPracticeForm}
            >
              <Text style={styles.secondaryButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && interventionStage && interventionStage !== 'none' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quelles techniques avez-vous utilisées ?</Text>
            <View style={styles.techniquesList}>
              {TECHNIQUES_BY_STAGE[interventionStage].map((technique) => (
                <TouchableOpacity
                  key={technique.key}
                  style={[
                    styles.techniqueChip,
                    selectedTechniques.includes(technique.key) && styles.techniqueChipSelected,
                  ]}
                  onPress={() => toggleTechnique(technique.key)}
                >
                  <Text
                    style={[
                      styles.techniqueChipText,
                      selectedTechniques.includes(technique.key) &&
                        styles.techniqueChipTextSelected,
                    ]}
                  >
                    {technique.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setStep(4)}
            >
              <Text style={styles.primaryButtonText}>Suivant</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={resetPracticeForm}
            >
              <Text style={styles.secondaryButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 4 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>L'intervention a-t-elle été réussie ?</Text>
            <TouchableOpacity
              style={[styles.choiceButton, styles.choiceButtonYes]}
              onPress={() => {
                setWasSuccessful(true);
                handleSubmitLog(true);
              }}
              disabled={createLogMutation.isPending}
            >
              <Text style={styles.choiceButtonText}>
                {createLogMutation.isPending ? 'Enregistrement...' : 'Oui ✅'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.choiceButton, styles.choiceButtonNo]}
              onPress={() => {
                setWasSuccessful(false);
                handleSubmitLog(false);
              }}
              disabled={createLogMutation.isPending}
            >
              <Text style={styles.choiceButtonText}>
                {createLogMutation.isPending ? 'Enregistrement...' : 'Non'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={resetPracticeForm}
            >
              <Text style={styles.secondaryButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Section 4: Review */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Progression</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Critères de réussite</Text>
          <Text style={styles.cardText}>
            Pour débloquer le module suivant, vous devez :
          </Text>
          <Text style={[styles.criteriaItem, successfulCrisesCount >= 1 && styles.criteriaCompleted]}>
            {successfulCrisesCount >= 1 ? '✅' : '⭕'} Gérer avec succès au moins 1 crise de colère
          </Text>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min((successfulCrisesCount / 1) * 100, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {successfulCrisesCount}/1 crises gérées avec succès
          </Text>

          {isPassed && (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>
                🎉 Félicitations ! Module complété le{' '}
                {new Date(angerManagementModule.passed_at!).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}
        </View>

        {logs.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Entrées récentes</Text>
            {logs.slice(0, 5).map(log => (
              <View key={log.id} style={styles.logItem}>
                <Text style={styles.logDate}>
                  {new Date(log.date).toLocaleDateString('fr-FR')}
                  {log.time && ` à ${log.time}`}
                </Text>
                <Text style={styles.logStage}>
                  Intervention : {log.intervention_stage === 'before' ? 'Avant' : log.intervention_stage === 'during' ? 'Pendant' : log.intervention_stage === 'after' ? 'Après' : 'Aucune'}
                </Text>
                <Text style={styles.logStatus}>
                  {log.was_successful ? '✅ Réussie' : '❌ Non réussie'}
                </Text>
              </View>
            ))}
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
    marginBottom: 8,
  },
  frequencyButton: {
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#DDD',
  },
  frequencyButtonSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  frequencyButtonText: {
    fontSize: 16,
    color: '#666',
  },
  frequencyButtonTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoBoxWarning: {
    backgroundColor: '#FFF3E0',
    borderLeftColor: '#FF9800',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  stageBox: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  stageTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  stageSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 8,
  },
  stageText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 4,
  },
  warningCard: {
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 15,
    color: '#856404',
    lineHeight: 22,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
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
  stageButton: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  stageButtonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    textAlign: 'center',
  },
  techniquesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  techniqueChip: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  techniqueChipSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  techniqueChipText: {
    fontSize: 14,
    color: '#666',
  },
  techniqueChipTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  choiceButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
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
  criteriaItem: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  criteriaCompleted: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
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
  logStage: {
    fontSize: 15,
    color: '#666',
    marginBottom: 2,
  },
  logStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    textAlign: 'center',
    marginTop: 40,
  },
});
