import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { HeaderWithFridge } from '../../components/PageHeader';
import { Colors, Fonts, Spacing, Radius } from '../../theme';

const PAGE_PX = 20;

const DIET_GOALS = [
  { label: '高蛋白', active: true },
  { label: '低脂', active: true },
  { label: '控糖', active: false },
  { label: '补钙', active: false },
  { label: '补铁', active: true },
  { label: '高纤维', active: false },
  { label: '低钠', active: false },
  { label: '增肌', active: true },
];

export default function ProfileScreen() {
  const router = useRouter();
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);

  const handleResetProfile = () => {
    router.push('/onboarding');
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#CDE4B9', '#d5e8c4', '#f5f5f3']}
        locations={[0, 0.4, 1]}
        style={styles.topGradient}
        pointerEvents="none"
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <HeaderWithFridge title="我的" subtitle="个人设置 · 数据管理" />

        {/* Family */}
        <TouchableOpacity style={styles.card} activeOpacity={0.7}>
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>👨‍👩‍👧</Text>
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>家庭账户</Text>
              <Text style={styles.cardSub}>多人共用冰箱，即将推出</Text>
            </View>
            <View style={styles.nextBadge}>
              <Text style={styles.nextBadgeText}>Next</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Diet Profile */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => setProfileExpanded(!profileExpanded)}
        >
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>📋</Text>
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>饮食档案</Text>
              <Text style={styles.cardSub}>性别 · 身高 · 体重 · 年龄 · 体脂率 · 食疗目标</Text>
            </View>
            <Text style={styles.chevron}>{profileExpanded ? '▲' : '▼'}</Text>
          </View>
          {profileExpanded && (
            <View style={styles.expanded}>
              <View style={styles.profileGrid}>
                {[
                  { key: 'gender', label: '性别', val: '男' },
                  { key: 'height', label: '身高', val: '178 cm' },
                  { key: 'weight', label: '体重', val: '72 kg' },
                  { key: 'age', label: '年龄', val: '28 岁' },
                  { key: 'bodyFat', label: '体脂率', val: '18%' },
                  { key: 'conditions', label: '基础病', val: '无' },
                ].map((it) => (
                  <View key={it.key} style={styles.profileBox}>
                    <Text style={styles.profileLabel}>{it.label}</Text>
                    <Text style={styles.profileVal}>{it.val}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.goalSectionTitle}>食疗目标</Text>
              <View style={styles.goalGrid}>
                {DIET_GOALS.map((g) => (
                  <View
                    key={g.label}
                    style={[
                      styles.goalTag,
                      g.active ? styles.goalTagOn : styles.goalTagOff,
                    ]}
                  >
                    <Text
                      style={[
                        styles.goalTagText,
                        g.active ? styles.goalTagTextOn : styles.goalTagTextOff,
                      ]}
                    >
                      {g.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Nutrition Report */}
        <TouchableOpacity style={styles.card} activeOpacity={0.7}>
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>📊</Text>
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>营养周报</Text>
              <Text style={styles.cardSub}>查看每周营养摄入统计与分析</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Subscription */}
        <TouchableOpacity style={styles.card} activeOpacity={0.7}>
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>💎</Text>
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>订阅管理</Text>
              <Text style={styles.cardSub}>¥38/月 · 下次续费7月8日</Text>
            </View>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>Pro</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Camera */}
        <TouchableOpacity style={styles.card} activeOpacity={0.7}>
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>🔌</Text>
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>冰箱摄像头</Text>
              <Text style={styles.cardSub}>ESP32-S3-CAM · 🟢 在线 · 电量92%</Text>
            </View>
            <View style={styles.onlineBadge}>
              <Text style={styles.onlineBadgeText}>在线</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Notification Toggle */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>🔔</Text>
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>临期提醒</Text>
              <Text style={styles.cardSub}>食材过期前推送通知</Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
              trackColor={{ false: Colors.divider, true: Colors.greenFaded }}
              thumbColor={notifEnabled ? Colors.greenPrimary : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Bottom tools */}
        <View style={styles.toolRow}>
          {[
            { icon: '🔔', label: '通知设置' },
            { icon: '📤', label: '数据导出' },
            { icon: '💬', label: '帮助' },
          ].map((t) => (
            <TouchableOpacity key={t.label} style={styles.toolBtn} activeOpacity={0.7}>
              <Text style={styles.toolIcon}>{t.icon}</Text>
              <Text style={styles.toolLabel}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reset */}
        <TouchableOpacity style={styles.resetBtn} activeOpacity={0.6} onPress={handleResetProfile}>
          <Text style={styles.resetBtnText}>🔄 重置饮食档案</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  card: {
    marginHorizontal: PAGE_PX,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eef4ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 20 },
  cardText: { flex: 1 },
  cardTitle: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.semibold,
    color: Colors.title,
  },
  cardSub: {
    fontSize: Fonts.sizes.sm,
    color: Colors.subtitle,
    marginTop: 3,
  },
  chevron: { fontSize: 12, color: Colors.hint },
  nextBadge: {
    backgroundColor: '#eef4ea',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  nextBadgeText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.semibold,
    color: Colors.greenPrimary,
  },
  proBadge: {
    backgroundColor: '#eef4ea',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  proBadgeText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.semibold,
    color: Colors.greenPrimary,
  },
  onlineBadge: {
    backgroundColor: '#edf7e8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  onlineBadgeText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.semibold,
    color: Colors.green,
  },

  expanded: {
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
    paddingTop: 16,
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileBox: {
    width: '30%',
    backgroundColor: '#f4f6f0',
    borderRadius: Radius.md,
    padding: 12,
    alignItems: 'center',
  },
  profileLabel: {
    fontSize: Fonts.sizes.xs,
    color: Colors.subtitle,
  },
  profileVal: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.semibold,
    color: Colors.title,
    marginTop: 4,
  },
  goalSectionTitle: {
    fontSize: Fonts.sizes.base,
    fontWeight: Fonts.weights.semibold,
    color: Colors.title,
    marginTop: 16,
    marginBottom: 10,
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalTag: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  goalTagOn: { backgroundColor: '#e7f0d8' },
  goalTagOff: { backgroundColor: '#f0f0ed' },
  goalTagText: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.medium },
  goalTagTextOn: { color: Colors.greenPrimary },
  goalTagTextOff: { color: Colors.hint },

  toolRow: {
    flexDirection: 'row',
    marginHorizontal: PAGE_PX,
    marginTop: 14,
    gap: 12,
  },
  toolBtn: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  toolIcon: { fontSize: 22, marginBottom: 6 },
  toolLabel: { fontSize: Fonts.sizes.sm, color: Colors.body },

  resetBtn: {
    marginHorizontal: PAGE_PX,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    backgroundColor: '#fdf2f2',
    borderWidth: 1,
    borderColor: '#f0cece',
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.medium,
    color: '#c0392b',
  },
});
