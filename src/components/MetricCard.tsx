// src/components/MetricCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING, FONT, SHADOW } from '../constants/theme';

interface MetricCardProps {
  icon: string;
  label: string;
  value: string;
  subValue?: string;
  accentColor?: string;
  onPress?: () => void;
  style?: ViewStyle;
  badge?: string;
  badgeColor?: string;
}

export default function MetricCard({
  icon,
  label,
  value,
  subValue,
  accentColor = COLORS.primary,
  onPress,
  style,
  badge,
  badgeColor = COLORS.warning,
}: MetricCardProps) {
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.card, SHADOW.md, style]}
    >
      {/* Subtle gradient background */}
      <LinearGradient
        colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.03)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Accent top border */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.content}>
        {/* Icon circle */}
        <View style={[styles.iconWrap, { backgroundColor: `${accentColor}20` }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>

        <View style={styles.textWrap}>
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.value, { color: accentColor }]} numberOfLines={1}>
            {value}
          </Text>
          {subValue ? (
            <Text style={styles.subValue} numberOfLines={1}>
              {subValue}
            </Text>
          ) : null}
        </View>

        {/* Optional badge / arrow */}
        {badge ? (
          <View style={[styles.badge, { backgroundColor: `${badgeColor}25`, borderColor: `${badgeColor}60` }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
          </View>
        ) : onPress ? (
          <Text style={[styles.arrow, { color: accentColor }]}>›</Text>
        ) : null}
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    backgroundColor: COLORS.bgSecondary,
  },
  accentBar: {
    height: 3,
    width: '100%',
    opacity: 0.9,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: FONT.xs,
    color: COLORS.textTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  value: {
    fontSize: FONT.lg,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subValue: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  badge: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: FONT.xs,
    fontWeight: '700',
  },
  arrow: {
    fontSize: 24,
    fontWeight: '300',
    opacity: 0.7,
  },
});
