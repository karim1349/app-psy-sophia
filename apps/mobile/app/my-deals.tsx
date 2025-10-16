import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StackScreen } from '@/components/stack-screen';
import { useMyDeals } from '@qiima/queries';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { config } from '@/constants/config';
import { useI18n } from '@qiima/i18n';
import { useTheme } from '@qiima/ui';

export default function MyDealsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useI18n();
  const theme = useTheme();

  const styles = createStyles(theme);

  // Fetch user's deals from API
  const { data: myDeals, isLoading, refetch, error } = useMyDeals({
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

  const handleCreateDeal = () => {
    router.push('/create-deal');
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
        <Text style={styles.title}>{t('common.myDealsTitle')}</Text>
      </View>

      {isLoading && !myDeals && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      )}

      {myDeals && myDeals.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>{t('common.noDealYet')}</Text>
          <Text style={styles.emptySubtitle}>{t('common.postFirstDeal')}</Text>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateDeal}>
            <Text style={styles.createButtonText}>{t('common.createAccount')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {myDeals && myDeals.length > 0 && (
        <View style={styles.dealsContainer}>
          {myDeals.map((deal) => (
            <TouchableOpacity 
              key={deal.id}
              style={styles.dealCard}
              onPress={() => handleDealPress(deal.id)}
            >
              <View style={styles.dealHeader}>
                <Text style={styles.dealTitle} numberOfLines={2}>
                  {deal.title}
                </Text>
                <View style={styles.dealStatus}>
                  <Text style={[
                    styles.statusText,
                    deal.is_verified ? styles.verifiedStatus : styles.unverifiedStatus
                  ]}>
                    {deal.is_verified ? t('common.verified') : 'Pending'}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.dealDescription} numberOfLines={2}>
                {deal.description}
              </Text>
              
              <View style={styles.dealFooter}>
                <View style={styles.priceContainer}>
                  <Text style={styles.currentPrice}>
                    {deal.current_price} {deal.currency}
                  </Text>
                  <Text style={styles.originalPrice}>
                    {deal.original_price} {deal.currency}
                  </Text>
                  <Text style={styles.discount}>
                    -{deal.discount_percentage}%
                  </Text>
                </View>
                
                <View style={styles.statsContainer}>
                  <Text style={styles.statText}>
                    {deal.vote_count} {t('common.votes')}
                  </Text>
                  <Text style={styles.statText}>
                    {deal.comment_count} comments
                  </Text>
                </View>
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
      marginBottom: 24,
    },
    createButton: {
      backgroundColor: theme.colors.brand,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: theme.radius.md,
    },
    createButtonText: {
      color: theme.mode === 'dark' ? '#0F1115' : '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    dealsContainer: {
      paddingHorizontal: 20,
    },
    dealCard: {
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radius.lg,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    dealHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    dealTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.fgDefault,
      flex: 1,
      marginRight: 12,
    },
    dealStatus: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.bgCanvas,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '500',
    },
    verifiedStatus: {
      color: theme.colors.brand,
    },
    unverifiedStatus: {
      color: theme.colors.neutral,
    },
    dealDescription: {
      fontSize: 14,
      color: theme.colors.fgMuted,
      marginBottom: 12,
      lineHeight: 20,
    },
    dealFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    priceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    currentPrice: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.brand,
      marginRight: 8,
    },
    originalPrice: {
      fontSize: 14,
      color: theme.colors.fgMuted,
      textDecorationLine: 'line-through',
      marginRight: 8,
    },
    discount: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.danger,
      backgroundColor: theme.colors.bgCanvas,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    statsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statText: {
      fontSize: 12,
      color: theme.colors.fgMuted,
      marginLeft: 12,
    },
  });
}
