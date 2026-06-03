import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing, shadows, radius } from '../theme';

interface PieChartData {
  label: string;
  value: number;
  color: string;
}

export function PieChart({ data }: { data: PieChartData[] }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  if (data.length === 0) {
    return (
      <View style={chartStyles.emptyContainer}>
        <Text style={chartStyles.emptyText}>暂无分布数据</Text>
      </View>
    );
  }

  return (
    <View style={chartStyles.container}>
      {data.map((item, index) => (
        <View key={index} style={chartStyles.barRow}>
          <Text style={chartStyles.label} numberOfLines={1}>{item.label}</Text>
          <View style={chartStyles.barTrack}>
            <View
              style={[
                chartStyles.barFill,
                {
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: item.color,
                },
              ]}
            />
          </View>
          <Text style={chartStyles.value}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function StatCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <View style={statStyles.card}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
      {subtitle ? <Text style={statStyles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    ...fonts.caption,
    color: colors.textSecondary,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    ...fonts.caption,
    width: 70,
  },
  barTrack: {
    flex: 1,
    height: 16,
    backgroundColor: colors.divider,
    borderRadius: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 8,
  },
  value: {
    ...fonts.caption,
    width: 30,
    textAlign: 'right',
    fontWeight: '600',
    color: colors.text,
  },
});

const statStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    flex: 1,
    alignItems: 'center',
    ...shadows.sm,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  label: {
    ...fonts.caption,
    textAlign: 'center',
  },
  subtitle: {
    ...fonts.caption,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
});
