import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { colors, fonts, spacing, shadows, radius } from '../theme';
import { goalsApi } from '../api/client';
import client from '../api/client';
import { calcKRProgress } from '../utils/progress';

const categoryOptions = [
  '工作事业', '学习成长', '健康身体', '财务理财',
  '人际关系', '家庭生活', '兴趣爱好', '个人成长',
];

interface KR {
  id: string;
  description: string;
  current: number;
  target: number;
  unit: string;
}

export default function GoalEditScreen({ route, navigation }: any) {
  const { mode, goal } = route.params || {};
  const isEdit = mode === 'edit' && goal;

  const [title, setTitle] = useState(isEdit ? goal.title : '');
  const [description, setDescription] = useState(isEdit ? goal.description : '');
  const [category, setCategory] = useState(isEdit ? (goal.category || '个人成长') : '个人成长');
  const [keyResults, setKeyResults] = useState<KR[]>(
    isEdit && goal.keyResults ? goal.keyResults : []
  );
  const [qualitativeMilestones, setQualitativeMilestones] = useState<string[]>(
    isEdit && goal.qualitativeMilestones ? goal.qualitativeMilestones : []
  );
  const [saving, setSaving] = useState(false);

  // Natural language input state
  const [naturalInput, setNaturalInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [isMultiGoal, setIsMultiGoal] = useState(false);

  const handleParse = async () => {
    const trimmed = naturalInput.trim();
    if (!trimmed) {
      Alert.alert('请输入目标描述');
      return;
    }
    setParsing(true);
    try {
      const res = await client.post('/goals/parse', { text: trimmed });
      const data = res.data.data;
      setTitle(data.title);
      setDescription(data.description);
      setCategory(data.category || '个人成长');
      setKeyResults(data.keyResults || []);
      setQualitativeMilestones(data.qualitativeMilestones || []);
      setIsMultiGoal(data.isMultiGoal || false);
      setParsed(true);
    } catch (e: any) {
      Alert.alert('解析失败', e.response?.data?.error || '请稍后重试');
    } finally {
      setParsing(false);
    }
  };

  const updateKR = (index: number, field: keyof KR, value: string | number) => {
    setKeyResults(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addKR = () => {
    setKeyResults(prev => [
      ...prev,
      { id: `kr-${Date.now()}`, description: '', current: 0, target: 100, unit: '%' },
    ]);
  };

  const removeKR = (index: number) => {
    setKeyResults(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('请输入目标标题');
      return;
    }
    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        description: description.trim(),
        category,
        keyResults: keyResults.map(kr => ({
          id: kr.id,
          description: kr.description,
          current: kr.current,
          target: kr.target,
          unit: kr.unit,
        })),
        qualitativeMilestones,
      };
      if (isEdit) {
        await goalsApi.update(goal.id, data);
      } else {
        await goalsApi.create(data);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('保存失败', e.response?.data?.error || '请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" removeClippedSubviews={true}>
      {/* Natural language input section */}
      {!isEdit && (
        <View style={styles.aiSection}>
          <Text style={styles.aiTitle}>描述你的目标</Text>
          <Text style={styles.aiHint}>
            随便说，想到哪说到哪。AI 会自动识别主题、提取量化指标。{'\n'}
            例："今年想提升管理能力，带出两个能独当一面的骨干，顺便减个15斤，每周跑三次"
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="用自然语言描述你想达成的目标..."
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlignVertical="top"
            value={naturalInput}
            onChangeText={setNaturalInput}
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.parseBtn, parsing && styles.parseBtnDisabled]}
            onPress={handleParse}
            disabled={parsing}
          >
            {parsing ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.parseBtnText}>智能解析</Text>
            )}
          </TouchableOpacity>
          {parsed && (
            <View style={styles.parsedBadge}>
              <Text style={styles.parsedBadgeText}>
                ✓ 已识别主题「{category}」
                {keyResults.length > 0 ? `，提取 ${keyResults.length} 个量化指标` : ''}
                {qualitativeMilestones.length > 0 ? `，${qualitativeMilestones.length} 个质性里程碑` : ''}
                {isMultiGoal ? '\n⚠️ 检测到多个目标，建议拆分保存' : ''}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ---- Structured Form ---- */}

      {/* 1. 类别 */}
      <Text style={styles.sectionLabel}>📂 类别</Text>
      <View style={styles.categoryRow}>
        {categoryOptions.map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.categoryChip, category === c && styles.categoryActive]}
            onPress={() => setCategory(c)}
          >
            <Text style={[styles.categoryText, category === c && styles.categoryTextActive]}>
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 2. 目标 */}
      <Text style={styles.sectionLabel}>🎯 目标</Text>
      <TextInput
        style={styles.input}
        placeholder="清晰的目标陈述"
        placeholderTextColor={colors.textSecondary}
        value={title}
        onChangeText={setTitle}
        maxLength={500}
      />
      <TextInput
        style={[styles.input, styles.descInput]}
        placeholder="补充描述（可选）"
        placeholderTextColor={colors.textSecondary}
        multiline
        textAlignVertical="top"
        value={description}
        onChangeText={setDescription}
        maxLength={500}
      />

      {/* 3. 关键结果 & 目标值 */}
      <View style={styles.krSectionHeader}>
        <Text style={styles.sectionLabel}>📊 关键结果</Text>
        <TouchableOpacity onPress={addKR} style={styles.addKrBtn}>
          <Text style={styles.addKrBtnText}>+ 添加</Text>
        </TouchableOpacity>
      </View>

      {keyResults.length === 0 ? (
        <View style={styles.emptyKR}>
          <Text style={styles.emptyKRText}>暂无量化指标。用 AI 解析自动提取，或手动添加</Text>
        </View>
      ) : (
        keyResults.map((kr, i) => (
          <View key={kr.id} style={styles.krCard}>
            <View style={styles.krHeader}>
              <Text style={styles.krIndex}>指标 {i + 1}</Text>
              <TouchableOpacity onPress={() => removeKR(i)}>
                <Text style={styles.krRemove}>删除</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.krDescInput}
              placeholder="描述这个指标，如「完成项目数量」"
              placeholderTextColor={colors.textSecondary}
              value={kr.description}
              onChangeText={v => updateKR(i, 'description', v)}
            />
            <View style={styles.krRow}>
              <View style={styles.krField}>
                <Text style={styles.krLabel}>当前</Text>
                <TextInput
                  style={styles.krNumInput}
                  keyboardType="numeric"
                  value={String(kr.current)}
                  onChangeText={v => updateKR(i, 'current', parseInt(v) || 0)}
                />
              </View>
              <View style={styles.krField}>
                <Text style={styles.krLabel}>目标</Text>
                <TextInput
                  style={styles.krNumInput}
                  keyboardType="numeric"
                  value={String(kr.target)}
                  onChangeText={v => updateKR(i, 'target', parseInt(v) || 100)}
                />
              </View>
              <View style={styles.krField}>
                <Text style={styles.krLabel}>单位</Text>
                <TextInput
                  style={styles.krUnitInput}
                  value={kr.unit}
                  onChangeText={v => updateKR(i, 'unit', v)}
                  placeholder="%"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>
            {/* Mini progress bar */}
            <View style={styles.krProgressBar}>
              <View
                style={[
                  styles.krProgressFill,
                  { width: `${calcKRProgress(kr)}%` },
                ]}
              />
            </View>
            <Text style={styles.krProgressText}>
              {kr.current}/{kr.target}{kr.unit} ({calcKRProgress(kr)}%)
            </Text>
          </View>
        ))
      )}

      {/* 4. 质性里程碑 */}
      <View style={styles.krSectionHeader}>
        <Text style={styles.sectionLabel}>🏷️ 质性里程碑</Text>
        <TouchableOpacity
          onPress={() => setQualitativeMilestones(prev => [...prev, ''])}
          style={styles.addKrBtn}
        >
          <Text style={styles.addKrBtnText}>+ 添加</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.qualitativeHint}>
        没有数字的目标也需要衡量。描述「做到什么」才算达成。
      </Text>

      {qualitativeMilestones.length === 0 ? (
        <View style={styles.emptyKR}>
          <Text style={styles.emptyKRText}>无。如果你的目标无法量化，可以在这里添加可观察的里程碑</Text>
        </View>
      ) : (
        qualitativeMilestones.map((milestone, i) => (
          <View key={i} style={styles.milestoneRow}>
            <View style={styles.milestoneDot} />
            <TextInput
              style={styles.milestoneInput}
              placeholder="例：下属汇报时先听完再给反馈，不打断"
              placeholderTextColor={colors.textSecondary}
              value={milestone}
              onChangeText={v => {
                setQualitativeMilestones(prev => {
                  const next = [...prev];
                  next[i] = v;
                  return next;
                });
              }}
            />
            <TouchableOpacity
              onPress={() =>
                setQualitativeMilestones(prev => prev.filter((_, idx) => idx !== i))
              }
            >
              <Text style={styles.krRemove}>删除</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveText}>{saving ? '保存中...' : '保存目标'}</Text>
      </TouchableOpacity>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },

  // AI section
  aiSection: {
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  aiTitle: { ...fonts.heading, marginBottom: spacing.xs },
  aiHint: { ...fonts.small, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 18 },
  parseBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  parseBtnDisabled: { opacity: 0.5 },
  parseBtnText: { ...fonts.body, color: colors.white, fontWeight: '600' },
  parsedBadge: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.successBg,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  parsedBadgeText: { ...fonts.small, color: colors.success, lineHeight: 18 },

  // Section labels
  sectionLabel: {
    ...fonts.heading,
    fontSize: 15,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },

  // Category
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  categoryChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { ...fonts.caption, color: colors.text, fontSize: 13 },
  categoryTextActive: { color: colors.white },

  // Form
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  descInput: { minHeight: 60, textAlignVertical: 'top' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },

  // Key Results
  krSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addKrBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryBg,
  },
  addKrBtnText: { ...fonts.small, color: colors.primary, fontWeight: '600' },
  emptyKR: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    borderStyle: 'dashed',
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyKRText: { ...fonts.caption, color: colors.textSecondary },
  krCard: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    padding: spacing.sm + 4,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  krHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  krIndex: { ...fonts.small, fontWeight: '600', color: colors.primary },
  krRemove: { ...fonts.small, color: '#E53935' },
  krDescInput: {
    ...fonts.caption,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  krRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  krField: { flex: 1 },
  krLabel: { ...fonts.small, fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  krNumInput: {
    ...fonts.caption,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.divider,
    textAlign: 'center',
  },
  krUnitInput: {
    ...fonts.caption,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.divider,
    textAlign: 'center',
  },
  krProgressBar: {
    height: 3,
    backgroundColor: colors.divider,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  krProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 1.5,
  },
  krProgressText: {
    ...fonts.small,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },

  // Qualitative milestones
  qualitativeHint: {
    ...fonts.small,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: -spacing.xs,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  milestoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  milestoneInput: {
    flex: 1,
    ...fonts.caption,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Save
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.xl,
    ...shadows.md,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { ...fonts.heading, color: colors.white },
});
