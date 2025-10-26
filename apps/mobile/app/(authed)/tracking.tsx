/**
 * Tracking screen - View progress and statistics
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../src/components/Button';
import { getDashboard, getTargetBehaviors, upsertCheckin, getTodayCheckin } from '../../src/api/onboarding';
import { appStorage } from '../../src/lib/storage';

export default function TrackingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [childId, setChildId] = React.useState<number | null>(null);
  const [isLoadingChild, setIsLoadingChild] = React.useState(true);
  const [todayBehaviors, setTodayBehaviors] = React.useState<Record<number, boolean>>({});

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

  // Fetch target behaviors
  const { data: behaviorsData } = useQuery({
    queryKey: ['behaviors'],
    queryFn: getTargetBehaviors,
    enabled: !!childId,
    retry: 2,
  });

  // Fetch dashboard
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard', childId],
    queryFn: () => getDashboard(childId!, 7),
    enabled: !!childId,
    retry: 2,
  });

  // Fetch today's check-in
  const { data: todayCheckin } = useQuery({
    queryKey: ['todayCheckin', childId],
    queryFn: () => getTodayCheckin(childId!),
    enabled: !!childId,
    retry: 2,
  });

  // Mutation for updating check-in
  const updateCheckinMutation = useMutation({
    mutationFn: ({
      behaviorId,
      done,
    }: {
      behaviorId: number;
      done: boolean;
    }) => {
      const today = new Date().toISOString().split('T')[0];

      // Update local state optimistically
      setTodayBehaviors((prev) => ({
        ...prev,
        [behaviorId]: done,
      }));

      // Build behaviors array with current state
      const allBehaviors = behaviorsData?.results.filter(b => b.active) || [];
      const currentBehaviors = allBehaviors.map((b) => ({
        behavior_id: b.id,
        done: b.id === behaviorId ? done : (todayBehaviors[b.id] || false),
      }));

      return upsertCheckin(childId!, {
        date: today,
        mood: 3,
        behaviors: currentBehaviors,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['todayCheckin'] });
    },
  });

  const behaviors = behaviorsData?.results.filter((b) => b.active).slice(0, 3) || [];

  // Prepare chart data
  const chartData =
    dashboardData?.days?.map((day: string, i: number) => ({
      x: i + 1,
      y: dashboardData.routine_success?.[i] || 0,
    })) || [];

  // Load today's behavior completion status from saved check-in
  React.useEffect(() => {
    if (todayCheckin) {
      const behaviorState: Record<number, boolean> = {};
      todayCheckin.behaviors.forEach((b) => {
        behaviorState[b.behavior_id] = b.done;
      });
      setTodayBehaviors(behaviorState);
    }
  }, [todayCheckin]);

  if (isLoadingChild) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#5B4BCC" />
      </View>
    );
  }

  if (!childId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Aucun enfant configuré</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Suivi</Text>
        </View>

        {/* Today's Routines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Les 3 routines du jour</Text>
          <Text style={styles.sectionHint}>
            Cochez les comportements réalisés par votre enfant aujourd'hui
          </Text>

          {behaviors.length === 0 ? (
            <Text style={styles.emptyText}>
              Aucune routine configurée. Complétez l'onboarding.
            </Text>
          ) : (
            <>
              {behaviors.map((behavior) => (
                <View key={behavior.id} style={styles.routineCard}>
                  <View style={styles.routineLeft}>
                    <Text style={styles.routineName}>{behavior.name}</Text>
                    {todayBehaviors[behavior.id] && (
                      <Text style={styles.routineDone}>✓ Fait</Text>
                    )}
                  </View>
                  <Switch
                    value={todayBehaviors[behavior.id] || false}
                    onValueChange={(value) =>
                      updateCheckinMutation.mutate({
                        behaviorId: behavior.id,
                        done: value,
                      })
                    }
                    trackColor={{ false: '#E5E7EB', true: '#8B7FE8' }}
                    thumbColor="#FFFFFF"
                    disabled={updateCheckinMutation.isPending}
                  />
                </View>
              ))}

              {/* Show encouragement when all behaviors done */}
              {behaviors.length > 0 &&
                behaviors.every((b) => todayBehaviors[b.id]) && (
                  <View style={styles.successBanner}>
                    <Text style={styles.successIcon}>🎉</Text>
                    <Text style={styles.successText}>
                      Bravo ! Toutes les routines sont réalisées aujourd'hui !
                    </Text>
                  </View>
                )}
            </>
          )}
        </View>

        {/* Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progression (7 jours)</Text>
          <View style={styles.chartCard}>
            {chartData.length > 0 ? (
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartPlaceholderText}>
                  📊 Graphique de progression
                </Text>
                <Text style={styles.chartPlaceholderSubtext}>
                  Données collectées : {chartData.length} jours
                </Text>
                <View style={styles.chartStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {Math.round(
                        chartData.reduce((sum: number, d: { x: number; y: number }) => sum + d.y, 0) /
                          chartData.length
                      )}
                      %
                    </Text>
                    <Text style={styles.statLabel}>Moyenne</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {Math.max(...chartData.map((d: { x: number; y: number }) => d.y))}%
                    </Text>
                    <Text style={styles.statLabel}>Meilleur</Text>
                  </View>
                </View>
              </View>
            ) : (
              <Text style={styles.emptyText}>
                Les données apparaîtront après vos premiers check-ins
              </Text>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actions}>
          <Button
            title="Check-in quotidien"
            onPress={() => router.push('/modals/checkin')}
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
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  header: {
    padding: 24,
    paddingTop: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  routineCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  routineLeft: {
    flex: 1,
    gap: 4,
  },
  routineName: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  routineDone: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    gap: 12,
  },
  successIcon: {
    fontSize: 24,
  },
  successText: {
    flex: 1,
    fontSize: 15,
    color: '#047857',
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  chartPlaceholder: {
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  chartPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  chartPlaceholderSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  chartStats: {
    flexDirection: 'row',
    gap: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5B4BCC',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    padding: 20,
  },
  actions: {
    padding: 24,
    gap: 12,
  },
});
