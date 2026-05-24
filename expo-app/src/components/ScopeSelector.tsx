import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../theme';
import type { ScopeArea } from '../../../shared/types';

const options: { value: ScopeArea; label: string }[] = [
  { value: 'WORK', label: '工作' },
  { value: 'RELATIONSHIP', label: '人际' },
  { value: 'PERSONAL_STATE', label: '个人状态' },
  { value: 'PERSONAL_LIFE', label: '个人生活' },
];

export default function ScopeSelector({
  value,
  onChange,
}: {
  value: ScopeArea;
  onChange: (v: ScopeArea) => void;
}) {
  return (
    <View style={styles.container}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.chip, value === opt.value && styles.activeChip]}
          onPress={() => onChange(opt.value)}
        >
          <Text style={[styles.chipText, value === opt.value && styles.activeChipText]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { ...fonts.caption, color: colors.text },
  activeChipText: { color: colors.white },
});
