// src/services/notificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// ─── Notification handler (foreground behavior) ────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Channel IDs ────────────────────────────────────────────────────────────
const FALL_CHANNEL_ID = 'fall-detection-alerts';
const BATTERY_CHANNEL_ID = 'battery-warnings';

// ─── Setup notification channels (Android only) ────────────────────────────
async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    // Kênh cảnh báo té ngã – ưu tiên cao nhất
    await Notifications.setNotificationChannelAsync(FALL_CHANNEL_ID, {
      name: 'Cảnh báo té ngã',
      description: 'Thông báo khi phát hiện sự kiện té ngã từ thiết bị đeo',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400, 200, 400],
      enableLights: true,
      lightColor: '#FF453A',
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // Kênh cảnh báo pin thấp
    await Notifications.setNotificationChannelAsync(BATTERY_CHANNEL_ID, {
      name: 'Cảnh báo pin thấp',
      description: 'Thông báo khi pin thiết bị đeo xuống thấp',
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
    });
  }
}

// ─── Request permissions ────────────────────────────────────────────────────
async function requestPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notification] Permission not granted');
    return false;
  }

  return true;
}

// ─── Initialize notifications ───────────────────────────────────────────────
export async function initializeNotifications(): Promise<boolean> {
  try {
    const granted = await requestPermissions();
    if (!granted) return false;

    await setupNotificationChannels();
    console.log('[Notification] Initialized successfully');
    return true;
  } catch (error) {
    console.error('[Notification] Failed to initialize:', error);
    return false;
  }
}

// ─── Send fall detection notification ───────────────────────────────────────
export async function sendFallNotification(data?: {
  fallTime?: string;
  latitude?: number;
  longitude?: number;
  deviceId?: string;
  deviceName?: string;
}): Promise<void> {
  const timeStr = data?.fallTime
    ? new Date(data.fallTime).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Vừa xảy ra';

  const deviceLabel = data?.deviceName
    ? `${data.deviceName} (${data.deviceId || 'ESP32'})`
    : data?.deviceId || 'Thiết bị CareDrop';

  const locationStr =
    data?.latitude && data?.longitude
      ? `📍 Vị trí: ${data.latitude.toFixed(6)}°N, ${data.longitude.toFixed(6)}°E`
      : '';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🚨 PHÁT HIỆN TÉ NGÃ - ${deviceLabel}!`,
      body: `Phát hiện sự kiện té ngã từ [${deviceLabel}] lúc ${timeStr}.\n${locationStr}\nNhấn để mở ứng dụng hỗ trợ ngay.`,
      data: {
        type: 'fall_detected',
        fallTime: data?.fallTime,
        latitude: data?.latitude,
        longitude: data?.longitude,
        deviceId: data?.deviceId,
        deviceName: data?.deviceName,
      },
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
      ...(Platform.OS === 'android' && { channelId: FALL_CHANNEL_ID }),
    },
    trigger: null, // Gửi ngay lập tức
  });
}

// ─── Send battery warning notification ──────────────────────────────────────
export async function sendBatteryWarning(batteryPct: number, deviceName?: string): Promise<void> {
  const label = deviceName ? `[${deviceName}] ` : '';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔋 Pin ${label}thấp!`,
      body: `Pin thiết bị ${label}chỉ còn ${batteryPct}%. Hãy sạc pin để đảm bảo giám sát liên tục.`,
      data: { type: 'battery_warning', batteryPct, deviceName },
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      ...(Platform.OS === 'android' && { channelId: BATTERY_CHANNEL_ID }),
    },
    trigger: null,
  });
}

// ─── Send test notification ─────────────────────────────────────────────────
export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✅ Test thông báo thành công!',
      body: 'Hệ thống thông báo đang hoạt động bình thường. Bạn sẽ nhận được cảnh báo khi phát hiện té ngã.',
      data: { type: 'test' },
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      ...(Platform.OS === 'android' && { channelId: FALL_CHANNEL_ID }),
    },
    trigger: null,
  });
}
