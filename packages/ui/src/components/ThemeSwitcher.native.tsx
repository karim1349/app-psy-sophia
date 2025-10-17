import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useThemeStore, type ThemeMode } from '@app-psy-sophia/state';
import { useTheme } from '../native/theme';

interface ThemeSwitcherProps {
  style?: any;
}

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export function ThemeSwitcher({ style }: ThemeSwitcherProps) {
  const themeStore = useThemeStore();
  const theme = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radius.md,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    button: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: theme.radius.sm,
      alignItems: 'center',
    },
    activeButton: {
      backgroundColor: theme.colors.brand,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.fgMuted,
    },
    activeButtonText: {
      color: theme.mode === 'dark' ? '#0F1115' : '#FFFFFF',
    },
  });

  return (
    <View style={[styles.container, style]}>
      {themeOptions.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.button,
            themeStore.mode === option.value && styles.activeButton,
          ]}
          onPress={() => themeStore.setMode(option.value)}
        >
          <Text
            style={[
              styles.buttonText,
              themeStore.mode === option.value && styles.activeButtonText,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
