import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { colors, fonts, spacing, shadows, radius } from '../theme';
import { coachApi, reviewsApi } from '../api/client';
import CoachBubble from '../components/CoachBubble';

interface Message {
  id: string;
  role: 'USER' | 'COACH';
  content: string;
}

export default function CoachChatScreen({ route }: any) {
  const { reviewId } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [gdrr, setGDRR] = useState<any>(null);
  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    Promise.all([
      coachApi.getMessages(reviewId),
      reviewsApi.get(reviewId),
    ]).then(([msgRes, revRes]) => {
      setMessages(msgRes.data.data || []);
      setGDRR(revRes.data.data?.gdrr);
    }).catch(console.error).finally(() => setLoading(false));
  }, [reviewId]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    try {
      const res = await coachApi.sendMessage(reviewId, text);
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'USER', content: text },
        { id: res.data.data.id, role: 'COACH', content: res.data.data.content },
      ]);
    } catch (e: any) {
      // Revert the user message on failure — remove last user msg
      setMessages(prev => prev.filter(m => m.role !== 'USER' || m.content !== text));
    } finally {
      setSending(false);
    }
  }, [input, sending, reviewId]);

  const renderItem = useCallback(({ item }: { item: Message }) => (
    <CoachBubble role={item.role} content={item.content} />
  ), []);

  const keyExtractor = useCallback((_: Message, index: number) => String(index), []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          gdrr ? (
            <View style={styles.contextCard}>
              <Text style={styles.contextLabel}>本次复盘</Text>
              <Text style={styles.contextText} numberOfLines={2}>
                {gdrr.goal?.slice(0, 80)}{gdrr.goal?.length > 80 ? '...' : ''}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>💬</Text>
            </View>
            <Text style={styles.emptyTitle}>开始教练对话</Text>
            <Text style={styles.emptyHint}>
              基于刚才的复盘，AI 教练会和你一起深入探索
            </Text>
          </View>
        }
        ListFooterComponent={
          sending ? (
            <View style={styles.typingRow}>
              <View style={[styles.avatar, { marginRight: spacing.sm }]}>
                <Text style={styles.avatarText}>AI</Text>
              </View>
              <View style={styles.typingBubble}>
                <View style={styles.typingDotRow}>
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                </View>
              </View>
            </View>
          ) : null
        }
      />

      <View style={styles.inputBar}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.chatInput}
            value={input}
            onChangeText={setInput}
            placeholder="输入你的想法..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendDisabled]}
            onPress={send}
            disabled={!input.trim() || sending}
            activeOpacity={0.7}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  // Context card (GDRR summary)
  contextCard: {
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  contextLabel: { ...fonts.small, fontWeight: '600', color: colors.primary, marginBottom: 2 },
  contextText: { ...fonts.small, color: colors.textSecondary, lineHeight: 18 },

  // Messages
  msgList: {
    padding: spacing.md,
    flexGrow: 1,
  },

  // Empty state
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyIconText: { fontSize: 28 },
  emptyTitle: { ...fonts.heading, marginBottom: spacing.xs },
  emptyHint: { ...fonts.caption, textAlign: 'center', color: colors.textSecondary, lineHeight: 20 },

  // Typing indicator
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { ...fonts.small, fontSize: 11, fontWeight: '700', color: colors.primary },
  typingBubble: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderTopLeftRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...shadows.sm,
  },
  typingDotRow: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.textSecondary,
    opacity: 0.4,
  },

  // Input bar
  inputBar: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...fonts.body,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  sendDisabled: { opacity: 0.3 },
  sendIcon: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
    marginTop: -1,
  },
});
