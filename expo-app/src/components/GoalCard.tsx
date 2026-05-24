import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../theme';
import type { AnnualGoal } from '../../../shared/types';

const categoryLabels: Record<string, string> = {
  WORK: '工作',
  RELATIONSHIP: '人际',
  PERSONAL_STATE: '个人状态',
  PERSONAL_LIFE: '个人生活',
};

export default function GoalCard({ goal, onPress }: { goal: AnnualGoal; onPress?: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.category}>{categoryLabels[goal.category] || goal.category}</Text>
        <Text style={styles.progress}>{goal.progress}%</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>{goal.title}</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${goal.progress}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginRight: spacing.md,
    width: 220,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  category: {
    ...fonts.caption,
    color: colors.primary,
  },
  progress: {
    ...fonts.caption,
    fontWeight: '600',
    color: colors.text,
  },
  title: {
    ...fonts.heading,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
