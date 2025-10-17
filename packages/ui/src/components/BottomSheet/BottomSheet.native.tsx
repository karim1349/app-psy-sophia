import { forwardRef, useCallback, useMemo, type ReactNode } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import RNBottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
  type BottomSheetProps as RNBottomSheetProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../native/theme';

export type BottomSheetProps = {
  /**
   * Snap points for the bottom sheet (e.g., ['25%', '50%', '90%'])
   */
  snapPoints?: Array<string | number>;

  /**
   * Initial snap index (defaults to 0)
   */
  initialSnapIndex?: number;

  /**
   * Whether to show the backdrop
   */
  enableBackdrop?: boolean;

  /**
   * Whether the backdrop is dismissable
   */
  backdropDismissable?: boolean;

  /**
   * Enable pan down to close gesture
   */
  enablePanDownToClose?: boolean;

  /**
   * Enable dynamic sizing (adapts to content height)
   */
  enableDynamicSizing?: boolean;

  /**
   * Detached mode (adds margins and shadow)
   */
  detached?: boolean;

  /**
   * Callback when sheet changes position
   */
  onChange?: (index: number) => void;

  /**
   * Callback when sheet is closed
   */
  onClose?: () => void;

  /**
   * Optional header component
   */
  header?: ReactNode;

  /**
   * Optional title (creates default header)
   */
  title?: string;

  /**
   * Optional footer component
   */
  footer?: ReactNode;

  /**
   * Content
   */
  children: ReactNode;

  /**
   * Accessibility label
   */
  accessibilityLabel?: string;

  /**
   * Additional bottom sheet props from @gorhom/bottom-sheet
   */
  bottomSheetProps?: Partial<RNBottomSheetProps>;
};

export const BottomSheet = forwardRef<RNBottomSheet, BottomSheetProps>(
  (
    {
      snapPoints: snapPointsProp,
      initialSnapIndex = 0,
      enableBackdrop = true,
      backdropDismissable = true,
      enablePanDownToClose = true,
      enableDynamicSizing = false,
      detached = false,
      onChange,
      onClose,
      header,
      title,
      footer,
      children,
      accessibilityLabel,
      bottomSheetProps,
    },
    ref
  ) => {
    const theme = useTheme();
    const { bottom: bottomInset } = useSafeAreaInsets();

    // Default snap points
    const snapPoints = useMemo(
      () => snapPointsProp ?? (enableDynamicSizing ? [] : ['50%', '90%']),
      [snapPointsProp, enableDynamicSizing]
    );

    // Handle change with close detection
    const handleChange = useCallback(
      (index: number) => {
        onChange?.(index);
        if (index === -1) {
          onClose?.();
        }
      },
      [onChange, onClose]
    );

    // Backdrop component
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior={backdropDismissable ? 'close' : 'none'}
          opacity={theme.mode === 'dark' ? 0.7 : 0.5}
        />
      ),
      [backdropDismissable, theme.mode]
    );

    const styles = StyleSheet.create({
      container: {
        backgroundColor: theme.colors.bgSurface,
        borderTopLeftRadius: theme.radius.lg,
        borderTopRightRadius: theme.radius.lg,
        borderWidth: 1,
        borderBottomWidth: detached ? 1 : 0,
        borderColor: theme.colors.border,
        overflow: 'hidden',
        ...(detached && {
          borderRadius: theme.radius.lg,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: theme.mode === 'dark' ? 0.4 : 0.2,
          shadowRadius: 16,
          elevation: 12,
        }),
      },
      handleIndicator: {
        backgroundColor: theme.colors.border,
        width: 40,
        height: 4,
        borderRadius: 2,
      },
      headerContainer: {
        paddingHorizontal: theme.space.lg,
        paddingTop: theme.space.md,
        paddingBottom: theme.space.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      },
      titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      title: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.fgDefault,
        flex: 1,
      },
      closeButton: {
        width: 32,
        height: 32,
        borderRadius: theme.radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginStart: theme.space.sm,
      },
      closeButtonText: {
        fontSize: 20,
        color: theme.colors.fgMuted,
        lineHeight: 20,
      },
      content: {
        flex: 1,
      },
      footerContainer: {
        paddingHorizontal: theme.space.lg,
        paddingTop: theme.space.sm,
        paddingBottom: theme.space.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
      },
    });

    // Close handler for title header
    const handleClose = useCallback(() => {
      if (ref && typeof ref !== 'function' && ref.current) {
        ref.current.close();
      }
    }, [ref]);

    // Default header with title
    const defaultHeader = title ? (
      <View style={styles.headerContainer}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {enablePanDownToClose && (
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.closeButton,
                { opacity: pressed ? theme.state.pressedOpacity : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Close bottom sheet"
            >
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          )}
        </View>
      </View>
    ) : null;

    return (
      <RNBottomSheet
        ref={ref}
        snapPoints={snapPoints}
        index={initialSnapIndex}
        enablePanDownToClose={enablePanDownToClose}
        enableDynamicSizing={enableDynamicSizing}
        detached={detached}
        bottomInset={detached ? bottomInset + theme.space.md : 0}
        onChange={handleChange}
        backdropComponent={enableBackdrop ? renderBackdrop : undefined}
        backgroundStyle={styles.container}
        handleIndicatorStyle={styles.handleIndicator}
        accessibilityLabel={accessibilityLabel}
        {...bottomSheetProps}
      >
        <BottomSheetView>
          {header ?? defaultHeader}
          <View style={styles.content}>{children}</View>
          {footer && <View style={styles.footerContainer}>{footer}</View>}
        </BottomSheetView>
      </RNBottomSheet>
    );
  }
);

BottomSheet.displayName = 'BottomSheet';
