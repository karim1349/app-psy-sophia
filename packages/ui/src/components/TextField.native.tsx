import { TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../native/theme';

type Props = {
  value?: string;
  onChangeText?: (text: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  hasError?: boolean;
};

export function TextField({ value, onChangeText, onBlur, placeholder, secureTextEntry, keyboardType, hasError }: Props) {
  const t = useTheme();

  const styles = StyleSheet.create({
    input: {
      backgroundColor: t.colors.bgSurface,
      borderWidth: 1,
      borderColor: hasError ? t.colors.danger : t.colors.border,
      borderRadius: t.radius.md,
      padding: t.space.md,
      fontSize: 16,
      color: t.colors.fgDefault,
    },
  });

  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      onBlur={onBlur}
      placeholder={placeholder}
      placeholderTextColor={t.colors.fgMuted}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize="none"
      autoCorrect={false}
    />
  );
}


