import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../theme';

export default function CoachBubble({ role, content }: { role: 'USER' | 'COACH'; content: string }) {
  const isCoach = role === 'COACH';
  return (
    <View style={[styles.row, isCoach ? styles.coachRow : styles.userRow]}>
      {isCoach && <Text style={styles.roleLabel}>教练</Text>}
      <View style={[styles.bubble, isCoach ? styles.coachBubble : styles.userBubble]}>
        <Text style={[styles.text, isCoach ? styles.coachText : styles.userText]}>
          {content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: spacing.sm },
  coachRow: { alignItems: 'flex-start' },
  userRow: { alignItems: 'flex-end' },
  roleLabel: { ...fonts.caption, fontSize: 11, color: colors.textSecondary, marginBottom: 2, marginLeft: 4 },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: spacing.md },
  coachBubble: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  userBubble: { backgroundColor: colors.primary },
  text: { ...fonts.body, fontSize: 14 },
  coachText: { color: colors.text },
  userText: { color: colors.white },
});
