import { View, ScrollView, StyleSheet, RefreshControl, ViewStyle, ScrollViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { ReactNode } from 'react';
import { useTheme } from '@app-psy-sophia/ui';

interface TabScreenProps {
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
   * Additional padding at the bottom (added to tab bar height)
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
}

/**
 * Unified container for tab screens with gradient background,
 * automatic tab bar padding, and optional scroll behavior.
 *
 * @example
 * // Basic scrollable screen
 * <TabScreen>
 *   <Text>My content</Text>
 * </TabScreen>
 *
 * @example
 * // Non-scrollable (for FlatList)
 * <TabScreen scrollable={false}>
 *   <FlatList data={items} renderItem={...} />
 * </TabScreen>
 *
 * @example
 * // Centered content
 * <TabScreen centered>
 *   <LoadingSpinner />
 * </TabScreen>
 */
export function TabScreen({
  children,
  scrollable = true,
  centered = false,
  onRefresh,
  refreshing = false,
  extraBottomPadding = 20,
  contentContainerStyle,
  scrollViewProps,
}: TabScreenProps) {
  const tabBarHeight = useTabBarHeight();
  const theme = useTheme();
  const paddingBottom = tabBarHeight + extraBottomPadding;

  // Non-scrollable container (for FlatList, etc.)
  if (!scrollable) {
    return (
      <View style={styles.container}>
        <LinearGradient
          pointerEvents="none"
          colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    );
  }

  // Scrollable container
  const refreshControl = onRefresh ? (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  ) : undefined;

  return (
    <View style={styles.container}>
      <LinearGradient
        pointerEvents="none"
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom },
          !centered && { flexGrow: 1 },
          centered && styles.centered,
          contentContainerStyle,
        ]}
        refreshControl={refreshControl}
        {...scrollViewProps}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
  },
});
