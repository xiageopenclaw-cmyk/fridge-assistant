import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: { label: string; onPress: () => void };
}

const FRIDGE_ICON = require('../assets/fridge-icon-3d-nobg.webp');

export default function PageHeader({ title, subtitle, rightAction }: PageHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        {rightAction && (
          <TouchableOpacity onPress={rightAction.onPress} style={styles.rightBtn}>
            <Text style={styles.rightLabel}>{rightAction.label}</Text>
          </TouchableOpacity>
        )}
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

export function HeaderWithFridge({
  title,
  subtitle,
  rightAction,
}: PageHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.fridgeRow}>
        <Image source={FRIDGE_ICON} style={styles.fridgeImage} resizeMode="contain" />
        <View style={styles.headerTextBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {rightAction && (
              <TouchableOpacity onPress={rightAction.onPress} style={styles.rightBtn}>
                <Text style={styles.rightLabel}>{rightAction.label}</Text>
              </TouchableOpacity>
            )}
          </View>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 10,
  },
  fridgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  fridgeImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  headerTextBlock: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#3a5030',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#8a8a7e',
    marginTop: 4,
  },
  rightBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rightLabel: {
    fontSize: 15,
    color: '#6a9a52',
    fontWeight: '600',
  },
});
