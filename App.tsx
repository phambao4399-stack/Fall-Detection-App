// App.tsx
import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { DeviceProvider } from './src/context/DeviceContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const notificationResponseListener = useRef<Notifications.EventSubscription>(null);

  useEffect(() => {
    // Lắng nghe khi user nhấn vào notification
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log('[App] Notification tapped:', data);
        // Có thể navigate tới màn hình tương ứng ở đây
        // Ví dụ: nếu data.type === 'fall_detected', navigate tới Dashboard
      });

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <DeviceProvider>
        <AppNavigator />
      </DeviceProvider>
    </SafeAreaProvider>
  );
}