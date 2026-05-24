import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<string | null> {
  // Cancel any existing reminder
  await cancelDailyReminder();

  if (Platform.OS === 'ios') {
    // iOS requires separate permissions check
    const granted = await requestNotificationPermission();
    if (!granted) return null;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '复盘时间到了',
      body: '花 2 分钟，记录今天吧',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return id;
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledReminder(): Promise<{ hour: number; minute: number } | null> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  if (scheduled.length === 0) return null;

  const daily = scheduled[0].trigger as any;
  if (daily?.type === 'daily') {
    return { hour: daily.hour, minute: daily.minute };
  }
  return null;
}
