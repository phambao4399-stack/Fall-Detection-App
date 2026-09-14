// src/components/FallAlertModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../constants/theme';
import { useDevice } from '../context/DeviceContext';

const { width, height } = Dimensions.get('window');

export default function FallAlertModal() {
  const { deviceData, acknowledgefall } = useDevice();
  const isFall = deviceData?.fall_detected ?? false;

  const flashAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Flash background
  useEffect(() => {
    if (!isFall) {
      scaleAnim.setValue(0.7);
      setElapsedSeconds(0);
      return;
    }

    // Pop-in animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Flashing background
    const flashLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 500, useNativeDriver: false }),
        Animated.timing(flashAnim, { toValue: 0, duration: 500, useNativeDriver: false }),
      ])
    );
    flashLoop.start();

    // Shake animation
    const shakeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 6, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 4, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -4, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
        Animated.delay(1500),
      ])
    );
    shakeLoop.start();

    // Elapsed timer
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);

    return () => {
      flashLoop.stop();
      shakeLoop.stop();
      clearInterval(timer);
      flashAnim.setValue(0);
      shakeAnim.setValue(0);
    };
  }, [isFall]);

  const bgColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,69,58,0.92)', 'rgba(180,20,12,0.96)'],
  });

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m} phút ${sec} giây` : `${sec} giây`;
  };

  return (
    <Modal
      visible={isFall}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { backgroundColor: bgColor }]}>
        {/* Content card */}
        <Animated.View
          style={[
            styles.card,
            SHADOW.lg,
            {
              transform: [
                { scale: scaleAnim },
                { translateX: shakeAnim },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['#1A0A0A', '#2D0F0F']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          {/* Warning icon */}
          <View style={styles.iconRing}>
            <View style={styles.iconInner}>
              <Text style={styles.alertIcon}>⚠️</Text>
            </View>
          </View>

          <Text style={styles.title}>PHÁT HIỆN TÉ NGÃ!</Text>
          <Text style={styles.subtitle}>Thiết bị ESP32_FALL_001</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>THỜI GIAN</Text>
              <Text style={styles.statValue}>{formatElapsed(elapsedSeconds)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>TỌA ĐỘ</Text>
              <Text style={styles.statValue} numberOfLines={2}>
                {deviceData?.latitude?.toFixed(5) ?? '--'}{'\n'}
                {deviceData?.longitude?.toFixed(5) ?? '--'}
              </Text>
            </View>
          </View>

          <Text style={styles.hint}>
            Người dùng có thể đã ngã. Hãy kiểm tra ngay!
          </Text>

          {/* Acknowledge button */}
          <TouchableOpacity
            style={styles.ackBtn}
            onPress={acknowledgefall}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF9F0A', '#E07A00']}
              style={styles.ackBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.ackBtnText}>✓  Đã kiểm tra — Tắt cảnh báo</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  card: {
    width: width - 40,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255,100,90,0.4)',
    overflow: 'hidden',
    alignItems: 'center',
    padding: SPACING.xxxl,
    paddingTop: SPACING.xl,
  },
  iconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255,69,58,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    backgroundColor: 'rgba(255,69,58,0.1)',
  },
  iconInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,69,58,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIcon: {
    fontSize: 38,
  },
  title: {
    fontSize: FONT.xxl,
    fontWeight: '900',
    color: '#FF453A',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT.sm,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: SPACING.xl,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    width: '100%',
    marginBottom: SPACING.lg,
  },
  statItem: {
    flex: 1,
    padding: SPACING.md,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: SPACING.md,
  },
  statLabel: {
    fontSize: FONT.xs,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: FONT.sm,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  hint: {
    fontSize: FONT.sm,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  ackBtn: {
    width: '100%',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    ...SHADOW.md,
  },
  ackBtnGradient: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ackBtnText: {
    fontSize: FONT.md,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.3,
  },
});
