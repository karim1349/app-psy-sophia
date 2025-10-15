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
import { useDeal, useDealComments, useVoteDeal } from '@qiima/queries';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { config } from '@/constants/config';
import { useI18nNamespace } from '@qiima/i18n';
import { useTheme } from '@qiima/ui';

export default function DealDetailScreen() {
  const scheme = useColorScheme() ?? 'light';
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();
  
  // i18n hooks
  const { t: tDealDetail } = useI18nNamespace('dealDetail');

  const styles = createStyles(theme);

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
        <Text style={styles.loadingText}>{tDealDetail('loading')}</Text>
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
        <Text style={styles.errorText}>{tDealDetail('error')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{tDealDetail('back')}</Text>
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
          <Text style={styles.headerBackButtonText}>{tDealDetail('back')}</Text>
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
                <Text style={styles.verifiedText}>{tDealDetail('verified')}</Text>
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
              {tDealDetail('by')} {deal.author.username} • {new Date(deal.created_at).toLocaleDateString()}
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
              <Text style={styles.voteButtonText}>{tDealDetail('upvote')}</Text>
            </TouchableOpacity>
            
            <Text style={styles.voteCount}>{deal.vote_count} {tDealDetail('votes')}</Text>
            
            <TouchableOpacity
              style={[
                styles.voteButton,
                deal.user_vote === 'down' && styles.voteButtonActive,
              ]}
              onPress={() => handleVote('down')}
              disabled={voteMutation.isPending}
            >
              <Text style={styles.voteButtonText}>{tDealDetail('downvote')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>
            {tDealDetail('comments.title')} ({deal.comment_count})
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
                  <Text style={styles.editedLabel}>{tDealDetail('comments.edited')}</Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.noCommentsText}>{tDealDetail('comments.noComments')}</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
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
    color: theme.colors.brand,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.fgMuted,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.danger,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: theme.colors.brand,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  dealCard: {
    backgroundColor: theme.colors.bgSurface,
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
    color: theme.colors.fgDefault,
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
    color: theme.colors.brand,
    marginBottom: 4,
  },
  originalPriceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalPrice: {
    fontSize: 16,
    color: theme.colors.fgMuted,
    textDecorationLine: 'line-through',
  },
  discount: {
    backgroundColor: theme.colors.danger,
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
    color: theme.colors.fgDefault,
  },
  location: {
    fontSize: 14,
    color: theme.colors.fgMuted,
  },
  author: {
    fontSize: 12,
    color: theme.colors.fgMuted,
  },
  description: {
    fontSize: 16,
    color: theme.colors.fgDefault,
    lineHeight: 24,
    marginBottom: 20,
  },
  voteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  voteButton: {
    backgroundColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  voteButtonActive: {
    backgroundColor: theme.colors.brand,
  },
  voteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.fgDefault,
  },
  voteCount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.brand,
  },
  commentsSection: {
    marginBottom: 40,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.fgDefault,
    marginBottom: 16,
  },
  commentCard: {
    backgroundColor: theme.colors.bgSurface,
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
    color: theme.colors.fgDefault,
  },
  commentDate: {
    fontSize: 12,
    color: theme.colors.fgMuted,
  },
  commentContent: {
    fontSize: 14,
    color: theme.colors.fgDefault,
    lineHeight: 20,
  },
  editedLabel: {
    fontSize: 10,
    color: theme.colors.fgMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  noCommentsText: {
    fontSize: 14,
    color: theme.colors.fgMuted,
    textAlign: 'center',
    padding: 20,
  },
});