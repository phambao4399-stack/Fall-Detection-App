// src/navigation/AppNavigator.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DashboardScreen from '../screens/DashboardScreen';
import MapScreen from '../screens/Mapscreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useDevice } from '../context/DeviceContext';
import { COLORS, FONT, RADIUS, SPACING } from '../constants/theme';

const Tab = createBottomTabNavigator();

const { width } = Dimensions.get('window');

const TAB_ITEMS = [
  { name: 'Tổng quan', icon: '🏠', activeIcon: '🏠' },
  { name: 'Bản đồ', icon: '🗺️', activeIcon: '🗺️' },
  { name: 'Lịch sử', icon: '📋', activeIcon: '📋' },
  { name: 'Cài đặt', icon: '⚙️', activeIcon: '⚙️' },
];

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

function CustomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { deviceData } = useDevice();
  const isFall = deviceData?.fall_detected ?? false;

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: insets.bottom }]}>
      {/* Gradient blur overlay */}
      <LinearGradient
        colors={['rgba(13,17,23,0)', 'rgba(13,17,23,0.98)']}
        style={styles.tabGradient}
        pointerEvents="none"
      />

      <View style={[styles.tabBar]}>
        <LinearGradient
          colors={['#1C2333', '#161B22']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const item = TAB_ITEMS[index];

          // Show badge on History tab if fall detected
          const showBadge = index === 2 && isFall;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              {/* Active indicator pill */}
              {isFocused && (
                <View style={styles.activePill}>
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </View>
              )}

              {/* Icon container */}
              <View style={styles.tabIconWrap}>
                <Text style={[styles.tabIcon, isFocused && styles.tabIconActive]}>
                  {item.icon}
                </Text>
                {/* Notification badge */}
                {showBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>!</Text>
                  </View>
                )}
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          animation: 'shift',
        }}
      >
        <Tab.Screen name="Tổng quan" component={DashboardScreen} />
        <Tab.Screen name="Bản đồ" component={MapScreen} />
        <Tab.Screen name="Lịch sử" component={HistoryScreen} />
        <Tab.Screen name="Cài đặt" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    height: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  activePill: {
    position: 'absolute',
    top: 6,
    left: 8,
    right: 8,
    height: 3,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: 6,
  },
  tabIconWrap: { position: 'relative' },
  tabIcon: { fontSize: 22, opacity: 0.4 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: FONT.xs, marginTop: 2, fontWeight: '600' },
  tabLabelActive: { color: COLORS.primary },
  tabLabelInactive: { color: COLORS.textTertiary },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#1C2333',
  },
  badgeText: { fontSize: 9, color: '#fff', fontWeight: '900' },
});
