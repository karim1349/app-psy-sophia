import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useI18n, supportedLanguages } from '@qiima/i18n';
import { useTheme } from '../native/theme';

interface LanguageSwitcherProps {
  style?: any;
}

export function LanguageSwitcher({ style }: LanguageSwitcherProps) {
  const { currentLanguage, changeLanguage } = useI18n();
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
      {supportedLanguages.map((lang) => (
        <TouchableOpacity
          key={lang}
          style={[
            styles.button,
            currentLanguage === lang && styles.activeButton,
          ]}
          onPress={() => changeLanguage(lang)}
        >
          <Text
            style={[
              styles.buttonText,
              currentLanguage === lang && styles.activeButtonText,
            ]}
          >
            {lang === 'ar' ? 'عربي' : lang.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
