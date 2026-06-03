import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { colors, fonts, spacing, radius } from '../theme';
import { authApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function LoginScreen() {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (phone.length !== 11) {
      Alert.alert('请输入正确的手机号');
      return;
    }
    setLoading(true);
    try {
      await authApi.sendCode(phone);
      setCodeSent(true);
    } catch (e: any) {
      Alert.alert('发送失败', e.response?.data?.error || '请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('请输入 6 位验证码');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.verifyCode(phone, code);
      await login(res.data.data.token);
    } catch (e: any) {
      Alert.alert('验证失败', e.response?.data?.error || '请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <Text style={styles.title}>复盘神器</Text>
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
            style={[styles.button, styles.sendBtn]}
            onPress={handleSendCode}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {codeSent ? '重新发送' : '获取验证码'}
            </Text>
          </TouchableOpacity>
        </View>

        {codeSent && (
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="验证码"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
            />
            <TouchableOpacity
              style={[styles.button, styles.verifyBtn]}
              onPress={handleVerify}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? '...' : '登录'}</Text>
            </TouchableOpacity>
          </View>
        )}
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
  sendBtn: {
    backgroundColor: colors.primary,
  },
  verifyBtn: {
    backgroundColor: colors.success,
  },
  buttonText: {
    ...fonts.body,
    color: colors.white,
    fontWeight: '600',
  },
});
