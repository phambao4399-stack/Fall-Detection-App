// App.tsx
import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DeviceProvider } from './src/context/DeviceContext';
import AppNavigator from './src/navigation/AppNavigator';
import GoogleLoginScreen from './src/screens/GoogleLoginScreen';

function RootNavigation() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  // Bắt buộc phải đăng nhập bằng tài khoản Google mới được vào app
  if (!user) {
    return <GoogleLoginScreen />;
  }

  return (
    <DeviceProvider>
      <AppNavigator />
    </DeviceProvider>
  );
}

export default function App() {
  const notificationResponseListener = useRef<Notifications.EventSubscription>(null);

  useEffect(() => {
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log('[App] Notification tapped:', data);
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
      <AuthProvider>
        <RootNavigation />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    backgroundColor: '#0D1117',
    alignItems: 'center',
    justifyContent: 'center',
  },
});