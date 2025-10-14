import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../native/theme';

type Props = {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
};

export function FormField({ label, hint, error, required, children }: Props) {
  const t = useTheme();
  const styles = StyleSheet.create({
    root: { marginBottom: t.space.md },
    label: { color: t.colors.fgDefault, fontSize: 14, fontWeight: '600', marginBottom: 6 },
    required: { color: t.colors.danger },
    hint: { color: t.colors.fgMuted, fontSize: 12, marginTop: 6 },
    error: { color: t.colors.danger, fontSize: 12, marginTop: 6 },
  });
  return (
    <View style={styles.root}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}


