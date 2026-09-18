// src/screens/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDevice } from '../context/DeviceContext';
import { useAuth } from '../context/AuthContext';
import BatteryIndicator from '../components/BatteryIndicator';
import AddDeviceModal from '../components/AddDeviceModal';
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../constants/theme';
import { sendTestNotification } from '../services/notificationService';
import {
  isBackgroundFetchRegistered,
  getBackgroundFetchStatus,
} from '../services/backgroundFallCheck';

// ─── Section wrapper ────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={[styles.sectionCard, SHADOW.sm]}>{children}</View>
    </View>
  );
}

// ─── Row item ───────────────────────────────────────────────────────────────
interface RowProps {
  icon: string;
  label: string;
  value?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  accent?: string;
  showDivider?: boolean;
  danger?: boolean;
}

function Row({
  icon, label, value, rightElement, onPress, accent = COLORS.primary, showDivider = true, danger = false,
}: RowProps) {
  const Comp = onPress ? TouchableOpacity : View;
  return (
    <>
      <Comp style={styles.row} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.rowIcon, { backgroundColor: `${accent}20` }]}>
          <Text style={{ fontSize: 18 }}>{icon}</Text>
        </View>
        <Text style={[styles.rowLabel, danger && { color: COLORS.danger }]}>{label}</Text>
        <View style={styles.rowRight}>
          {rightElement ?? (
            <>
              {value ? <Text style={styles.rowValue}>{value}</Text> : null}
              {onPress ? <Text style={styles.rowArrow}>›</Text> : null}
            </>
          )}
        </View>
      </Comp>
      {showDivider && <View style={styles.divider} />}
    </>
  );
}

// ─── Battery threshold slider (manual +/- controls since no Slider installed) ─
function BatteryThreshold({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const color =
    value < 20 ? COLORS.danger : value < 40 ? COLORS.warning : COLORS.success;
  return (
    <View style={styles.sliderWrap}>
      <Text style={styles.sliderLabel}>Ngưỡng cảnh báo pin thấp</Text>
      <View style={styles.sliderRow}>
        <TouchableOpacity
          style={[styles.sliderBtn, { borderColor: COLORS.border }]}
          onPress={() => onChange(Math.max(5, value - 5))}
        >
          <Text style={styles.sliderBtnText}>−</Text>
        </TouchableOpacity>
        {/* Track */}
        <View style={styles.track}>
          <View
            style={[styles.trackFill, { width: `${value * 2}%`, backgroundColor: color }]}
          />
        </View>
        <TouchableOpacity
          style={[styles.sliderBtn, { borderColor: COLORS.border }]}
          onPress={() => onChange(Math.min(50, value + 5))}
        >
          <Text style={styles.sliderBtnText}>+</Text>
        </TouchableOpacity>
        <Text style={[styles.sliderValue, { color }]}>{value}%</Text>
      </View>
      <Text style={styles.sliderHint}>
        {value < 20 ? 'Ngưỡng thấp — Cảnh báo ít thường xuyên hơn'
          : value < 35 ? 'Ngưỡng phù hợp'
          : 'Ngưỡng cao — Cảnh báo sớm'}
      </Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const {
    deviceData,
    devicesData,
    pairedDevices,
    activeDeviceId,
    setActiveDeviceId,
    removePairedDevice,
    simulateDeviceFall,
    settings,
    updateSettings,
    refreshHistory,
    isConnected,
  } = useDevice();
  const { user, logout } = useAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [testingDeviceId, setTestingDeviceId] = useState<string | null>(null);
  const [histDeleting, setHistDeleting] = useState(false);
  const [bgTaskStatus, setBgTaskStatus] = useState<string>('Đang kiểm tra...');
  const [bgFetchStatus, setBgFetchStatus] = useState<string>('');

  // Xử lý giả lập té ngã Firebase để test
  const handleToggleFallSimulation = async (id: string, currentFall: boolean) => {
    setTestingDeviceId(id);
    try {
      await simulateDeviceFall(id, !currentFall);
      Alert.alert(
        !currentFall ? '🚨 Đã phát tín hiệu té ngã!' : '✅ Đã đặt lại bình thường',
        !currentFall
          ? `Đã gửi tín hiệu té ngã (fall_detected: true) lên Firestore cho [${id}]. Ứng dụng sẽ kích hoạt chuông và gửi thông báo!`
          : `Đã đưa trạng thái thiết bị [${id}] về bình thường.`
      );
    } catch (e: any) {
      Alert.alert('Lỗi Firebase', e?.message || 'Không thể cập nhật Firebase.');
    } finally {
      setTestingDeviceId(null);
    }
  };

  // Xóa / Gỡ phần cứng
  const handleRemoveDevice = (id: string, name: string) => {
    Alert.alert(
      'Hủy ghép nối thiết bị',
      `Bạn có chắc muốn gỡ [${name} (${id})] khỏi điện thoại này không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gỡ thiết bị',
          style: 'destructive',
          onPress: async () => {
            await removePairedDevice(id);
          },
        },
      ]
    );
  };

  // Kiểm tra trạng thái background task
  useEffect(() => {
    const checkStatus = async () => {
      const registered = await isBackgroundFetchRegistered();
      setBgTaskStatus(registered ? '✅ Đang chạy' : '⏸️ Đã dừng');
      const fetchStatus = await getBackgroundFetchStatus();
      setBgFetchStatus(fetchStatus);
    };
    checkStatus();
  }, [settings.backgroundMonitoring, settings.notificationsEnabled]);

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc muốn đăng xuất khỏi tài khoản Google này không? Bạn sẽ cần đăng nhập lại để vào ứng dụng.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Xóa lịch sử',
      'Bạn có chắc muốn xóa toàn bộ lịch sử sự kiện té ngã không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa tất cả',
          style: 'destructive',
          onPress: async () => {
            setHistDeleting(true);
            await refreshHistory();
            setHistDeleting(false);
            Alert.alert('Hoàn tất', 'Lịch sử đã được xóa.');
          },
        },
      ]
    );
  };

  const handleTestNotification = async () => {
    try {
      await sendTestNotification();
      Alert.alert('Đã gửi!', 'Kiểm tra thanh thông báo trên điện thoại của bạn.');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể gửi thông báo. Hãy kiểm tra quyền thông báo.');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#0D1117', '#161B22']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(13,17,23,1)', 'rgba(13,17,23,0)']}
        style={styles.headerGradient}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cài đặt</Text>
          <Text style={styles.headerSub}>Tài khoản & Thiết bị giám sát</Text>
        </View>

        {/* ── GOOGLE ACCOUNT SECTION ────────────────── */}
        <Section title="👤  TÀI KHOẢN GOOGLE">
          <View style={styles.googleAccountCard}>
            <View style={styles.googleAvatarWrap}>
              <Text style={styles.googleAvatarText}>
                {(user?.displayName || user?.email || 'G')[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.googleAccountInfo}>
              <Text style={styles.googleAccountName} numberOfLines={1}>
                {user?.displayName || 'Tài khoản Google'}
              </Text>
              <Text style={styles.googleAccountEmail} numberOfLines={1}>
                {user?.email || 'chua_dang_nhap@gmail.com'}
              </Text>
              <View style={styles.googleStatusBadge}>
                <View style={styles.googleStatusDot} />
                <Text style={styles.googleStatusText}>Đang bảo vệ 24/7</Text>
              </View>
            </View>
          </View>
          <View style={styles.divider} />
          <Row
            icon="🚪"
            label="Đăng xuất tài khoản Google"
            accent={COLORS.danger}
            danger
            onPress={handleLogout}
            showDivider={false}
          />
        </Section>

        {/* ── MULTI-DEVICE MANAGEMENT SECTION ──────────────────────── */}
        <Section title={`📟  PHẦN CỨNG GIÁM SÁT (${pairedDevices.length})`}>
          <View style={styles.deviceListHeaderNotice}>
            <Text style={styles.deviceListNoticeText}>
              Điện thoại sẽ tự động nhận cảnh báo té ngã từ tất cả phần cứng trong danh sách này 24/7.
            </Text>
          </View>

          {pairedDevices.length === 0 ? (
            <View style={styles.emptySettingsDevCard}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📟</Text>
              <Text style={styles.emptySettingsDevTitle}>Chưa có phần cứng nào được liên kết</Text>
              <Text style={styles.emptySettingsDevSub}>
                Tài khoản Gmail mới bắt đầu với 0 thiết bị. Để nhận cảnh báo té ngã từ phần cứng nào, hãy bấm nút "Thêm thiết bị phần cứng mới" bên dưới.
              </Text>
            </View>
          ) : (
            pairedDevices.map((dev, index) => {
              const devData = devicesData[dev.id];
              const isFalling = devData?.fall_detected === true;
              const isCurrentActive = dev.id === activeDeviceId;
              const batt = devData?.battery_pct ?? 100;

              return (
                <View key={dev.id} style={styles.deviceItemCard}>
                  <TouchableOpacity
                    style={styles.deviceItemMain}
                    onPress={() => setActiveDeviceId(dev.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.devAvatar, isFalling && styles.devAvatarFalling]}>
                      <Text style={{ fontSize: 20 }}>{isFalling ? '🚨' : '📟'}</Text>
                    </View>

                    <View style={{ flex: 1, marginLeft: SPACING.md }}>
                      <View style={styles.devNameRow}>
                        <Text style={styles.devNameText} numberOfLines={1}>
                          {dev.name}
                        </Text>
                        {isCurrentActive && (
                          <View style={styles.activeDevBadge}>
                            <Text style={styles.activeDevBadgeText}>Đang xem</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.devIdText}>Mã ID: {dev.id}</Text>

                      <View style={styles.devMetaRow}>
                        <View style={styles.devMetaChip}>
                          <View
                            style={[
                              styles.devStatusDot,
                              {
                                backgroundColor: isFalling
                                  ? COLORS.danger
                                  : isConnected
                                  ? COLORS.success
                                  : COLORS.danger,
                              },
                            ]}
                          />
                          <Text
                            style={[
                              styles.devMetaChipText,
                              isFalling && { color: COLORS.danger, fontWeight: 'bold' },
                            ]}
                          >
                            {isFalling
                              ? 'ĐANG TÉ NGÃ!'
                              : isConnected
                              ? 'Trực tuyến'
                              : 'Ngoại tuyến'}
                          </Text>
                        </View>
                        <Text style={styles.devBattText}>🔋 {batt}%</Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Control Actions Row */}
                  <View style={styles.devActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.testSimBtn,
                        isFalling && styles.testSimBtnReset,
                      ]}
                      onPress={() => handleToggleFallSimulation(dev.id, isFalling)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.testSimBtnText,
                          isFalling && { color: '#FFFFFF' },
                        ]}
                      >
                        {isFalling ? '⏹️ Tắt té ngã' : '🧪 Thử té ngã (Firebase)'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.removeDevBtn}
                      onPress={() => handleRemoveDevice(dev.id, dev.name)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.removeDevBtnText}>🗑️ Gỡ</Text>
                    </TouchableOpacity>
                  </View>

                  {index < pairedDevices.length - 1 && <View style={styles.dividerLight} />}
                </View>
              );
            })
          )}

          <View style={styles.addDeviceSectionWrap}>
            <TouchableOpacity
              style={styles.addDeviceButton}
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#4F46E5', '#3730A3']}
                style={styles.addDeviceGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.addDeviceBtnText}>➕ Thêm thiết bị phần cứng mới</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Section>

        {/* ── PIN SECTION ───────────────────────────── */}
        <Section title="🔋  PIN & TRẠNG THÁI">
          <View style={styles.batteryRow}>
            <View style={styles.batteryInfo}>
              <Text style={styles.battLabel}>Mức pin hiện tại</Text>
              <Text style={[
                styles.battValue,
                {
                  color: (deviceData?.battery_pct ?? 100) < 20 ? COLORS.danger
                    : (deviceData?.battery_pct ?? 100) < 50 ? COLORS.warning : COLORS.success
                }
              ]}>
                {deviceData?.battery_pct ?? '--'}%
              </Text>
            </View>
            <BatteryIndicator percent={deviceData?.battery_pct ?? 0} size="lg" showLabel={false} />
          </View>
          <View style={styles.divider} />
          <BatteryThreshold
            value={settings.batteryThreshold}
            onChange={(v) => updateSettings({ batteryThreshold: v })}
          />
        </Section>

        {/* ── NOTIFICATIONS ────────────────────────── */}
        <Section title="🔔  THÔNG BÁO">
          <Row
            icon="📳"
            label="Cảnh báo té ngã"
            accent={COLORS.danger}
            rightElement={
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={(v) => updateSettings({ notificationsEnabled: v })}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: `${COLORS.primary}80` }}
                thumbColor={settings.notificationsEnabled ? COLORS.primary : COLORS.textTertiary}
                ios_backgroundColor="rgba(255,255,255,0.1)"
              />
            }
          />
          <Row
            icon="🔔"
            label="Test thông báo"
            accent={COLORS.warning}
            onPress={handleTestNotification}
            showDivider={false}
            rightElement={
              <LinearGradient
                colors={[COLORS.warning, '#E07A00']}
                style={styles.testBtnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.testBtnText}>Gửi ›</Text>
              </LinearGradient>
            }
          />
        </Section>

        {/* ── BACKGROUND MONITORING ────────────────── */}
        <Section title="🌙  GIÁM SÁT NỀN">
          <Row
            icon="🔄"
            label="Chạy nền"
            accent={COLORS.success}
            rightElement={
              <Switch
                value={settings.backgroundMonitoring}
                onValueChange={(v) => updateSettings({ backgroundMonitoring: v })}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: `${COLORS.success}80` }}
                thumbColor={settings.backgroundMonitoring ? COLORS.success : COLORS.textTertiary}
                ios_backgroundColor="rgba(255,255,255,0.1)"
              />
            }
          />
          <Row
            icon="📊"
            label="Trạng thái task nền"
            value={bgTaskStatus}
            accent={COLORS.info}
          />
          <Row
            icon="⚡"
            label="Background Fetch"
            value={bgFetchStatus}
            accent={COLORS.info}
            showDivider={false}
          />
          <View style={styles.bgInfoBanner}>
            <Text style={styles.bgInfoIcon}>💡</Text>
            <Text style={styles.bgInfoText}>
              Khi bật chạy nền, app sẽ kiểm tra trạng thái thiết bị định kỳ và
              gửi thông báo ngay cả khi app không mở. Tần suất do hệ điều hành quyết định.
            </Text>
          </View>
        </Section>

        {/* ── MAP ──────────────────────────────────── */}
        <Section title="🗺️  BẢN ĐỒ">
          <Row
            icon="🎯"
            label="Tự động theo dõi thiết bị"
            accent={COLORS.info}
            rightElement={
              <Switch
                value={settings.mapAutoFollow}
                onValueChange={(v) => updateSettings({ mapAutoFollow: v })}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: `${COLORS.primary}80` }}
                thumbColor={settings.mapAutoFollow ? COLORS.primary : COLORS.textTertiary}
                ios_backgroundColor="rgba(255,255,255,0.1)"
              />
            }
            showDivider={false}
          />
        </Section>

        {/* ── DANGER ZONE ──────────────────────────── */}
        <Section title="🗑️  QUẢN LÝ DỮ LIỆU">
          <Row
            icon="🗑️"
            label={histDeleting ? 'Đang xóa...' : 'Xóa lịch sử sự kiện té ngã'}
            accent={COLORS.danger}
            onPress={histDeleting ? undefined : handleClearHistory}
            danger
            showDivider={false}
            rightElement={
              <LinearGradient
                colors={[COLORS.danger, '#CC1F16']}
                style={styles.dangerBtnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.dangerBtnText}>Xóa ›</Text>
              </LinearGradient>
            }
          />
        </Section>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>CareDrop v1.2.0</Text>
          <Text style={styles.footerSub}>Đồ án: Giám sát thiết bị đeo nhận diện té ngã</Text>
          <Text style={styles.footerSub}>ESP32 + Firebase Firestore + Background Monitoring</Text>
        </View>

        <View style={{ height: SPACING.xxxl }} />
      </ScrollView>

      {/* Modal Thêm Thiết Bị Mới */}
      <AddDeviceModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 160, zIndex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 52, paddingBottom: 40 },

  header: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    zIndex: 2,
  },
  headerTitle: { fontSize: FONT.xxl, fontWeight: '800', color: COLORS.textPrimary },
  headerSub: { fontSize: FONT.sm, color: COLORS.textTertiary, marginTop: 4 },

  section: { marginBottom: SPACING.lg, paddingHorizontal: SPACING.xl },
  sectionTitle: {
    fontSize: FONT.xs, fontWeight: '700', color: COLORS.textTertiary,
    letterSpacing: 1.5, marginBottom: SPACING.sm, marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },

  // Google Account Card
  googleAccountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  googleAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  googleAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  googleAccountInfo: {
    flex: 1,
  },
  googleAccountName: {
    fontSize: FONT.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  googleAccountEmail: {
    fontSize: FONT.xs,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  googleStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  googleStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 5,
  },
  googleStatusText: {
    fontSize: 10,
    color: COLORS.success,
    fontWeight: '600',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  rowIcon: {
    width: 38, height: 38, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: FONT.md, color: COLORS.textPrimary, fontWeight: '500' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowValue: { fontSize: FONT.sm, color: COLORS.textSecondary },
  rowArrow: { fontSize: 20, color: COLORS.textTertiary },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 72 },

  // Battery section
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  batteryInfo: {},
  battLabel: { fontSize: FONT.sm, color: COLORS.textTertiary, marginBottom: 4 },
  battValue: { fontSize: FONT.xxl, fontWeight: '800' },

  // Slider
  sliderWrap: { padding: SPACING.lg, paddingTop: SPACING.md },
  sliderLabel: { fontSize: FONT.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  sliderBtn: {
    width: 34, height: 34, borderRadius: RADIUS.md, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sliderBtnText: { color: COLORS.textPrimary, fontSize: FONT.lg, fontWeight: '700' },
  track: {
    flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.full, overflow: 'hidden',
  },
  trackFill: { height: '100%', borderRadius: RADIUS.full },
  sliderValue: { fontSize: FONT.md, fontWeight: '700', minWidth: 38, textAlign: 'right' },
  sliderHint: { fontSize: FONT.xs, color: COLORS.textTertiary, marginTop: 6 },

  // Danger
  dangerBtnGrad: {
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 7,
  },
  dangerBtnText: { fontSize: FONT.sm, fontWeight: '700', color: '#fff' },

  // Test notification button
  testBtnGrad: {
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 7,
  },
  testBtnText: { fontSize: FONT.sm, fontWeight: '700', color: '#fff' },

  // Background info banner
  bgInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(10,132,255,0.08)',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  bgInfoIcon: { fontSize: 16, marginTop: 1 },
  bgInfoText: {
    flex: 1,
    fontSize: FONT.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  // Multi-device styles
  deviceListHeaderNotice: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  deviceListNoticeText: {
    fontSize: FONT.xs,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  deviceItemCard: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  deviceItemMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  devAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  devAvatarFalling: {
    backgroundColor: 'rgba(255,69,58,0.2)',
    borderColor: COLORS.danger,
  },
  devNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  devNameText: {
    fontSize: FONT.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  activeDevBadge: {
    backgroundColor: 'rgba(52,199,89,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.3)',
  },
  activeDevBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.success,
  },
  devIdText: {
    fontSize: FONT.xs,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  devMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: SPACING.md,
  },
  devMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  devStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  devMetaChipText: {
    fontSize: FONT.xs,
    color: COLORS.textSecondary,
  },
  devBattText: {
    fontSize: FONT.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  devActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: SPACING.sm,
    paddingLeft: 44 + SPACING.md,
  },
  testSimBtn: {
    backgroundColor: 'rgba(255,159,10,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,159,10,0.3)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  testSimBtnReset: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
  },
  testSimBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.warning,
  },
  removeDevBtn: {
    backgroundColor: 'rgba(255,69,58,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.2)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  removeDevBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.danger,
  },
  dividerLight: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginTop: SPACING.md,
  },
  addDeviceSectionWrap: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  addDeviceButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  addDeviceGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDeviceBtnText: {
    fontSize: FONT.sm,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Empty Settings Devices Card
  emptySettingsDevCard: {
    padding: SPACING.xl,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  emptySettingsDevTitle: {
    fontSize: FONT.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySettingsDevSub: {
    fontSize: FONT.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: SPACING.md,
  },

  // Footer
  footer: { alignItems: 'center', paddingHorizontal: SPACING.xl, marginTop: SPACING.xl },
  footerText: { fontSize: FONT.sm, color: COLORS.textTertiary, fontWeight: '600' },
  footerSub: { fontSize: FONT.xs, color: COLORS.textTertiary, marginTop: 2, textAlign: 'center' },
});
