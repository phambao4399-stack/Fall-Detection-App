// src/services/backgroundFallCheck.ts
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { sendFallNotification, sendBatteryWarning } from './notificationService';
import { saveFallEvent } from './historyService';

// ─── Constants ──────────────────────────────────────────────────────────────
export const BACKGROUND_FALL_CHECK_TASK = 'BACKGROUND_FALL_CHECK';
const STORAGE_KEY_LAST_FALL_STATE_PREFIX = '@bg_last_fall_state_';
const STORAGE_KEY_LAST_BATTERY_WARN = '@bg_last_battery_warn';
const STORAGE_KEY_DEVICE_ID = '@bg_device_id';
const STORAGE_KEY_BATTERY_THRESHOLD = '@bg_battery_threshold';
export const STORAGE_KEY_PAIRED_DEVICES = '@bg_paired_devices';

// ─── Define the background task ─────────────────────────────────────────────
// IMPORTANT: This must be called at the top-level (outside of any component)
TaskManager.defineTask(BACKGROUND_FALL_CHECK_TASK, async () => {
  try {
    console.log('[BackgroundFallCheck] Task executing for multi-device check...');

    const batteryThresholdStr = await AsyncStorage.getItem(STORAGE_KEY_BATTERY_THRESHOLD);
    const batteryThreshold = batteryThresholdStr ? parseInt(batteryThresholdStr, 10) : 20;

    // Lấy danh sách thiết bị ghép nối từ storage
    const rawDevices = await AsyncStorage.getItem(STORAGE_KEY_PAIRED_DEVICES);
    let deviceList: Array<{ id: string; name: string }> = [];
    if (rawDevices) {
      try {
        deviceList = JSON.parse(rawDevices);
      } catch (_e) {
        deviceList = [];
      }
    }

    // Nếu tài khoản chưa ghép nối thiết bị nào, bỏ qua kiểm tra chạy ngầm
    if (deviceList.length === 0) {
      console.log('[BackgroundFallCheck] No paired devices found. Skipping check.');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    let hasNewData = false;

    for (const dev of deviceList) {
      try {
        const docRef = doc(db, 'devices', dev.id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) continue;

        const data = docSnap.data();
        const fallKey = `${STORAGE_KEY_LAST_FALL_STATE_PREFIX}${dev.id}`;
        const previousFallState = await AsyncStorage.getItem(fallKey);
        const wasFalling = previousFallState === 'true';
        const isFalling = data.fall_detected === true;

        await AsyncStorage.setItem(fallKey, String(isFalling));

        // Nếu phát hiện té ngã mới từ thiết bị này
        if (isFalling && !wasFalling) {
          console.log(`[BackgroundFallCheck] NEW fall detected on [${dev.id}] (${dev.name})!`);
          await saveFallEvent({
            timestamp: data.fall_time || new Date().toISOString(),
            latitude: data.latitude ?? 10.84,
            longitude: data.longitude ?? 106.77,
            battery_pct: data.battery_pct ?? 100,
            acknowledged: false,
            deviceId: dev.id,
          });

          await sendFallNotification({
            fallTime: data.fall_time,
            latitude: data.latitude,
            longitude: data.longitude,
            deviceId: dev.id,
            deviceName: dev.name,
          });

          hasNewData = true;
        }

        // Kiểm tra pin thấp
        const batteryPct = data.battery_pct ?? 100;
        if (batteryPct <= batteryThreshold) {
          const warnKey = `${STORAGE_KEY_LAST_BATTERY_WARN}_${dev.id}`;
          const lastBatteryWarn = await AsyncStorage.getItem(warnKey);
          const now = Date.now();
          if (!lastBatteryWarn || now - parseInt(lastBatteryWarn, 10) > 30 * 60 * 1000) {
            await sendBatteryWarning(batteryPct, dev.name);
            await AsyncStorage.setItem(warnKey, String(now));
          }
        }
      } catch (devErr) {
        console.warn(`[BackgroundFallCheck] Error checking device ${dev.id}:`, devErr);
      }
    }

    return hasNewData
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('[BackgroundFallCheck] Error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ─── Register background fetch ─────────────────────────────────────────────
export async function registerBackgroundFetch(): Promise<boolean> {
  try {
    // Kiểm tra xem task đã được registered chưa
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_FALL_CHECK_TASK
    );

    if (isRegistered) {
      console.log('[BackgroundFallCheck] Task already registered');
      return true;
    }

    await BackgroundFetch.registerTaskAsync(BACKGROUND_FALL_CHECK_TASK, {
      minimumInterval: 60, // 1 phút (OS sẽ tự điều chỉnh, thường 15-30 phút trên Android)
      stopOnTerminate: false, // Tiếp tục chạy sau khi app bị tắt
      startOnBoot: true, // Khởi động lại task sau khi restart điện thoại
    });

    console.log('[BackgroundFallCheck] Task registered successfully');
    return true;
  } catch (error) {
    console.error('[BackgroundFallCheck] Failed to register:', error);
    return false;
  }
}

// ─── Unregister background fetch ────────────────────────────────────────────
export async function unregisterBackgroundFetch(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_FALL_CHECK_TASK
    );

    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FALL_CHECK_TASK);
      console.log('[BackgroundFallCheck] Task unregistered');
    }
  } catch (error) {
    console.error('[BackgroundFallCheck] Failed to unregister:', error);
  }
}

// ─── Check if background fetch is registered ────────────────────────────────
export async function isBackgroundFetchRegistered(): Promise<boolean> {
  try {
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_FALL_CHECK_TASK);
  } catch {
    return false;
  }
}

// ─── Get background fetch status ────────────────────────────────────────────
export async function getBackgroundFetchStatus(): Promise<string> {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    switch (status) {
      case BackgroundFetch.BackgroundFetchStatus.Restricted:
        return 'Bị hạn chế bởi hệ thống';
      case BackgroundFetch.BackgroundFetchStatus.Denied:
        return 'Bị từ chối quyền';
      case BackgroundFetch.BackgroundFetchStatus.Available:
        return 'Khả dụng';
      default:
        return 'Không xác định';
    }
  } catch {
    return 'Lỗi kiểm tra';
  }
}

// ─── Sync settings to AsyncStorage (for background task) ────────────────────
export async function syncSettingsForBackground(settings: {
  deviceId: string;
  batteryThreshold: number;
  pairedDevices?: Array<{ id: string; name: string }>;
}): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_DEVICE_ID, settings.deviceId);
  await AsyncStorage.setItem(
    STORAGE_KEY_BATTERY_THRESHOLD,
    String(settings.batteryThreshold)
  );
  if (settings.pairedDevices) {
    await AsyncStorage.setItem(
      STORAGE_KEY_PAIRED_DEVICES,
      JSON.stringify(settings.pairedDevices)
    );
  }
}
