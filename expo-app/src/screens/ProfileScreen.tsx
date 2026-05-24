import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert,
} from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { userApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function ProfileScreen() {
  const { logout } = useAuth();
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('');
  const [focusAreas, setFocusAreas] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    userApi.getProfile().then(res => {
      const user = res.data.data;
      setNickname(user.nickname || '');
      setRole(user.profile?.role || '');
      setFocusAreas(user.profile?.focusAreas?.join('、') || '');
    }).catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await userApi.updateProfile({
        nickname: nickname.trim(),
        profile: {
          role: role.trim(),
          focusAreas: focusAreas.split(/[、,，]/).map((s: string) => s.trim()).filter(Boolean),
        },
      });
      Alert.alert('已保存');
    } catch (e: any) {
      Alert.alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('确认退出', '', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>昵称</Text>
      <TextInput
        style={styles.input}
        placeholder="你的昵称"
        placeholderTextColor={colors.textSecondary}
        value={nickname}
        onChangeText={setNickname}
      />

      <Text style={styles.label}>职业/角色</Text>
      <TextInput
        style={styles.input}
        placeholder="例：产品经理"
        placeholderTextColor={colors.textSecondary}
        value={role}
        onChangeText={setRole}
      />

      <Text style={styles.label}>关注领域（用逗号分隔）</Text>
      <TextInput
        style={styles.input}
        placeholder="例：管理能力、技术成长、人际关系"
        placeholderTextColor={colors.textSecondary}
        value={focusAreas}
        onChangeText={setFocusAreas}
      />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveText}>{saving ? '保存中...' : '保存画像'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>退出登录</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  label: { ...fonts.caption, fontWeight: '600', marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveText: { ...fonts.heading, color: colors.white },
  logoutBtn: {
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  logoutText: { ...fonts.body, color: colors.textSecondary },
});
