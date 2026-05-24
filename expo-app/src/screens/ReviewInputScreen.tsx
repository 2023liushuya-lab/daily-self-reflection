import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { reviewsApi } from '../api/client';
import ScopeSelector from '../components/ScopeSelector';
import VoiceRecorder from '../components/VoiceRecorder';
import type { ScopeArea } from '../../../shared/types';

export default function ReviewInputScreen({ navigation }: any) {
  const [text, setText] = useState('');
  const [scope, setScope] = useState<ScopeArea>('WORK');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert('请输入或录入复盘内容');
      return;
    }
    setSubmitting(true);
    try {
      const res = await reviewsApi.create({ rawText: trimmed, scopeArea: scope });
      const review = res.data.data;
      navigation.replace('ReviewDetail', { id: review.id });
    } catch (e: any) {
      Alert.alert('提交失败', e.response?.data?.error || '请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoiceResult = (recognizedText: string) => {
    setText(prev => prev ? `${prev}\n${recognizedText}` : recognizedText);
  };

  if (submitting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>AI 正在分析你的复盘...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScopeSelector value={scope} onChange={setScope} />

      <VoiceRecorder onResult={handleVoiceResult} />

      <TextInput
        style={styles.textInput}
        placeholder="说说今天发生了什么..."
        placeholderTextColor={colors.textSecondary}
        multiline
        textAlignVertical="top"
        value={text}
        onChangeText={setText}
      />

      <TouchableOpacity
        style={[styles.submitBtn, !text.trim() && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={!text.trim()}
      >
        <Text style={styles.submitText}>提交分析</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  textInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 200,
    ...fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { ...fonts.heading, color: colors.white },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { ...fonts.body, color: colors.textSecondary, marginTop: spacing.md },
});
