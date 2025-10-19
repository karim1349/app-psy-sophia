/**
 * ADHD Screener with 10 Likert items
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../../../src/components/Button';
import { submitScreener } from '../../../src/api/onboarding';
import { appStorage } from '../../../src/lib/storage';

const QUESTIONS = [
  'Votre enfant a du mal à se concentrer sur les tâches ?',
  'Votre enfant bouge beaucoup ou a du mal à rester assis ?',
  'Votre enfant a des difficultés à attendre son tour ?',
  'Votre enfant interrompt souvent les autres ?',
  'Votre enfant oublie des choses au quotidien ?',
  'Votre enfant a du mal à finir ce qu\'il commence ?',
  'Votre enfant est facilement distrait ?',
  'Votre enfant agit sans réfléchir ?',
  'Votre enfant a du mal à s\'organiser ?',
  'Votre enfant perd souvent ses affaires ?',
];

const OPTIONS = [
  { value: 0, label: 'Jamais' },
  { value: 1, label: 'Parfois' },
  { value: 2, label: 'Souvent' },
  { value: 3, label: 'Très souvent' },
];

type Zone = 'vert' | 'orange' | 'rouge';

interface ScreenerResult {
  total_score: number;
  zone: Zone;
  recommendations: string[];
  consult: string[];
}

export default function ScreenerScreen() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<ScreenerResult | null>(null);

  const screenerMutation = useMutation({
    mutationFn: async (answersData: Record<string, number>) => {
      const childId = await appStorage.getChildId();
      if (!childId) throw new Error('No child ID');
      return submitScreener(childId, answersData);
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const handleAnswer = (questionIndex: number, value: number) => {
    setAnswers((prev) => ({
      ...prev,
      [`q${questionIndex + 1}`]: value,
    }));
  };

  const allAnswered = Object.keys(answers).length === QUESTIONS.length;

  const handleSubmit = () => {
    if (allAnswered) {
      screenerMutation.mutate(answers);
    }
  };

  const handleNext = () => {
    router.push('/(public)/onboarding/priorities');
  };

  // Show result view if screener submitted
  if (result) {
    const zoneColors: Record<Zone, string> = {
      vert: '#10B981',
      orange: '#F59E0B',
      rouge: '#EF4444',
    };

    const zoneLabels: Record<Zone, string> = {
      vert: 'Zone Verte',
      orange: 'Zone Orange',
      rouge: 'Zone Rouge',
    };

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content}>
          <View style={styles.resultHeader}>
            <View
              style={[
                styles.zoneBadge,
                { backgroundColor: zoneColors[result.zone] },
              ]}
            >
              <Text style={styles.zoneText}>{zoneLabels[result.zone]}</Text>
            </View>
            <Text style={styles.resultScore}>Score: {result.total_score}/30</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommandations</Text>
            {result.recommendations.map((rec: string, i: number) => (
              <Text key={i} style={styles.recommendation}>
                • {rec}
              </Text>
            ))}
          </View>

          {result.consult && result.consult.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Qui consulter ?</Text>
              {result.consult.map((professional: string, i: number) => (
                <Text key={i} style={styles.professional}>
                  • {professional}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.footer}>
            <Button title="Continuer" onPress={handleNext} size="large" />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Questionnaire</Text>
          <Text style={styles.subtitle}>
            Répondez aux questions suivantes ({Object.keys(answers).length}/{QUESTIONS.length})
          </Text>
        </View>

        <View style={styles.questions}>
          {QUESTIONS.map((question, index) => (
            <View key={index} style={styles.questionCard}>
              <Text style={styles.questionText}>
                {index + 1}. {question}
              </Text>
              <View style={styles.options}>
                {OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.option,
                      answers[`q${index + 1}`] === option.value &&
                        styles.optionSelected,
                    ]}
                    onPress={() => handleAnswer(index, option.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        answers[`q${index + 1}`] === option.value &&
                          styles.optionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Button
            title="Voir mes résultats"
            onPress={handleSubmit}
            disabled={!allAnswered}
            loading={screenerMutation.isPending}
            size="large"
          />
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
    marginBottom: 24,
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
  },
  questions: {
    gap: 24,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  optionSelected: {
    borderColor: '#5B4BCC',
    backgroundColor: '#EDE9FE',
  },
  optionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  optionTextSelected: {
    color: '#5B4BCC',
    fontWeight: '600',
  },
  footer: {
    marginTop: 32,
    marginBottom: 24,
  },
  resultHeader: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
  },
  zoneBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 16,
  },
  zoneText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultScore: {
    fontSize: 18,
    color: '#6B7280',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  recommendation: {
    fontSize: 15,
    color: '#4B5563',
    marginBottom: 8,
    lineHeight: 22,
  },
  professional: {
    fontSize: 15,
    color: '#4B5563',
    marginBottom: 6,
  },
});
