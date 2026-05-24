import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ReviewInputScreen from '../screens/ReviewInputScreen';
import ReviewDetailScreen from '../screens/ReviewDetailScreen';
import GoalsScreen from '../screens/GoalsScreen';
import GoalEditScreen from '../screens/GoalEditScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const { token, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <NavigationContainer>
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
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: '复盘神器' }} />
            <Stack.Screen name="ReviewInput" component={ReviewInputScreen} options={{ title: '今日复盘' }} />
            <Stack.Screen name="ReviewDetail" component={ReviewDetailScreen} options={{ title: '复盘详情' }} />
            <Stack.Screen name="Goals" component={GoalsScreen} options={{ title: '年度目标' }} />
            <Stack.Screen name="GoalEdit" component={GoalEditScreen} options={{ title: '编辑目标' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: '个人设置' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
