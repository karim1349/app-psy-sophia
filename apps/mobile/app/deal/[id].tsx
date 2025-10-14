import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useDeal, useDealComments, useVoteDeal, useAddComment } from '@qiima/queries';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { config } from '@/constants/config';

export default function DealDetailScreen() {
  const scheme = useColorScheme() ?? 'light';
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch deal data
  const { data: deal, isLoading, error, refetch } = useDeal({
    env: 'native',
    baseURL: config.baseURL,
  }, id);

  // Fetch comments
  const { data: comments, refetch: refetchComments } = useDealComments({
    env: 'native',
    baseURL: config.baseURL,
  }, id);

  // Vote mutation
  const voteMutation = useVoteDeal({
    env: 'native',
    baseURL: config.baseURL,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchComments()]);
    setRefreshing(false);
  };

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!deal) return;

    try {
      await voteMutation.mutateAsync({
        dealId: deal.id.toString(),
        voteType,
      });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to vote');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
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
        <Text style={styles.loadingText}>Loading deal...</Text>
      </View>
    );
  }

  if (error || !deal) {
    return (
      <View style={[styles.container, styles.centerContent]}>
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
        <Text style={styles.errorText}>Deal not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const discountPercentage = deal.original_price 
    ? Math.round(((deal.original_price - deal.current_price) / deal.original_price) * 100)
    : 0;

  return (
    <View style={styles.container}>
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
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
          <Text style={styles.headerBackButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.dealCard}>
          <View style={styles.dealHeader}>
            <Text style={styles.dealTitle}>{deal.title}</Text>
            {deal.is_verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            )}
          </View>

          <View style={styles.priceSection}>
            <Text style={styles.currentPrice}>
              {deal.current_price.toLocaleString()} {deal.currency}
            </Text>
            {deal.original_price && (
              <View style={styles.originalPriceSection}>
                <Text style={styles.originalPrice}>
                  {deal.original_price.toLocaleString()} {deal.currency}
                </Text>
                <Text style={styles.discount}>-{discountPercentage}%</Text>
              </View>
            )}
          </View>

          <View style={styles.dealMeta}>
            <Text style={styles.merchant}>
              {deal.category.icon || '🏷️'} {deal.merchant}
            </Text>
            <Text style={styles.location}>📍 {deal.location}</Text>
            <Text style={styles.author}>
              By {deal.author.username} • {new Date(deal.created_at).toLocaleDateString()}
            </Text>
          </View>

          <Text style={styles.description}>{deal.description}</Text>

          <View style={styles.voteSection}>
            <TouchableOpacity
              style={[
                styles.voteButton,
                deal.user_vote === 'up' && styles.voteButtonActive,
              ]}
              onPress={() => handleVote('up')}
              disabled={voteMutation.isPending}
            >
              <Text style={styles.voteButtonText}>👍 Upvote</Text>
            </TouchableOpacity>
            
            <Text style={styles.voteCount}>{deal.vote_count} votes</Text>
            
            <TouchableOpacity
              style={[
                styles.voteButton,
                deal.user_vote === 'down' && styles.voteButtonActive,
              ]}
              onPress={() => handleVote('down')}
              disabled={voteMutation.isPending}
            >
              <Text style={styles.voteButtonText}>👎 Downvote</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>
            Comments ({deal.comment_count})
          </Text>
          
          {comments && comments.length > 0 ? (
            comments.map((comment) => (
              <View key={comment.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{comment.user.username}</Text>
                  <Text style={styles.commentDate}>
                    {new Date(comment.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.commentContent}>{comment.content}</Text>
                {comment.is_edited && (
                  <Text style={styles.editedLabel}>Edited</Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.noCommentsText}>No comments yet</Text>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerBackButton: {
    alignSelf: 'flex-start',
  },
  headerBackButtonText: {
    fontSize: 16,
    color: '#FF6A00',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#ff4444',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#FF6A00',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  dealCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dealHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dealTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 12,
  },
  verifiedBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  priceSection: {
    marginBottom: 16,
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6A00',
    marginBottom: 4,
  },
  originalPriceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalPrice: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  discount: {
    backgroundColor: '#ff4444',
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dealMeta: {
    marginBottom: 16,
    gap: 4,
  },
  merchant: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  location: {
    fontSize: 14,
    color: '#666',
  },
  author: {
    fontSize: 12,
    color: '#999',
  },
  description: {
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 24,
    marginBottom: 20,
  },
  voteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  voteButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  voteButtonActive: {
    backgroundColor: '#FF6A00',
  },
  voteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  voteCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6A00',
  },
  commentsSection: {
    marginBottom: 40,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  commentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  commentDate: {
    fontSize: 12,
    color: '#999',
  },
  commentContent: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  editedLabel: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  noCommentsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
});