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
  const hasWarned60s = useRef(false);

  // Breathing animation for recording state
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'recording') {
      const breathing = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1.0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      breathing.start();
      return () => breathing.stop();
    } else {
      pulse.setValue(1);
    }
  }, [state, pulse]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
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
      hasWarned60s.current = false;
      setState('recording');

      timerRef.current = setInterval(() => {
        setElapsed((d) => {
          const next = d + 1;
          if (next >= 60 && !hasWarned60s.current) {
            hasWarned60s.current = true;
            // Use setTimeout to avoid setState-in-render race
            setTimeout(() => {
              Alert.alert('录音时长提示', '已超过60秒，建议分段录音以便更好地识别');
            }, 0);
          }
          return next;
        });
      }, 1000);
    } catch {
      Alert.alert('启动失败', '录音无法启动，请重试');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const rec = recordingRef.current;
    if (!rec) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setState('transcribing');

    try {
      await rec.stopAndUnloadAsync();
    } catch {
      // Recording already stopped or invalid
    }

    const uri = rec.getURI();
    recordingRef.current = null;

    if (!uri) {
      setState('idle');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/wav',
        name: 'recording.wav',
      } as any);

      const res = await reviewsApi.uploadAudio(formData);
      const recognizedText = res.data?.data?.text;
      if (recognizedText) {
        onResult(recognizedText);
      } else {
        Alert.alert('识别失败', '语音识别未返回结果，请重试');
      }
    } catch {
      Alert.alert('识别失败', '无法连接到语音识别服务');
    } finally {
      setState('idle');
      setElapsed(0);
    }
  }, [onResult]);

  const handlePressIn = useCallback(() => {
    if (state === 'idle') {
      startRecording();
    }
  }, [state, startRecording]);

  const handlePressOut = useCallback(() => {
    if (state === 'recording') {
      stopRecording();
    }
  }, [state, stopRecording]);

  const formatTime = (s: number): string => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // — Transcribing state —
  if (state === 'transcribing') {
    return (
      <View style={styles.container}>
        <View style={styles.transcribingCard}>
          <Text style={styles.transcribingText}>正在识别语音...</Text>
          <View style={styles.loadingDots}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
        </View>
      </View>
    );
  }

  // — Recording state —
  if (state === 'recording') {
    return (
      <Pressable
        onPressOut={handlePressOut}
        style={styles.container}
      >
        <Animated.View
          style={[
            styles.recordingCircle,
            { transform: [{ scale: pulse }] },
          ]}
        >
          <View style={styles.recordingInner} />
        </Animated.View>

        <Text style={styles.timer}>{formatTime(elapsed)}</Text>

        <Text style={styles.hint}>松开结束录音</Text>
      </Pressable>
    );
  }

  // — Idle state —
  return (
    <Pressable
      onPressIn={handlePressIn}
      style={styles.container}
    >
      <View style={styles.idleCircle}>
        <Text style={styles.idleIcon}>🎤</Text>
      </View>
      <Text style={styles.idleLabel}>按住说话</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },

  // Idle
  idleCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  idleIcon: {
    fontSize: 36,
  },
  idleLabel: {
    ...fonts.body,
    color: colors.textSecondary,
  },

  // Recording
  recordingCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  recordingInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF4444',
  },
  timer: {
    ...fonts.title,
    color: colors.primary,
    marginBottom: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    ...fonts.caption,
    color: colors.textSecondary,
  },

  // Transcribing
  transcribingCard: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  transcribingText: {
    ...fonts.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryLight,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1.0,
  },
});
