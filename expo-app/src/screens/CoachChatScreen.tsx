import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { colors, fonts, spacing } from '../theme';
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
      Alert.alert('发送失败', '请稍后重试');
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
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {gdrr && (
        <View style={styles.gdrrBar}>
          <Text style={styles.gdrrSummary} numberOfLines={1}>
            目标: {gdrr.goal?.slice(0, 50)}{gdrr.goal?.length > 50 ? '...' : ''}
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>开始教练对话，深入反思今天的复盘</Text>
          </View>
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.chatInput}
          value={input}
          onChangeText={setInput}
          placeholder="输入你的想法..."
          placeholderTextColor={colors.textSecondary}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendDisabled]}
          onPress={send}
          disabled={!input.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.sendText}>发送</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  gdrrBar: {
    backgroundColor: colors.card,
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gdrrSummary: { ...fonts.caption, fontSize: 12, color: colors.textSecondary },
  msgList: { padding: spacing.md, flexGrow: 1 },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyChatText: { ...fonts.caption, color: colors.textSecondary },
  inputRow: {
    flexDirection: 'row',
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.sm,
    alignItems: 'flex-end',
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...fonts.body,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: colors.white, fontWeight: '600' },
});
