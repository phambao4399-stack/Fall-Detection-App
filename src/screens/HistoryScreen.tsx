// src/screens/HistoryScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDevice } from '../context/DeviceContext';
import { FallEvent } from '../types/device';
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../constants/theme';

type FilterType = 'all' | 'today' | 'week';

function isToday(isoString: string) {
  const d = new Date(isoString);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

function isThisWeek(isoString: string) {
  const d = new Date(isoString);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return d >= weekAgo;
}

function formatEventTime(isoString: string) {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { time: isoString, date: '' };
    // Dùng manual format vì toLocaleTimeString trên RN Android thường bị lỗi múi giờ
    const pad = (n: number) => n.toString().padStart(2, '0');
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    return {
      time: `${hours}:${minutes}:${seconds}`,
      date: `${day}/${month}/${year}`,
    };
  } catch {
    return { time: isoString, date: '' };
  }
}

function groupByDate(events: FallEvent[]) {
  const groups: Record<string, FallEvent[]> = {};
  events.forEach((e) => {
    const dateKey = formatEventTime(e.timestamp).date;
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(e);
  });
  return Object.entries(groups);
}

interface EventItemProps {
  event: FallEvent;
  onViewMap: (e: FallEvent) => void;
  onAcknowledge: (id: string) => void;
}

function EventItem({ event, onViewMap, onAcknowledge }: EventItemProps) {
  const { time } = formatEventTime(event.timestamp);
  const battColor =
    event.battery_pct >= 60 ? COLORS.success :
    event.battery_pct >= 30 ? COLORS.warning : COLORS.danger;

  return (
    <View style={[styles.eventCard, SHADOW.sm]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
        style={StyleSheet.absoluteFill}
      />
      {/* Left accent */}
      <View style={[styles.eventAccent, { backgroundColor: event.acknowledged ? COLORS.success : COLORS.danger }]} />

      <View style={styles.eventContent}>
        {/* Icon */}
        <View style={styles.eventIconWrap}>
          <LinearGradient
            colors={event.acknowledged ? [COLORS.success, '#1F8B4C'] : [COLORS.danger, '#CC1F16']}
            style={styles.eventIconGradient}
          >
            <Text style={styles.eventIcon}>{event.acknowledged ? '🛡️' : '⚠️'}</Text>
          </LinearGradient>
        </View>

        {/* Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>
            {event.acknowledged ? 'Sự cố đã xác nhận' : 'Cảnh báo té ngã'}
          </Text>
          <Text style={styles.eventTime}>🕐 {time}</Text>
          <Text style={styles.eventCoord} numberOfLines={1}>
            📍 {event.latitude?.toFixed(6) ?? '?'}°N, {event.longitude?.toFixed(6) ?? '?'}°E
          </Text>
          <View style={styles.eventFooter}>
            <View style={[styles.battChip, { borderColor: `${battColor}50` }]}>
              <Text style={[styles.battText, { color: battColor }]}>
                🔋 {Math.round(event.battery_pct ?? 0)}%
              </Text>
            </View>
            {event.acknowledged ? (
              <View style={styles.ackChip}>
                <Text style={styles.ackText}>✓ Đã xử lý</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.unackChip}
                onPress={() => onAcknowledge(event.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.unackText}>Xác nhận</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* View button */}
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => onViewMap(event)}
          activeOpacity={0.7}
        >
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.viewBtnGradient}>
            <Text style={styles.viewBtnText}>Xem map</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmptyState({ filter }: { filter: FilterType }) {
  const messages: Record<FilterType, { emoji: string; title: string; sub: string }> = {
    all: { emoji: '🎉', title: 'Chưa có sự cố nào', sub: 'Thiết bị đang hoạt động tốt.\nMọi cảnh báo té ngã sẽ được tự động lưu lại ở đây.' },
    today: { emoji: '☀️', title: 'Hôm nay bình an', sub: 'Không ghi nhận sự cố té ngã nào trong ngày.' },
    week: { emoji: '🗓️', title: 'Tuần này bình an', sub: 'Không có sự cố nào trong 7 ngày qua.' },
  };
  const m = messages[filter];
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{m.emoji}</Text>
      <Text style={styles.emptyTitle}>{m.title}</Text>
      <Text style={styles.emptySub}>{m.sub}</Text>
    </View>
  );
}

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const { fallEvents, refreshHistory, clearHistory, acknowledgeEvent } = useDevice();
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshHistory();
    setRefreshing(false);
  }, [refreshHistory]);

  const handleClear = () => {
    Alert.alert(
      'Xóa lịch sử sự kiện',
      'Bạn có chắc chắn muốn xóa toàn bộ lịch sử té ngã này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa sạch', style: 'destructive', onPress: () => clearHistory() },
      ]
    );
  };

  const handleViewMap = (_event: FallEvent) => {
    navigation.navigate('Bản đồ');
  };

  const filtered = fallEvents.filter((e) => {
    if (filter === 'today') return isToday(e.timestamp);
    if (filter === 'week') return isThisWeek(e.timestamp);
    return true;
  });

  const grouped = groupByDate(filtered);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: `Tất cả (${fallEvents.length})` },
    { key: 'today', label: 'Hôm nay' },
    { key: 'week', label: 'Tuần này' },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#0D1117', '#161B22']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <LinearGradient
        colors={['rgba(13,17,23,1)', 'rgba(13,17,23,0)']}
        style={styles.headerGradient}
        pointerEvents="none"
      />
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Lịch sử sự kiện</Text>
            <Text style={styles.headerSub}>
              {filtered.length} sự kiện {filter === 'today' ? 'hôm nay' : filter === 'week' ? 'tuần này' : 'được ghi nhận'}
            </Text>
          </View>
          {fallEvents.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.7}>
              <Text style={styles.clearBtnText}>🗑️ Xóa</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
          >
            {filter === f.key && (
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            )}
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={([date]) => date}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          renderItem={({ item: [date, events] }) => (
            <View>
              {/* Date header */}
              <View style={styles.dateHeader}>
                <View style={styles.dateLine} />
                <Text style={styles.dateText}>📅 {date}</Text>
                <View style={styles.dateLine} />
              </View>
              {events.map((e) => (
                <EventItem
                  key={e.id}
                  event={e}
                  onViewMap={handleViewMap}
                  onAcknowledge={acknowledgeEvent}
                />
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 160, zIndex: 1 },
  header: {
    paddingTop: 52,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
    zIndex: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: FONT.xxl, fontWeight: '800', color: COLORS.textPrimary },
  headerSub: { fontSize: FONT.sm, color: COLORS.textTertiary, marginTop: 4 },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,69,58,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.3)',
  },
  clearBtnText: {
    fontSize: FONT.xs,
    color: COLORS.danger,
    fontWeight: '700',
  },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    zIndex: 2,
  },
  filterBtn: {
    flex: 1,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    overflow: 'hidden',
  },
  filterBtnActive: { borderColor: COLORS.primary },
  filterText: { fontSize: FONT.sm, color: COLORS.textTertiary, fontWeight: '600' },
  filterTextActive: { color: '#fff', fontWeight: '700' },

  listContent: { paddingHorizontal: SPACING.xl, paddingBottom: 100 },

  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
    gap: SPACING.sm,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dateText: { fontSize: FONT.xs, color: COLORS.textTertiary, fontWeight: '600', letterSpacing: 0.5 },

  eventCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    backgroundColor: COLORS.bgSecondary,
    marginBottom: SPACING.md,
    flexDirection: 'row',
  },
  eventAccent: { width: 4 },
  eventContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  eventIconWrap: { width: 44, height: 44, borderRadius: RADIUS.md, overflow: 'hidden' },
  eventIconGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  eventIcon: { fontSize: 20 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: FONT.md, fontWeight: '700', color: COLORS.textPrimary },
  eventTime: { fontSize: FONT.xs, color: COLORS.textTertiary, marginTop: 2 },
  eventCoord: { fontSize: FONT.xs, color: COLORS.textSecondary, marginTop: 2 },
  eventFooter: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.xs },
  battChip: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  battText: { fontSize: 10, fontWeight: '600' },
  ackChip: {
    backgroundColor: 'rgba(52,199,89,0.15)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.3)',
  },
  ackText: { fontSize: 10, color: COLORS.success, fontWeight: '600' },
  unackChip: {
    backgroundColor: 'rgba(255,149,0,0.15)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.4)',
  },
  unackText: { fontSize: 10, color: COLORS.warning, fontWeight: '700' },

  viewBtn: { borderRadius: RADIUS.md, overflow: 'hidden' },
  viewBtnGradient: { paddingHorizontal: 12, paddingVertical: 8 },
  viewBtnText: { fontSize: FONT.xs, color: '#fff', fontWeight: '700' },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingTop: 80,
  },
  emptyEmoji: { fontSize: 56, marginBottom: SPACING.lg },
  emptyTitle: { fontSize: FONT.xl, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  emptySub: {
    fontSize: FONT.sm,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
});
