import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  Dimensions,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { HeaderWithFridge } from '../../components/PageHeader';
import { Colors, Fonts, Spacing, Radius } from '../../theme';
import { useInventory, useRecipes, CATEGORY_EMOJI, CATEGORY_BG, CATEGORY_ACCENT, InventoryItem, RecipeItem } from '../../hooks/useLiveData';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PAGE_PX = 16;
const CARD_GAP = 6;
const COLS = 5;
const CARD_W = (SCREEN_W - PAGE_PX * 2 - CARD_GAP * (COLS - 1)) / COLS;

const FOOD_IMAGES: Record<string, any> = {
  '乳制品': require('../../assets/food-dairy-v2-nobg.webp'),
  '肉类':   require('../../assets/food-meat-v2-nobg.webp'),
  '蔬菜':   require('../../assets/food-veggie-v2-nobg.webp'),
  '水果':   require('../../assets/food-fruit-v2-nobg.webp'),
  '蛋类':   require('../../assets/food-eggs-v2-nobg.webp'),
  '饮料':   require('../../assets/food-drinks-v2-nobg.webp'),
  '海鲜':   require('../../assets/food-seafood-v2-nobg.webp'),
  '零食':   require('../../assets/food-snacks-v2-nobg.webp'),
  '熟食':   require('../../assets/food-cooked-v2-nobg.webp'),
  '豆制品': require('../../assets/food-veggie-v2-nobg.webp'),
  '其他':   require('../../assets/food-other-v2-nobg.webp'),
};

// ── Category Card ──
function CategoryCard({
  name,
  count,
  onPress,
}: {
  name: string;
  count: number;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const bg = CATEGORY_BG[name] || '#e8e4dc';

  const onPressIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
  }, [scale]);
  const onPressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
  }, [scale]);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      style={styles.categoryCardOuter}
    >
      <Animated.View style={[styles.categoryCard, { transform: [{ scale }] }]}>
        <View style={[styles.catCircle, { backgroundColor: bg }]}>
          <Image source={FOOD_IMAGES[name]} style={styles.catImage} resizeMode="contain" />
        </View>
        <Text style={styles.catName} numberOfLines={1}>{name}</Text>
        <Text style={styles.catCount}>{count}种</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Bottom Sheet ──
function CategorySheet({
  catName,
  items,
  visible,
  onClose,
  onItemPress,
}: {
  catName: string | null;
  items: InventoryItem[];
  visible: boolean;
  onClose: () => void;
  onItemPress: (name: string) => void;
}) {
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 14,
        bounciness: 2,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_H,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  if (!catName) return null;
  const bg = CATEGORY_BG[catName] || '#e8e4dc';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
          </Pressable>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetCatCircle, { backgroundColor: bg }]}>
                <Image source={FOOD_IMAGES[catName]} style={styles.sheetCatImg} resizeMode="contain" />
              </View>
              <View style={styles.sheetHeaderText}>
                <Text style={styles.sheetTitle}>{catName}</Text>
                <Text style={styles.sheetSubtitle}>{items.length} 种食材</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
                <Text style={styles.sheetCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.sheetItem}
                activeOpacity={0.6}
                onPress={() => {
                  onClose();
                  setTimeout(() => onItemPress(item.name), 250);
                }}
              >
                <Text style={styles.sheetItemName}>{item.name}</Text>
                <Text style={styles.sheetItemQty}>{item.quantity}{item.unit}</Text>
                <View style={[styles.sheetItemBadge, { backgroundColor: (item.freshness?.color || '#5ca85c') + '15' }]}>
                  <Text style={[styles.sheetItemDays, { color: item.freshness?.color || '#5ca85c' }]}>
                    {item.freshness?.status || '新鲜'}
                  </Text>
                </View>
                <Text style={styles.sheetItemArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ── Hero Recipe Card (rotating) ──
function HeroRecipeCard({
  recipe,
  index,
  total,
}: {
  recipe: RecipeItem;
  index: number;
  total: number;
}) {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Cross-fade on rotation
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.4, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [recipe.name]);

  return (
    <Animated.View style={[styles.heroRecipeContent, { opacity: fadeAnim }]}>
      <View style={styles.heroRecipeHeader}>
        <Text style={styles.heroRecipeEmoji}>{recipe.emoji}</Text>
        <Text style={styles.heroRecipeName} numberOfLines={1}>{recipe.name}</Text>
      </View>
      <View style={styles.heroRecipeTags}>
        {recipe.tags.slice(0, 3).map((t) => (
          <View key={t} style={styles.heroTag}>
            <Text style={styles.heroTagText}>{t}</Text>
          </View>
        ))}
      </View>
      <View style={styles.heroRecipeMeta}>
        <Text style={styles.heroMetaText}>⏱ {recipe.time}</Text>
        <Text style={styles.heroMetaDot}>·</Text>
        <Text style={styles.heroMetaText}>🔥 {recipe.difficulty}</Text>
      </View>
      {/* Dots */}
      <View style={styles.heroDots}>
        {Array.from({ length: Math.min(total, 5) }).map((_, i) => (
          <View key={i} style={[styles.heroDot, i === index && styles.heroDotActive]} />
        ))}
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { items, alerts, total, byCategory, loading: inventoryLoading } = useInventory();
  const { recipes, loading: recipesLoading } = useRecipes();

  // Build category list
  const categories = Object.entries(byCategory)
    .map(([name, data]) => ({ name, count: data.count }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [sheetCat, setSheetCat] = useState<string | null>(null);

  // Hero recipe rotation
  const [heroIndex, setHeroIndex] = useState(0);
  const visibleAlerts = showAllAlerts ? alerts : alerts.slice(0, 5);
  const hasMore = alerts.length > 5;

  useEffect(() => {
    if (recipes.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex((i) => (i + 1) % recipes.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [recipes.length]);

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
        <HeaderWithFridge
          title="Hi Jarry!"
          subtitle={inventoryLoading ? '加载中…' : `冰箱里有 ${total} 种食材，${alerts.length} 样该吃了`}
        />

        {/* ── Hero: 小厨师 + 推荐菜 ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <Image
              source={require('../../assets/chef-character-nobg.webp')}
              style={styles.heroChef}
              resizeMode="contain"
            />
          </View>
          <TouchableOpacity
            style={styles.heroRight}
            activeOpacity={0.9}
            onPress={() => router.navigate('/(tabs)/recipes')}
          >
            <View style={styles.heroRecipeLabel}>
              <Text style={styles.heroRecipeLabelText}>今天吃啥</Text>
              <Text style={styles.heroRecipeLabelArrow}>→</Text>
            </View>
            {recipesLoading ? (
              <ActivityIndicator color={Colors.greenPrimary} style={{ padding: 12 }} />
            ) : recipes.length > 0 ? (
              <HeroRecipeCard
                recipe={recipes[heroIndex]}
                index={heroIndex}
                total={recipes.length}
              />
            ) : (
              <Text style={styles.heroEmpty}>暂无推荐</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── 快速操作 ── */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.qaBtn, styles.qaBtnOutline]}
            activeOpacity={0.8}
            onPress={() => router.navigate('/shopping')}
          >
            <Text style={styles.qaBtnIcon}>📋</Text>
            <Text style={styles.qaBtnLabelOutline}>采购清单</Text>
          </TouchableOpacity>
        </View>

        {/* ── 食材分类 ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <View style={styles.dotGrid}>
              <View style={styles.dot} /><View style={styles.dot} />
              <View style={styles.dot} /><View style={styles.dot} />
            </View>
          </View>
          <Text style={styles.sectionTitle}>食材分类</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catScrollOuter}
          contentContainerStyle={styles.catScrollInner}
        >
          {inventoryLoading ? (
            <ActivityIndicator color={Colors.greenPrimary} style={{ padding: 30 }} />
          ) : (
            <View style={styles.catGrid2Row}>
              <View style={styles.catRow}>
                {categories.slice(0, Math.ceil(categories.length / 2)).map((cat) => (
                  <CategoryCard
                    key={cat.name}
                    name={cat.name}
                    count={cat.count}
                    onPress={() => setSheetCat(cat.name)}
                  />
                ))}
              </View>
              {categories.length > Math.ceil(categories.length / 2) && (
                <View style={styles.catRow}>
                  {categories.slice(Math.ceil(categories.length / 2)).map((cat) => (
                    <CategoryCard
                      key={cat.name}
                      name={cat.name}
                      count={cat.count}
                      onPress={() => setSheetCat(cat.name)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* ── 过期提醒 ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Text style={{ fontSize: 18 }}>🕐</Text>
          </View>
          <Text style={styles.sectionTitle}>过期提醒</Text>
        </View>

        <View style={styles.expiryCard}>
          {alerts.length === 0 ? (
            <Text style={{ textAlign: 'center', color: Colors.subtitle, padding: 16 }}>
              🎉 所有食材都很新鲜！
            </Text>
          ) : (
            <>
              {visibleAlerts.map((item, i, arr) => (
                <View key={item.id}>
                  <TouchableOpacity
                    style={styles.expiryRow}
                    activeOpacity={0.6}
                    onPress={() => router.navigate(`/item/${encodeURIComponent(item.name)}?id=${item.id}`)}
                  >
                    <Text style={styles.expiryIcon}>{CATEGORY_EMOJI[item.category] || '📦'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.expiryName}>{item.name}</Text>
                      <Text style={styles.expirySub}>
                        {item.batch_label ? `${item.batch_label} · ` : ''}
                        {item.shelf_range ? `${item.shelf_range.min}-${item.shelf_range.max}天` : ''}
                      </Text>
                    </View>
                    <View style={[styles.expiryBadge, {
                      backgroundColor: (item.freshness?.color || '#5ca85c') + '18',
                    }]}>
                      <Text style={[styles.expiryDays, { color: item.freshness?.color || '#5ca85c' }]}>
                        {item.freshness?.emoji || '🟢'} {item.freshness?.status || '新鲜'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {i < arr.length - 1 && <View style={styles.expiryDivider} />}
                </View>
              ))}
              {/* 查看全部 / 收起 — 放在过期列表最下方 */}
              {hasMore && (
                <TouchableOpacity
                  style={styles.expiryToggle}
                  onPress={() => setShowAllAlerts(!showAllAlerts)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.expiryToggleText}>
                    {showAllAlerts ? '收起' : `查看全部 (${alerts.length})`}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Sheet */}
      <CategorySheet
        catName={sheetCat}
        items={sheetCat ? (byCategory[sheetCat]?.items || []) : []}
        visible={sheetCat !== null}
        onClose={() => setSheetCat(null)}
        onItemPress={(itemName) =>
          router.navigate(`/item/${encodeURIComponent(itemName)}`)
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  // ── Hero Card ──
  heroCard: {
    marginHorizontal: PAGE_PX,
    marginTop: 6,
    marginBottom: 14,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  heroLeft: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4faf0',
    borderTopLeftRadius: Radius.xl,
    borderBottomLeftRadius: Radius.xl,
    paddingVertical: 12,
  },
  heroChef: {
    width: 72,
    height: 72,
  },
  heroRight: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  heroRecipeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  heroRecipeLabelText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.semibold,
    color: Colors.greenPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroRecipeLabelArrow: {
    fontSize: 12,
    color: Colors.greenPrimary,
  },
  heroRecipeContent: {},
  heroRecipeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  heroRecipeEmoji: { fontSize: 18 },
  heroRecipeName: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
    color: Colors.title,
    flex: 1,
  },
  heroRecipeTags: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  heroTag: {
    backgroundColor: '#f4f6f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  heroTagText: {
    fontSize: 11,
    color: Colors.subtitle,
    fontWeight: Fonts.weights.medium,
  },
  heroRecipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  heroMetaText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.subtitle,
  },
  heroMetaDot: {
    fontSize: Fonts.sizes.xs,
    color: Colors.hint,
  },
  heroDots: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 2,
  },
  heroDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#d0d5c8',
  },
  heroDotActive: {
    backgroundColor: Colors.greenPrimary,
    width: 16,
    borderRadius: 2.5,
  },
  heroEmpty: {
    fontSize: Fonts.sizes.sm,
    color: Colors.hint,
    padding: 8,
  },

  // ── Quick Actions ──
  quickActions: {
    paddingHorizontal: PAGE_PX,
    gap: 10,
    marginTop: 0,
    marginBottom: 14,
  },
  qaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.greenPrimary,
    borderRadius: Radius.xl,
    paddingVertical: 14,
    gap: 8,
  },
  qaBtnOutline: {
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.divider,
  },
  qaBtnIcon: { fontSize: 20 },
  qaBtnLabel: { fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold, color: '#fff' },
  qaBtnLabelOutline: { fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold, color: Colors.title },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAGE_PX,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: 8,
  },
  sectionIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  dotGrid: { width: 18, height: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.greenDark },
  sectionTitle: { fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold, color: Colors.title },

  // ── Category scroll ──
  catScrollOuter: { marginVertical: 4 },
  catScrollInner: { paddingHorizontal: PAGE_PX },
  catGrid2Row: { flexDirection: 'column', gap: 10 },
  catRow: { flexDirection: 'row', gap: CARD_GAP },

  // ── Category Card ──
  categoryCardOuter: { width: CARD_W },
  categoryCard: {
    width: CARD_W,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  catCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  catImage: { width: 32, height: 32 },
  catName: { fontSize: 11, fontWeight: Fonts.weights.semibold, color: Colors.title, marginBottom: 1 },
  catCount: { fontSize: 10, fontWeight: Fonts.weights.regular, color: Colors.subtitle },

  // ── Expiry ──
  expiryCard: {
    marginHorizontal: PAGE_PX,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    paddingVertical: 4,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  expiryDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#e8e8e0', marginHorizontal: 4 },
  expiryIcon: { fontSize: 24 },
  expiryName: { fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold, color: Colors.title },
  expirySub: { fontSize: 11, color: Colors.subtitle, marginTop: 1 },
  expiryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.lg },
  expiryDays: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold },
  expiryToggle: {
    marginTop: 6,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e8e8e0',
  },
  expiryToggleText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.greenPrimary,
    fontWeight: Fonts.weights.semibold,
  },

  // ── Bottom Sheet ──
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    maxHeight: SCREEN_H * 0.55,
    paddingBottom: 34,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.divider, alignSelf: 'center', marginTop: 12, marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAGE_PX, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider, gap: 12 },
  sheetCatCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sheetCatImg: { width: 36, height: 36 },
  sheetHeaderText: { flex: 1 },
  sheetTitle: { fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.bold, color: Colors.title },
  sheetSubtitle: { fontSize: Fonts.sizes.sm, color: Colors.subtitle, marginTop: 2 },
  sheetCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f2eb', alignItems: 'center', justifyContent: 'center' },
  sheetCloseIcon: { fontSize: 14, color: Colors.subtitle },
  sheetScroll: { flexGrow: 0 },
  sheetScrollContent: { paddingHorizontal: PAGE_PX, paddingTop: 8 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, borderRadius: Radius.md, gap: 12 },
  sheetItemName: { flex: 1, fontSize: Fonts.sizes.base, color: Colors.body, fontWeight: Fonts.weights.medium },
  sheetItemQty: { fontSize: Fonts.sizes.sm, color: Colors.subtitle },
  sheetItemBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm },
  sheetItemDays: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold },
  sheetItemArrow: { fontSize: 20, color: Colors.hint },
});
