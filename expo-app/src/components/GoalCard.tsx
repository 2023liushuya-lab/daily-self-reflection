import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fonts, spacing, shadows, radius } from '../theme';
import type { AnnualGoal } from '../../../shared/types';
import { calcKRProgress } from '../utils/progress';

export default function GoalCard({ goal, onPress }: { goal: AnnualGoal; onPress?: () => void }) {
  const krs = (goal.keyResults as any[]) || [];
  const milestones = (goal.qualitativeMilestones as string[]) || [];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Category badge */}
      {goal.category ? (
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{goal.category}</Text>
        </View>
      ) : null}

      {/* Title */}
      <Text style={styles.title} numberOfLines={3}>{goal.title}</Text>

      {/* Key Results mini */}
      {krs.length > 0 ? (
        <View style={styles.krList}>
          {krs.slice(0, 3).map((kr: any) => (
            <View key={kr.id} style={styles.krRow}>
              <Text style={styles.krDesc} numberOfLines={1}>{kr.description}</Text>
              <Text style={styles.krValue}>{kr.current}/{kr.target}{kr.unit}</Text>
              <View style={styles.krMiniBar}>
                <View
                  style={[
                    styles.krMiniFill,
                    { width: `${calcKRProgress(kr)}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      ) : milestones.length > 0 ? (
        <View style={styles.milestoneList}>
          {milestones.slice(0, 2).map((m: string, i: number) => (
            <View key={i} style={styles.milestoneRow}>
              <View style={styles.milestoneDot} />
              <Text style={styles.milestoneText} numberOfLines={1}>{m}</Text>
            </View>
          ))}
          {milestones.length > 2 && (
            <Text style={styles.milestoneMore}>+{milestones.length - 2} 更多</Text>
          )}
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
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginRight: spacing.md,
    width: 240,
    ...shadows.sm,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  categoryText: {
    ...fonts.small,
    color: colors.primary,
    fontWeight: '600',
  },
  title: {
    ...fonts.heading,
    fontSize: 15,
    marginBottom: spacing.sm,
    lineHeight: 21,
  },
  // Key Results
  krList: {
    gap: spacing.xs + 2,
  },
  krRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  krDesc: {
    ...fonts.small,
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  krValue: {
    ...fonts.small,
    fontWeight: '600',
    color: colors.text,
    minWidth: 55,
    textAlign: 'right',
  },
  krMiniBar: {
    width: 40,
    height: 3,
    backgroundColor: colors.divider,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  krMiniFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 1.5,
  },
  // Qualitative milestones
  milestoneList: {
    gap: spacing.xs + 2,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  milestoneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  milestoneText: {
    ...fonts.small,
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  milestoneMore: {
    ...fonts.small,
    fontSize: 11,
    color: colors.primary,
  },
  // Fallback progress (no KRs)
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.divider,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    ...fonts.caption,
    fontWeight: '600',
    minWidth: 35,
    textAlign: 'right',
  },
});
