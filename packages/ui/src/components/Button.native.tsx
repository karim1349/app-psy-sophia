import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../native/theme';
import { createVariants } from '../native/variants';

type Size = 'sm' | 'md' | 'lg';
type Variant = 'solid' | 'outline' | 'ghost';
type Tone = 'brand' | 'neutral' | 'danger';

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: Size;
  variant?: Variant;
  tone?: Tone;
};

export function Button({ title, onPress, disabled, loading, size = 'md', variant = 'solid', tone = 'brand' }: ButtonProps) {
  const theme = useTheme();

  const palette = getPalette(theme, tone);

  const styles = StyleSheet.create({
    container: {
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    solid: {
      backgroundColor: palette.bg,
      borderColor: palette.bg,
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: palette.border,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
    sm: { height: 40, paddingHorizontal: theme.space.md },
    md: { height: 48, paddingHorizontal: theme.space.lg },
    lg: { height: 56, paddingHorizontal: theme.space.xl, borderRadius: theme.radius.lg },
    text: {
      color: palette.fg,
      fontSize: theme.type.button.size,
      fontWeight: theme.type.button.weight,
    },
    textGhost: { color: palette.textGhost },
    textOutline: { color: palette.textOutline },
  });

  const resolve = createVariants({
    base: styles.container,
    variants: {
      size: { sm: styles.sm, md: styles.md, lg: styles.lg },
      variant: { solid: styles.solid, outline: styles.outline, ghost: styles.ghost },
    },
    defaultVariants: { size: 'md', variant: 'solid' },
  });

  const textColorStyle = variant === 'solid' ? styles.text : variant === 'outline' ? styles.textOutline : styles.textGhost;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        ...resolve({ size, variant }),
        { opacity: disabled || loading ? theme.state.disabledOpacity : pressed ? theme.state.pressedOpacity : 1 },
      ] as any}
      accessibilityRole="button"
    >
      {loading ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <ActivityIndicator color={palette.fg} />
          <Text style={textColorStyle}>{title}</Text>
        </View>
      ) : (
        <Text style={textColorStyle}>{title}</Text>
      )}
    </Pressable>
  );
}

function getPalette(theme: ReturnType<typeof useTheme>, tone: Tone) {
  if (tone === 'danger') {
    return {
      bg: theme.colors.danger,
      border: theme.colors.danger,
      fg: theme.mode === 'dark' ? '#1C0B0B' : '#FFFFFF',
      textGhost: theme.colors.danger,
      textOutline: theme.colors.danger,
    };
  }
  if (tone === 'neutral') {
    return {
      bg: theme.colors.neutral,
      border: theme.colors.neutral,
      fg: theme.mode === 'dark' ? '#0F1115' : '#FFFFFF',
      textGhost: theme.colors.neutral,
      textOutline: theme.colors.neutral,
    };
  }
  return {
    bg: theme.colors.brand,
    border: theme.colors.brand,
    fg: theme.mode === 'dark' ? '#0F1115' : '#FFFFFF',
    textGhost: theme.colors.brandStrong,
    textOutline: theme.colors.brand,
  };
}



