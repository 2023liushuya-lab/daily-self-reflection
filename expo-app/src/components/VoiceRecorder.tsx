import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { colors, fonts, spacing } from '../theme';
import { reviewsApi } from '../api/client';

type RecorderState = 'idle' | 'recording' | 'transcribing';

export default function VoiceRecorder({ onResult }: { onResult: (text: string) => void }) {
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // Breathing animation
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'recording') {
      const breathing = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.12, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1.0, duration: 700, useNativeDriver: true }),
        ]),
      );
      breathing.start();
      return () => breathing.stop();
    } else {
      pulse.setValue(1);
    }
  }, [state, pulse]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('权限不足', '请在设置中允许访问麦克风');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setElapsed(0);
      setState('recording');

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setElapsed(d => d + 1);
      }, 1000);
    } catch (e) {
      console.error('[VoiceRecorder] startRecording failed:', e);
      Alert.alert('启动失败', '录音无法启动，请重试');
    }
  }, []);

  const stopAndTranscribe = useCallback(async () => {
    const rec = recordingRef.current;
    if (!rec) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setState('transcribing');

    try {
      await rec.stopAndUnloadAsync();
    } catch (e) {
      console.error('[VoiceRecorder] stopAndUnloadAsync failed:', e);
    }

    const uri = rec.getURI();
    recordingRef.current = null;

    if (!uri) {
      setState('idle');
      setElapsed(0);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);

      const res = await reviewsApi.uploadAudio(formData);
      const recognizedText = res.data?.data?.text;
      if (recognizedText && isMountedRef.current) {
        onResultRef.current(recognizedText);
      } else if (!recognizedText) {
        Alert.alert('识别结果为空', '请重试或使用文字输入');
      }
    } catch (e: any) {
      console.error('[VoiceRecorder] uploadAudio failed:', e);
      const msg = e.response?.data?.error || e.message || '无法连接语音识别服务';
      Alert.alert('识别失败', msg);
    } finally {
      if (isMountedRef.current) {
        setState('idle');
        setElapsed(0);
      }
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
    }
  }, []);

  const handlePress = useCallback(() => {
    if (state === 'idle') {
      startRecording();
    } else if (state === 'recording') {
      stopAndTranscribe();
    }
    // transcribing state: do nothing
  }, [state, startRecording, stopAndTranscribe]);

  const formatTime = (s: number): string => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // — Transcribing —
  if (state === 'transcribing') {
    return (
      <View style={styles.container}>
        <View style={styles.idleCircle}>
          <Text style={styles.transcribingIcon}>⏳</Text>
        </View>
        <Text style={styles.label}>正在识别语音...</Text>
      </View>
    );
  }

  // — Recording —
  if (state === 'recording') {
    return (
      <Pressable onPress={handlePress} style={styles.container}>
        <Animated.View style={[styles.recordCircle, { transform: [{ scale: pulse }] }]}>
          <View style={styles.recordInner} />
        </Animated.View>
        <Text style={styles.timer}>{formatTime(elapsed)}</Text>
        <Text style={styles.label}>点击结束录音</Text>
      </Pressable>
    );
  }

  // — Idle —
  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <View style={styles.idleCircle}>
        <Text style={styles.micIcon}>🎤</Text>
      </View>
      <Text style={styles.label}>点击开始说话</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },

  // Idle
  idleCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  micIcon: { fontSize: 32 },
  transcribingIcon: { fontSize: 28 },

  // Recording
  recordCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordInner: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#FF4444',
  },
  timer: {
    ...fonts.title,
    color: colors.primary,
    marginTop: spacing.sm,
    fontVariant: ['tabular-nums'],
  },

  // Shared
  label: {
    ...fonts.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
