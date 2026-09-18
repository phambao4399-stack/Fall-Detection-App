// src/types/device.ts
export interface DeviceData {
  fall_detected: boolean;   // True: có té ngã
  latitude: number;         // Vĩ độ GPS
  longitude: number;        // Kinh độ GPS
  battery_pct: number;      // Phần trăm pin (%)
  fall_time: string;        // Thời gian xảy ra sự cố (ISO string)
  ack_fall: boolean;        // Cờ xác nhận app đã nhận thông báo
  emergency_mode?: boolean; // Chế độ khẩn cấp
  device_id?: string;       // ID thiết bị
  last_updated?: string;    // Lần cập nhật cuối
  connected?: boolean;      // Trạng thái kết nối
}

export interface PairedDevice {
  id: string;              // Mã phần cứng, ví dụ: 'ESP32_FALL_001', 'ESP32_FALL_002'
  name: string;            // Tên gợi nhớ, ví dụ: 'Thiết bị Phòng Khách', 'Cảm biến Cụ Bà'
  addedAt: string;         // Thời gian ghép nối (ISO string)
  location?: string;       // Ghi chú vị trí (tùy chọn)
}

export interface FallEvent {
  id: string;
  timestamp: string;        // ISO string
  latitude: number;
  longitude: number;
  battery_pct: number;
  acknowledged: boolean;
  deviceId?: string;        // Mã thiết bị phát hiện té ngã
  deviceName?: string;      // Tên gợi nhớ của thiết bị
}

export interface AppSettings {
  notificationsEnabled: boolean;
  backgroundMonitoring: boolean;  // Giám sát ngầm khi app ở background
  batteryThreshold: number;      // % cảnh báo pin thấp (default 20)
  emergencyContact?: string;
  deviceId: string;              // Thiết bị đang được chọn xem
  mapAutoFollow: boolean;
  pairedDevices?: PairedDevice[]; // Danh sách phần cứng đã ghép nối
}