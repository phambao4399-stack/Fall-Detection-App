// src/components/AddDeviceModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOW, SPACING } from '../constants/theme';
import { useDevice } from '../context/DeviceContext';

interface AddDeviceModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRESET_IDS = ['ESP32_FALL_001', 'ESP32_FALL_002', 'ESP32_FALL_003'];
const PRESET_NAMES = ['Thiết bị ESP32 #1', 'Thiết bị Cụ Bà', 'Cảm biến Phòng ngủ', 'Cảm biến Đeo tay'];

export default function AddDeviceModal({ visible, onClose }: AddDeviceModalProps) {
  const { addPairedDevice } = useDevice();
  const [deviceId, setDeviceId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    const trimmedId = deviceId.trim();
    const trimmedName = deviceName.trim() || trimmedId;

    if (!trimmedId) {
      Alert.alert('Chưa nhập mã', 'Vui lòng nhập Mã nhận diện phần cứng (ví dụ: ESP32_FALL_002).');
      return;
    }

    setLoading(true);
    try {
      const res = await addPairedDevice(trimmedId, trimmedName);
      if (res.success) {
        Alert.alert(
          'Ghép nối thành công! 🎉',
          `Thiết bị [${trimmedId}] (${trimmedName}) đã được thêm vào hệ thống giám sát. Giờ đây điện thoại sẽ tự động nhận cảnh báo té ngã từ thiết bị này!`,
          [
            {
              text: 'OK',
              onPress: () => {
                setDeviceId('');
                setDeviceName('');
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert('Không thể thêm thiết bị', res.message || 'Có lỗi xảy ra.');
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Có lỗi xảy ra khi kết nối thiết bị.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.modalSheet, SHADOW.lg]}>
          <LinearGradient
            colors={['#1F2937', '#111827']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />

          {/* Header handle */}
          <View style={styles.dragHandle} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Title */}
            <View style={styles.headerRow}>
              <View style={styles.iconCircle}>
                <Text style={{ fontSize: 24 }}>📟</Text>
              </View>
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Text style={styles.modalTitle}>Thêm Phần Cứng Mới</Text>
                <Text style={styles.modalSub}>
                  Liên kết thiết bị ESP32 để nhận cảnh báo té ngã
                </Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Input 1: Device ID */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                MÃ NHẬN DIỆN PHẦN CỨNG (DEVICE ID) <Text style={{ color: COLORS.danger }}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="VD: ESP32_FALL_002"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={deviceId}
                onChangeText={setDeviceId}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {/* Quick ID chips */}
              <View style={styles.chipRow}>
                {PRESET_IDS.map((id) => (
                  <TouchableOpacity
                    key={id}
                    style={[styles.chip, deviceId === id && styles.chipActive]}
                    onPress={() => setDeviceId(id)}
                  >
                    <Text style={[styles.chipText, deviceId === id && styles.chipTextActive]}>
                      +{id}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Input 2: Device Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TÊN GỢI NHỚ / VỊ TRÍ (TÙY CHỌN)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="VD: Cảm biến Cụ Bà (Phòng ngủ)"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={deviceName}
                onChangeText={setDeviceName}
              />
              {/* Quick Name chips */}
              <View style={styles.chipRow}>
                {PRESET_NAMES.map((name) => (
                  <TouchableOpacity
                    key={name}
                    style={[styles.chip, deviceName === name && styles.chipActive]}
                    onPress={() => setDeviceName(name)}
                  >
                    <Text style={[styles.chipText, deviceName === name && styles.chipTextActive]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Security note */}
            <View style={styles.infoBanner}>
              <Text style={styles.infoIcon}>💡</Text>
              <Text style={styles.infoText}>
                Hệ thống sẽ tự động tạo kênh lắng nghe Firestore cho mã phần cứng này. Khi thiết bị gửi tín hiệu té ngã, chuông báo và thông báo đẩy sẽ lập tức kích hoạt.
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              onPress={handleAdd}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#4F46E5', '#3730A3']}
                style={styles.submitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>✓ Ghép nối & Giám sát ngay</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  backdrop: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    overflow: 'hidden',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 1.5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(79,70,229,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.4)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.8,
    marginBottom: SPACING.xs,
  },
  textInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: SPACING.sm,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {
    backgroundColor: 'rgba(79,70,229,0.3)',
    borderColor: '#6366F1',
  },
  chipText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
  },
  chipTextActive: {
    color: '#818CF8',
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59,130,246,0.12)',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
    marginBottom: SPACING.xl,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  submitBtn: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOW.md,
  },
  submitGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
