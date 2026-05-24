import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { reportsApi } from '../api/client';
import { PieChart, StatCard } from '../components/ReportChart';

type ReportPeriod = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';

const periodTabs: { key: ReportPeriod; label: string }[] = [
  { key: 'WEEKLY', label: '周报' },
  { key: 'MONTHLY', label: '月报' },
  { key: 'QUARTERLY', label: '季报' },
];

const scopeLabels: Record<string, string> = {
  WORK: '工作',
  RELATIONSHIP: '人际',
  PERSONAL_STATE: '个人状态',
  PERSONAL_LIFE: '个人生活',
};

const scopeColors: Record<string, string> = {
  WORK: colors.primary,
  RELATIONSHIP: colors.warning,
  PERSONAL_STATE: colors.success,
  PERSONAL_LIFE: '#8B7355',
};

interface ScopeCounts {
  [key: string]: number;
}

interface GoalAssessment {
  goalId: string;
  goalTitle: string;
  reviewCount: number;
  alignmentNote: string;
  suggestion: string;
}

interface ReportContent {
  reviewCount?: number;
  streakDays?: number;
  tagCount?: number;
  scopeCounts?: ScopeCounts;
  aiNarrative?: string;
  growthSignals?: {
    skillsObserved: string[];
    patternsContinuing: string[];
    breakthroughs: string[];
  };
  goalAssessments?: GoalAssessment[];
  nextPeriodSuggestions?: string[];
}

export default function ReportsScreen() {
  const [period, setPeriod] = useState<ReportPeriod>('WEEKLY');
  const [report, setReport] = useState<ReportContent | null>(null);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const fetchReport = useCallback(async (reportType: ReportPeriod) => {
    setLoading(true);
    try {
      const res = await reportsApi.get({ type: reportType, date: today });
      const data = res.data?.data ?? res.data;
      setReport((data?.content ?? data) as ReportContent);
    } catch (err: any) {
      if (err?.response?.status === 500) {
        try {
          const genRes = await reportsApi.generate({ type: reportType, date: today });
          const genData = genRes.data?.data ?? genRes.data;
          setReport((genData?.content ?? genData) as ReportContent);
        } catch (genErr: any) {
          Alert.alert('生成失败', genErr?.response?.data?.error || '报告生成失败，请稍后再试');
          setReport(null);
        }
      } else {
        Alert.alert('加载失败', err?.response?.data?.error || '无法加载报告');
        setReport(null);
      }
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchReport(period);
  }, [period, fetchReport]);

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const genRes = await reportsApi.generate({ type: period, date: today });
      const genData = genRes.data?.data ?? genRes.data;
      setReport((genData?.content ?? genData) as ReportContent);
    } catch (err: any) {
      Alert.alert('生成失败', err?.response?.data?.error || '报告生成失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const scopeChartData = Object.entries(report?.scopeCounts ?? {}).map(([key, value]) => ({
    label: scopeLabels[key] ?? key,
    value,
    color: scopeColors[key] ?? colors.primary,
  }));

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>正在生成报告...</Text>
        </View>
      );
    }

    if (!report) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>暂无该周期复盘数据</Text>
          <Text style={styles.emptySubtitle}>完成复盘后，AI 将为你生成报告</Text>
          <TouchableOpacity style={styles.generateButton} onPress={handleRegenerate}>
            <Text style={styles.generateButtonText}>手动生成报告</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard
            label="复盘次数"
            value={String(report.reviewCount ?? 0)}
            subtitle="本周期"
          />
          <StatCard
            label="连续天数"
            value={String(report.streakDays ?? 0)}
            subtitle="天"
          />
          <StatCard
            label="标签数"
            value={String(report.tagCount ?? 0)}
            subtitle="个"
          />
        </View>

        {/* Scope Distribution */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>复盘分布</Text>
          <PieChart data={scopeChartData} />
        </View>

        {/* AI Narrative */}
        {report.aiNarrative ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>AI 总结</Text>
            <Text style={styles.narrativeText}>{report.aiNarrative}</Text>
          </View>
        ) : null}

        {/* Growth Signals */}
        {report.growthSignals ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>成长信号</Text>

            {report.growthSignals.skillsObserved.length > 0 && (
              <View style={styles.signalSection}>
                <Text style={styles.signalLabel}>技能观察</Text>
                {report.growthSignals.skillsObserved.map((item, i) => (
                  <View key={i} style={styles.signalItem}>
                    <View style={styles.bullet} />
                    <Text style={styles.signalText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {report.growthSignals.patternsContinuing.length > 0 && (
              <View style={styles.signalSection}>
                <Text style={styles.signalLabel}>持续模式</Text>
                {report.growthSignals.patternsContinuing.map((item, i) => (
                  <View key={i} style={styles.signalItem}>
                    <View style={[styles.bullet, { backgroundColor: colors.warning }]} />
                    <Text style={styles.signalText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {report.growthSignals.breakthroughs.length > 0 && (
              <View style={styles.signalSection}>
                <Text style={styles.signalLabel}>突破</Text>
                {report.growthSignals.breakthroughs.map((item, i) => (
                  <View key={i} style={styles.signalItem}>
                    <View style={[styles.bullet, { backgroundColor: colors.success }]} />
                    <Text style={styles.signalText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* Goal Assessment */}
        {report.goalAssessments && report.goalAssessments.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>目标评估</Text>
            {report.goalAssessments.map((ga, i) => (
              <View key={ga.goalId ?? i} style={styles.goalAssessmentItem}>
                <View style={styles.goalAssessmentHeader}>
                  <Text style={styles.goalTitle} numberOfLines={1}>{ga.goalTitle}</Text>
                  <View style={styles.goalReviewBadge}>
                    <Text style={styles.goalReviewCount}>{ga.reviewCount} 次复盘</Text>
                  </View>
                </View>
                <Text style={styles.goalNote}>{ga.alignmentNote}</Text>
                <View style={styles.suggestionBox}>
                  <Text style={styles.suggestionText}>{ga.suggestion}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Next Period Suggestions */}
        {report.nextPeriodSuggestions && report.nextPeriodSuggestions.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>下阶段建议</Text>
            {report.nextPeriodSuggestions.map((s, i) => (
              <View key={i} style={styles.suggestionRow}>
                <Text style={styles.suggestionNumber}>{i + 1}.</Text>
                <Text style={styles.suggestionBody}>{s}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Regenerate Button */}
        <TouchableOpacity style={styles.regenerateButton} onPress={handleRegenerate}>
          <Text style={styles.regenerateButtonText}>重新生成报告</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Period Tabs */}
      <View style={styles.tabBar}>
        {periodTabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, period === tab.key && styles.tabActive]}
            onPress={() => setPeriod(tab.key)}
          >
            <Text style={[styles.tabText, period === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    margin: spacing.md,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...fonts.body,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  // Loading / Empty
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    ...fonts.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyTitle: {
    ...fonts.heading,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...fonts.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  generateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: 24,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  // Content
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    ...fonts.heading,
    marginBottom: spacing.sm,
  },
  narrativeText: {
    ...fonts.body,
    lineHeight: 24,
  },
  // Growth Signals
  signalSection: {
    marginTop: spacing.sm,
  },
  signalLabel: {
    ...fonts.caption,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  signalItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryLight,
    marginTop: 6,
  },
  signalText: {
    ...fonts.body,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  // Goal Assessment
  goalAssessmentItem: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  goalAssessmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  goalTitle: {
    ...fonts.body,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  goalReviewBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  goalReviewCount: {
    ...fonts.caption,
    fontSize: 12,
    color: colors.primary,
  },
  goalNote: {
    ...fonts.caption,
    fontSize: 14,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  suggestionBox: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.sm,
  },
  suggestionText: {
    ...fonts.caption,
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  // Next Period Suggestions
  suggestionRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  suggestionNumber: {
    ...fonts.body,
    fontWeight: '600',
    color: colors.primary,
    width: 20,
  },
  suggestionBody: {
    ...fonts.body,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  // Regenerate
  regenerateButton: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 4,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  regenerateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  bottomSpacer: {
    height: 40,
  },
});
