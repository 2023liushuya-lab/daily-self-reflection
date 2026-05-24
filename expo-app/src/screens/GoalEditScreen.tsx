import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert,
} from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { goalsApi } from '../api/client';
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
