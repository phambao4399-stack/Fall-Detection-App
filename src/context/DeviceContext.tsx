// src/context/DeviceContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../services/firebaseConfig';
import { DeviceData, FallEvent, AppSettings, PairedDevice } from '../types/device';
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
import { useAuth } from './AuthContext';

export const STORAGE_KEY_PAIRED_DEVICES = '@healthguard_paired_devices';
export const STORAGE_KEY_ACTIVE_DEVICE_ID = '@healthguard_active_device_id';

const DEFAULT_PAIRED_DEVICES: PairedDevice[] = [];

export interface ActiveFallAlert {
  deviceId: string;
  deviceName: string;
  fallTime?: string;
  latitude?: number;
  longitude?: number;
  battery_pct?: number;
}

interface DeviceContextType {
  deviceData: DeviceData | null;
  devicesData: Record<string, DeviceData>;
  pairedDevices: PairedDevice[];
  activeDeviceId: string;
  activeDevice: PairedDevice | undefined;
  activeFallAlert: ActiveFallAlert | null;
  fallEvents: FallEvent[];
  settings: AppSettings;
  isConnected: boolean;
  addPairedDevice: (
    id: string,
    name: string
  ) => Promise<{ success: boolean; message?: string }>;
  removePairedDevice: (id: string) => Promise<void>;
  setActiveDeviceId: (id: string) => void;
  simulateDeviceFall: (id: string, fall: boolean) => Promise<void>;
  acknowledgefall: (targetDeviceId?: string) => Promise<void>;
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
  deviceId: '',
  mapAutoFollow: true,
};

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userEmail = user?.email ? user.email.toLowerCase().trim() : '';

  // Khóa lưu trữ riêng biệt theo từng tài khoản Google
  const userDevicesKey = userEmail
    ? `@caredrop_paired_devices_${userEmail}`
    : STORAGE_KEY_PAIRED_DEVICES;
  const userActiveDeviceKey = userEmail
    ? `@caredrop_active_device_${userEmail}`
    : STORAGE_KEY_ACTIVE_DEVICE_ID;

  const [pairedDevices, setPairedDevices] = useState<PairedDevice[]>([]);
  const [activeDeviceId, setActiveDeviceIdState] = useState<string>('');
  const [devicesData, setDevicesData] = useState<Record<string, DeviceData>>({});
  const [activeFallAlert, setActiveFallAlert] = useState<ActiveFallAlert | null>(null);
  const [fallEvents, setFallEvents] = useState<FallEvent[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const prevFallMapRef = useRef<Record<string, boolean>>({});
  const prevBatteryWarnMapRef = useRef<Record<string, boolean>>({});

  // ── Khởi tạo notifications ────────────────────────────────────────────────
  useEffect(() => {
    initializeNotifications().then((success) => {
      if (success) {
        console.log('[DeviceContext] Notifications initialized');
      }
    });
  }, []);

  // ── Tải danh sách pairedDevices theo từng tài khoản Google khi đăng nhập ─────────────
  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (!userEmail) {
        if (isMounted) {
          setPairedDevices([]);
          setActiveDeviceIdState('');
          setIsConnected(false);
        }
        return;
      }

      try {
        // 1. Kiểm tra bộ nhớ máy (AsyncStorage) của tài khoản Gmail này
        const stored = await AsyncStorage.getItem(userDevicesKey);
        if (stored !== null) {
          const list: PairedDevice[] = JSON.parse(stored);
          if (Array.isArray(list)) {
            if (isMounted) {
              setPairedDevices(list);
              const storedActive = await AsyncStorage.getItem(userActiveDeviceKey);
              if (storedActive && list.some((d) => d.id === storedActive)) {
                setActiveDeviceIdState(storedActive);
              } else if (list.length > 0) {
                setActiveDeviceIdState(list[0].id);
              } else {
                setActiveDeviceIdState('');
                setIsConnected(false);
              }
            }
            return;
          }
        }

        // 2. Nếu máy chưa có, kiểm tra trên Firestore users/{email}
        const userRef = doc(db, 'users', userEmail);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const cloudDevices = userSnap.data()?.pairedDevices;
          if (Array.isArray(cloudDevices) && cloudDevices.length > 0) {
            if (isMounted) {
              setPairedDevices(cloudDevices);
              setActiveDeviceIdState(cloudDevices[0].id);
              await AsyncStorage.setItem(userDevicesKey, JSON.stringify(cloudDevices));
              await AsyncStorage.setItem(userActiveDeviceKey, cloudDevices[0].id);
            }
            return;
          }
        }

        // 3. Mọi tài khoản Gmail đăng nhập lần đầu tiên: KHÔNG CÓ THIẾT BỊ NÀO CẢ (mảng rỗng)
        if (isMounted) {
          setPairedDevices([]);
          setActiveDeviceIdState('');
          setIsConnected(false);
          await AsyncStorage.setItem(userDevicesKey, JSON.stringify([]));
          await AsyncStorage.setItem(userActiveDeviceKey, '');
        }
      } catch (err) {
        console.warn('[DeviceContext] Error loading paired devices for user:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [userEmail, userDevicesKey, userActiveDeviceKey]);

  // ── Quản lý background monitoring ────────────────────────────────────────
  useEffect(() => {
    if (settings.backgroundMonitoring && settings.notificationsEnabled) {
      syncSettingsForBackground({
        deviceId: activeDeviceId,
        batteryThreshold: settings.batteryThreshold,
        pairedDevices: pairedDevices.map((d) => ({ id: d.id, name: d.name })),
      });
      registerBackgroundFetch();
    } else {
      unregisterBackgroundFetch();
    }
  }, [
    settings.backgroundMonitoring,
    settings.notificationsEnabled,
    activeDeviceId,
    settings.batteryThreshold,
    pairedDevices,
  ]);

  // ── Realtime listeners cho TẤT CẢ các thiết bị đã ghép nối ───────────────
  useEffect(() => {
    if (pairedDevices.length === 0) return;

    const unsubscribers: Array<() => void> = [];

    pairedDevices.forEach((dev) => {
      const docRef = doc(db, 'devices', dev.id);
      const unsub = onSnapshot(
        docRef,
        (docSnap) => {
          setIsConnected(true);
          if (docSnap.exists()) {
            const data = docSnap.data() as DeviceData;
            setDevicesData((prev) => ({
              ...prev,
              [dev.id]: {
                ...data,
                device_id: data.device_id || dev.id,
              },
            }));

            // ── Kiểm tra té ngã cho thiết bị này ──
            const wasFalling = prevFallMapRef.current[dev.id] ?? false;
            const isFalling = data.fall_detected === true;

            if (isFalling && !wasFalling) {
              console.log(`[DeviceContext] 🚨 NEW fall detected on [${dev.id}] (${dev.name})!`);
              if (settings.notificationsEnabled) {
                startFallAlarm();
                sendFallNotification({
                  fallTime: data.fall_time,
                  latitude: data.latitude,
                  longitude: data.longitude,
                  deviceId: dev.id,
                  deviceName: dev.name,
                });
              }

              // Thiết lập cảnh báo hiện hành
              setActiveFallAlert({
                deviceId: dev.id,
                deviceName: dev.name,
                fallTime: data.fall_time,
                latitude: data.latitude,
                longitude: data.longitude,
                battery_pct: data.battery_pct,
              });

              // Tự động lưu vào lịch sử sự cố
              const newEvent: Omit<FallEvent, 'id'> = {
                timestamp: data.fall_time || new Date().toISOString(),
                latitude: data.latitude ?? 10.84,
                longitude: data.longitude ?? 106.77,
                battery_pct: data.battery_pct ?? 100,
                acknowledged: false,
                deviceId: dev.id,
                deviceName: dev.name,
              };

              saveFallEvent({
                ...newEvent,
                deviceId: dev.id,
              }).then((saved) => {
                setFallEvents((prev) => {
                  const exists = prev.some(
                    (e) => e.id === saved.id || e.timestamp === saved.timestamp
                  );
                  return exists ? prev : [saved, ...prev];
                });
              });
            } else if (!isFalling && wasFalling) {
              // Nếu sự cố trên thiết bị này đã kết thúc hoặc được xác nhận
              setActiveFallAlert((current) =>
                current?.deviceId === dev.id ? null : current
              );
            }
            prevFallMapRef.current[dev.id] = isFalling;

            // ── Kiểm tra pin thấp ──
            const batt = data.battery_pct ?? 100;
            const wasWarned = prevBatteryWarnMapRef.current[dev.id] ?? false;
            if (batt <= settings.batteryThreshold && !wasWarned && settings.notificationsEnabled) {
              sendBatteryWarning(batt, dev.name);
              prevBatteryWarnMapRef.current[dev.id] = true;
            } else if (batt > settings.batteryThreshold) {
              prevBatteryWarnMapRef.current[dev.id] = false;
            }
          }
        },
        (_error) => {
          console.warn(`[DeviceContext] Error listening to ${dev.id}:`, _error);
        }
      );
      unsubscribers.push(unsub);
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [pairedDevices, settings.notificationsEnabled, settings.batteryThreshold]);

  // ── Thêm thiết bị phần cứng mới ──────────────────────────────────────────
  const addPairedDevice = async (
    id: string,
    name: string
  ): Promise<{ success: boolean; message?: string }> => {
    const trimmedId = id.trim();
    const trimmedName = name.trim() || trimmedId;

    if (!trimmedId) {
      return { success: false, message: 'Mã nhận diện thiết bị không được để trống.' };
    }

    if (pairedDevices.some((d) => d.id.toLowerCase() === trimmedId.toLowerCase())) {
      return { success: false, message: `Thiết bị [${trimmedId}] đã có trong danh sách.` };
    }

    const newDev: PairedDevice = {
      id: trimmedId,
      name: trimmedName,
      addedAt: new Date().toISOString(),
    };

    const updated = [...pairedDevices, newDev];
    setPairedDevices(updated);
    setActiveDeviceIdState(trimmedId);

    try {
      await AsyncStorage.setItem(userDevicesKey, JSON.stringify(updated));
      await AsyncStorage.setItem(userActiveDeviceKey, trimmedId);

      // Cập nhật lên profile người dùng trên Firestore
      if (userEmail) {
        const userRef = doc(db, 'users', userEmail);
        await setDoc(userRef, { pairedDevices: updated }, { merge: true });
      }

      // Khởi tạo document trên Firestore nếu chưa có để người dùng test ngay
      const docRef = doc(db, 'devices', trimmedId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, {
          device_id: trimmedId,
          fall_detected: false,
          battery_pct: 100,
          latitude: 10.8505,
          longitude: 106.7739,
          fall_time: new Date().toISOString(),
          ack_fall: false,
          emergency_mode: false,
          connected: true,
          last_updated: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('[DeviceContext] Error saving new device:', err);
    }

    return { success: true };
  };

  // ── Xóa thiết bị phần cứng ───────────────────────────────────────────────
  const removePairedDevice = async (id: string) => {
    const updated = pairedDevices.filter((d) => d.id !== id);
    setPairedDevices(updated);

    let nextActive = '';
    if (updated.length > 0) {
      nextActive = activeDeviceId === id ? updated[0].id : activeDeviceId;
    } else {
      setIsConnected(false);
    }
    setActiveDeviceIdState(nextActive);

    try {
      await AsyncStorage.setItem(userDevicesKey, JSON.stringify(updated));
      await AsyncStorage.setItem(userActiveDeviceKey, nextActive);

      if (userEmail) {
        const userRef = doc(db, 'users', userEmail);
        await setDoc(userRef, { pairedDevices: updated }, { merge: true });
      }
    } catch (err) {
      console.warn('[DeviceContext] Error removing device:', err);
    }
  };

  // ── Chuyển đổi thiết bị đang chọn xem ────────────────────────────────────
  const setActiveDeviceId = (id: string) => {
    setActiveDeviceIdState(id);
    AsyncStorage.setItem(userActiveDeviceKey, id).catch(() => {});
  };

  // ── Giả lập té ngã trên Firebase Firestore (phục vụ test trực tiếp) ──────
  const simulateDeviceFall = async (id: string, fall: boolean) => {
    try {
      const docRef = doc(db, 'devices', id);
      await setDoc(
        docRef,
        {
          device_id: id,
          fall_detected: fall,
          fall_time: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          battery_pct: 85,
          connected: true,
        },
        { merge: true }
      );
    } catch (err) {
      console.error('[DeviceContext] Error in simulateDeviceFall:', err);
      throw err;
    }
  };

  // ── Load fall history từ Firestore & AsyncStorage ────────────────────────
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

  // ── Xác nhận sự cố té ngã ────────────────────────────────────────────────
  const acknowledgefall = async (targetDeviceId?: string) => {
    await stopFallAlarm();
    const target = targetDeviceId || activeFallAlert?.deviceId || activeDeviceId;
    setActiveFallAlert(null);

    try {
      const docRef = doc(db, 'devices', target);
      await updateDoc(docRef, { ack_fall: true, fall_detected: false });
    } catch (err) {
      console.warn('[DeviceContext] Error updating ack_fall on Firestore:', err);
    }

    if (fallEvents.length > 0) {
      acknowledgeEvent(fallEvents[0].id);
    }
  };

  const triggerEmergency = async () => {
    const docRef = doc(db, 'devices', activeDeviceId);
    await updateDoc(docRef, { emergency_mode: true });
  };

  const cancelEmergency = async () => {
    const docRef = doc(db, 'devices', activeDeviceId);
    await updateDoc(docRef, { emergency_mode: false });
  };

  const updateSettings = (s: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...s }));
  };

  // Thiết bị hiện tại đang active
  const activeDevice = pairedDevices.find((d) => d.id === activeDeviceId);

  // Dữ liệu thiết bị tương thích ngược:
  // Nếu có activeFallAlert đang kêu, ưu tiên hiển thị dữ liệu của thiết bị đang té ngã
  const activeFallData = activeFallAlert ? devicesData[activeFallAlert.deviceId] : null;
  const currentDeviceData = devicesData[activeDeviceId] || null;

  const resolvedDeviceData: DeviceData | null =
    activeFallAlert && activeFallData
      ? {
          ...activeFallData,
          fall_detected: true,
          device_id: activeFallAlert.deviceId,
        }
      : currentDeviceData;

  return (
    <DeviceContext.Provider
      value={{
        deviceData: resolvedDeviceData,
        devicesData,
        pairedDevices,
        activeDeviceId,
        activeDevice,
        activeFallAlert,
        fallEvents,
        settings: {
          ...settings,
          deviceId: activeDeviceId,
          pairedDevices,
        },
        isConnected,
        addPairedDevice,
        removePairedDevice,
        setActiveDeviceId,
        simulateDeviceFall,
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
