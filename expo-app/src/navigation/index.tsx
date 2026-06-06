import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ReviewInputScreen from '../screens/ReviewInputScreen';
import ReviewDetailScreen from '../screens/ReviewDetailScreen';
import GoalsScreen from '../screens/GoalsScreen';
import GoalEditScreen from '../screens/GoalEditScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ReportsScreen from '../screens/ReportsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import CoachChatScreen from '../screens/CoachChatScreen';

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const { token, isLoading } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  // Handle notification tap — navigate to ReviewInput
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const screen = response.notification.request.content.data?.screen;
      if (screen === 'ReviewInput' && navigationRef.current) {
        navigationRef.current.navigate('ReviewInput');
      }
    });

    // Also handle the case where the app was opened from a notification (cold start)
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        const screen = response.notification.request.content.data?.screen;
        if (screen === 'ReviewInput') {
          // Wait for navigation to be ready
          setTimeout(() => {
            navigationRef.current?.navigate('ReviewInput');
          }, 500);
        }
      }
    });

    return () => subscription.remove();
  }, []);

  if (isLoading) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!token ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: '吾日三省吾身' }} />
            <Stack.Screen name="ReviewInput" component={ReviewInputScreen} options={{ title: '今日复盘' }} />
            <Stack.Screen name="ReviewDetail" component={ReviewDetailScreen} options={{ title: '复盘详情' }} />
            <Stack.Screen name="Goals" component={GoalsScreen} options={{ title: '年度目标' }} />
            <Stack.Screen name="GoalEdit" component={GoalEditScreen} options={{ title: '编辑目标' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: '个人设置' }} />
            <Stack.Screen name="History" component={HistoryScreen} options={{ title: '历史复盘' }} />
            <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: '报告' }} />
            <Stack.Screen name="CoachChat" component={CoachChatScreen} options={{ title: '教练对话' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
