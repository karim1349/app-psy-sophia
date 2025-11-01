/**
 * Home screen with dashboard, routines, and chart
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Command,
  Gift,
  Hourglass,
  Lock,
  Shield,
} from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTabBarHeight } from '../../../hooks/use-tab-bar-height';
import { getModules } from '../../../src/api/modules';
import {
  getDashboard,
  getTargetBehaviors,
  getTodayCheckin,
  upsertCheckin,
} from '../../../src/api/onboarding';
import { Button } from '../../../src/components/Button';
import { appStorage } from '../../../src/lib/storage';

const { width } = Dimensions.get('window');

// Icon mapping for each module type
const getModuleIcon = (key: string) => {
  switch (key) {
    case 'special_time':
      return Clock;
    case 'effective_commands':
      return Command;
    case 'anger_management':
      return Shield;
    case 'timeout':
      return Hourglass;
    case 'rewards':
      return Gift;
    case 'time_management':
      return Calendar;
    case 'homework':
      return BookOpen;
    default:
      return BookOpen;
  }
};

// Color scheme for each module type - Enhanced with vibrant colors
const getModuleColor = (key: string, state: string) => {
  const colors: Record<
    string,
    { background: string; icon: string; text: string; accent: string }
  > = {
    special_time: {
      // Warm purple gradient
      background: '#F3E8FF',
      icon: '#A855F7',
      text: '#7C3AED',
      accent: '#C084FC',
    },
    effective_commands: {
      // Vibrant blue
      background: '#EFF6FF',
      icon: '#2563EB',
      text: '#1E40AF',
      accent: '#60A5FA',
    },
    anger_management: {
      // Soft coral/orange
      background: '#FFF1F2',
      icon: '#F43F5E',
      text: '#BE185D',
      accent: '#FB7185',
    },
    timeout: {
      // Warm amber
      background: '#FFFBEB',
      icon: '#F59E0B',
      text: '#D97706',
      accent: '#FBBF24',
    },
    rewards: {
      // Fresh mint green
      background: '#ECFDF5',
      icon: '#10B981',
      text: '#059669',
      accent: '#34D399',
    },
    time_management: {
      // Deep indigo
      background: '#EEF2FF',
      icon: '#6366F1',
      text: '#4F46E5',
      accent: '#818CF8',
    },
    homework: {
      // Vibrant pink
      background: '#FDF2F8',
      icon: '#EC4899',
      text: '#DB2777',
      accent: '#F472B6',
    },
  };

  const moduleColors = colors[key] || colors.special_time;

  // If locked, apply reduced opacity to colors while maintaining the color scheme
  if (state === 'locked') {
    return {
      background: moduleColors.background + 'CC', // ~80% opacity
      icon: moduleColors.icon + '80', // Reduced opacity icon (50% opacity)
      text: moduleColors.text + '99', // Reduced opacity text (~60% opacity)
      accent: moduleColors.accent + '80', // Reduced opacity accent (50% opacity)
    };
  }

  return moduleColors;
};

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tabBarHeight = useTabBarHeight();
  const [childId, setChildId] = React.useState<number | null>(null);
  const [isLoadingChild, setIsLoadingChild] = React.useState(true);
  const [todayBehaviors, setTodayBehaviors] = React.useState<
    Record<number, boolean>
  >({});

  React.useEffect(() => {
    async function loadChildId() {
      console.log('=== DASHBOARD DEBUG ===');

      // Ensure we have auth tokens before making API calls
      const { isAuthenticated } = await import('../../../src/api/auth');
      const hasAuth = await isAuthenticated();

      if (!hasAuth) {
        console.error('❌ No auth token found. Cannot load dashboard.');
        await appStorage.clearAppData();
        router.replace('/(public)/onboarding/age');
        setIsLoadingChild(false);
        return;
      }

      const id = await appStorage.getChildId();
      console.log('Child ID from storage:', id);

      if (id) {
        // Verify the child belongs to the current user
        try {
          console.log('🔍 Verifying child ownership...');
          const { getChildren } = await import('../../../src/api/onboarding');
          const childrenResponse = await getChildren();
          const userChildren = childrenResponse.results;

          console.log(
            '👤 User has',
            userChildren.length,
            'children:',
            userChildren.map((c) => c.id)
          );

          const childExists = userChildren.some((c) => c.id === id);

          if (childExists) {
            console.log('✅ Child ID', id, 'belongs to current user');
            console.log(
              '✅ Will call: /api/children/' + id + '/dashboard/?range=7'
            );
            setChildId(id);
          } else {
            console.error('❌ Child ID', id, 'does NOT belong to current user');
            console.log(
              '🔄 Clearing stored child ID and restarting onboarding'
            );
            await appStorage.clearAppData();
            router.replace('/(public)/onboarding/age');
          }
        } catch (error) {
          console.error('❌ Error verifying child:', error);
          await appStorage.clearAppData();
          router.replace('/(public)/onboarding/age');
        }
      } else {
        console.error('❌ NO CHILD ID! User must complete onboarding first.');
        router.replace('/(public)/onboarding/age');
      }
      setIsLoadingChild(false);
    }
    loadChildId();
  }, []);

  // Fetch target behaviors
  const { data: behaviorsData, error: behaviorsError } = useQuery({
    queryKey: ['behaviors'],
    queryFn: getTargetBehaviors,
    enabled: !!childId,
    retry: 2,
  });

  // Fetch dashboard
  const {
    data: dashboardData,
    error: dashboardError,
    isLoading: isDashboardLoading,
  } = useQuery({
    queryKey: ['dashboard', childId],
    queryFn: () => {
      console.log('🔄 Fetching dashboard for child ID:', childId);
      return getDashboard(childId!, 7);
    },
    enabled: !!childId,
    refetchInterval: 30000, // Refetch every 30s
    retry: 2,
  });

  // Fetch today's check-in to load saved behavior states
  const { data: todayCheckin } = useQuery({
    queryKey: ['todayCheckin', childId],
    queryFn: () => {
      console.log("📅 Fetching today's check-in for child ID:", childId);
      return getTodayCheckin(childId!);
    },
    enabled: !!childId,
    retry: 2,
  });

  // Fetch modules with progress
  const { data: modules } = useQuery({
    queryKey: ['modules', childId],
    queryFn: () => getModules(childId!),
    enabled: !!childId,
    retry: 2,
  });

  const specialTimeModule = modules?.find((m) => m.key === 'special_time');

  // Mutation for updating check-in (must be called before any conditional returns)
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
      const allBehaviors = behaviorsData?.results.filter((b) => b.active) || [];
      const currentBehaviors = allBehaviors.map((b) => ({
        behavior_id: b.id,
        done: b.id === behaviorId ? done : todayBehaviors[b.id] || false,
      }));

      console.log('✅ Updating behavior:', behaviorId, 'done:', done);
      console.log('📊 All behaviors state:', currentBehaviors);

      return upsertCheckin(childId!, {
        date: today,
        mood: 3, // Default mood (will be updated in check-in modal)
        behaviors: currentBehaviors,
      });
    },
    onSuccess: () => {
      console.log('✅ Check-in updated successfully');
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['todayCheckin'] });
    },
    onError: (error) => {
      console.error('❌ Failed to update check-in:', error);
      // Revert optimistic update on error
      // (in production, you'd want to revert the specific behavior)
    },
  });

  const behaviors =
    behaviorsData?.results.filter((b) => b.active).slice(0, 3) || [];

  // Prepare chart data
  const chartData =
    dashboardData?.days?.map((day: string, i: number) => ({
      x: i + 1,
      y: dashboardData.routine_success?.[i] || 0,
    })) || [];

  // Load today's behavior completion status from saved check-in
  React.useEffect(() => {
    if (todayCheckin) {
      console.log('📅 Loading saved check-in:', todayCheckin);

      // Convert behaviors array to state object
      const behaviorState: Record<number, boolean> = {};
      todayCheckin.behaviors.forEach((b) => {
        behaviorState[b.behavior_id] = b.done;
      });

      console.log('✅ Restored behavior state:', behaviorState);
      setTodayBehaviors(behaviorState);
    } else {
      console.log('📅 No check-in for today yet, starting fresh');
    }
  }, [todayCheckin]);

  // Handle dashboard errors
  React.useEffect(() => {
    if (
      dashboardError &&
      'status' in dashboardError &&
      (dashboardError as any).status === 404
    ) {
      console.error('❌ Dashboard API error:', dashboardError);
      appStorage.clearAppData();
      router.replace('/(public)/onboarding/age');
    }
  }, [dashboardError]);

  // Show loading state while checking for child ID
  if (isLoadingChild) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#5B4BCC" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  // Show error if child ID is missing
  if (!childId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Configuration requise</Text>
          <Text style={styles.errorText}>
            Veuillez compléter le processus d&apos;inscription pour continuer.
          </Text>
          <Button
            title="Commencer"
            onPress={() => router.replace('/(public)/onboarding/age')}
            size="large"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Bonjour ! 👋</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.childBadge}>
              <Text style={styles.childBadgeText}>Mon enfant</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Module: Special Time */}
        {specialTimeModule && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📚 Module en cours</Text>
            <TouchableOpacity
              style={styles.moduleCard}
              onPress={() => router.push('/(authed)/home/special-time')}
            >
              <View style={styles.moduleHeader}>
                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleTitle}>
                    {specialTimeModule.title}
                  </Text>
                  {specialTimeModule.state === 'passed' && (
                    <Text style={styles.moduleBadge}>✓ Complété</Text>
                  )}
                </View>
                <View style={styles.progressRing}>
                  <Text style={styles.progressRingText}>
                    {specialTimeModule.counters.sessions_21d}/6
                  </Text>
                </View>
              </View>
              <View style={styles.moduleStats}>
                <View style={styles.moduleStat}>
                  <Text style={styles.moduleStatLabel}>Sessions (21j)</Text>
                  <Text style={styles.moduleStatValue}>
                    {specialTimeModule.counters.sessions_21d}
                  </Text>
                </View>
                <View style={styles.moduleStat}>
                  <Text style={styles.moduleStatLabel}>
                    Appréciées (6 dernières)
                  </Text>
                  <Text style={styles.moduleStatValue}>
                    {specialTimeModule.counters.liked_last6}/4
                  </Text>
                </View>
              </View>
              <Button
                title="Consigner une session"
                size="small"
                variant="outline"
                onPress={() => router.push('/(authed)/home/special-time')}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* All Modules */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Tous les modules</Text>
          {modules && modules.length > 0 ? (
            <View style={styles.modulesGrid}>
              {modules.map((module, index) => {
                const isLocked = module.state === 'locked';
                const previousModule = index > 0 ? modules[index - 1] : null;
                const IconComponent = getModuleIcon(module.key);
                const colors = getModuleColor(module.key, module.state);

                const handlePress = () => {
                  if (isLocked) {
                    return;
                  }

                  if (module.key === 'special_time') {
                    router.push('/(authed)/home/special-time');
                  } else if (module.key === 'effective_commands') {
                    router.push('/(authed)/home/effective-commands');
                  } else if (module.key === 'anger_management') {
                    router.push('/(authed)/home/anger-management');
                  } else if (module.key === 'timeout') {
                    router.push('/(authed)/home/timeout');
                  } else if (module.key === 'rewards') {
                    router.push('/(authed)/home/rewards');
                  } else if (module.key === 'time_management') {
                    router.push('/(authed)/home/time-management');
                  } else if (module.key === 'homework') {
                    router.push('/(authed)/home/homework');
                  }
                };

                return (
                  <TouchableOpacity
                    key={module.id}
                    style={[
                      styles.moduleGridCard,
                      { backgroundColor: colors.background },
                      isLocked && styles.moduleGridCardLocked,
                    ]}
                    onPress={handlePress}
                    activeOpacity={isLocked ? 1 : 0.7}
                  >
                    <View style={styles.moduleGridCardContent}>
                      {/* Status Badge - Only show for locked or passed modules */}
                      {(module.state === 'locked' ||
                        module.state === 'passed') && (
                        <View style={styles.moduleStatusBadge}>
                          {module.state === 'locked' && (
                            <Lock size={14} color="#9CA3AF" />
                          )}
                          {module.state === 'passed' && (
                            <CheckCircle2 size={14} color="#10B981" />
                          )}
                        </View>
                      )}

                      {/* Main Content Area */}
                      <View style={styles.moduleCardMainContent}>
                        {/* Icon */}
                        <View
                          style={[
                            styles.moduleIconContainer,
                            { backgroundColor: colors.accent + '40' },
                            isLocked && styles.moduleIconContainerLocked,
                          ]}
                        >
                          <IconComponent size={32} color={colors.icon} />
                        </View>

                        {/* Title */}
                        <Text
                          style={[
                            styles.moduleGridCardTitle,
                            { color: colors.text },
                            isLocked && styles.moduleGridCardTitleLocked,
                          ]}
                          numberOfLines={2}
                        >
                          {module.title}
                        </Text>

                        {/* State Label */}
                        <Text
                          style={[
                            styles.moduleGridCardState,
                            { color: colors.text + 'CC' },
                            isLocked && styles.moduleGridCardStateLocked,
                          ]}
                          numberOfLines={2}
                        >
                          {module.state === 'locked' && previousModule
                            ? `Complétez "${previousModule.title}" d'abord`
                            : module.state === 'locked'
                              ? 'Verrouillé'
                              : module.state === 'unlocked'
                                ? 'Disponible'
                                : 'Complété'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyText}>Aucun module disponible</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsButton: {
    padding: 4,
  },
  settingsIcon: {
    fontSize: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  childBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  childBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5B4BCC',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 16,
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  moduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  moduleBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  progressRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#8B7FE8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  progressRingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5B4BCC',
  },
  moduleStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  moduleStat: {
    flex: 1,
  },
  moduleStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  moduleStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moduleGridCard: {
    width: (width - 48 - 12) / 2,
    aspectRatio: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  moduleGridCardLocked: {
    opacity: 0.6,
  },
  moduleGridCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  moduleCardMainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  moduleStatusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  moduleIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  moduleIconContainerLocked: {
    opacity: 0.7,
  },
  moduleGridCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 20,
  },
  moduleGridCardTitleLocked: {
    opacity: 0.7,
  },
  moduleGridCardState: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  moduleGridCardStateLocked: {
    opacity: 0.7,
    textTransform: 'none',
    fontSize: 10,
    lineHeight: 14,
  },
});
