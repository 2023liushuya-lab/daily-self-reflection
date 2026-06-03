import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { colors, fonts, spacing, shadows, radius } from '../theme';
import { goalsApi } from '../api/client';
import { calcKRProgress, calcGoalProgress } from '../utils/progress';
import type { AnnualGoal } from '../../../shared/types';

export default function GoalsScreen({ navigation }: any) {
  const [goals, setGoals] = useState<AnnualGoal[]>([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      goalsApi.list().then(res => setGoals(res.data.data || [])).catch(console.error);
    });
    return unsubscribe;
  }, [navigation]);

  const handleDelete = (id: string) => {
    Alert.alert('确认删除', '删除后无法恢复', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: async () => {
          await goalsApi.delete(id);
          setGoals(prev => prev.filter(g => g.id !== id));
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} removeClippedSubviews={true}>
      {goals.map(goal => {
        const krs = (goal.keyResults as any[]) || [];
        const krProgress = krs.length > 0 ? calcGoalProgress(krs) : goal.progress;

        return (
          <TouchableOpacity
            key={goal.id}
            style={styles.card}
            onPress={() => navigation.navigate('GoalEdit', { mode: 'edit', goal })}
            onLongPress={() => handleDelete(goal.id)}
            activeOpacity={0.7}
          >
            {/* Row 1: Category + Status */}
            <View style={styles.header}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{goal.category || '个人成长'}</Text>
              </View>
              <Text style={styles.status}>
                {goal.status === 'ACTIVE' ? '进行中' : goal.status === 'COMPLETED' ? '已完成' : '已放弃'}
              </Text>
            </View>

            {/* Row 2: Title */}
            <Text style={styles.title}>{goal.title}</Text>
            {goal.description ? (
              <Text style={styles.desc} numberOfLines={2}>{goal.description}</Text>
            ) : null}

            {/* Row 3: Key Results with individual progress */}
            {krs.length > 0 ? (
              <View style={styles.krSection}>
                {krs.map((kr: any) => {
                  const krPct = calcKRProgress(kr);
                  return (
                    <View key={kr.id} style={styles.krItem}>
                      <View style={styles.krInfo}>
                        <Text style={styles.krDesc} numberOfLines={1}>{kr.description}</Text>
                        <Text style={styles.krTarget}>
                          {kr.current}/{kr.target}{kr.unit}
                        </Text>
                      </View>
                      <View style={styles.krBar}>
                        <View style={[styles.krFill, { width: `${Math.min(krPct, 100)}%` }]} />
                      </View>
                    </View>
                  );
                })}
                {/* Overall progress */}
                <View style={styles.overallRow}>
                  <Text style={styles.overallLabel}>总进度</Text>
                  <Text style={styles.overallValue}>{krProgress}%</Text>
                  <View style={styles.overallBar}>
                    <View style={[styles.overallFill, { width: `${Math.min(krProgress, 100)}%` }]} />
                  </View>
                </View>
              </View>
            ) : (goal.qualitativeMilestones as string[])?.length > 0 ? (
              <View style={styles.milestoneSection}>
                {(goal.qualitativeMilestones as string[]).slice(0, 3).map((m, i) => (
                  <View key={i} style={styles.milestoneItem}>
                    <View style={styles.milestoneDot} />
                    <Text style={styles.milestoneText} numberOfLines={2}>{m}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.progressRow}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min(goal.progress, 100)}%` }]} />
                </View>
                <Text style={styles.progressText}>{goal.progress}%</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('GoalEdit', { mode: 'create' })}
      >
        <Text style={styles.addButtonText}>+ 添加目标</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },

  // Card
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },

  // Header: category + status
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  categoryText: { ...fonts.small, color: colors.primary, fontWeight: '600' },
  status: { ...fonts.small, color: colors.textSecondary },

  // Title & desc
  title: { ...fonts.heading, fontSize: 16, marginBottom: spacing.xs, lineHeight: 22 },
  desc: { ...fonts.caption, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 18 },

  // Key Results section
  krSection: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
  },
  krItem: {
    marginBottom: spacing.sm,
  },
  krInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  krDesc: {
    ...fonts.small,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  krTarget: {
    ...fonts.small,
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  krBar: {
    height: 4,
    backgroundColor: colors.divider,
    borderRadius: 2,
    overflow: 'hidden',
  },
  krFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  // Overall progress
  overallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  overallLabel: { ...fonts.small, fontSize: 11, color: colors.textSecondary },
  overallValue: { ...fonts.small, fontSize: 12, fontWeight: '700', color: colors.text },
  overallBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.divider,
    borderRadius: 3,
    overflow: 'hidden',
  },
  overallFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 3,
  },

  // Qualitative milestones
  milestoneSection: {
    backgroundColor: colors.successBg,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs + 2,
  },
  milestoneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginTop: 5,
  },
  milestoneText: {
    ...fonts.small,
    color: colors.text,
    flex: 1,
    lineHeight: 18,
  },

  // Fallback (no KRs)
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressBar: {
    flex: 1, height: 6, backgroundColor: colors.divider,
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  progressText: { ...fonts.caption, fontWeight: '600' },

  // Add button
  addButton: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    borderStyle: 'dashed',
    alignItems: 'center',
    ...shadows.sm,
  },
  addButtonText: { ...fonts.body, color: colors.primary, fontWeight: '500' },
});
