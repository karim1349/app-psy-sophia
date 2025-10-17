import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TabScreen } from '@/components/tab-screen';
import { useHotDeals } from '@qiima/queries';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { config } from '@/constants/config';
import { useI18n } from '@qiima/i18n';
import { useTheme, BottomSheetModal, PickerField } from '@qiima/ui';
import type { BottomSheetModal as BottomSheetModalRef } from '@gorhom/bottom-sheet';

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useI18n();
  const theme = useTheme();
  const bottomSheetRef = useRef<BottomSheetModalRef>(null);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const styles = createStyles(theme);

  const cities = [
    { label: 'Casablanca', value: 'casablanca' },
    { label: 'Rabat', value: 'rabat' },
    { label: 'Marrakech', value: 'marrakech' },
    { label: 'Fès', value: 'fes' },
    { label: 'Tanger', value: 'tanger' },
    { label: 'Agadir', value: 'agadir' },
    { label: 'Meknès', value: 'meknes' },
    { label: 'Oujda', value: 'oujda' },
    { label: 'Casablanca', value: 'casablanca' },
    { label: 'Rabat', value: 'rabat' },
    { label: 'Marrakech', value: 'marrakech' },
    { label: 'Fès', value: 'fes' },
    { label: 'Tanger', value: 'tanger' },
    { label: 'Agadir', value: 'agadir' },
    { label: 'Meknès', value: 'meknes' },
    { label: 'Oujda', value: 'oujda' },
    { label: 'Casablanca', value: 'casablanca' },
    { label: 'Rabat', value: 'rabat' },
    { label: 'Marrakech', value: 'marrakech' },
    { label: 'Fès', value: 'fes' },
    { label: 'Tanger', value: 'tanger' },
    { label: 'Agadir', value: 'agadir' },
    { label: 'Meknès', value: 'meknes' },
    { label: 'Oujda', value: 'oujda' },
  ];

  const categories = [
    { label: 'Électronique', value: 'electronics' },
    { label: 'Mode', value: 'fashion' },
    { label: 'Maison', value: 'home' },
    { label: 'Sport', value: 'sport' },
  ];

  // Fetch hot deals from API
  const { data: hotDeals, isLoading, refetch } = useHotDeals({
    env: 'native',
    baseURL: config.baseURL,
  }, 10);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <TabScreen onRefresh={onRefresh} refreshing={refreshing}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('common.qiimaDeals')}</Text>
          <Text style={styles.subtitle}>{t('common.findBestDeals')}</Text>
        </View>

        <View style={styles.dealsSection}>
          <Text style={styles.sectionTitle}>{t('common.hotDeals')}</Text>

          {isLoading && !hotDeals && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>{t('common.loadingDeals')}</Text>
            </View>
          )}
          
          
          {hotDeals?.map((deal) => (
            <TouchableOpacity 
              key={deal.id}
              style={styles.dealCard}
              onPress={() => router.push(`/deal/${deal.id}`)}
            >
              <Text style={styles.dealTitle}>{deal.title}</Text>
              <Text style={styles.dealPrice}>
                {deal.current_price.toLocaleString()} {deal.currency}
                {deal.original_price && ` (${t('common.was')} ${deal.original_price.toLocaleString()} ${deal.currency})`}
              </Text>
              <Text style={styles.dealCategory}>
                {deal.category.icon || '🏷️'} {deal.category.name}
              </Text>
              <Text style={styles.dealMerchant}>
                🏪 {deal.merchant} • 📍 {deal.location}
              </Text>
              <View style={styles.dealVotes}>
                <Text style={styles.voteCount}>🔥 {deal.vote_count} {t('common.votes')}</Text>
                {deal.is_verified && <Text style={styles.verifiedBadge}>✓ {t('common.verified')}</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.pickerSection}>
          <Text style={styles.sectionTitle}>Picker Field Demo</Text>

          <PickerField
            label="Ville"
            value={selectedCity}
            onValueChange={setSelectedCity}
            options={cities}
            placeholder="Choisir une ville"
            searchable
            searchPlaceholder="Rechercher une ville..."
          />

          <PickerField
            label="Catégorie"
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            options={categories}
            placeholder="Choisir une catégorie"
          />

          {(selectedCity || selectedCategory) && (
            <View style={styles.selectionDisplay}>
              <Text style={styles.selectionText}>
                {selectedCity && `Ville: ${cities.find(c => c.value === selectedCity)?.label}`}
              </Text>
              <Text style={styles.selectionText}>
                {selectedCategory && `Catégorie: ${categories.find(c => c.value === selectedCategory)?.label}`}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => bottomSheetRef.current?.present()}
          style={styles.testButton}
        >
          <Text style={styles.testButtonText}>Open Bottom Sheet</Text>
        </TouchableOpacity>
      </TabScreen>

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/create-deal')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.demoButtonContainer}>
        <TouchableOpacity
          style={styles.demoButton}
          onPress={() => router.push('/toast-demo')}
        >
          <Text style={styles.demoButtonText}>Toast Demo</Text>
        </TouchableOpacity>
      </View>

      <BottomSheetModal
        ref={bottomSheetRef}
        enableDynamicSizing
        detached
        enablePanDownToClose
      >
        <View style={styles.sheetContentWrapper}>
          <Text style={styles.sheetContent}>Hello from Bottom Sheet!</Text>
          <Text style={styles.sheetContent}>This sheet adapts to its content height.</Text>
          <Text style={styles.sheetContent}>Detached mode adds margins and shadow for a floating effect.</Text>
        </View>
      </BottomSheetModal>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 32,
    marginTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.fgDefault,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.fgMuted,
  },
  dealsSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.fgDefault,
    marginBottom: 16,
  },
  dealCard: {
    backgroundColor: theme.colors.bgSurface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dealTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.fgDefault,
    marginBottom: 8,
  },
  dealPrice: {
    fontSize: 16,
    color: theme.colors.brand,
    fontWeight: '600',
    marginBottom: 4,
  },
  dealCategory: {
    fontSize: 13,
    color: theme.colors.brand,
    fontWeight: '600',
    marginBottom: 2,
  },
  dealMerchant: {
    fontSize: 14,
    color: theme.colors.fgMuted,
    marginBottom: 12,
  },
  dealVotes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voteCount: {
    fontSize: 14,
    color: theme.colors.brand,
    fontWeight: '500',
  },
  verifiedBadge: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.fgMuted,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.danger,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.brand,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  demoButtonContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
  },
  demoButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  demoButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  testButton: {
    backgroundColor: theme.colors.brand,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sheetContentWrapper: {
    padding: theme.space.lg,
    gap: theme.space.sm,
  },
  sheetContent: {
    fontSize: 16,
    color: theme.colors.fgDefault,
  },
  pickerSection: {
    gap: 16,
    marginTop: 24,
  },
  selectionDisplay: {
    backgroundColor: theme.colors.bgSurface,
    padding: theme.space.md,
    borderRadius: theme.radius.md,
    gap: theme.space.xs,
  },
  selectionText: {
    fontSize: 14,
    color: theme.colors.fgDefault,
  },
});

