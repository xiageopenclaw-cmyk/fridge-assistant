import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Fonts, Spacing, Radius } from '../../theme';
import { getInventory, InventoryItem } from '../../services/api';
import { CATEGORY_EMOJI, CATEGORY_BG, CATEGORY_ACCENT } from '../../hooks/useLiveData';

const PAGE_PX = 20;

const NUTRITION_DB: Record<string, Array<{ label: string; value: string }>> = {
  '牛奶': [{ label: '热量', value: '65 kcal/100ml' }, { label: '蛋白质', value: '3.2g' }, { label: '钙', value: '120mg' }],
  '鸡胸肉': [{ label: '热量', value: '165 kcal/100g' }, { label: '蛋白质', value: '31g' }, { label: '脂肪', value: '3.6g' }],
  '牛肉': [{ label: '热量', value: '250 kcal/100g' }, { label: '蛋白质', value: '26g' }, { label: '铁', value: '2.6mg' }],
  '菠菜': [{ label: '热量', value: '23 kcal/100g' }, { label: '纤维', value: '2.2g' }, { label: '铁', value: '2.7mg' }],
  '西兰花': [{ label: '热量', value: '34 kcal/100g' }, { label: '维C', value: '89mg' }, { label: '纤维', value: '2.6g' }],
  '番茄': [{ label: '热量', value: '18 kcal/100g' }, { label: '维C', value: '14mg' }, { label: '番茄红素', value: '高' }],
  '鸡蛋': [{ label: '热量', value: '78 kcal/个' }, { label: '蛋白质', value: '6g/个' }, { label: '维生素D', value: '1μg' }],
  '豆腐': [{ label: '热量', value: '76 kcal/100g' }, { label: '蛋白质', value: '8g' }, { label: '钙', value: '350mg' }],
  '老豆腐': [{ label: '热量', value: '80 kcal/100g' }, { label: '蛋白质', value: '8g' }, { label: '钙', value: '350mg' }],
  '苹果': [{ label: '热量', value: '52 kcal/个' }, { label: '纤维', value: '4.4g' }, { label: '维C', value: '8mg' }],
  '葡萄': [{ label: '热量', value: '69 kcal/100g' }, { label: '抗氧化', value: '高' }, { label: '糖', value: '16g' }],
  '橙汁': [{ label: '热量', value: '45 kcal/100ml' }, { label: '维C', value: '30mg' }, { label: '糖', value: '10g' }],
  '奶酪棒': [{ label: '热量', value: '80 kcal/支' }, { label: '蛋白质', value: '5g' }, { label: '钙', value: '200mg' }],
  '蛋炒饭': [{ label: '热量', value: '350 kcal/盒' }, { label: '蛋白质', value: '12g' }, { label: '碳水', value: '45g' }],
  '小葱': [{ label: '热量', value: '25 kcal/100g' }, { label: '维C', value: '27mg' }, { label: '叶酸', value: '64μg' }],
  '蒜': [{ label: '热量', value: '149 kcal/100g' }, { label: '大蒜素', value: '高' }, { label: '维B6', value: '1.2mg' }],
};

const TIPS_DB: Record<string, string> = {
  '牛奶': '牛奶临期可以做酸奶或蛋糕，避免浪费。开封后24小时内喝完最佳',
  '鸡胸肉': '鸡胸肉切薄片用淀粉腌制更嫩',
  '牛肉': '牛腱子适合炖汤，牛肉片适合快炒',
  '菠菜': '菠菜焯水可去草酸，口感更好',
  '西兰花': '西兰花焯水后冰镇更翠绿',
  '番茄': '番茄炒蛋是万能菜，加糖更鲜',
  '鸡蛋': '鸡蛋冷水下锅煮8分钟是溏心的',
  '老豆腐': '老豆腐适合红烧、煎炸，嫩豆腐适合凉拌',
  '苹果': '苹果带皮吃营养更好',
  '葡萄': '葡萄冰冻后当零食超赞',
  '蛋炒饭': '隔夜饭炒蛋炒饭最好吃，粒粒分明',
  '小葱': '小葱切花冷冻保存，随用随取',
  '蒜': '大蒜发芽了也能吃，蒜苗炒肉别有风味',
  '奶酪棒': '即食零食，做西餐配料也不错',
};

const DEFAULT_TIPS: Record<string, string> = {
  '蔬菜': '绿叶菜用湿润厨房纸包裹冷藏，保鲜更久',
  '肉类': '肉类分装冷冻，每次取一份解冻，避免反复冻融',
  '水果': '水果不要和蔬菜混放，苹果释放乙烯会催熟',
  '乳制品': '牛奶开封后尽量3天内饮用完毕',
  '蛋类': '鸡蛋尖端朝下存放，蛋黄居中保鲜更久',
  '海鲜': '海鲜解冻后尽快食用，不要反复冷冻',
  '饮料': '开封后密封冷藏，3天内饮用最佳',
  '零食': '零食密封保存防潮，避免阳光直射',
  '熟食': '熟食趁热食用口感最佳，剩菜加盖冷藏不超过2天',
  '豆制品': '豆腐泡在凉水里每天换水，可延长保质期',
  '调味品': '调味品远离灶火存放，开盖后密封',
};

export default function ItemDetailScreen() {
  const router = useRouter();
  const { name, id } = useLocalSearchParams<{ name: string; id?: string }>();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await getInventory();
        if (cancelled) return;
        const decoded = decodeURIComponent(name || '');
        // Match by id first, then by name
        const found = items.find(
          (i: any) => (id && String(i.id) === String(id)) || i.name === decoded
        );
        setItem(found || null);
      } catch {
        setItem(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [name, id]);

  if (loading) {
    return (
      <View style={styles.root}>
        <ActivityIndicator color={Colors.greenPrimary} style={{ flex: 1 }} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.root}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>食材未找到</Text>
          <Text style={styles.emptySub}>"{decodeURIComponent(name || '')}" 不在当前冰箱库存中</Text>
          <TouchableOpacity style={styles.backBtnLarge} onPress={() => router.back()}>
            <Text style={styles.backBtnLargeText}>← 返回</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const icon = CATEGORY_EMOJI[item.category] || '📦';
  const categoryBg = CATEGORY_BG[item.category] || '#e8e4dc';
  const categoryColor = CATEGORY_ACCENT[item.category] || '#8a8178';
  const nutrition = NUTRITION_DB[item.name] || [
    { label: '类别', value: item.category },
    { label: '数量', value: `${item.quantity}${item.unit}` },
    { label: '保鲜', value: `${item.shelf_range?.min || 0}-${item.shelf_range?.max || 7} 天` },
  ];
  const tips = TIPS_DB[item.name] || DEFAULT_TIPS[item.category] || '保持冰箱温度在4°C以下';

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#CDE4B9', '#d5e8c4', '#f5f5f3']} locations={[0, 0.4, 1]} style={styles.topGradient} pointerEvents="none" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{item.name}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconCircle}>
            <Text style={styles.heroEmoji}>{icon}</Text>
          </View>
          <Text style={styles.heroName}>{item.name}</Text>
          <View style={styles.heroMetaRow}>
            <View style={[styles.categoryTag, { backgroundColor: categoryBg }]}>
              <Text style={[styles.categoryTagText, { color: categoryColor }]}>{item.category}</Text>
            </View>
            <Text style={styles.heroQty}>{item.quantity}{item.unit}</Text>
          </View>
        </View>

        {/* Freshness */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={{ fontSize: 18, marginRight: 8 }}>{item.freshness?.emoji}</Text>
            <View style={styles.statusTextBlock}>
              <Text style={styles.statusLabel}>{item.freshness?.status}</Text>
              <Text style={styles.statusDays}>购买 {item.freshness?.elapsed_days} 天前</Text>
            </View>
            <View style={styles.statusBarBg}>
              <View style={[styles.statusBarFill, {
                backgroundColor: item.freshness?.color, width: `${Math.min((item.freshness?.percent || 0), 100)}%`,
              }]} />
            </View>
          </View>
        </View>

        {/* 存放信息 */}
        <Text style={styles.sectionTitle}>存放信息</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>购买日期</Text>
            <Text style={styles.infoValue}>{item.purchase_date}</Text>
          </View>
          {item.production_date ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>生产日期</Text>
              <Text style={styles.infoValue}>{item.production_date}</Text>
            </View>
          ) : null}
          {item.batch_label ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>批次</Text>
              <Text style={styles.infoValue}>{item.batch_label}</Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>保鲜建议</Text>
            <Text style={styles.infoValue}>
              {item.shelf_range?.min || 0}-{item.shelf_range?.max || 7} 天
              {item.expiry_source === 'package' ? '（按包装保质期）' : item.expiry_source === 'verified' ? '（查证数据）' : '（一般建议）'}
            </Text>
          </View>
          {item.opened_date ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>开封日期</Text>
              <Text style={styles.infoValue}>{item.opened_date}</Text>
            </View>
          ) : null}
        </View>

        {/* Nutrition */}
        <Text style={styles.sectionTitle}>营养成分</Text>
        <View style={styles.card}>
          <View style={styles.nutritionGrid}>
            {nutrition.map((n) => (
              <View key={n.label} style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{n.value}</Text>
                <Text style={styles.nutritionLabel}>{n.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tips */}
        <Text style={styles.sectionTitle}>小贴士</Text>
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>{tips}</Text>
        </View>

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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 20, color: Colors.title, marginTop: -1 },
  headerTitle: { fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold, color: Colors.title },
  headerRight: { width: 40 },
  heroCard: { alignItems: 'center', marginHorizontal: PAGE_PX, marginTop: 16, marginBottom: 12, backgroundColor: Colors.card, borderRadius: Radius.xxl, padding: 28 },
  heroIconCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#f4f6f0', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroEmoji: { fontSize: 44 },
  heroName: { fontSize: Fonts.sizes.xxl, fontWeight: Fonts.weights.bold, color: Colors.title, marginBottom: 8 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryTag: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full },
  categoryTagText: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.medium },
  heroQty: { fontSize: Fonts.sizes.sm, color: Colors.subtitle },
  card: { marginHorizontal: PAGE_PX, marginBottom: 12, backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 18 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusTextBlock: { flex: 1 },
  statusLabel: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.semibold, color: Colors.title },
  statusDays: { fontSize: Fonts.sizes.sm, color: Colors.subtitle, marginTop: 2 },
  statusBarBg: { width: 80, height: 6, backgroundColor: '#eef0ea', borderRadius: 3, overflow: 'hidden' },
  statusBarFill: { height: 6, borderRadius: 3 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0e8' },
  infoLabel: { fontSize: Fonts.sizes.sm, color: Colors.subtitle },
  infoValue: { fontSize: Fonts.sizes.sm, color: Colors.title, fontWeight: Fonts.weights.medium, maxWidth: '60%', textAlign: 'right' },
  sectionTitle: { fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold, color: Colors.title, paddingHorizontal: PAGE_PX, marginTop: Spacing.xl, marginBottom: Spacing.md },
  nutritionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  nutritionItem: { flex: 1, minWidth: '30%', backgroundColor: '#f4f6f0', borderRadius: Radius.md, padding: 14, alignItems: 'center' },
  nutritionValue: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.semibold, color: Colors.title },
  nutritionLabel: { fontSize: Fonts.sizes.xs, color: Colors.subtitle, marginTop: 4 },
  tipCard: { marginHorizontal: PAGE_PX, flexDirection: 'row', backgroundColor: '#fdfaee', borderRadius: Radius.xl, padding: 16, gap: 10, borderLeftWidth: 3, borderLeftColor: '#e0b04c' },
  tipIcon: { fontSize: 20 },
  tipText: { flex: 1, fontSize: Fonts.sizes.sm, color: Colors.body, lineHeight: 20 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold, color: Colors.title, marginBottom: 8 },
  emptySub: { fontSize: Fonts.sizes.sm, color: Colors.subtitle, textAlign: 'center', marginBottom: 28 },
  backBtnLarge: { backgroundColor: Colors.greenPrimary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: Radius.xl },
  backBtnLargeText: { fontSize: Fonts.sizes.base, fontWeight: Fonts.weights.semibold, color: '#fff' },
});
