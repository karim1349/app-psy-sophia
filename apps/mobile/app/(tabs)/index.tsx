import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { getHotDeals } from '@qiima/schemas';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const router = useRouter();
  const hotDeals = getHotDeals(5);

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
          <Text style={styles.title}>Qiima Deals</Text>
          <Text style={styles.subtitle}>Find the best deals in Morocco</Text>
        </View>

        <View style={styles.dealsSection}>
          <Text style={styles.sectionTitle}>Hot Deals</Text>
          
          {hotDeals.map((deal) => (
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
        </View>
      </ScrollView>

      <View style={styles.fabContainer}>
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => {/* TODO: Navigate to create deal */}}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>
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
  dealsSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  dealCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
    color: '#1a1a1a',
    marginBottom: 8,
  },
  dealPrice: {
    fontSize: 16,
    color: '#FF6A00',
    fontWeight: '600',
    marginBottom: 4,
  },
  dealMerchant: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  dealVotes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voteCount: {
    fontSize: 14,
    color: '#FF6A00',
    fontWeight: '500',
  },
  verifiedBadge: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6A00',
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
});
