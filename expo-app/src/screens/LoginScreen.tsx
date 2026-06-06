import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { colors, fonts, spacing, radius } from '../theme';
import { authApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function LoginScreen() {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (phone.length !== 11) {
      Alert.alert('请输入正确的手机号');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.directLogin(phone);
      await login(res.data.data.token);
    } catch (e: any) {
      Alert.alert('登录失败', e.response?.data?.error || '请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <Text style={styles.title}>吾日三省吾身</Text>
        <Text style={styles.subtitle}>设定目标，每天说几句{"\n"}AI 帮你结构化反思</Text>

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="手机号"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
            maxLength={11}
            value={phone}
            onChangeText={setPhone}
          />
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, (loading || phone.length !== 11) ? { opacity: 0.5 } : {}]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>登录</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...fonts.title,
    fontSize: 32,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...fonts.caption,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  inputGroup: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    ...fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    height: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    ...fonts.body,
    color: colors.white,
    fontWeight: '600',
  },
});
