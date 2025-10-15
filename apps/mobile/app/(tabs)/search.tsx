import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { TabScreen } from '@/components/tab-screen';
import { useState, useEffect } from 'react';
import { useSearchDeals, useInfiniteCategories } from '@qiima/queries';
import { useRouter } from 'expo-router';
import { config } from '@/constants/config';
import { useI18nNamespace } from '@qiima/i18n';

export default function SearchScreen() {
  const router = useRouter();
  
  // i18n hooks
  const { t: tSearch } = useI18nNamespace('search');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<{
    category?: string;
    city?: string;
  }>({});

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch categories with infinite scroll
  const { 
    data: categoriesData, 
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage 
  } = useInfiniteCategories({
    env: 'native',
    baseURL: config.baseURL,
  }, 10); // Smaller page size for quick filters

  // Flatten all categories from all pages
  const categories = categoriesData?.pages.flatMap(page => page.results) || [];

  // Search deals
  const { data: searchResults, isLoading: isSearching, error } = useSearchDeals({
    env: 'native',
    baseURL: config.baseURL,
  }, debouncedQuery, selectedFilters);

  const handleCategoryFilter = (categoryName: string) => {
    setSelectedFilters(prev => ({ ...prev, category: categoryName }));
    setSearchQuery(categoryName);
  };

  const handleCityFilter = (city: string) => {
    setSelectedFilters(prev => ({ ...prev, city }));
    setSearchQuery(city);
  };

  return (
    <TabScreen>
        <View style={styles.header}>
          <Text style={styles.title}>{tSearch('title')}</Text>
          <Text style={styles.subtitle}>{tSearch('subtitle')}</Text>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={tSearch('searchPlaceholder')}
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity 
              style={styles.searchButton}
              disabled={isSearching}
            >
              <Text style={styles.searchButtonText}>🔍</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filtersContainer}>
            <Text style={styles.filtersTitle}>{tSearch('filters.title')}</Text>
            <View style={styles.filtersRow}>
              {categories?.slice(0, 6).map((category) => (
                <TouchableOpacity 
                  key={category.id}
                  style={styles.filterChip}
                  onPress={() => handleCategoryFilter(category.name)}
                >
                  <Text style={styles.filterChipText}>
                    {category.icon || '🏷️'} {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {hasNextPage && (
              <TouchableOpacity 
                style={[styles.filterChip, styles.loadMoreChip]}
                onPress={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                <Text style={styles.filterChipText}>
                  {isFetchingNextPage ? tSearch('filters.loadingMore') : tSearch('filters.loadMore')}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.filtersRow}>
              <TouchableOpacity 
                style={styles.filterChip}
                onPress={() => handleCityFilter('Casablanca')}
              >
                <Text style={styles.filterChipText}>📍 Casablanca</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.filterChip}
                onPress={() => handleCityFilter('Rabat')}
              >
                <Text style={styles.filterChipText}>📍 Rabat</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.filterChip}
                onPress={() => handleCityFilter('Marrakech')}
              >
                <Text style={styles.filterChipText}>📍 Marrakech</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.resultsSection}>
          {isSearching && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>{tSearch('results.loading')}</Text>
            </View>
          )}
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{tSearch('results.error')}</Text>
            </View>
          )}
          
          {searchResults && searchResults.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>
                {tSearch('results.title')} ({searchResults.length})
              </Text>
              {searchResults.map((deal) => (
                <TouchableOpacity 
                  key={deal.id}
                  style={styles.dealCard}
                  onPress={() => router.push(`/deal/${deal.id}`)}
                >
                  <Text style={styles.dealTitle}>{deal.title}</Text>
                  <Text style={styles.dealPrice}>
                    {deal.current_price.toLocaleString()} {deal.currency}
                    {deal.original_price && ` (was ${deal.original_price.toLocaleString()} ${deal.currency})`}
                  </Text>
                  <Text style={styles.dealMerchant}>
                    {deal.category.icon || '🏷️'} {deal.merchant} • {deal.location}
                  </Text>
                  <View style={styles.dealVotes}>
                    <Text style={styles.voteCount}>🔥 {deal.vote_count} {tSearch('dealCard.votes')}</Text>
                    {deal.is_verified && <Text style={styles.verifiedBadge}>✓ {tSearch('dealCard.verified')}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </>
          ) : !isSearching && !error && debouncedQuery && (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>{tSearch('results.noResults')}</Text>
              <Text style={styles.noResultsSubtext}>{tSearch('results.noResultsDescription')}</Text>
            </View>
          )}
        </View>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 32,
    marginTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  searchSection: {
    marginBottom: 32,
  },
  searchInputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    marginRight: 12,
  },
  searchButton: {
    backgroundColor: '#FF6A00',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 56,
  },
  searchButtonText: {
    fontSize: 20,
    color: 'white',
  },
  filtersContainer: {
    marginBottom: 20,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterChipText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  loadMoreChip: {
    backgroundColor: '#FF6A00',
    marginTop: 8,
  },
  resultsSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  recentSearchItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentSearchText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  recentSearchTime: {
    fontSize: 14,
    color: '#666',
  },
  dealCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  dealPrice: {
    fontSize: 14,
    color: '#FF6A00',
    fontWeight: '600',
    marginBottom: 4,
  },
  dealMerchant: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  dealVotes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voteCount: {
    fontSize: 12,
    color: '#FF6A00',
    fontWeight: '500',
  },
  verifiedBadge: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ff4444',
  },
  noResultsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#666',
  },
});
