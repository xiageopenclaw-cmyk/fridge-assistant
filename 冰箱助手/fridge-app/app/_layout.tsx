import React from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CartProvider } from '../stores/CartContext';
import { HomeIcon, StatusIcon, RecordIcon, CalendarIcon, PersonIcon } from '../components/TabIcons';

const NAV_BAR_BG = 'rgba(245,245,243,0.95)';
const NAV_ICON_COLOR = '#4a6141';
const NAV_ICON_ACTIVE = '#3a5030';
const FAB_BG = '#ffffff';

const TABS = [
  { name: '(tabs)', label: '首页', icon: HomeIcon },
  { name: 'status', label: '状态', icon: StatusIcon },
  { name: 'record', label: '记录', icon: RecordIcon, isFab: true },
  { name: 'calendar', label: '日历', icon: CalendarIcon },
  { name: 'profile', label: '我的', icon: PersonIcon },
];

function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  function isActive(tab: typeof TABS[0]) {
    if (tab.name === '(tabs)') {
      // Home active for root, shopping, item, recipes
      return pathname === '/' || pathname === '/(tabs)' ||
        pathname.startsWith('/shopping') || pathname.startsWith('/item');
    }
    return pathname.includes(`/(tabs)/${tab.name}`);
  }

  return (
    <View style={[styles.navBar, { paddingBottom: insets.bottom || 4 }]}>
      {TABS.map((tab) => {
        const active = isActive(tab);
        const color = active ? NAV_ICON_ACTIVE : NAV_ICON_COLOR;
        const Icon = tab.icon;

        if (tab.isFab) {
          return (
            <TouchableOpacity
              key={tab.label}
              style={styles.fabContainer}
              onPress={() => router.navigate('/(tabs)/record')}
              activeOpacity={0.8}
            >
              <View style={styles.fabCircle}>
                <Icon size={26} />
              </View>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={tab.label}
            style={styles.navItem}
            onPress={() => {
              if (tab.name === '(tabs)') router.navigate('/(tabs)');
              else router.navigate(`/(tabs)/${tab.name}`);
            }}
            activeOpacity={0.7}
          >
            <Icon size={22} />
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function RootLayout() {
  return (
    <CartProvider>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.content}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="shopping" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="item" />
          </Stack>
        </View>
        <BottomNav />
      </View>
    </CartProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    ...(Platform.OS === 'web' ? { height: '100dvh', overflow: 'hidden' as const } : {}),
  },
  content: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    backgroundColor: NAV_BAR_BG,
    borderTopWidth: 0,
    paddingTop: 6,
    alignItems: 'flex-end',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 2,
  },
  fabContainer: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 2,
  },
  fabCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: FAB_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    marginBottom: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  navLabel: {
    fontSize: 10,
    color: NAV_ICON_COLOR,
    marginTop: 2,
  },
  navLabelActive: {
    color: NAV_ICON_ACTIVE,
    fontWeight: '600',
  },
});
