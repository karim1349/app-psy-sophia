/**
 * Rewards System (Le système de point) Module Screen
 *
 * Sections: Setup, Daily Tracking, Balance, Privileges, History
 * Parents create tasks (1/3/5 points) and privileges (3/5/10 points)
 * Child earns points by completing tasks and spends them on privileges
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
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getModules,
  setupRewards,
  listRewardsTasks,
  listRewardsPrivileges,
  logDailyCompletion,
  redeemPrivilege,
  getRewardsBalance,
} from '../../../src/api/modules';
import { appStorage } from '../../../src/lib/storage';
import { useUIStore } from '../../../src/store/ui';
import type { Task, Privilege } from '@app-psy-sophia/schemas';

interface TaskInput {
  title: string;
  points_reward: 1 | 3 | 5;
}

interface PrivilegeInput {
  title: string;
  points_cost: 3 | 5 | 10;
}

export default function RewardsScreen() {
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

  // Setup state
  const [taskInputs, setTaskInputs] = useState<TaskInput[]>([
    { title: '', points_reward: 1 },
    { title: '', points_reward: 3 },
    { title: '', points_reward: 5 },
  ]);
  const [privilegeInputs, setPrivilegeInputs] = useState<PrivilegeInput[]>([
    { title: '', points_cost: 3 },
    { title: '', points_cost: 5 },
    { title: '', points_cost: 10 },
  ]);

  // Daily tracking state
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
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

  const rewardsModule = modules?.find(m => m.key === 'rewards');
  const isSetupComplete = rewardsModule?.counters?.setup_complete === true;

  const { data: tasksData } = useQuery({
    queryKey: ['rewards-tasks', childId],
    queryFn: () => listRewardsTasks(childId!),
    enabled: !!childId && isSetupComplete,
    retry: 2,
  });

  const { data: privilegesData } = useQuery({
    queryKey: ['rewards-privileges', childId],
    queryFn: () => listRewardsPrivileges(childId!),
    enabled: !!childId && isSetupComplete,
    retry: 2,
  });

  const { data: balanceData } = useQuery({
    queryKey: ['rewards-balance', childId],
    queryFn: () => getRewardsBalance(childId!),
    enabled: !!childId && isSetupComplete,
    retry: 2,
  });

  const tasks = tasksData?.tasks || [];
  const privileges = privilegesData?.privileges || [];
  const balance = balanceData?.balance || 0;

  // Mutations
  const setupMutation = useMutation({
    mutationFn: setupRewards,
    onSuccess: async () => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['modules', childId] }),
        queryClient.refetchQueries({ queryKey: ['rewards-tasks', childId] }),
        queryClient.refetchQueries({ queryKey: ['rewards-privileges', childId] }),
      ]);
      showToast('success', 'Système de récompenses configuré', 'Succès');
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    },
    onError: (error: any) => {
      showToast('error', error.message || 'Impossible de configurer', 'Erreur');
    },
  });

  const logCompletionMutation = useMutation({
    mutationFn: logDailyCompletion,
    onSuccess: async () => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['modules', childId] }),
        queryClient.refetchQueries({ queryKey: ['rewards-balance', childId] }),
      ]);
      setSelectedTaskIds(new Set());
      setNotes('');
      showToast('success', 'Tâches enregistrées', 'Bravo !');
    },
    onError: (error: any) => {
      showToast('error', error.message || 'Impossible d\'enregistrer', 'Erreur');
    },
  });

  const redeemMutation = useMutation({
    mutationFn: redeemPrivilege,
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['rewards-balance', childId] });
      showToast('success', 'Privilège utilisé', 'Félicitations !');
    },
    onError: (error: any) => {
      showToast('error', error.message || 'Points insuffisants', 'Erreur');
    },
  });

  // Handlers
  const handleSetup = () => {
    if (!childId) return;

    const validTasks = taskInputs.filter(t => t.title.trim() !== '');
    const validPrivileges = privilegeInputs.filter(p => p.title.trim() !== '');

    if (validTasks.length === 0) {
      showToast('error', 'Ajoutez au moins une tâche', 'Erreur');
      return;
    }

    if (validPrivileges.length === 0) {
      showToast('error', 'Ajoutez au moins un privilège', 'Erreur');
      return;
    }

    setupMutation.mutate({
      child_id: childId,
      tasks: validTasks,
      privileges: validPrivileges,
    });
  };

  const handleLogCompletion = () => {
    if (!childId) return;

    const today = new Date().toISOString().split('T')[0];

    logCompletionMutation.mutate({
      child_id: childId,
      date: today,
      completed_task_ids: Array.from(selectedTaskIds),
      notes: notes.trim(),
    });
  };

  const handleRedeem = (privilege: Privilege) => {
    if (!childId) return;

    if (balance < privilege.points_cost) {
      showToast('error', `Il manque ${privilege.points_cost - balance} points`, 'Points insuffisants');
      return;
    }

    Alert.alert(
      'Utiliser ce privilège ?',
      `${privilege.title} coûte ${privilege.points_cost} points.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Utiliser',
          onPress: () => {
            redeemMutation.mutate({
              child_id: childId,
              privilege_id: privilege.id,
            });
          },
        },
      ]
    );
  };

  const toggleTask = (taskId: number) => {
    const newSet = new Set(selectedTaskIds);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    setSelectedTaskIds(newSet);
  };

  // Loading state
  if (isLoadingChild || modulesLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Le système de point</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      </View>
    );
  }

  if (!childId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Le système de point</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Aucun enfant sélectionné</Text>
        </View>
      </View>
    );
  }

  const consecutiveDays = rewardsModule?.counters?.consecutive_days_above_50pct || 0;
  const isPassed = rewardsModule?.state === 'passed';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Le système de point</Text>
      </View>

      <ScrollView style={styles.scrollView} ref={scrollViewRef}>
        {/* Progress Banner */}
        {isSetupComplete && (
          <View style={[styles.progressBanner, isPassed && styles.progressBannerPassed]}>
            <Text style={styles.progressText}>
              {isPassed
                ? '🎉 Module complété !'
                : `${consecutiveDays}/5 jours consécutifs à >50%`}
            </Text>
          </View>
        )}

        {/* Setup Section */}
        {!isSetupComplete ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Configuration initiale</Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                <Text style={styles.bold}>Attention :</Text> Présentez ce système positivement.
                Votre enfant n'est pas assez récompensé pour ses bonnes actions. Ce tableau
                lui donnera accès à{' '}
                <Text style={styles.bold}>davantage de récompenses</Text>. Il gagne son temps
                d'écran au lieu d'en être privé.
              </Text>
            </View>

            <Text style={styles.subsectionTitle}>Tâches (que l'enfant doit faire)</Text>
            {taskInputs.map((task, index) => (
              <View key={index} style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder={
                    task.points_reward === 1
                      ? 'Ex: Faire son lit'
                      : task.points_reward === 3
                      ? 'Ex: Ranger sa chambre'
                      : 'Ex: Prendre sa douche'
                  }
                  value={task.title}
                  onChangeText={(text) => {
                    const newTasks = [...taskInputs];
                    newTasks[index].title = text;
                    setTaskInputs(newTasks);
                  }}
                />
                <View style={styles.pointsBadge}>
                  <Text style={styles.pointsText}>{task.points_reward} pt</Text>
                </View>
              </View>
            ))}

            <Text style={[styles.subsectionTitle, { marginTop: 24 }]}>
              Privilèges (récompenses)
            </Text>
            {privilegeInputs.map((privilege, index) => (
              <View key={index} style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder={
                    privilege.points_cost === 3
                      ? 'Ex: 10 min d\'écran'
                      : privilege.points_cost === 5
                      ? 'Ex: Un bonbon'
                      : 'Ex: Une sortie'
                  }
                  value={privilege.title}
                  onChangeText={(text) => {
                    const newPrivileges = [...privilegeInputs];
                    newPrivileges[index].title = text;
                    setPrivilegeInputs(newPrivileges);
                  }}
                />
                <View style={[styles.pointsBadge, styles.costBadge]}>
                  <Text style={styles.pointsText}>{privilege.points_cost} pt</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.button, setupMutation.isPending && styles.buttonDisabled]}
              onPress={handleSetup}
              disabled={setupMutation.isPending}
            >
              {setupMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Créer le système de point</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Balance Section */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Solde actuel</Text>
              <Text style={styles.balanceAmount}>{balance} points</Text>
              {balanceData && (
                <View style={styles.balanceDetails}>
                  <Text style={styles.balanceDetail}>
                    Gagnés: {balanceData.total_earned} • Dépensés: {balanceData.total_spent}
                  </Text>
                </View>
              )}
            </View>

            {/* Today's Tasks */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✅ Tâches d'aujourd'hui</Text>
              {tasks.length === 0 ? (
                <Text style={styles.emptyText}>Aucune tâche configurée</Text>
              ) : (
                <>
                  {tasks.map((task) => (
                    <TouchableOpacity
                      key={task.id}
                      style={[
                        styles.taskItem,
                        selectedTaskIds.has(task.id) && styles.taskItemSelected,
                      ]}
                      onPress={() => toggleTask(task.id)}
                    >
                      <View style={styles.taskLeft}>
                        <View
                          style={[
                            styles.checkbox,
                            selectedTaskIds.has(task.id) && styles.checkboxChecked,
                          ]}
                        >
                          {selectedTaskIds.has(task.id) && (
                            <Text style={styles.checkmark}>✓</Text>
                          )}
                        </View>
                        <Text style={styles.taskTitle}>{task.title}</Text>
                      </View>
                      <View style={styles.pointsBadge}>
                        <Text style={styles.pointsText}>{task.points_reward} pt</Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                  <TextInput
                    style={[styles.input, { marginTop: 16 }]}
                    placeholder="Notes optionnelles"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={2}
                  />

                  <TouchableOpacity
                    style={[
                      styles.button,
                      (logCompletionMutation.isPending || selectedTaskIds.size === 0) &&
                        styles.buttonDisabled,
                    ]}
                    onPress={handleLogCompletion}
                    disabled={logCompletionMutation.isPending || selectedTaskIds.size === 0}
                  >
                    {logCompletionMutation.isPending ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.buttonText}>Enregistrer</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Privileges Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎁 Privilèges disponibles</Text>
              {privileges.length === 0 ? (
                <Text style={styles.emptyText}>Aucun privilège configuré</Text>
              ) : (
                <>
                  {privileges.map((privilege) => {
                    const canAfford = balance >= privilege.points_cost;
                    return (
                      <TouchableOpacity
                        key={privilege.id}
                        style={[
                          styles.privilegeItem,
                          !canAfford && styles.privilegeItemDisabled,
                        ]}
                        onPress={() => handleRedeem(privilege)}
                        disabled={!canAfford || redeemMutation.isPending}
                      >
                        <View style={styles.privilegeLeft}>
                          <Text style={styles.privilegeTitle}>{privilege.title}</Text>
                        </View>
                        <View
                          style={[
                            styles.pointsBadge,
                            styles.costBadge,
                            !canAfford && styles.costBadgeDisabled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.pointsText,
                              !canAfford && styles.pointsTextDisabled,
                            ]}
                          >
                            {privilege.points_cost} pt
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </View>

            {/* Educational Note */}
            <View style={styles.tipBox}>
              <Text style={styles.tipTitle}>💡 Conseil</Text>
              <Text style={styles.tipText}>
                Changez les tâches et privilèges toutes les 2 semaines pour maintenir la
                motivation de votre enfant.
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4F46E5',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  progressBanner: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  progressBannerPassed: {
    backgroundColor: '#D1FAE5',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F46E5',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  inputFlex: {
    flex: 1,
    marginRight: 8,
  },
  pointsBadge: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  costBadge: {
    backgroundColor: '#F59E0B',
  },
  costBadgeDisabled: {
    backgroundColor: '#D1D5DB',
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  pointsTextDisabled: {
    color: '#9CA3AF',
  },
  button: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  balanceCard: {
    backgroundColor: '#4F46E5',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E0E7FF',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFF',
  },
  balanceDetails: {
    marginTop: 8,
  },
  balanceDetail: {
    fontSize: 12,
    color: '#C7D2FE',
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  taskItemSelected: {
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  checkmark: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: 15,
    color: '#111827',
    flex: 1,
  },
  privilegeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#F59E0B',
    marginBottom: 12,
  },
  privilegeItemDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    opacity: 0.6,
  },
  privilegeLeft: {
    flex: 1,
  },
  privilegeTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  tipBox: {
    backgroundColor: '#F0F9FF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0C4A6E',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#075985',
    lineHeight: 20,
  },
});
