import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StackScreen } from '@/components/stack-screen';
import { useMyComments } from '@qiima/queries';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { config } from '@/constants/config';
import { useI18n } from '@qiima/i18n';
import { useTheme } from '@qiima/ui';

export default function MyCommentsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useI18n();
  const theme = useTheme();

  const styles = createStyles(theme);

  // Fetch user's comments from API
  const { data: myComments, isLoading, refetch, error } = useMyComments({
    env: 'native',
    baseURL: config.baseURL,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDealPress = (dealId: number) => {
    router.push(`/deal/${dealId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  if (error) {
    return (
      <StackScreen centered>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('common.failedToLoadDeals')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </StackScreen>
    );
  }

  return (
    <StackScreen onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('common.myCommentsTitle')}</Text>
      </View>

      {isLoading && !myComments && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      )}

      {myComments && myComments.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>{t('common.noCommentsYet')}</Text>
          <Text style={styles.emptySubtitle}>{t('common.startCommenting')}</Text>
        </View>
      )}

      {myComments && myComments.length > 0 && (
        <View style={styles.commentsContainer}>
          {myComments.map((comment) => (
            <TouchableOpacity 
              key={comment.id}
              style={styles.commentCard}
              onPress={() => handleDealPress(comment.deal)}
            >
              <View style={styles.commentHeader}>
                <Text style={styles.dealTitle} numberOfLines={1}>
                  Deal #{comment.deal}
                </Text>
                <Text style={styles.commentDate}>
                  {formatDate(comment.created_at)}
                </Text>
              </View>
              
              <Text style={styles.commentContent} numberOfLines={3}>
                {comment.content}
              </Text>
              
              <View style={styles.commentFooter}>
                <Text style={styles.tapToView}>
                  Tap to view deal
                </Text>
                {comment.is_edited && (
                  <Text style={styles.editedLabel}>
                    (edited)
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </StackScreen>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.fgDefault,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.fgMuted,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    errorText: {
      fontSize: 16,
      color: theme.colors.danger,
      textAlign: 'center',
      marginBottom: 20,
    },
    retryButton: {
      backgroundColor: theme.colors.brand,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: theme.radius.md,
    },
    retryButtonText: {
      color: theme.mode === 'dark' ? '#0F1115' : '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.fgDefault,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 16,
      color: theme.colors.fgMuted,
      textAlign: 'center',
    },
    commentsContainer: {
      paddingHorizontal: 20,
    },
    commentCard: {
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radius.lg,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    commentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    dealTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.brand,
      flex: 1,
    },
    commentDate: {
      fontSize: 12,
      color: theme.colors.fgMuted,
    },
    commentContent: {
      fontSize: 14,
      color: theme.colors.fgDefault,
      lineHeight: 20,
      marginBottom: 12,
    },
    commentFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    tapToView: {
      fontSize: 12,
      color: theme.colors.brand,
      fontStyle: 'italic',
    },
    editedLabel: {
      fontSize: 12,
      color: theme.colors.fgMuted,
      fontStyle: 'italic',
    },
  });
}
