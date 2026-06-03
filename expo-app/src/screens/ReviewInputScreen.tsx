import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, fonts, spacing, shadows, radius } from '../theme';
import { reviewsApi } from '../api/client';
import VoiceRecorder from '../components/VoiceRecorder';

export default function ReviewInputScreen({ navigation }: any) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert('请输入或录入复盘内容');
      return;
    }
    setSubmitting(true);
    try {
      const res = await reviewsApi.create({ rawText: trimmed });
      const review = res.data.data;
      navigation.replace('ReviewDetail', { id: review.id });
    } catch (e: any) {
      Alert.alert('提交失败', e.response?.data?.error || '请稍后重试');
      setSubmitting(false);
    }
  }, [text, navigation]);

  const handleVoiceResult = useCallback((recognizedText: string) => {
    setText(prev => prev ? `${prev}\n${recognizedText}` : recognizedText);
  }, []);

  if (submitting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>AI 正在分析你的复盘...</Text>
      </View>
    );
  }

  const canSubmit = text.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={true}
      >
        <TextInput
          style={styles.textInput}
          placeholder="写点什么，或点击下方麦克风开始说话..."
          placeholderTextColor={colors.textSecondary}
          multiline
          textAlignVertical="top"
          value={text}
          onChangeText={setText}
        />
      </ScrollView>

      <View style={styles.footer}>
        <VoiceRecorder onResult={handleVoiceResult} />

        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <Text style={styles.submitText}>提交分析</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, flexGrow: 1 },
  textInput: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 200,
    ...fonts.body,
    ...shadows.sm,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    ...shadows.md,
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
