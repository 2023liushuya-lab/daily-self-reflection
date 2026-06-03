import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { colors, fonts, spacing, shadows, radius } from '../theme';
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

  // Breathing animation (smoother)
  const pulse = useRef(new Animated.Value(1)).current;
  const ringPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'recording') {
      const breathing = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.08,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1.0,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      const ringBreathing = Animated.loop(
        Animated.sequence([
          Animated.timing(ringPulse, {
            toValue: 1.03,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(ringPulse, {
            toValue: 1.0,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      breathing.start();
      ringBreathing.start();
      return () => {
        breathing.stop();
        ringBreathing.stop();
      };
    } else {
      pulse.setValue(1);
      ringPulse.setValue(1);
    }
  }, [state, pulse, ringPulse]);

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
        <View style={styles.aiCircle}>
          <View style={styles.waveformRow}>
            <View style={[styles.waveBar, { height: 12 }]} />
            <View style={[styles.waveBar, { height: 20 }]} />
            <View style={[styles.waveBar, { height: 8 }]} />
            <View style={[styles.waveBar, { height: 18 }]} />
            <View style={[styles.waveBar, { height: 14 }]} />
          </View>
        </View>
        <Text style={styles.stateLabel}>AI 正在识别...</Text>
        <Text style={styles.stateHint}>语音转文字 + 智能纠错</Text>
      </View>
    );
  }

  // — Recording —
  if (state === 'recording') {
    return (
      <Pressable onPress={handlePress} style={styles.container}>
        <Animated.View style={[styles.recordingRing, { transform: [{ scale: ringPulse }] }]}>
          <Animated.View style={[styles.recordCircle, { transform: [{ scale: pulse }] }]}>
            <View style={styles.stopIcon} />
          </Animated.View>
        </Animated.View>
        <Text style={styles.timer}>{formatTime(elapsed)}</Text>
        <Text style={styles.stateLabel}>轻触结束</Text>
      </Pressable>
    );
  }

  // — Idle —
  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <View style={styles.micRing}>
        <View style={styles.micCircle}>
          {/* Mic body */}
          <View style={styles.micBody}>
            <View style={styles.micBodyTop} />
          </View>
          {/* Mic stand */}
          <View style={styles.micStand} />
          {/* Mic base */}
          <View style={styles.micBase} />
        </View>
      </View>
      <Text style={styles.stateLabel}>轻触说话</Text>
      <Text style={styles.stateHint}>AI 语音转文字 · 自动整理</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },

  // --- Idle: Mic icon ---
  micRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(177, 116, 75, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  micCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  micBody: {
    width: 16,
    height: 20,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: colors.white,
    backgroundColor: 'transparent',
    marginBottom: 2,
  },
  micBodyTop: {
    position: 'absolute',
    top: -1,
    left: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  micStand: {
    width: 2.5,
    height: 8,
    backgroundColor: colors.white,
    borderRadius: 1,
  },
  micBase: {
    width: 12,
    height: 2.5,
    backgroundColor: colors.white,
    borderRadius: 1,
    marginTop: -1,
  },

  // --- Recording ---
  recordingRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: 'rgba(177, 116, 75, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  recordCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIcon: {
    width: 18,
    height: 18,
    borderRadius: 3,
    backgroundColor: '#E53935',
  },
  timer: {
    fontSize: 28,
    fontWeight: '300',
    color: colors.primary,
    marginTop: spacing.sm,
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },

  // --- Transcribing ---
  aiCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(177, 116, 75, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  waveformRow: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'flex-end',
    height: 30,
  },
  waveBar: {
    width: 3,
    backgroundColor: colors.primary,
    borderRadius: 1.5,
    opacity: 0.6,
  },

  // --- Shared labels ---
  stateLabel: {
    ...fonts.body,
    fontWeight: '500',
    color: colors.text,
    fontSize: 15,
  },
  stateHint: {
    ...fonts.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
