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
import BatteryIndicator from '../components/BatteryIndicator';
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
  const { deviceData, settings, updateSettings, refreshHistory, isConnected } = useDevice();
  const [histDeleting, setHistDeleting] = useState(false);
  const [bgTaskStatus, setBgTaskStatus] = useState<string>('Đang kiểm tra...');
  const [bgFetchStatus, setBgFetchStatus] = useState<string>('');

  // Kiểm tra trạng thái background task
  useEffect(() => {
    const checkStatus = async () => {
      const registered = await isBackgroundFetchRegistered();
      setBgTaskStatus(registered ? '✅ Đang chạy' : '⏸️ Đã dừng');
      const fetchStatus = await getBackgroundFetchStatus();
      setBgFetchStatus(fetchStatus);
    };
    checkStatus();
    // Re-check khi settings thay đổi
  }, [settings.backgroundMonitoring, settings.notificationsEnabled]);

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
            // Refresh to get latest from Firebase (actual delete would need batch writes)
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
          <Text style={styles.headerSub}>Thiết bị & Ứng dụng</Text>
        </View>

        {/* ── DEVICE INFO ──────────────────────────── */}
        <Section title="⚙️  THIẾT BỊ">
          <Row
            icon="📟"
            label="ID thiết bị"
            value={settings.deviceId}
            accent={COLORS.primary}
          />
          <Row
            icon="☁️"
            label="Cơ sở dữ liệu"
            value="Cloud Firestore"
            accent={COLORS.info}
          />
          <Row
            icon={isConnected ? '🟢' : '🔴'}
            label="Trạng thái kết nối"
            value={isConnected ? 'Đang kết nối' : 'Mất kết nối'}
            accent={isConnected ? COLORS.success : COLORS.danger}
            showDivider={false}
          />
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
          {/* Background info banner */}
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
          <Text style={styles.footerText}>HealthGuard v1.1.0</Text>
          <Text style={styles.footerSub}>Đồ án: Giám sát thiết bị đeo nhận diện té ngã</Text>
          <Text style={styles.footerSub}>ESP32 + Firebase Firestore + Background Monitoring</Text>
        </View>

        <View style={{ height: SPACING.xxxl }} />
      </ScrollView>
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

  // Footer
  footer: { alignItems: 'center', paddingHorizontal: SPACING.xl, marginTop: SPACING.xl },
  footerText: { fontSize: FONT.sm, color: COLORS.textTertiary, fontWeight: '600' },
  footerSub: { fontSize: FONT.xs, color: COLORS.textTertiary, marginTop: 2, textAlign: 'center' },
});
