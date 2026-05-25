import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { reviewsApi } from '../api/client';
import GDRRCard from '../components/GDRRCard';
import CoachQuestions from '../components/CoachQuestions';
import type { Review } from '../../../shared/types';

export default function ReviewDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    reviewsApi.get(id)
      .then(res => setReview(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleDelete} disabled={deleting}>
          <Text style={{ color: '#E53935', fontSize: 15, fontWeight: '600' }}>
            {deleting ? '删除中...' : '删除'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, deleting]);

  const handleDelete = () => {
    Alert.alert('删除复盘', '删除后无法恢复，确定要删除吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await reviewsApi.delete(id);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('删除失败', e.response?.data?.error || '请重试');
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!review) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>复盘不存在</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.rawSection}>
        <Text style={styles.rawLabel}>原文</Text>
        <Text style={styles.rawText}>{review.rawText}</Text>
      </View>

      {review.tags && (review.tags as string[]).length > 0 && (
        <View style={styles.tagRow}>
          {(review.tags as string[]).map((tag: string) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <GDRRCard gdrr={review.gdrr} />

      <CoachQuestions
        questions={(review.coachQuestions as string[]) || []}
        onQuestionPress={(q: string) => {
          navigation.navigate('CoachChat', { reviewId: review.id });
        }}
        onChatPress={() => {
          navigation.navigate('CoachChat', { reviewId: review.id });
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 100 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  errorText: { ...fonts.body, color: colors.textSecondary },
  rawSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  rawLabel: { ...fonts.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  rawText: { ...fonts.body, fontSize: 14, lineHeight: 22 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  tag: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: { ...fonts.caption, fontSize: 12, color: colors.primary },
});
