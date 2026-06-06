import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';
import Navigation from './src/navigation';

export default function App() {
  useEffect(() => {
    async function checkUpdates() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          Alert.alert('更新已下载', '重启应用后生效', [
            { text: '稍后重启' },
            { text: '立即重启', onPress: () => Updates.reloadAsync() },
          ]);
        }
      } catch {}
    }
    // Don't block rendering — check in background
    checkUpdates();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Navigation />
    </>
  );
}
