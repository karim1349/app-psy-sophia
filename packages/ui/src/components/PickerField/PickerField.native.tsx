import { useRef, useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { BottomSheetModal } from '../BottomSheet';
import type { BottomSheetModal as BottomSheetModalType } from '@gorhom/bottom-sheet';
import { useTheme } from '../../native/theme';

export type PickerOption<T = string> = {
  label: string;
  value: T;
};

export type PickerFieldProps<T = string> = {
  /**
   * Field label
   */
  label: string;

  /**
   * Current selected value
   */
  value?: T;

  /**
   * Callback when value changes
   */
  onValueChange: (value: T) => void;

  /**
   * List of options
   */
  options: PickerOption<T>[];

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Modal title
   */
  title?: string;

  /**
   * Enable search/filter
   */
  searchable?: boolean;

  /**
   * Search placeholder
   */
  searchPlaceholder?: string;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Error message
   */
  error?: string;

  /**
   * Accessibility label
   */
  accessibilityLabel?: string;
};

export function PickerField<T = string>({
  label,
  value,
  onValueChange,
  options,
  placeholder = 'Sélectionner',
  title,
  searchable = false,
  searchPlaceholder = 'Rechercher...',
  disabled = false,
  error,
  accessibilityLabel,
}: PickerFieldProps<T>) {
  const theme = useTheme();
  const modalRef = useRef<BottomSheetModalType>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption?.label || placeholder;

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) {
      return options;
    }
    const query = searchQuery.toLowerCase();
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(query)
    );
  }, [options, searchQuery, searchable]);

  const handleSelect = (option: PickerOption<T>) => {
    onValueChange(option.value);
    setSearchQuery('');
    modalRef.current?.dismiss();
  };

  const handleOpen = () => {
    if (!disabled) {
      modalRef.current?.present();
    }
  };

  const handleDismiss = () => {
    setSearchQuery('');
  };

  const styles = StyleSheet.create({
    container: {
      gap: theme.space.xs,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.fgDefault,
      marginBottom: theme.space.xs,
    },
    field: {
      height: 48,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: error ? theme.colors.danger : 'transparent',
      backgroundColor: disabled ? theme.colors.bgCanvas : theme.colors.bgSurface,
      paddingHorizontal: theme.space.md,
      justifyContent: 'center',
    },
    fieldText: {
      fontSize: 16,
      color: selectedOption ? theme.colors.fgDefault : theme.colors.fgMuted,
    },
    error: {
      fontSize: 14,
      color: theme.colors.danger,
      marginVertical: theme.space.xs,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.space.lg,
      paddingTop: theme.space.md,
      paddingBottom: theme.space.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    titleText: {
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
    searchContainer: {
      paddingHorizontal: theme.space.lg,
      paddingTop: theme.space.md,
      paddingBottom: theme.space.md,
    },
    searchInput: {
      height: 40,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.bgCanvas,
      paddingHorizontal: theme.space.md,
      fontSize: 16,
      color: theme.colors.fgDefault,
    },
    listContent: {
      paddingBottom: theme.space.lg,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.space.md,
      paddingHorizontal: theme.space.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    optionLast: {
      borderBottomWidth: 0,
    },
    optionLabel: {
      fontSize: 16,
      color: theme.colors.fgDefault,
      flex: 1,
    },
    optionSelected: {
      fontWeight: '600',
      color: theme.colors.brand,
    },
    checkmark: {
      fontSize: 18,
      color: theme.colors.brand,
      marginStart: theme.space.sm,
    },
    emptyContainer: {
      padding: theme.space.xl,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.fgMuted,
    },
  });

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={styles.label}>{label}</Text>

      {/* Field Trigger */}
      <Pressable
        onPress={handleOpen}
        disabled={disabled}
        style={({ pressed }) => [
          styles.field,
          { opacity: disabled ? theme.state.disabledOpacity : pressed ? theme.state.pressedOpacity : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || `${label} picker`}
        accessibilityHint="Opens picker modal"
      >
        <Text style={styles.fieldText}>{displayValue}</Text>
      </Pressable>

      {/* Error */}
      {error && <Text style={styles.error}>{error}</Text>}

      {/* Picker Modal */}
      <BottomSheetModal
        ref={modalRef}
        enableDynamicSizing
        maxDynamicContentSize={600}
        scrollable
        onDismiss={handleDismiss}
        accessibilityLabel={accessibilityLabel || `${label} picker modal`}
      >
        {/* Options List with Title and Search as Header */}
        <BottomSheetFlatList<PickerOption<T>>
          data={filteredOptions}
          keyExtractor={(item: PickerOption<T>, index: number) => `${item.value}-${index}`}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              {/* Title Header */}
              <View style={styles.titleContainer}>
                <Text style={styles.titleText} numberOfLines={1}>
                  {title || label}
                </Text>
                <Pressable
                  onPress={() => modalRef.current?.dismiss()}
                  style={({ pressed }) => [
                    styles.closeButton,
                    { opacity: pressed ? theme.state.pressedOpacity : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Close picker"
                >
                  <Text style={styles.closeButtonText}>×</Text>
                </Pressable>
              </View>

              {/* Search Input */}
              {searchable && (
                <View style={styles.searchContainer}>
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={searchPlaceholder}
                    placeholderTextColor={theme.colors.fgMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}
            </>
          }
          renderItem={({ item, index }: { item: PickerOption<T>; index: number }) => (
            <Pressable
              onPress={() => handleSelect(item)}
              style={({ pressed }) => [
                styles.option,
                index === filteredOptions.length - 1 && styles.optionLast,
                { opacity: pressed ? theme.state.pressedOpacity : 1 },
              ]}
            >
              <Text
                style={[
                  styles.optionLabel,
                  item.value === value && styles.optionSelected,
                ]}
              >
                {item.label}
              </Text>
              {item.value === value && <Text style={styles.checkmark}>✓</Text>}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'Aucun résultat trouvé' : 'Aucune option disponible'}
              </Text>
            </View>
          }
        />
      </BottomSheetModal>
    </View>
  );
}

PickerField.displayName = 'PickerField';
