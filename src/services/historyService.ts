// src/services/historyService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { FallEvent } from '../types/device';

const STORAGE_KEY_FALL_HISTORY = '@healthguard_fall_history';
const STORAGE_KEY_CLEARED_AT = '@healthguard_history_cleared_at';

/**
 * Chuyển timestamp UTC (ISO string) sang giờ địa phương (Việt Nam / múi giờ thiết bị).
 * ESP32 gửi fall_time dạng UTC → cần cộng thêm offset của thiết bị.
 */
function convertToLocalTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    // Tạo ISO string theo múi giờ local bằng cách bù offset
    const offsetMs = d.getTimezoneOffset() * 60 * 1000;
    const localDate = new Date(d.getTime() - offsetMs);
    return localDate.toISOString().replace('Z', '');
  } catch {
    return isoString;
  }
}

/**
 * Tải danh sách lịch sử té ngã:
 * Kết hợp từ AsyncStorage (offline-first) và Firestore (cloud).
 * Lọc bỏ các sự kiện cũ hơn thời điểm xóa lần cuối.
 */
export async function loadFallHistory(): Promise<FallEvent[]> {
  let localEvents: FallEvent[] = [];

  // Lấy thời điểm xóa lần cuối (nếu có)
  let clearedAt: number = 0;
  try {
    const clearedAtStr = await AsyncStorage.getItem(STORAGE_KEY_CLEARED_AT);
    if (clearedAtStr) {
      clearedAt = parseInt(clearedAtStr, 10) || 0;
    }
  } catch (_e) {
    // bỏ qua
  }

  // 1. Tải từ bộ nhớ máy (AsyncStorage) trước
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_FALL_HISTORY);
    if (raw) {
      localEvents = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[historyService] Error reading local history:', err);
  }

  // 2. Thử đồng bộ từ Firestore collection 'fall_events'
  try {
    const q = query(
      collection(db, 'fall_events'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    const remoteEvents: FallEvent[] = snapshot.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          timestamp: data.timestamp || new Date().toISOString(),
          latitude: Number(data.latitude) || 10.84,
          longitude: Number(data.longitude) || 106.77,
          battery_pct: Number(data.battery_pct) || 0,
          acknowledged: Boolean(data.acknowledged),
          _createdAt: data.createdAt || data.timestamp || '',
        };
      })
      // Lọc bỏ các sự kiện cũ hơn thời điểm xóa lần cuối
      .filter((e) => {
        if (clearedAt === 0) return true;
        const eventTime = new Date(e._createdAt || e.timestamp).getTime();
        return eventTime > clearedAt;
      })
      .map(({ _createdAt, ...rest }) => rest);

    // 3. Gộp và loại bỏ trùng lặp (dựa vào id hoặc timestamp)
    const eventMap = new Map<string, FallEvent>();
    localEvents.forEach((e) => {
      const key = e.id || e.timestamp;
      eventMap.set(key, e);
    });
    remoteEvents.forEach((e) => {
      const key = e.id || e.timestamp;
      eventMap.set(key, e);
    });

    const merged = Array.from(eventMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Lưu lại bộ nhớ máy
    await AsyncStorage.setItem(STORAGE_KEY_FALL_HISTORY, JSON.stringify(merged));
    return merged;
  } catch (_e) {
    // Nếu không có mạng hoặc lỗi Firestore, trả về lịch sử lưu trên máy
    return localEvents;
  }
}

/**
 * Lưu sự kiện té ngã mới vào cả Local Storage và Firestore Cloud.
 * Tự động chuyển timestamp từ UTC sang giờ địa phương.
 */
export async function saveFallEvent(
  eventData: Omit<FallEvent, 'id'> & { id?: string; deviceId?: string }
): Promise<FallEvent> {
  const newId = eventData.id || `fall_${Date.now()}`;
  // Chuyển timestamp UTC → giờ địa phương
  const localTimestamp = convertToLocalTimestamp(
    eventData.timestamp || new Date().toISOString()
  );
  const event: FallEvent = {
    id: newId,
    timestamp: localTimestamp,
    latitude: Number(eventData.latitude) || 10.84,
    longitude: Number(eventData.longitude) || 106.77,
    battery_pct: Number(eventData.battery_pct) || 0,
    acknowledged: Boolean(eventData.acknowledged),
  };

  // 1. Lưu ngay vào AsyncStorage trên điện thoại
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_FALL_HISTORY);
    const current: FallEvent[] = raw ? JSON.parse(raw) : [];
    // Kiểm tra không thêm trùng lặp trong vòng 10 giây
    const isDup = current.some(
      (e) => Math.abs(new Date(e.timestamp).getTime() - new Date(event.timestamp).getTime()) < 10000
    );
    if (!isDup) {
      const updated = [event, ...current];
      await AsyncStorage.setItem(STORAGE_KEY_FALL_HISTORY, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('[historyService] Failed to save locally:', err);
  }

  // 2. Ghi lên Firestore 'fall_events' để đồng bộ đám mây
  try {
    await addDoc(collection(db, 'fall_events'), {
      deviceId: eventData.deviceId || 'ESP32_FALL_001',
      timestamp: event.timestamp,
      latitude: event.latitude,
      longitude: event.longitude,
      battery_pct: event.battery_pct,
      acknowledged: event.acknowledged,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[historyService] Failed to save to Firestore:', err);
  }

  return event;
}

/**
 * Xóa toàn bộ lịch sử té ngã trên thiết bị VÀ trên Firestore.
 * Lưu thời điểm xóa để không load lại dữ liệu cũ từ Firestore.
 */
export async function clearFallHistory(): Promise<void> {
  // 1. Xóa AsyncStorage
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_FALL_HISTORY);
  } catch (err) {
    console.warn('[historyService] Failed to clear local history:', err);
  }

  // 2. Lưu thời điểm xóa → khi load lại sẽ bỏ qua event cũ hơn mốc này
  try {
    await AsyncStorage.setItem(STORAGE_KEY_CLEARED_AT, String(Date.now()));
  } catch (err) {
    console.warn('[historyService] Failed to save cleared_at:', err);
  }

  // 3. Xóa toàn bộ trên Firestore (best-effort, không chặn UI)
  try {
    const q = query(collection(db, 'fall_events'));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((d) =>
      deleteDoc(doc(db, 'fall_events', d.id))
    );
    await Promise.all(deletePromises);
    console.log('[historyService] Cleared Firestore fall_events');
  } catch (err) {
    console.warn('[historyService] Failed to clear Firestore:', err);
  }
}

/**
 * Đánh dấu sự kiện đã được xác nhận (Đã xử lý).
 */
export async function acknowledgeFallEvent(eventId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_FALL_HISTORY);
    if (raw) {
      const list: FallEvent[] = JSON.parse(raw);
      const updated = list.map((e) =>
        e.id === eventId ? { ...e, acknowledged: true } : e
      );
      await AsyncStorage.setItem(STORAGE_KEY_FALL_HISTORY, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('[historyService] Failed to ack locally:', err);
  }

  try {
    if (!eventId.startsWith('fall_')) {
      const docRef = doc(db, 'fall_events', eventId);
      await updateDoc(docRef, { acknowledged: true });
    }
  } catch (_e) {
    // bỏ qua nếu là id cục bộ
  }
}
