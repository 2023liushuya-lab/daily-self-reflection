import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { colors, fonts, spacing, shadows, radius } from '../theme';
import { Ease } from '../utils/animations';
import type { GDRR } from '../../../shared/types';

const sections: { key: keyof GDRR; label: string }[] = [
  { key: 'goal', label: '目标' },
  { key: 'result', label: '结果' },
  { key: 'difference', label: '差异' },
  { key: 'reason', label: '根因' },
];

export default function GDRRCard({ gdrr }: { gdrr: GDRR }) {
  const animValues = useRef(
    Object.fromEntries(sections.map(s => [s.key, new Animated.Value(1)]))
  ).current;

  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(sections.map(s => [s.key, true]))
  );

  const toggle = useCallback((key: string) => {
    const isExpanded = expanded[key];
    setExpanded(prev => ({ ...prev, [key]: !isExpanded }));

    Animated.timing(animValues[key], {
      toValue: isExpanded ? 0 : 1,
      duration: 300,
      easing: Ease.power3Out,
      useNativeDriver: false,
    }).start();
  }, [expanded, animValues]);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>GDRR 分析</Text>
      {sections.map(({ key, label }) => {
        const animValue = animValues[key];
        const maxHeight = animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 200],
        });

        return (
          <View key={key} style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggle(key)}>
              <Text style={styles.sectionLabel}>{label}</Text>
              <Animated.Text style={[
                styles.toggleIcon,
                {
                  transform: [{
                    rotate: animValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '45deg'],
                    })
                  }]
                }
              ]}>+</Animated.Text>
            </TouchableOpacity>
            <Animated.View style={{ maxHeight, overflow: 'hidden', opacity: animValue }}>
              <Text style={styles.sectionContent}>{gdrr[key] || '暂无'}</Text>
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: { ...fonts.heading, fontSize: 16, marginBottom: spacing.md },
  section: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
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
