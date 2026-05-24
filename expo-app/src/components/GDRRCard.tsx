import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../theme';
import type { GDRR } from '../../../shared/types';

const sections: { key: keyof GDRR; label: string }[] = [
  { key: 'goal', label: '目标' },
  { key: 'result', label: '结果' },
  { key: 'difference', label: '差异' },
  { key: 'reason', label: '根因' },
];

export default function GDRRCard({ gdrr }: { gdrr: GDRR }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    goal: true,
    result: true,
    difference: true,
    reason: true,
  });

  const toggle = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>GDRR 分析</Text>
      {sections.map(({ key, label }) => (
        <View key={key} style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggle(key)}>
            <Text style={styles.sectionLabel}>{label}</Text>
            <Text style={styles.toggleIcon}>{expanded[key] ? '−' : '+'}</Text>
          </TouchableOpacity>
          {expanded[key] && (
            <Text style={styles.sectionContent}>{gdrr[key] || '暂无'}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...fonts.heading, fontSize: 16, marginBottom: spacing.md },
  section: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: { ...fonts.body, fontWeight: '600', color: colors.primary },
  toggleIcon: { ...fonts.heading, color: colors.textSecondary, fontSize: 20 },
  sectionContent: { ...fonts.body, marginTop: spacing.xs, lineHeight: 22 },
});
