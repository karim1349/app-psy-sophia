import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Hook that returns the height of the floating tab bar
 * Use this to add bottom padding to scrollable content
 */
export function useTabBarHeight() {
  const insets = useSafeAreaInsets();

  // Tab bar structure:
  // - Container padding top: 8px
  // - Tab bar inner: ~60px (icon + padding)
  // - Container padding bottom: max(insets.bottom, 12)
  const TAB_BAR_INNER_HEIGHT = 60;
  const CONTAINER_PADDING_TOP = 8;
  const CONTAINER_PADDING_BOTTOM = Math.max(insets.bottom, 12);

  return TAB_BAR_INNER_HEIGHT + CONTAINER_PADDING_TOP + CONTAINER_PADDING_BOTTOM;
}
