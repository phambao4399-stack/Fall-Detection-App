// src/services/alarmService.ts
// Dịch vụ phát báo động khi phát hiện té ngã.
// Rung liên tục trong 30 giây kết hợp thông báo âm thanh hệ thống.

import { Vibration } from 'react-native';

// ─── Cấu hình ────────────────────────────────────────────────────────────────
const ALARM_DURATION_MS = 30_000; // 30 giây
const VIBRATION_PATTERN = [0, 800, 400, 800, 400, 800]; // rung mạnh, lặp lại

// ─── State quản lý alarm ─────────────────────────────────────────────────────
let alarmTimer: ReturnType<typeof setTimeout> | null = null;
let isAlarmPlaying = false;

/**
 * Phát báo động rung liên tục trong 30 giây khi té ngã.
 * Tự động dừng sau 30 giây, hoặc gọi stopFallAlarm() để dừng sớm.
 */
export async function startFallAlarm(): Promise<void> {
  if (isAlarmPlaying) {
    console.log('[AlarmService] Alarm already playing, skipping');
    return;
  }

  isAlarmPlaying = true;
  console.log('[AlarmService] 🚨 Starting fall alarm (vibration) for 30 seconds...');

  try {
    // Rung liên tục theo pattern cảnh báo khẩn cấp
    Vibration.vibrate(VIBRATION_PATTERN, true);

    // Tự động tắt sau 30 giây
    alarmTimer = setTimeout(() => {
      console.log('[AlarmService] Auto-stopping alarm after 30s');
      stopFallAlarm();
    }, ALARM_DURATION_MS);
  } catch (error) {
    console.error('[AlarmService] Error starting alarm:', error);
    isAlarmPlaying = false;
  }
}

/**
 * Dừng báo động và rung.
 * Gọi khi người dùng xác nhận hoặc sau 30 giây.
 */
export async function stopFallAlarm(): Promise<void> {
  console.log('[AlarmService] Stopping alarm...');
  isAlarmPlaying = false;

  // Dừng rung
  Vibration.cancel();

  // Dừng timer nếu đang chạy
  if (alarmTimer) {
    clearTimeout(alarmTimer);
    alarmTimer = null;
  }
}

/**
 * Kiểm tra xem alarm có đang kêu không.
 */
export function isAlarmActive(): boolean {
  return isAlarmPlaying;
}
