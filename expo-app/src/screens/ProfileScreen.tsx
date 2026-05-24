import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, Switch,
} from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { userApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import {
  requestNotificationPermission,
  scheduleDailyReminder,
  cancelDailyReminder,
  getScheduledReminder,
} from '../utils/notifications';

// Preset reminder times (hours)
const HOUR_OPTIONS = [
  { label: '08:00', hour: 8, minute: 0 },
  { label: '09:00', hour: 9, minute: 0 },
  { label: '10:00', hour: 10, minute: 0 },
  { label: '18:00', hour: 18, minute: 0 },
  { label: '19:00', hour: 19, minute: 0 },
  { label: '20:00', hour: 20, minute: 0 },
  { label: '21:00', hour: 21, minute: 0 },
  { label: '22:00', hour: 22, minute: 0 },
  { label: '23:00', hour: 23, minute: 0 },
];

export default function ProfileScreen() {
  const { logout } = useAuth();
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('');
  const [focusAreas, setFocusAreas] = useState('');
  const [saving, setSaving] = useState(false);
  const [coachBackend, setCoachBackend] = useState<'deepseek' | 'openclaw'>('deepseek');
  const [openclawEndpoint, setOpenclawEndpoint] = useState('');
  const [openclawApiKey, setOpenclawApiKey] = useState('');
  // Reminder
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState<{ hour: number; minute: number } | null>(null);

  useEffect(() => {
    Promise.all([
      userApi.getProfile(),
      getScheduledReminder(),
    ]).then(([res, scheduled]) => {
      const user = res.data.data;
      setNickname(user.nickname || '');
      setRole(user.profile?.role || '');
      setFocusAreas(user.profile?.focusAreas?.join('、') || '');
      if (scheduled) {
        setReminderEnabled(true);
        setReminderTime(scheduled);
      } else {
        setReminderTime({ hour: 21, minute: 0 });
      }
    }).catch(console.error);
  }, []);

  const setReminder = useCallback(async (hour: number, minute: number) => {
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert('权限不足', '请在设置中允许通知');
      return;
    }
    const id = await scheduleDailyReminder(hour, minute);
    if (id) {
      setReminderTime({ hour, minute });
      setReminderEnabled(true);
      Alert.alert('已设置', `每日 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} 提醒你复盘`);
    } else {
      Alert.alert('设置失败', '请重试');
    }
  }, []);

  const disableReminder = useCallback(async () => {
    await cancelDailyReminder();
    setReminderEnabled(false);
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
        <Text style={styles.sectionTitle}>每日提醒</Text>
        <View style={styles.reminderToggle}>
          <Text style={styles.reminderLabel}>开启每日复盘提醒</Text>
          <Switch
            value={reminderEnabled}
            onValueChange={(v) => v ? setReminder(reminderTime?.hour || 21, reminderTime?.minute || 0) : disableReminder()}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={reminderEnabled ? colors.white : '#f4f3f4'}
          />
        </View>
        <View style={styles.timeRow}>
          {HOUR_OPTIONS.map(opt => {
            const selected = reminderTime?.hour === opt.hour && reminderTime?.minute === opt.minute;
            return (
              <TouchableOpacity
                key={opt.label}
                style={[styles.timeChip, selected && styles.timeChipActive]}
                onPress={() => setReminder(opt.hour, opt.minute)}
              >
                <Text style={[styles.timeChipText, selected && styles.timeChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

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
  // Reminder
  reminderToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  reminderLabel: { ...fonts.body },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  timeChipText: { ...fonts.caption, color: colors.text },
  timeChipTextActive: { color: colors.white },
  // Coach
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
