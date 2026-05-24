import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { goalsApi } from '../api/client';
import type { AnnualGoal } from '../../../shared/types';

const categoryLabels: Record<string, string> = {
  WORK: '工作', RELATIONSHIP: '人际', PERSONAL_STATE: '个人状态', PERSONAL_LIFE: '个人生活',
};

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {goals.map(goal => (
        <TouchableOpacity
          key={goal.id}
          style={styles.card}
          onPress={() => navigation.navigate('GoalEdit', { mode: 'edit', goal })}
          onLongPress={() => handleDelete(goal.id)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.category}>{categoryLabels[goal.category] || goal.category}</Text>
            <Text style={styles.status}>
              {goal.status === 'ACTIVE' ? '进行中' : goal.status === 'COMPLETED' ? '已完成' : '已放弃'}
            </Text>
          </View>
          <Text style={styles.title}>{goal.title}</Text>
          <Text style={styles.desc} numberOfLines={2}>{goal.description}</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${goal.progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{goal.progress}%</Text>
          </View>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('GoalEdit', { mode: 'create' })}
      >
        <Text style={styles.addButtonText}>+ 添加目标</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  category: { ...fonts.caption, color: colors.primary, fontWeight: '600' },
  status: { ...fonts.caption, color: colors.textSecondary },
  title: { ...fonts.heading, fontSize: 16, marginBottom: spacing.xs },
  desc: { ...fonts.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressBar: {
    flex: 1, height: 6, backgroundColor: colors.border,
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  progressText: { ...fonts.caption, fontWeight: '600' },
  addButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addButtonText: { ...fonts.body, color: colors.primary },
});
