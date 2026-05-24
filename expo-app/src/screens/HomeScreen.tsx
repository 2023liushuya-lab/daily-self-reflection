import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { goalsApi, reviewsApi } from '../api/client';
import GoalCard from '../components/GoalCard';
import type { AnnualGoal, Review } from '../../../shared/types';

export default function HomeScreen({ navigation }: any) {
  const [goals, setGoals] = useState<AnnualGoal[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [todayReviewed, setTodayReviewed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [goalsRes, reviewsRes] = await Promise.all([
        goalsApi.list(),
        reviewsApi.list({ pageSize: 5 }),
      ]);
      setGoals(goalsRes.data.data || []);
      const reviews = reviewsRes.data.data || [];
      setRecentReviews(reviews);

      const today = new Date().toISOString().slice(0, 10);
      setTodayReviewed(reviews.some((r: Review) => r.createdAt.slice(0, 10) === today));
    } catch (e) {
      console.error('Failed to load home data:', e);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.todayCard}>
        <Text style={styles.todayTitle}>
          {todayReviewed ? '今日已完成复盘' : '今日还未复盘'}
        </Text>
        <Text style={styles.todaySubtitle}>
          {todayReviewed ? '做得好！继续保持' : '花 2 分钟，记录今天吧'}
        </Text>
        <View style={styles.quickActions}>
          {!todayReviewed && (
            <TouchableOpacity
              style={styles.fab}
              onPress={() => navigation.navigate('ReviewInput')}
            >
              <Text style={styles.fabText}>开始复盘</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.fab, styles.reportFab]}
            onPress={() => navigation.navigate('Reports')}
          >
            <Text style={styles.fabText}>查看报告</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>年度目标</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Goals')}>
            <Text style={styles.viewAll}>查看全部</Text>
          </TouchableOpacity>
        </View>
        {goals.length === 0 ? (
          <TouchableOpacity
            style={styles.emptyState}
            onPress={() => navigation.navigate('GoalEdit', { mode: 'create' })}
          >
            <Text style={styles.emptyText}>设定你的第一个年度目标</Text>
          </TouchableOpacity>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {goals.map(goal => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>最近复盘</Text>
        </View>
        {recentReviews.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>还没有复盘记录</Text>
          </View>
        ) : (
          recentReviews.map(review => (
            <TouchableOpacity
              key={review.id}
              style={styles.reviewItem}
              onPress={() => navigation.navigate('ReviewDetail', { id: review.id })}
            >
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewScope}>{review.scopeArea}</Text>
                <Text style={styles.reviewDate}>
                  {new Date(review.createdAt).toLocaleDateString('zh-CN')}
                </Text>
              </View>
              <Text style={styles.reviewPreview} numberOfLines={2}>
                {review.rawText.slice(0, 100)}
              </Text>
              {review.tags && (review.tags as string[]).length > 0 && (
                <View style={styles.tagRow}>
                  {(review.tags as string[]).slice(0, 3).map((tag: string) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 100 },
  todayCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  todayTitle: { ...fonts.heading, marginBottom: spacing.xs },
  todaySubtitle: { ...fonts.caption, marginBottom: spacing.md },
  quickActions: { flexDirection: 'row', gap: spacing.sm },
  fab: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 4,
    borderRadius: 24,
  },
  reportFab: { backgroundColor: '#8B7355' },
  fabText: { color: colors.white, ...fonts.body, fontWeight: '600' },
  section: { marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...fonts.heading },
  viewAll: { ...fonts.caption, color: colors.primary },
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyText: { ...fonts.caption, color: colors.textSecondary },
  reviewItem: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  reviewScope: { ...fonts.caption, color: colors.primary, fontWeight: '600' },
  reviewDate: { ...fonts.caption, color: colors.textSecondary },
  reviewPreview: { ...fonts.body, fontSize: 14, marginBottom: spacing.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: { ...fonts.caption, fontSize: 12, color: colors.textSecondary },
});
