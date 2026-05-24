import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { goalsApi } from '../api/client';
import client from '../api/client';
import type { GoalCategory, AnnualGoal } from '../../../shared/types';

const categories: { value: GoalCategory; label: string }[] = [
  { value: 'WORK', label: '工作' },
  { value: 'RELATIONSHIP', label: '人际' },
  { value: 'PERSONAL_STATE', label: '个人状态' },
  { value: 'PERSONAL_LIFE', label: '个人生活' },
];

export default function GoalEditScreen({ route, navigation }: any) {
  const { mode, goal } = route.params || {};
  const isEdit = mode === 'edit' && goal;

  const [title, setTitle] = useState(isEdit ? goal.title : '');
  const [description, setDescription] = useState(isEdit ? goal.description : '');
  const [category, setCategory] = useState<GoalCategory>(isEdit ? goal.category : 'WORK');
  const [saving, setSaving] = useState(false);

  // Natural language input state
  const [naturalInput, setNaturalInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);

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
      setCategory(data.category);
      setParsed(true);
    } catch (e: any) {
      Alert.alert('解析失败', e.response?.data?.error || '请稍后重试');
    } finally {
      setParsing(false);
    }
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
        keyResults: [],
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Natural language input section */}
      {!isEdit && (
        <View style={styles.aiSection}>
          <Text style={styles.aiTitle}>用一句话描述你的目标</Text>
          <Text style={styles.aiHint}>
            AI 会自动帮你分类并提取关键结果。例如："今年想提升管理能力，带出两个能独当一面的骨干"
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="用自然语言描述你的年度目标..."
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
              <Text style={styles.parsedBadgeText}>AI 已解析，可修改后保存</Text>
            </View>
          )}
        </View>
      )}

      {/* Form fields (populated by AI or manual) */}
      <Text style={styles.label}>类别</Text>
      <View style={styles.categoryRow}>
        {categories.map(c => (
          <TouchableOpacity
            key={c.value}
            style={[styles.categoryChip, category === c.value && styles.categoryActive]}
            onPress={() => setCategory(c.value)}
          >
            <Text style={[styles.categoryText, category === c.value && styles.categoryTextActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>目标标题</Text>
      <TextInput
        style={styles.input}
        placeholder="例：提升跨部门协作能力"
        placeholderTextColor={colors.textSecondary}
        value={title}
        onChangeText={setTitle}
        maxLength={100}
      />

      <Text style={styles.label}>描述（可选）</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="详细描述你的目标..."
        placeholderTextColor={colors.textSecondary}
        multiline
        textAlignVertical="top"
        value={description}
        onChangeText={setDescription}
        maxLength={500}
      />

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveText}>{saving ? '保存中...' : '保存'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  // AI section
  aiSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  aiTitle: { ...fonts.heading, marginBottom: spacing.xs },
  aiHint: { ...fonts.caption, fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 18 },
  parseBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  parseBtnDisabled: { opacity: 0.5 },
  parseBtnText: { ...fonts.body, color: colors.white, fontWeight: '600' },
  parsedBadge: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    alignItems: 'center',
  },
  parsedBadgeText: { ...fonts.caption, color: '#2E7D32', fontSize: 12 },
  // Existing
  label: { ...fonts.caption, fontWeight: '600', marginBottom: spacing.xs, marginTop: spacing.md },
  categoryRow: { flexDirection: 'row', gap: spacing.sm },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { ...fonts.caption, color: colors.text },
  categoryTextActive: { color: colors.white },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { ...fonts.heading, color: colors.white },
});
