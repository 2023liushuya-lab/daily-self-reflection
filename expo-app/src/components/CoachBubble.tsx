import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing, shadows, radius } from '../theme';

export default function CoachBubble({ role, content }: { role: 'USER' | 'COACH'; content: string }) {
  const isCoach = role === 'COACH';

  return (
    <View style={[styles.row, isCoach ? styles.coachRow : styles.userRow]}>
      {isCoach && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AI</Text>
        </View>
      )}
      <View style={[styles.bubble, isCoach ? styles.coachBubble : styles.userBubble]}>
        <Text style={[isCoach ? styles.coachText : styles.userText]}>
          {content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  coachRow: { justifyContent: 'flex-start' },
  userRow: { justifyContent: 'flex-end' },

  // Avatar
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  avatarText: {
    ...fonts.small,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },

  // Bubbles
  bubble: {
    maxWidth: '75%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  coachBubble: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.sm,
    ...shadows.sm,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderTopRightRadius: radius.sm,
  },

  // Text
  coachText: {
    ...fonts.body,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  userText: {
    ...fonts.body,
    fontSize: 15,
    color: colors.white,
    lineHeight: 22,
  },
});
