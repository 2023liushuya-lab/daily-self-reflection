import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

export interface AuthState {
  token: string | null;
  isLoading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ token: null, isLoading: true });

  useEffect(() => {
    SecureStore.getItemAsync('auth-token').then(token => {
      setState({ token, isLoading: false });
    });
  }, []);

  const login = async (token: string) => {
    await SecureStore.setItemAsync('auth-token', token);
    setState({ token, isLoading: false });
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('auth-token');
    setState({ token: null, isLoading: false });
  };

  return { ...state, login, logout };
}
