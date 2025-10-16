import { View, ScrollView, StyleSheet, RefreshControl, ViewStyle, ScrollViewProps, KeyboardAvoidingView, Platform, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReactNode } from 'react';
import { useThemeStore } from '@qiima/state';

interface StackScreenProps {
  /**
   * Content to render inside the screen
   */
  children: ReactNode;

  /**
   * Whether the content should be scrollable (default: true)
   * Set to false if you're using FlatList or custom scroll component
   */
  scrollable?: boolean;

  /**
   * Center content vertically (useful for loading/empty states)
   */
  centered?: boolean;

  /**
   * Pull to refresh handler
   */
  onRefresh?: () => void | Promise<void>;

  /**
   * Whether refresh is in progress
   */
  refreshing?: boolean;

  /**
   * Additional padding at the top (added to safe area inset)
   */
  extraTopPadding?: number;

  /**
   * Additional padding at the bottom
   */
  extraBottomPadding?: number;

  /**
   * Custom content container style
   */
  contentContainerStyle?: ViewStyle;

  /**
   * Additional ScrollView props
   */
  scrollViewProps?: Omit<ScrollViewProps, 'children' | 'style' | 'contentContainerStyle' | 'refreshControl'>;

  /**
   * Whether to show gradient background (default: true)
   */
  showGradient?: boolean;

  /**
   * Whether to use KeyboardAvoidingView (default: true)
   */
  keyboardAvoiding?: boolean;

  /**
   * Custom gradient colors (overrides theme colors)
   */
  gradientColors?: readonly [string, string, ...string[]];
}

/**
 * Unified container for stack/modal screens with automatic safe area handling,
 * gradient background, and optional scroll behavior.
 *
 * @example
 * // Basic scrollable screen
 * <StackScreen>
 *   <Text>My content</Text>
 * </StackScreen>
 *
 * @example
 * // With pull-to-refresh
 * <StackScreen onRefresh={handleRefresh} refreshing={isRefreshing}>
 *   <DealList deals={deals} />
 * </StackScreen>
 *
 * @example
 * // Non-scrollable (for FlatList)
 * <StackScreen scrollable={false}>
 *   <FlatList data={items} renderItem={...} />
 * </StackScreen>
 *
 * @example
 * // Centered content
 * <StackScreen centered>
 *   <LoadingSpinner />
 * </StackScreen>
 *
 * @example
 * // Without gradient background
 * <StackScreen showGradient={false}>
 *   <CustomContent />
 * </StackScreen>
 */
export function StackScreen({
  children,
  scrollable = true,
  centered = false,
  onRefresh,
  refreshing = false,
  extraTopPadding = 60,
  extraBottomPadding = 20,
  contentContainerStyle,
  scrollViewProps,
  showGradient = true,
  keyboardAvoiding = true,
  gradientColors,
}: StackScreenProps) {
  const insets = useSafeAreaInsets();
  const themeStore = useThemeStore();
  const systemScheme = useColorScheme() ?? 'light';
  const scheme = themeStore.mode === 'system' ? systemScheme : themeStore.mode;
  
  const paddingTop = insets.top + extraTopPadding;
  const paddingBottom = insets.bottom + extraBottomPadding;

  // Get gradient colors
  const colors = gradientColors || (
    scheme === 'dark'
      ? ['#21110D', '#28180F', '#17120A'] as const
      : ['#FFECE5', '#FFE3CC', '#FFF6D6'] as const
  );

  const container = (
    <View style={styles.container}>
      {showGradient && (
        <LinearGradient
          pointerEvents="none"
          colors={colors}
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {children}
    </View>
  );

  // Non-scrollable container (for FlatList, etc.)
  if (!scrollable) {
    return keyboardAvoiding ? (
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {container}
      </KeyboardAvoidingView>
    ) : container;
  }

  // Scrollable container
  const refreshControl = onRefresh ? (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  ) : undefined;

  const scrollableContent = (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.content,
        { paddingTop, paddingBottom },
        !centered && { flexGrow: 1 },
        centered && styles.centered,
        contentContainerStyle,
      ]}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  );

  return keyboardAvoiding ? (
    <KeyboardAvoidingView 
      style={styles.keyboardContainer} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        {showGradient && (
          <LinearGradient
            pointerEvents="none"
            colors={colors}
            locations={[0, 0.6, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        {scrollableContent}
      </View>
    </KeyboardAvoidingView>
  ) : (
    <View style={styles.container}>
      {showGradient && (
        <LinearGradient
          pointerEvents="none"
          colors={colors}
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {scrollableContent}
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
