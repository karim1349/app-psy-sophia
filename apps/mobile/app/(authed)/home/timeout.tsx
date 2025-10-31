/**
 * Time Out Module Screen
 *
 * Definition: Removing the child from an activity when their behavior is inappropriate.
 * Key concepts: Location (L'ENDROIT) and Timing (LE MOMENT).
 *
 * Goal: Set target duration (2, 3, 4, or 5 minutes based on child's age).
 * Pass criteria: Successfully use time-out at least once.
 *
 * Flow:
 * 1. Did you need to use time-out today? → No = positive message, Yes = Q2
 * 2. Did it work? → Yes = success message, No = Q3
 * 3. Why not? → "Negotiation" or "Time not respected" + advice
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
  createTimeOutLog,
  getTimeOutLogs,
  setTimeOutGoal,
} from '../../../src/api/modules';
import { appStorage } from '../../../src/lib/storage';
import { useUIStore } from '../../../src/store/ui';
import type {
  ModuleWithProgress,
  CreateTimeOutLogRequest,
  TimeOutFailureReason,
} from '../../../src/types/api';

// Helper to format date to French locale
function formatDateFr(dateStr: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('fr-FR', options);
}

export default function TimeOutScreen() {
  const queryClient = useQueryClient();
  const showToast = useUIStore((state) => state.showToast);

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

  // Queries
  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ['modules', childId],
    queryFn: () => getModules(childId!),
    enabled: !!childId,
    retry: 2,
  });

  const module = modules?.find((m: ModuleWithProgress) => m.key === 'timeout');
  const counters = module?.counters || {};

  const { data: logsData } = useQuery({
    queryKey: ['timeout-logs', childId],
    queryFn: () => getTimeOutLogs(childId!, '30d'),
    enabled: !!childId,
    retry: 2,
  });

  // State
  const [selectedDuration, setSelectedDuration] = useState<2 | 3 | 4 | 5 | null>(null);
  const [logStep, setLogStep] = useState<1 | 2 | 3 | 4>(1);
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [neededTimeout, setNeededTimeout] = useState<boolean | null>(null);
  const [wasSuccessful, setWasSuccessful] = useState<boolean | null>(null);
  const [failureReason, setFailureReason] = useState<TimeOutFailureReason | null>(null);
  const [notes, setNotes] = useState('');

  // Mutations
  const setGoalMutation = useMutation({
    mutationFn: setTimeOutGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules', childId] });
      showToast('success', 'Objectif enregistré !', 'Enregistré');
    },
    onError: () => {
      showToast('error', 'Erreur lors de l\'enregistrement de l\'objectif', 'Erreur');
    },
  });

  const createLogMutation = useMutation({
    mutationFn: createTimeOutLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules', childId] });
      queryClient.invalidateQueries({ queryKey: ['timeout-logs', childId] });
      showToast('success', 'Entrée enregistrée !', 'Enregistré');
      resetLogForm();
    },
    onError: () => {
      showToast('error', 'Erreur lors de l\'enregistrement', 'Erreur');
    },
  });

  // Handlers
  const handleSetGoal = () => {
    if (!childId || !selectedDuration) return;
    setGoalMutation.mutate({
      child_id: childId,
      target_duration: selectedDuration,
    });
  };

  const resetLogForm = () => {
    setLogStep(1);
    setLogDate(new Date().toISOString().split('T')[0]);
    setNeededTimeout(null);
    setWasSuccessful(null);
    setFailureReason(null);
    setNotes('');
  };

  const handleSubmitLog = () => {
    if (!childId || neededTimeout === null) return;

    const payload: CreateTimeOutLogRequest = {
      child: childId,
      date: logDate,
      needed_timeout: neededTimeout,
      notes: notes.trim(),
    };

    if (neededTimeout) {
      payload.was_successful = wasSuccessful;
      if (wasSuccessful === false && failureReason) {
        payload.failure_reason = failureReason;
      }
    }

    createLogMutation.mutate(payload);
  };

  // Loading & Error states
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

  if (!module) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Module non trouvé</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPassed = module.state === 'passed';
  const isLocked = module.state === 'locked';
  const logs = logsData?.results || [];
  const successfulCount = counters.successful_timeouts_count || 0;
  const currentDuration = counters.target_duration;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Time Out</Text>
        {isPassed && (
          <View style={styles.passedBadge}>
            <Text style={styles.passedBadgeText}>✓ Complété</Text>
          </View>
        )}
      </View>

      {isLocked && (
        <View style={styles.lockedBanner}>
          <Text style={styles.lockedBannerText}>🔒 Module verrouillé</Text>
          <Text style={styles.lockedBannerSubtext}>
            Complétez le module précédent pour déverrouiller celui-ci.
          </Text>
        </View>
      )}

      {!isLocked && (
        <>
          {/* Section 1: Learn */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📐 Définition</Text>

            <View style={styles.card}>
              <Text style={styles.cardText}>
                Le <Text style={styles.boldText}>time-out</Text> consiste à{' '}
                <Text style={styles.boldText}>retirer l'enfant d'une activité</Text> lorsque son
                comportement est inapproprié.
              </Text>

              <Text style={[styles.cardTitle, { marginTop: 24 }]}>🏠 L'ENDROIT</Text>

              <View style={styles.infoBox}>
                <Text style={styles.infoBoxTitle}>Un lieu sûr et ennuyeux :</Text>
                <Text style={styles.infoBoxText}>
                  • Chaise dans le couloir ou coin de la pièce{'\n'}
                  • Pas de stimulation (jouets, écrans, fenêtre){'\n'}
                  • Visible par le parent{'\n'}
                  • Toujours le même endroit
                </Text>
              </View>

              <Text style={[styles.cardTitle, { marginTop: 16 }]}>⏱️ LE MOMENT</Text>

              <View style={[styles.infoBox, { backgroundColor: '#E8F5E9' }]}>
                <Text style={styles.infoBoxTitle}>Quand l'utiliser :</Text>
                <Text style={styles.infoBoxText}>
                  • L'enfant n'obéit pas à un ordre{'\n'}
                  • Après 1 avertissement clair{'\n'}
                  • Immédiatement après le comportement{'\n'}
                  • Avec calme et fermeté
                </Text>
              </View>

              <View style={[styles.infoBox, { backgroundColor: '#FFF9E6', marginTop: 12 }]}>
                <Text style={styles.infoBoxTitle}>Durée recommandée :</Text>
                <Text style={styles.infoBoxText}>
                  • <Text style={styles.boldText}>2 minutes</Text> : 2-3 ans{'\n'}
                  • <Text style={styles.boldText}>3 minutes</Text> : 4-5 ans{'\n'}
                  • <Text style={styles.boldText}>4 minutes</Text> : 6-8 ans{'\n'}
                  • <Text style={styles.boldText}>5 minutes</Text> : 9+ ans
                </Text>
              </View>

              <View style={styles.warningBox}>
                <Text style={styles.warningBoxTitle}>⚠️ Règles importantes :</Text>
                <Text style={styles.warningBoxText}>
                  • Ne pas parler ou regarder l'enfant pendant le time-out{'\n'}
                  • Remettre au time-out si l'enfant se lève{'\n'}
                  • Le chronomètre ne démarre que quand l'enfant est calme{'\n'}
                  • Pas d'explications pendant, seulement après
                </Text>
              </View>
            </View>
          </View>

          {/* Section 2: Goal */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Objectif</Text>

            {currentDuration ? (
              <View style={styles.successBanner}>
                <Text style={styles.cardText}>
                  Durée définie : <Text style={[styles.boldText, { fontSize: 20 }]}>{currentDuration} minutes</Text>
                </Text>
                <Text style={[styles.cardText, { fontSize: 14, marginTop: 8 }]}>
                  Vous pouvez modifier cette durée si nécessaire.
                </Text>
              </View>
            ) : (
              <Text style={styles.cardText}>
                Choisissez la durée du time-out adaptée à l'âge de votre enfant :
              </Text>
            )}

            <View style={{ marginTop: 16 }}>
              {([2, 3, 4, 5] as const).map((duration) => (
                <TouchableOpacity
                  key={duration}
                  onPress={() => setSelectedDuration(duration)}
                  style={[
                    styles.optionButton,
                    selectedDuration === duration && styles.optionButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      selectedDuration === duration && styles.optionButtonTextSelected,
                    ]}
                  >
                    {duration} minutes
                  </Text>
                  <Text style={styles.optionButtonSubtext}>
                    {duration === 2 && 'Recommandé pour 2-3 ans'}
                    {duration === 3 && 'Recommandé pour 4-5 ans'}
                    {duration === 4 && 'Recommandé pour 6-8 ans'}
                    {duration === 5 && 'Recommandé pour 9 ans et plus'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleSetGoal}
              disabled={!selectedDuration || setGoalMutation.isPending}
              style={[
                styles.primaryButton,
                (!selectedDuration || setGoalMutation.isPending) && styles.primaryButtonDisabled,
              ]}
            >
              {setGoalMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {currentDuration ? 'Modifier l\'objectif' : 'Enregistrer l\'objectif'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Section 3: Practice (Multi-step logging) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Pratiquer</Text>

            {logStep === 1 && (
              <View style={styles.card}>
                <Text style={styles.cardText}>
                  Date : <Text style={styles.boldText}>{formatDateFr(logDate)}</Text>
                </Text>

                <Text style={[styles.cardTitle, { marginTop: 24 }]}>
                  Avez-vous eu besoin d'utiliser le time-out aujourd'hui ?
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    setNeededTimeout(false);
                    setLogStep(4);
                  }}
                  style={[styles.choiceButton, { backgroundColor: '#4CAF50' }]}
                >
                  <Text style={styles.choiceButtonText}>Non, pas aujourd'hui</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setNeededTimeout(true);
                    setLogStep(2);
                  }}
                  style={[styles.choiceButton, { backgroundColor: '#FF9800' }]}
                >
                  <Text style={styles.choiceButtonText}>Oui, j'ai utilisé le time-out</Text>
                </TouchableOpacity>
              </View>
            )}

            {logStep === 2 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Est-ce que le time-out a fonctionné ?</Text>

                <TouchableOpacity
                  onPress={() => {
                    setWasSuccessful(true);
                    setLogStep(4);
                  }}
                  style={[styles.choiceButton, { backgroundColor: '#4CAF50' }]}
                >
                  <Text style={styles.choiceButtonText}>Oui, ça a fonctionné !</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setWasSuccessful(false);
                    setLogStep(3);
                  }}
                  style={[styles.choiceButton, { backgroundColor: '#F44336' }]}
                >
                  <Text style={styles.choiceButtonText}>Non, ça n'a pas marché</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setLogStep(1)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>← Retour</Text>
                </TouchableOpacity>
              </View>
            )}

            {logStep === 3 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Pourquoi ça n'a pas marché ?</Text>

                <TouchableOpacity
                  onPress={() => {
                    setFailureReason('negotiation');
                    setLogStep(4);
                  }}
                  style={[
                    styles.optionButton,
                    failureReason === 'negotiation' && styles.optionButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      failureReason === 'negotiation' && styles.optionButtonTextSelected,
                    ]}
                  >
                    L'enfant a continué à négocier
                  </Text>
                  <Text style={styles.optionButtonSubtext}>
                    Il a parlé, argumenté ou essayé de discuter pendant le time-out
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setFailureReason('time_not_respected');
                    setLogStep(4);
                  }}
                  style={[
                    styles.optionButton,
                    failureReason === 'time_not_respected' && styles.optionButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      failureReason === 'time_not_respected' && styles.optionButtonTextSelected,
                    ]}
                  >
                    Le temps n'a pas été respecté
                  </Text>
                  <Text style={styles.optionButtonSubtext}>
                    Il s'est levé, a quitté le time-out avant la fin
                  </Text>
                </TouchableOpacity>

                {failureReason && (
                  <TouchableOpacity onPress={() => setLogStep(4)} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>Continuer →</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={() => setLogStep(2)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>← Retour</Text>
                </TouchableOpacity>
              </View>
            )}

            {logStep === 4 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>✅ Confirmation</Text>

                <View style={{ backgroundColor: '#F5F5F5', padding: 16, borderRadius: 8, marginTop: 16 }}>
                  <Text style={styles.cardText}>
                    <Text style={styles.boldText}>Date :</Text> {formatDateFr(logDate)}
                  </Text>
                  <Text style={styles.cardText}>
                    <Text style={styles.boldText}>Time-out utilisé :</Text>{' '}
                    {neededTimeout ? 'Oui' : 'Non'}
                  </Text>
                  {neededTimeout && (
                    <>
                      <Text style={styles.cardText}>
                        <Text style={styles.boldText}>Résultat :</Text>{' '}
                        {wasSuccessful ? 'Réussi ✅' : 'Échoué ❌'}
                      </Text>
                      {wasSuccessful === false && failureReason && (
                        <Text style={styles.cardText}>
                          <Text style={styles.boldText}>Raison :</Text>{' '}
                          {failureReason === 'negotiation'
                            ? 'L\'enfant a continué à négocier'
                            : 'Le temps n\'a pas été respecté'}
                        </Text>
                      )}
                    </>
                  )}
                </View>

                {neededTimeout === false && (
                  <View style={styles.successBanner}>
                    <Text style={styles.successBannerText}>Bravo ! 🎉</Text>
                    <Text style={[styles.cardText, { marginTop: 8 }]}>
                      Pas besoin de time-out aujourd'hui ! Votre enfant a bien géré son comportement.
                    </Text>
                  </View>
                )}

                {wasSuccessful === true && (
                  <View style={styles.successBanner}>
                    <Text style={styles.successBannerText}>Excellent ! 🎉</Text>
                    <Text style={[styles.cardText, { marginTop: 8 }]}>
                      Le time-out a fonctionné ! Continuez à l'utiliser de manière cohérente.
                    </Text>
                  </View>
                )}

                {wasSuccessful === false && failureReason === 'negotiation' && (
                  <View style={[styles.infoBox, { backgroundColor: '#E3F2FD', marginTop: 16 }]}>
                    <Text style={styles.infoBoxTitle}>Conseil 💡</Text>
                    <Text style={styles.infoBoxText}>
                      Ignorez complètement toute tentative de négociation. Ne répondez pas, ne regardez
                      pas l'enfant. Le temps ne commence que quand il est calme et silencieux.
                    </Text>
                  </View>
                )}

                {wasSuccessful === false && failureReason === 'time_not_respected' && (
                  <View style={[styles.infoBox, { backgroundColor: '#E3F2FD', marginTop: 16 }]}>
                    <Text style={styles.infoBoxTitle}>Conseil 💡</Text>
                    <Text style={styles.infoBoxText}>
                      Si l'enfant se lève, raccompagnez-le calmement au time-out sans parler. Répétez
                      autant de fois que nécessaire. Le temps ne démarre que quand il reste assis et
                      calme.
                    </Text>
                  </View>
                )}

                <Text style={[styles.boldText, { marginTop: 16 }]}>Notes (optionnel) :</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Ajoutez des détails si vous le souhaitez..."
                  multiline
                  numberOfLines={3}
                  style={styles.textInput}
                  placeholderTextColor="#999"
                />

                <TouchableOpacity
                  onPress={handleSubmitLog}
                  disabled={createLogMutation.isPending}
                  style={[
                    styles.primaryButton,
                    createLogMutation.isPending && styles.primaryButtonDisabled,
                  ]}
                >
                  {createLogMutation.isPending ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Enregistrer</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    if (wasSuccessful === false && failureReason) {
                      setLogStep(3);
                    } else if (neededTimeout === true) {
                      setLogStep(2);
                    } else {
                      setLogStep(1);
                    }
                  }}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>← Retour</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Section 4: Review */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Progression</Text>

            {isPassed ? (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>Module complété ! 🎉</Text>
                <Text style={[styles.cardText, { marginTop: 8 }]}>
                  Vous avez réussi à utiliser le time-out efficacement.
                </Text>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardText}>
                  <Text style={styles.boldText}>Objectif :</Text> Réussir 1 time-out
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: successfulCount >= 1 ? '100%' : '0%' },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  Time-out réussis : {successfulCount}/1
                </Text>
              </View>
            )}

            <Text style={[styles.cardTitle, { marginTop: 24 }]}>
              Entrées récentes (30 jours)
            </Text>

            {logs.length === 0 ? (
              <Text style={styles.emptyText}>Aucune entrée pour le moment</Text>
            ) : (
              logs.slice(0, 5).map((log) => (
                <View key={log.id} style={styles.logItem}>
                  <Text style={styles.logDate}>{formatDateFr(log.date)}</Text>
                  {!log.needed_timeout ? (
                    <Text style={styles.logStage}>Pas de time-out aujourd'hui</Text>
                  ) : (
                    <>
                      <Text style={[styles.logStatus, { color: log.was_successful ? '#4CAF50' : '#F44336' }]}>
                        {log.was_successful ? '✅ Réussi' : '❌ Échoué'}
                      </Text>
                      {log.failure_reason && (
                        <Text style={[styles.cardText, { fontSize: 12 }]}>
                          {log.failure_reason === 'negotiation'
                            ? 'Négociation'
                            : 'Temps non respecté'}
                        </Text>
                      )}
                      {log.notes && (
                        <Text style={[styles.cardText, { fontSize: 12, fontStyle: 'italic' }]}>
                          {log.notes}
                        </Text>
                      )}
                    </>
                  )}
                </View>
              ))
            )}

            <TouchableOpacity onPress={resetLogForm} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>+ Nouvelle entrée</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  passedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  passedBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  lockedBanner: {
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB300',
    marginBottom: 24,
  },
  lockedBannerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 4,
  },
  lockedBannerSubtext: {
    fontSize: 14,
    color: '#F57C00',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 8,
  },
  boldText: {
    fontWeight: '600',
    color: '#333',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  warningBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  warningBoxTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C62828',
    marginBottom: 8,
  },
  warningBoxText: {
    fontSize: 15,
    color: '#C62828',
    lineHeight: 22,
  },
  successBanner: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginTop: 16,
  },
  successBannerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    textAlign: 'center',
  },
  optionButton: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    marginBottom: 12,
  },
  optionButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionButtonTextSelected: {
    color: '#007AFF',
  },
  optionButtonSubtext: {
    fontSize: 14,
    color: '#666',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
  },
  choiceButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  choiceButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 8,
    textAlignVertical: 'top',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  logItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  logDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  logStage: {
    fontSize: 14,
    color: '#666',
  },
  logStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    textAlign: 'center',
    marginTop: 40,
  },
});
