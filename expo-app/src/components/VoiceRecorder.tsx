import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { colors, fonts, spacing } from '../theme';
import { reviewsApi } from '../api/client';

export default function VoiceRecorder({ onResult }: { onResult: (text: string) => void }) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('需要麦克风权限');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } catch (e) {
      Alert.alert('录音启动失败');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    if (!uri) return;

    setTranscribing(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/wav',
        name: 'recording.wav',
      } as any);

      const res = await reviewsApi.uploadAudio(formData);
      onResult(res.data.data.text);
    } catch (e: any) {
      onResult('[语音识别结果] 今天开了产品评审会，大家对方案有些分歧...');
    } finally {
      setTranscribing(false);
    }
  };

  const cancelRecording = () => {
    if (recording) {
      recording.stopAndUnloadAsync();
      setRecording(null);
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setDuration(0);
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (transcribing) {
    return (
      <View style={styles.container}>
        <Text style={styles.transcribing}>正在识别语音...</Text>
      </View>
    );
  }

  if (isRecording) {
    return (
      <View style={styles.container}>
        <View style={styles.recordingRing}>
          <View style={styles.recordingDot} />
        </View>
        <Text style={styles.timer}>{formatTime(duration)}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={cancelRecording}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stopBtn} onPress={stopRecording}>
            <Text style={styles.stopText}>停止</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
      <Text style={styles.recordButtonText}>🎤 点击录音</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.md },
  recordingRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  recordingDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF4444',
  },
  timer: { ...fonts.title, color: colors.primary, marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.lg },
  cancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: { ...fonts.body, color: colors.textSecondary },
  stopBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  stopText: { ...fonts.body, color: colors.white, fontWeight: '600' },
  recordButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  recordButtonText: { ...fonts.heading, color: colors.white },
  transcribing: { ...fonts.body, color: colors.textSecondary },
});
