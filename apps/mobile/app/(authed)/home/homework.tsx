/**
 * Homework module - Informational guide for managing school homework with ADHD
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function HomeworkScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header */}
          <Text style={styles.title}>📚 Les devoirs scolaires</Text>

          {/* Definition */}
          <View style={styles.section}>
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>💡</Text>
              <Text style={styles.infoText}>
                Le TDAH a souvent un impact sur les devoirs scolaires et sur la motivation de l'enfant, ce qui entraîne du conflit et un retard dans l'autonomie. Apprendre à mieux gérer les devoirs scolaires aidera votre enfant à avancer.
              </Text>
            </View>
          </View>

          {/* En pratique */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>En pratique</Text>
            <Text style={styles.sectionSubtitle}>
              Il faut se poser les bonnes questions pour améliorer la réalisation des devoirs scolaires !
            </Text>

            {/* Où */}
            <View style={styles.questionBlock}>
              <Text style={styles.questionTitle}>📍 Où ?</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Pièce calme</Text>
                <Text style={styles.bullet}>• Face à un mur sans distraction (pas de fenêtre)</Text>
                <Text style={styles.bullet}>• Bureau vide</Text>
                <Text style={styles.bullet}>• Chaise stable</Text>
              </View>
            </View>

            {/* Quand */}
            <View style={styles.questionBlock}>
              <Text style={styles.questionTitle}>⏰ Quand ?</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Avant les écrans</Text>
                <Text style={styles.bullet}>• Après une pause au retour de l'école</Text>
                <Text style={styles.bullet}>• Toujours à la même heure</Text>
                <Text style={styles.bullet}>• S'avancer si possible</Text>
              </View>
            </View>

            {/* Avec qui */}
            <View style={styles.questionBlock}>
              <Text style={styles.questionTitle}>👥 Avec qui ?</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Seul si possible</Text>
                <Text style={styles.bullet}>• Avec le parent le plus patient</Text>
                <Text style={styles.bullet}>• Idéalement avec une personne extérieure (étudiant, prof privé, etc.)</Text>
              </View>
            </View>

            {/* Combien de temps */}
            <View style={styles.questionBlock}>
              <Text style={styles.questionTitle}>⏱️ Combien de temps ?</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Fractionner par tranches de 15 minutes</Text>
                <Text style={styles.bullet}>• Pause courte de 5 minutes entre chaque tranche</Text>
              </View>
            </View>

            {/* Comment */}
            <View style={styles.questionBlock}>
              <Text style={styles.questionTitle}>✅ Comment ?</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bullet}>• Autoriser l'enfant à bouger si cela l'aide</Text>
                <Text style={styles.bullet}>• Debout, bouger sur sa chaise, etc.</Text>
              </View>
            </View>
          </View>

          {/* Temps recommandé */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏲️ Temps recommandé par niveau</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderText}>Niveau</Text>
                <Text style={styles.tableHeaderText}>Temps</Text>
                <Text style={styles.tableHeaderText}>Fréquence</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Maternelle</Text>
                <Text style={styles.tableCell}>1-5 min</Text>
                <Text style={styles.tableCell}>1-3×/sem</Text>
              </View>

              <View style={[styles.tableRow, styles.tableRowAlt]}>
                <Text style={styles.tableCell}>CP/CE1</Text>
                <Text style={styles.tableCell}>2-10 min</Text>
                <Text style={styles.tableCell}>1-4×/sem</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>CE2/CM1</Text>
                <Text style={styles.tableCell}>5-15 min</Text>
                <Text style={styles.tableCell}>1-4×/sem</Text>
              </View>

              <View style={[styles.tableRow, styles.tableRowAlt]}>
                <Text style={styles.tableCell}>CM2/6e</Text>
                <Text style={styles.tableCell}>5-30 min</Text>
                <Text style={styles.tableCell}>1-4×/sem</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>5e</Text>
                <Text style={styles.tableCell}>15-45 min</Text>
                <Text style={styles.tableCell}>1-4×/sem</Text>
              </View>

              <View style={[styles.tableRow, styles.tableRowAlt]}>
                <Text style={styles.tableCell}>4e/3e</Text>
                <Text style={styles.tableCell}>15-60 min</Text>
                <Text style={styles.tableCell}>1-4×/sem</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Lycée</Text>
                <Text style={styles.tableCell}>30-75 min</Text>
                <Text style={styles.tableCell}>1-4×/sem</Text>
              </View>
            </View>
          </View>

          {/* Bottom spacing */}
          <View style={styles.bottomSpacer} />
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
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
    fontSize: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#5B4BCC',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 24,
  },
  questionBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  questionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  bulletList: {
    gap: 8,
  },
  bullet: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    paddingLeft: 8,
  },
  table: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#5B4BCC',
    padding: 12,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableRowAlt: {
    backgroundColor: '#F9FAFB',
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});
