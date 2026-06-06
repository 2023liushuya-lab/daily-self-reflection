import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import client from '../api/client';

const DEVICE_ID_KEY = 'device-id';
const TOKEN_KEY = 'auth-token';

export interface AuthState {
  token: string | null;
  isLoading: boolean;
}

function generateDeviceId(): string {
  // Simple UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ token: null, isLoading: true });

  useEffect(() => {
    (async () => {
      try {
        // Try existing token first
        let token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) {
          setState({ token, isLoading: false });
          return;
        }

        // Get or create device ID
        let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
        if (!deviceId) {
          deviceId = generateDeviceId();
          await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
        }

        // Auto-login with device ID
        const res = await client.post('/auth/device-login', { deviceId });
        token = res.data.data.token;
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        setState({ token, isLoading: false });
      } catch (e) {
        console.error('[useAuth] Auto-login failed:', e);
        setState({ token: null, isLoading: false });
      }
    })();
  }, []);

  const logout = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setState({ token: null, isLoading: false });
  };

  return { ...state, logout };
}
