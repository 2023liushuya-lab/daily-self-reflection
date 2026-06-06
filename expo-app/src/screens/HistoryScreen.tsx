import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput,
} from 'react-native';
import { colors, fonts, spacing, shadows, radius } from '../theme';
import { reviewsApi } from '../api/client';
import type { Review } from '../../../shared/types';

const SCOPE_OPTIONS = [
  { label: '全部', value: '' },
  { label: '工作', value: 'WORK' },
  { label: '人际', value: 'RELATIONSHIP' },
  { label: '个人状态', value: 'PERSONAL_STATE' },
  { label: '个人生活', value: 'PERSONAL_LIFE' },
];

export default function HistoryScreen({ navigation }: any) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [activeScope, setActiveScope] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState('');

  const fetchReviews = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      const params: any = { page: pageNum, pageSize: 20 };
      if (activeScope) params.scopeArea = activeScope;
      if (searchText.trim()) params.search = searchText.trim();
      if (activeTag) params.tag = activeTag;

      const res = await reviewsApi.list(params);
      const data = res.data.data || [];
      if (append) {
        setReviews(prev => [...prev, ...data]);
      } else {
        setReviews(data);
        // Collect all tags for filter
        const tags = new Set<string>();
        data.forEach((r: Review) => {
          (r.tags as string[])?.forEach((t: string) => tags.add(t));
        });
        setAllTags(Array.from(tags).sort());
      }
      setHasMore(data.length === 20);
    } catch (e) {
      console.error('Failed to load reviews:', e);
    }
  }, [activeScope, searchText, activeTag]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchReviews(1).finally(() => setLoading(false));
  }, [fetchReviews]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setPage(1);
      fetchReviews(1);
    });
    return unsubscribe;
  }, [navigation, fetchReviews]);

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await fetchReviews(1);
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchReviews(nextPage, true);
  };

  const handleSearch = () => {
    setLoading(true);
    setPage(1);
    fetchReviews(1).finally(() => setLoading(false));
  };

  const quickFilter = (scope: string) => {
    setActiveScope(scope);
    setActiveTag('');
    setSearchText('');
  };

  const scopeLabel = (scope: string) => {
    const found = SCOPE_OPTIONS.find(o => o.value === scope);
    return found?.label || scope;
  };

  if (loading && reviews.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Quick filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {SCOPE_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.filterChip, activeScope === opt.value && styles.filterChipActive]}
            onPress={() => quickFilter(opt.value)}
          >
            <Text style={[styles.filterChipText, activeScope === opt.value && styles.filterChipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索复盘内容..."
          placeholderTextColor={colors.textSecondary}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>搜索</Text>
        </TouchableOpacity>
      </View>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagRow}
          contentContainerStyle={styles.tagContent}
        >
          <TouchableOpacity
            style={[styles.tagChip, !activeTag && styles.tagChipActive]}
            onPress={() => setActiveTag('')}
          >
            <Text style={[styles.tagChipText, !activeTag && styles.tagChipTextActive]}>全部标签</Text>
          </TouchableOpacity>
          {allTags.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.tagChip, activeTag === tag && styles.tagChipActive]}
              onPress={() => setActiveTag(tag === activeTag ? '' : tag)}
            >
              <Text style={[styles.tagChipText, activeTag === tag && styles.tagChipTextActive]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        onMomentumScrollEnd={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) {
            loadMore();
          }
        }}
      >
        {reviews.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>暂无复盘记录</Text>
            <Text style={styles.emptySubtitle}>
              {searchText ? '尝试其他关键词' : activeScope ? '切换分类看看' : '写一条复盘吧'}
            </Text>
          </View>
        ) : (
          reviews.map(review => (
            <TouchableOpacity
              key={review.id}
              style={styles.reviewItem}
              onPress={() => navigation.navigate('ReviewDetail', { id: review.id })}
              activeOpacity={0.7}
            >
              <View style={styles.reviewHeader}>
                <View style={styles.scopeBadge}>
                  <Text style={styles.scopeText}>{scopeLabel(review.scopeArea)}</Text>
                </View>
                <Text style={styles.reviewDate}>
                  {new Date(review.createdAt).toLocaleDateString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <Text style={styles.reviewPreview} numberOfLines={3}>
                {review.rawText}
              </Text>
              {(review.tags as string[])?.length > 0 && (
                <View style={styles.reviewTags}>
                  {(review.tags as string[]).slice(0, 3).map(tag => (
                    <View key={tag} style={styles.reviewTag}>
                      <Text style={styles.reviewTagText}>{tag}</Text>
                    </View>
                  ))}
                  {(review.tags as string[]).length > 3 && (
                    <Text style={styles.moreTag}>+{(review.tags as string[]).length - 3}</Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}

        {hasMore && reviews.length > 0 && (
          <View style={styles.loadingMore}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  // Filters
  filterRow: { maxHeight: 44, marginTop: spacing.sm },
  filterContent: { paddingHorizontal: spacing.md, gap: spacing.sm, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { ...fonts.caption, color: colors.textSecondary },
  filterChipTextActive: { color: colors.white },

  // Search
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...fonts.body,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    justifyContent: 'center',
  },
  searchBtnText: { ...fonts.body, color: colors.white, fontWeight: '600', fontSize: 14 },

  // Tags
  tagRow: { maxHeight: 36, marginTop: spacing.sm },
  tagContent: { paddingHorizontal: spacing.md, gap: spacing.xs, alignItems: 'center' },
  tagChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagChipActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  tagChipText: { ...fonts.small, fontSize: 11, color: colors.textSecondary },
  tagChipTextActive: { color: colors.primary, fontWeight: '600' },

  // List
  list: { flex: 1, marginTop: spacing.sm },
  listContent: { paddingHorizontal: spacing.md },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { ...fonts.heading, marginBottom: spacing.xs },
  emptySubtitle: { ...fonts.caption, color: colors.textSecondary, textAlign: 'center' },

  // Review item
  reviewItem: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  scopeBadge: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  scopeText: { ...fonts.small, color: colors.primary, fontWeight: '600' },
  reviewDate: { ...fonts.small, color: colors.textSecondary, fontSize: 11 },
  reviewPreview: { ...fonts.body, fontSize: 14, lineHeight: 21, marginBottom: spacing.sm },
  reviewTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  reviewTag: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  reviewTagText: { ...fonts.small, fontSize: 11, color: colors.textSecondary },
  moreTag: { ...fonts.small, fontSize: 11, color: colors.primary },

  // Loading more
  loadingMore: { paddingVertical: spacing.lg, alignItems: 'center' },
});
