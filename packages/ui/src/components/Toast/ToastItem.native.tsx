import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleCheck, CircleX, AlertTriangle, Info } from 'lucide-react-native';
import { useI18n, useI18nNamespace } from '@app-psy-sophia/i18n';
import { useTheme } from '../../native/theme';
import { ToastProps } from './types';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Helper function to translate a string that might be an i18n key or plain text.
 * 
 * i18n keys typically contain dots (e.g., "errors.validation.title" or "auth.login.success")
 * Plain text from backend is returned as-is (e.g., "Something went wrong")
 */
function translateText(
  text: string, 
  tCommon: (key: string, options?: Record<string, unknown>) => string,
  tErrors: (key: string, options?: Record<string, unknown>) => string,
  tSuccess: (key: string, options?: Record<string, unknown>) => string
): string {
  if (!text) return '';
  
  // Check if it looks like an i18n key (contains dots and starts with known prefix)
  const isI18nKey = /^(errors|auth|validation|common|network|server|resource|rateLimit)\./.test(text);
  
  if (isI18nKey) {
    // Try to translate from the 'errors' namespace first
    // When using useI18nNamespace('errors'), we need to remove the 'errors.' prefix
    let keyToTranslate = text;
    if (text.startsWith('errors.')) {
      keyToTranslate = text.substring(7); // Remove 'errors.' prefix
    }
    
    let translated = tErrors(keyToTranslate);
    
    // If not found in errors, try success namespace
    if (translated === keyToTranslate) {
      if (text.startsWith('success.')) {
        keyToTranslate = text.substring(8); // Remove 'success.' prefix
      }
      translated = tSuccess(keyToTranslate);
    }
    
    // If still not found, try common namespace
    if (translated === keyToTranslate) {
      if (text.startsWith('common.')) {
        keyToTranslate = text.substring(7); // Remove 'common.' prefix
      }
      translated = tCommon(keyToTranslate);
    }
    
    return translated !== keyToTranslate ? translated : text;
  }
  
  // Return plain text as-is (already in the correct language from backend or hardcoded)
  return text;
}

export function ToastItem({ toast, onHide, offset = 0, onLayout }: ToastProps) {
  const theme = useTheme();
  const { t: tCommon } = useI18n();
  const { t: tErrors } = useI18nNamespace('errors');
  const { t: tSuccess } = useI18nNamespace('success');
  const insets = useSafeAreaInsets();
  
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Slide-in with subtle bounce
    translateY.value = withSpring(offset, {
      damping: 12,
      stiffness: 200,
      mass: 0.8,
    });
    opacity.value = withTiming(1, { duration: 200 });
  }, [offset]);

  const handleHide = () => {
    // Simple slide-out animation
    translateY.value = withTiming(-100, { duration: 150 });
    opacity.value = withTiming(0, { duration: 150 }, () => {
      runOnJS(onHide)(toast.id);
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  const getToastConfig = () => {
    switch (toast.type) {
      case 'success':
        return {
          ...theme.colors.toast.success,
          IconComponent: CircleCheck,
        };
      case 'error':
        return {
          ...theme.colors.toast.error,
          IconComponent: CircleX,
        };
      case 'warning':
        return {
          ...theme.colors.toast.warning,
          IconComponent: AlertTriangle,
        };
      case 'info':
        return {
          ...theme.colors.toast.info,
          IconComponent: Info,
        };
      default:
        return {
          text: theme.colors.fgDefault,
          border: theme.colors.border,
          icon: theme.colors.brand,
          IconComponent: Info,
        };
    }
  };

  const config = getToastConfig();

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: insets.top + theme.space.md, // Safe area top + spacing only
      left: theme.space.md,
      right: theme.space.md,
      maxWidth: screenWidth - theme.space.md * 2,
    },
    shadowContainer: {
      borderRadius: 12, // 12px border radius
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.12, // Subtle shadow
      shadowRadius: 8, // 8px blur
      elevation: 3,
    },
    gradient: {
      borderRadius: 12, // 12px border radius
      paddingHorizontal: 16, // 16px horizontal padding
      paddingVertical: 12, // 12px vertical padding
      overflow: 'hidden', // Clip the gradient to border radius
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 32, // 32px circle
      height: 32,
      borderRadius: 16,
      backgroundColor: `${config.icon}1F`, // 12% opacity
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12, // 12px icon-to-text spacing
    },
    textContainer: {
      flex: 1,
      marginRight: 8, // 8px text-to-close spacing
    },
    title: {
      fontSize: 15, // 15-16px
      fontWeight: '600',
      letterSpacing: -0.2,
      color: config.text,
      marginBottom: 2,
    },
    message: {
      fontSize: 13, // 13-14px
      fontWeight: '400',
      letterSpacing: -0.1,
      color: config.text,
      opacity: 0.85, // 85% opacity
      lineHeight: 18,
    },
    closeButton: {
      width: 20, // 20px close button
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeText: {
      fontSize: 16,
      color: config.text,
      opacity: 0.7,
      fontWeight: '600',
    },
  });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    onLayout?.(toast.id, height);
  };

  // Get gradient colors from theme
  const gradientColors = [theme.colors.gradientStart, theme.colors.gradientEnd] as const;
  const { IconComponent } = config;

  return (
    <Animated.View 
      style={[styles.container, animatedStyle]}
      onLayout={handleLayout}
    >
      <View style={styles.shadowContainer}>
        <View style={styles.gradient}>
          <LinearGradient
            colors={gradientColors}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Pressable style={styles.content} onPress={handleHide}>
            <View style={styles.iconContainer}>
              <IconComponent size={20} color={config.icon} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{translateText(toast.title, tCommon, tErrors, tSuccess)}</Text>
              {toast.message && (
                <Text style={styles.message}>
                  {toast.field ? `${translateText(toast.field, tCommon, tErrors, tSuccess)}: ` : ''}{translateText(toast.message, tCommon, tErrors, tSuccess)}
                </Text>
              )}
            </View>
            <Pressable style={styles.closeButton} onPress={handleHide}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}
