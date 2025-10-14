import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@qiima/ui';
import { getDealById, mockComments, type MockDeal } from '@qiima/schemas';

export default function DealDetailScreen() {
  const scheme = useColorScheme() ?? 'light';
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Get deal data from mock data
  const deal = getDealById(parseInt(id || '1'));
  const dealComments = mockComments.filter(comment => comment.deal === parseInt(id || '1'));

  if (!deal) {
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
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Deal not found</Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            variant="solid"
            tone="brand"
            size="md"
          />
        </View>
      </View>
    );
  }

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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dealCard}>
          {deal.image_url && (
            <Image source={{ uri: deal.image_url }} style={styles.dealImage} />
          )}
          
          <View style={styles.dealInfo}>
            <Text style={styles.dealTitle}>{deal.title}</Text>
            
            <View style={styles.priceContainer}>
              <Text style={styles.currentPrice}>
                {deal.current_price.toLocaleString()} {deal.currency}
              </Text>
              {deal.original_price && (
                <Text style={styles.originalPrice}>
                  {deal.original_price.toLocaleString()} {deal.currency}
                </Text>
              )}
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{deal.discount_percentage}%</Text>
              </View>
            </View>

            <View style={styles.merchantInfo}>
              <Text style={styles.merchantName}>
                {deal.category.icon} {deal.merchant}
              </Text>
              <Text style={styles.merchantLocation}>📍 {deal.location}</Text>
            </View>

            <Text style={styles.description}>{deal.description}</Text>

            <View style={styles.metaInfo}>
              <Text style={styles.metaText}>Posted by {deal.author.username}</Text>
              <Text style={styles.metaText}>• {new Date(deal.created_at).toLocaleDateString()}</Text>
              {deal.is_verified && (
                <Text style={styles.verifiedText}>✓ Verified Deal</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.actionsSection}>
          <View style={styles.votingSection}>
            <Text style={styles.sectionTitle}>Vote on this deal</Text>
            <View style={styles.voteButtons}>
              <TouchableOpacity style={styles.voteButton}>
                <Text style={styles.voteButtonText}>👍 Good Deal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.voteButton}>
                <Text style={styles.voteButtonText}>👎 Not Good</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.voteCount}>🔥 {deal.vote_count} votes</Text>
          </View>

          <View style={styles.shareSection}>
            <Text style={styles.sectionTitle}>Share this deal</Text>
            <View style={styles.shareButtons}>
              <TouchableOpacity style={styles.shareButton}>
                <Text style={styles.shareButtonText}>📱 Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareButton}>
                <Text style={styles.shareButtonText}>📋 Copy Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>Comments ({deal.comment_count})</Text>
          
          {dealComments.map((comment) => (
            <View key={comment.id} style={styles.comment}>
              <Text style={styles.commentAuthor}>{comment.user.username}</Text>
              <Text style={styles.commentText}>{comment.content}</Text>
              <Text style={styles.commentTime}>
                {new Date(comment.created_at).toLocaleDateString()}
              </Text>
            </View>
          ))}

          <Button
            title="Add Comment"
            variant="outline"
            tone="brand"
            size="md"
          />
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
    marginTop: 60,
    marginBottom: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: '#FF6A00',
    fontWeight: '600',
  },
  dealCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  dealImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  dealInfo: {
    padding: 20,
  },
  dealTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    lineHeight: 32,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6A00',
  },
  originalPrice: {
    fontSize: 18,
    color: '#666',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#FF6A00',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  discountText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  merchantInfo: {
    marginBottom: 16,
  },
  merchantName: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '600',
    marginBottom: 4,
  },
  merchantLocation: {
    fontSize: 14,
    color: '#666',
  },
  description: {
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 24,
    marginBottom: 16,
  },
  metaInfo: {
    flexDirection: 'row',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  actionsSection: {
    gap: 24,
    marginBottom: 32,
  },
  votingSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 20,
  },
  shareSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  voteButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  voteButtonText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  voteCount: {
    fontSize: 16,
    color: '#FF6A00',
    fontWeight: '600',
    textAlign: 'center',
  },
  shareButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  commentsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  comment: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 22,
    marginBottom: 8,
  },
  commentTime: {
    fontSize: 12,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  verifiedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
});
