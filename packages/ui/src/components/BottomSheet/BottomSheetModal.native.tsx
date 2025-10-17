import { forwardRef, useCallback, useMemo, type ReactNode } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import {
  BottomSheetModal as RNBottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
  type BottomSheetModalProps as RNBottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../native/theme';

export type BottomSheetModalProps = {
  /**
   * Unique name for this modal (helps provider distinguish between multiple modals)
   */
  name?: string;

  /**
   * Snap points for the bottom sheet (e.g., ['25%', '50%', '90%'])
   */
  snapPoints?: Array<string | number>;

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
   * Maximum dynamic content size (requires enableDynamicSizing)
   */
  maxDynamicContentSize?: number;

  /**
   * Detached mode (adds margins and shadow)
   */
  detached?: boolean;

  /**
   * Enable scrollable mode (children must be BottomSheetScrollView or BottomSheetFlatList)
   * When true, skips BottomSheetView wrapper for proper gesture coordination
   */
  scrollable?: boolean;

  /**
   * Callback when sheet is dismissed
   */
  onDismiss?: () => void;

  /**
   * Callback when sheet changes position
   */
  onChange?: (index: number) => void;

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
   * Additional bottom sheet modal props from @gorhom/bottom-sheet
   */
  bottomSheetModalProps?: Partial<RNBottomSheetModalProps>;
};

export const BottomSheetModal = forwardRef<RNBottomSheetModal, BottomSheetModalProps>(
  (
    {
      name,
      snapPoints: snapPointsProp,
      enableBackdrop = true,
      backdropDismissable = true,
      enablePanDownToClose = true,
      enableDynamicSizing = false,
      maxDynamicContentSize,
      detached = false,
      scrollable = false,
      onDismiss,
      onChange,
      header,
      title,
      footer,
      children,
      accessibilityLabel,
      bottomSheetModalProps,
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
        ref.current.dismiss();
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
      <RNBottomSheetModal
        ref={ref}
        name={name}
        snapPoints={snapPoints}
        enablePanDownToClose={enablePanDownToClose}
        enableDismissOnClose
        enableDynamicSizing={enableDynamicSizing}
        maxDynamicContentSize={maxDynamicContentSize}
        detached={detached}
        style={{marginHorizontal: detached ? theme.space.md : 0}}
        bottomInset={detached ? bottomInset + theme.space.md : 0}
        onDismiss={onDismiss}
        onChange={onChange}
        backdropComponent={enableBackdrop ? renderBackdrop : undefined}
        backgroundStyle={styles.container}
        handleIndicatorStyle={styles.handleIndicator}
        accessibilityLabel={accessibilityLabel}
        {...bottomSheetModalProps}
      >
        {scrollable ? (
          <>
            {header ?? defaultHeader}
            {children}
          </>
        ) : (
          <BottomSheetView>
            {header ?? defaultHeader}
            <View style={styles.content}>{children}</View>
            {footer && <View style={styles.footerContainer}>{footer}</View>}
          </BottomSheetView>
        )}
      </RNBottomSheetModal>
    );
  }
);

BottomSheetModal.displayName = 'BottomSheetModal';
