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
  const [coachBackend, setCoachBackend] = useState<'deepseek' | 'openclaw'>('deepseek');
  const [openclawEndpoint, setOpenclawEndpoint] = useState('');
  const [openclawApiKey, setOpenclawApiKey] = useState('');

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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>教练后端</Text>

        <TouchableOpacity
          style={[styles.coachOption, coachBackend === 'deepseek' && styles.coachActive]}
          onPress={() => setCoachBackend('deepseek')}
        >
          <View style={styles.coachOptionContent}>
            <Text style={styles.coachOptionTitle}>内置教练 (DeepSeek)</Text>
            <Text style={styles.coachOptionDesc}>使用 DeepSeek API，开箱即用</Text>
          </View>
          {coachBackend === 'deepseek' && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.coachOption, coachBackend === 'openclaw' && styles.coachActive]}
          onPress={() => setCoachBackend('openclaw')}
        >
          <View style={styles.coachOptionContent}>
            <Text style={styles.coachOptionTitle}>OpenClaw 私人教练</Text>
            <Text style={styles.coachOptionDesc}>连接本地 OpenClaw 实例，更丰富的上下文</Text>
          </View>
          {coachBackend === 'openclaw' && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        {coachBackend === 'openclaw' && (
          <View style={styles.openclawConfig}>
            <TextInput
              style={styles.input}
              placeholder="OpenClaw 端点 (http://localhost:8787)"
              placeholderTextColor={colors.textSecondary}
              value={openclawEndpoint}
              onChangeText={setOpenclawEndpoint}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="API Key"
              placeholderTextColor={colors.textSecondary}
              value={openclawApiKey}
              onChangeText={setOpenclawApiKey}
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.testBtn}
              onPress={async () => {
                if (!openclawEndpoint.trim()) {
                  Alert.alert('请先输入 OpenClaw 端点');
                  return;
                }
                try {
                  const res = await fetch(`${openclawEndpoint.trim()}/ping`, { method: 'GET' });
                  if (res.ok) {
                    Alert.alert('连接成功');
                  } else {
                    Alert.alert('连接失败', `HTTP ${res.status}`);
                  }
                } catch (e: any) {
                  Alert.alert('连接失败', e.message || '无法访问该端点');
                }
              }}
            >
              <Text style={styles.testBtnText}>测试连接</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

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
  section: { marginTop: spacing.xl },
  sectionTitle: { ...fonts.heading, marginBottom: spacing.sm },
  coachOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coachActive: { borderColor: colors.primary, borderWidth: 2 },
  coachOptionContent: { flex: 1 },
  coachOptionTitle: { ...fonts.body, fontWeight: '600' },
  coachOptionDesc: { ...fonts.caption, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  checkmark: { fontSize: 18, color: colors.primary, fontWeight: '700', marginLeft: spacing.sm },
  openclawConfig: { marginTop: spacing.sm, gap: spacing.sm },
  testBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  testBtnText: { ...fonts.body, color: colors.white },
});
