import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, spacing, shadows, radius } from '../theme';

export default function CoachQuestions({
  questions,
  onQuestionPress,
  onChatPress,
}: {
  questions: string[];
  onQuestionPress: (q: string) => void;
  onChatPress: () => void;
}) {
  if (!questions || questions.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>教练想问你</Text>
      {questions.map((q, i) => (
        <TouchableOpacity key={i} style={styles.questionCard} onPress={() => onQuestionPress(q)}>
          <Text style={styles.questionText}>{q}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.chatButton} onPress={onChatPress}>
        <Text style={styles.chatButtonText}>深入聊聊</Text>
      </TouchableOpacity>
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
  title: { ...fonts.heading, fontSize: 16, marginBottom: spacing.sm },
  questionCard: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  questionText: { ...fonts.body, fontSize: 14, lineHeight: 20 },
  chatButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  chatButtonText: { ...fonts.body, color: colors.white, fontWeight: '600' },
});
