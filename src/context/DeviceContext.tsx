// src/context/DeviceContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { DeviceData, FallEvent, AppSettings } from '../types/device';
import {
  initializeNotifications,
  sendFallNotification,
  sendBatteryWarning,
} from '../services/notificationService';
import {
  registerBackgroundFetch,
  unregisterBackgroundFetch,
  syncSettingsForBackground,
} from '../services/backgroundFallCheck';
import {
  loadFallHistory,
  saveFallEvent,
  clearFallHistory,
  acknowledgeFallEvent,
} from '../services/historyService';
import { startFallAlarm, stopFallAlarm } from '../services/alarmService';

interface DeviceContextType {
  deviceData: DeviceData | null;
  fallEvents: FallEvent[];
  settings: AppSettings;
  isConnected: boolean;
  acknowledgefall: () => Promise<void>;
  triggerEmergency: () => Promise<void>;
  cancelEmergency: () => Promise<void>;
  updateSettings: (s: Partial<AppSettings>) => void;
  refreshHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
  acknowledgeEvent: (id: string) => Promise<void>;
}

const DeviceContext = createContext<DeviceContextType | null>(null);

const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  backgroundMonitoring: true,
  batteryThreshold: 20,
  deviceId: 'ESP32_FALL_001',
  mapAutoFollow: true,
};

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
  const [fallEvents, setFallEvents] = useState<FallEvent[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isConnected, setIsConnected] = useState(false);
  const prevFallRef = useRef<boolean>(false);
  const prevBatteryWarnRef = useRef<boolean>(false);

  // ── Khởi tạo notifications ────────────────────────────────────────────────
  useEffect(() => {
    initializeNotifications().then((success) => {
      if (success) {
        console.log('[DeviceContext] Notifications initialized');
      }
    });
  }, []);

  // ── Quản lý background monitoring ────────────────────────────────────────
  useEffect(() => {
    if (settings.backgroundMonitoring && settings.notificationsEnabled) {
      syncSettingsForBackground({
        deviceId: settings.deviceId,
        batteryThreshold: settings.batteryThreshold,
      });
      registerBackgroundFetch();
    } else {
      unregisterBackgroundFetch();
    }
  }, [
    settings.backgroundMonitoring,
    settings.notificationsEnabled,
    settings.deviceId,
    settings.batteryThreshold,
  ]);

  // ── Realtime listener cho device document ────────────────────────────────
  useEffect(() => {
    const docRef = doc(db, 'devices', settings.deviceId);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        setIsConnected(true);
        if (docSnap.exists()) {
          const data = docSnap.data() as DeviceData;
          setDeviceData(data);

          // Phát hiện té ngã khi fall_detected chuyển từ false → true (hoặc lần đầu mở nếu đang true)
          const isNewFall = data.fall_detected && !prevFallRef.current;
          if (isNewFall) {
            if (settings.notificationsEnabled) {
              // Phát chuông báo thức + rung liên tục 30 giây
              startFallAlarm();
              sendFallNotification({
                fallTime: data.fall_time,
                latitude: data.latitude,
                longitude: data.longitude,
              });
            }

            // TỰ ĐỘNG GHI VÀO LỊCH SỬ SỰ KIỆN (CẢ LOCAL VÀ CLOUD)
            const newEvent: Omit<FallEvent, 'id'> = {
              timestamp: data.fall_time || new Date().toISOString(),
              latitude: data.latitude ?? 10.84,
              longitude: data.longitude ?? 106.77,
              battery_pct: data.battery_pct ?? 100,
              acknowledged: false,
            };

            saveFallEvent({
              ...newEvent,
              deviceId: settings.deviceId,
            }).then((saved) => {
              setFallEvents((prev) => {
                const exists = prev.some(
                  (e) => e.id === saved.id || e.timestamp === saved.timestamp
                );
                return exists ? prev : [saved, ...prev];
              });
            });
          }
          prevFallRef.current = data.fall_detected;

          // Cảnh báo pin thấp
          if (
            data.battery_pct <= settings.batteryThreshold &&
            !prevBatteryWarnRef.current &&
            settings.notificationsEnabled
          ) {
            sendBatteryWarning(data.battery_pct);
            prevBatteryWarnRef.current = true;
          } else if (data.battery_pct > settings.batteryThreshold) {
            prevBatteryWarnRef.current = false;
          }
        }
      },
      (_error) => {
        setIsConnected(false);
      }
    );
    return () => unsubscribe();
  }, [settings.deviceId, settings.notificationsEnabled, settings.batteryThreshold]);

  // Load fall history từ Firestore & AsyncStorage
  // CHỈ load lịch sử đã lưu, KHÔNG tự tạo event mới
  const refreshHistory = useCallback(async () => {
    try {
      const list = await loadFallHistory();
      setFallEvents(list);
    } catch (e) {
      console.warn('[DeviceContext] Error in refreshHistory:', e);
    }
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const clearHistory = async () => {
    await clearFallHistory();
    setFallEvents([]);
  };

  const acknowledgeEvent = async (id: string) => {
    await acknowledgeFallEvent(id);
    setFallEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, acknowledged: true } : e))
    );
  };

  const acknowledgefall = async () => {
    // Dừng chuông báo thức khi xác nhận
    await stopFallAlarm();
    const docRef = doc(db, 'devices', settings.deviceId);
    await updateDoc(docRef, { ack_fall: true, fall_detected: false });
    // Nếu có sự cố mới nhất, đánh dấu đã xử lý
    if (fallEvents.length > 0) {
      acknowledgeEvent(fallEvents[0].id);
    }
  };

  const triggerEmergency = async () => {
    const docRef = doc(db, 'devices', settings.deviceId);
    await updateDoc(docRef, { emergency_mode: true });
  };

  const cancelEmergency = async () => {
    const docRef = doc(db, 'devices', settings.deviceId);
    await updateDoc(docRef, { emergency_mode: false });
  };

  const updateSettings = (s: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...s }));
  };

  return (
    <DeviceContext.Provider
      value={{
        deviceData,
        fallEvents,
        settings,
        isConnected,
        acknowledgefall,
        triggerEmergency,
        cancelEmergency,
        updateSettings,
        refreshHistory,
        clearHistory,
        acknowledgeEvent,
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice() {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error('useDevice must be used within DeviceProvider');
  return ctx;
}
