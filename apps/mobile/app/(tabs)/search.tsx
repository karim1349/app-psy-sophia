import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { searchDeals, mockCategories, type MockDeal } from '@qiima/schemas';
import { useRouter } from 'expo-router';

export default function SearchScreen() {
  const scheme = useColorScheme() ?? 'light';
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MockDeal[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    const results = searchDeals(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleCategoryFilter = (categoryName: string) => {
    setSearchQuery(categoryName);
    const results = searchDeals(categoryName);
    setSearchResults(results);
  };

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <LinearGradient
        pointerEvents="none"
        colors={
          scheme === 'dark'
            ? ['#21110D', '#28180F', '#17120A']
            : ['#FFECE5', '#FFE3CC', '#FFF6D6']
        }
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Search Deals</Text>
          <Text style={styles.subtitle}>Find deals by category, merchant, or keyword</Text>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for deals..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={handleSearch}
              disabled={isSearching}
            >
              <Text style={styles.searchButtonText}>🔍</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filtersContainer}>
            <Text style={styles.filtersTitle}>Quick Filters</Text>
            <View style={styles.filtersRow}>
              {mockCategories.slice(0, 3).map((category) => (
                <TouchableOpacity 
                  key={category.id}
                  style={styles.filterChip}
                  onPress={() => handleCategoryFilter(category.name)}
                >
                  <Text style={styles.filterChipText}>
                    {category.icon} {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.filtersRow}>
              <TouchableOpacity 
                style={styles.filterChip}
                onPress={() => handleCategoryFilter('Casablanca')}
              >
                <Text style={styles.filterChipText}>📍 Casablanca</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.filterChip}
                onPress={() => handleCategoryFilter('Rabat')}
              >
                <Text style={styles.filterChipText}>📍 Rabat</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.filterChip}
                onPress={() => handleCategoryFilter('Marrakech')}
              >
                <Text style={styles.filterChipText}>📍 Marrakech</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.resultsSection}>
          {searchResults.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>
                Search Results ({searchResults.length})
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
                    {deal.category.icon} {deal.merchant} • {deal.location}
                  </Text>
                  <View style={styles.dealVotes}>
                    <Text style={styles.voteCount}>🔥 {deal.vote_count} votes</Text>
                    {deal.is_verified && <Text style={styles.verifiedBadge}>✓ Verified</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              
              <View style={styles.recentSearchItem}>
                <Text style={styles.recentSearchText}>iPhone deals</Text>
                <Text style={styles.recentSearchTime}>2 hours ago</Text>
              </View>
              
              <View style={styles.recentSearchItem}>
                <Text style={styles.recentSearchText}>Nike shoes</Text>
                <Text style={styles.recentSearchTime}>Yesterday</Text>
              </View>
              
              <View style={styles.recentSearchItem}>
                <Text style={styles.recentSearchText}>Restaurant deals Casablanca</Text>
                <Text style={styles.recentSearchTime}>3 days ago</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
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
});
