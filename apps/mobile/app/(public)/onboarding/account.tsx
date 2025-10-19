/**
 * Account creation screen - Convert guest to full account
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../../../src/components/Button';
import { convertGuest } from '../../../src/api/auth';
import { appStorage } from '../../../src/lib/storage';

export default function AccountScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const convertMutation = useMutation({
    mutationFn: () =>
      convertGuest({
        email: email.trim(),
        username: username.trim(),
        password,
        password_confirm: passwordConfirm,
      }),
    onSuccess: async () => {
      console.log('✅ Guest converted to full account');
      await appStorage.setOnboardingDone(true);
      router.replace('/(authed)/home');
    },
    onError: (error: any) => {
      console.error('❌ Account creation error:', error);
      const errorMessage =
        error.data?.email?.[0] ||
        error.data?.username?.[0] ||
        error.data?.password?.[0] ||
        error.data?.detail ||
        'Une erreur est survenue';
      Alert.alert('Erreur', errorMessage);
    },
  });

  const handleSkip = async () => {
    Alert.alert(
      'Continuer sans compte',
      'Vous pouvez créer un compte plus tard depuis les paramètres. Vos données seront préservées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          onPress: async () => {
            await appStorage.setOnboardingDone(true);
            router.replace('/(authed)/home');
          },
        },
      ]
    );
  };

  const handleSubmit = () => {
    // Validation
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre email');
      return;
    }
    if (!username.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom d\'utilisateur');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    convertMutation.mutate();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Créez votre compte</Text>
          <Text style={styles.subtitle}>
            Sécurisez vos données et accédez à votre compte depuis n'importe quel appareil
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="votre@email.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nom d'utilisateur</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="nom_utilisateur"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoComplete="username"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoComplete="password"
            />
            <Text style={styles.hint}>Minimum 8 caractères</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <TextInput
              style={styles.input}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoComplete="password"
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Créer mon compte"
            onPress={handleSubmit}
            loading={convertMutation.isPending}
            size="large"
          />
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Plus tard</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Vos données de suivi sont automatiquement sauvegardées.
            La création d'un compte permet d'y accéder depuis n'importe quel appareil.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  form: {
    gap: 20,
    marginBottom: 32,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  hint: {
    fontSize: 14,
    color: '#6B7280',
  },
  footer: {
    gap: 16,
    marginBottom: 24,
  },
  skipButton: {
    alignItems: 'center',
    padding: 12,
  },
  skipText: {
    fontSize: 16,
    color: '#5B4BCC',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#5B4BCC',
    lineHeight: 20,
  },
});
