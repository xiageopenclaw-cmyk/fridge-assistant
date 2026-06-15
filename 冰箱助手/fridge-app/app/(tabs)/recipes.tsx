import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HeaderWithFridge } from '../../components/PageHeader';
import { Colors, Fonts, Spacing, Radius } from '../../theme';
import { useRecipes, useInventory, RecipeItem } from '../../hooks/useLiveData';
import { BASE_URL } from '../../services/api';
import { useCart } from '../../stores/CartContext';

const { width: SCREEN_W } = Dimensions.get('window');
const PAGE_PX = 20;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MEAL_LABELS: Record<string, { title: string; emoji: string }> = {
  breakfast: { title: '早餐', emoji: '🌅' },
  lunch: { title: '午餐', emoji: '☀️' },
  dinner: { title: '晚餐', emoji: '🌙' },
};

export default function RecipesScreen() {
  const { meals, recipes, loading, refresh } = useRecipes();
  const { items } = useInventory();
  const { addItem } = useCart();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [planned, setPlanned] = useState<Set<string>>(new Set());

  const toggleExpand = (name: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(expanded === name ? null : name);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetch(`${BASE_URL}/api/recipes/refresh`, { method: 'POST' });
    } catch {}
    await refresh();
    setRefreshing(false);
  }, [refresh]);

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
          title="今天吃啥"
          subtitle={loading ? '加载中…' : `冰箱 ${items.length} 种食材 · 三餐搭配`}
          rightAction={{
            label: refreshing ? '生成中…' : '↻ 换一批',
            onPress: handleRefresh,
          }}
        />

        {loading ? (
          <ActivityIndicator color={Colors.greenPrimary} style={{ padding: 60 }} />
        ) : !meals ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>暂无推荐</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={handleRefresh}>
              <Text style={styles.emptyBtnText}>点此生成菜谱</Text>
            </TouchableOpacity>
          </View>
        ) : (
          (['breakfast', 'lunch', 'dinner'] as const).map((mealKey) => {
            const mealRecipes = meals[mealKey] || [];
            if (mealRecipes.length === 0) return null;
            const label = MEAL_LABELS[mealKey];

            return (
              <View key={mealKey}>
                <View style={styles.mealHeader}>
                  <Text style={styles.mealTitle}>
                    {label.emoji} {label.title}
                  </Text>
                  <Text style={styles.mealCount}>{mealRecipes.length} 道推荐</Text>
                </View>

                {mealRecipes.map((r: RecipeItem) => {
                  const isOpen = expanded === `${mealKey}-${r.name}`;
                  const isPlanned = planned.has(`${mealKey}-${r.name}`);
                  return (
                    <View key={r.name} style={styles.recipeCard}>
                      {/* Header row */}
                      <View style={styles.recipeHeader}>
                        {/* Plan checkbox */}
                        <TouchableOpacity
                          style={[styles.planCheck, isPlanned && styles.planCheckDone]}
                          onPress={() => {
                            const key = `${mealKey}-${r.name}`;
                            const next = new Set(planned);
                            if (isPlanned) {
                              next.delete(key);
                            } else {
                              next.add(key);
                              // Push missing ingredients to cart
                              (r.missing || []).forEach((m) => {
                                addItem({ name: m, category: '其他', reason: `菜谱需要: ${r.name}`, shelf_hint: '' });
                              });
                            }
                            setPlanned(next);
                          }}>
                          {isPlanned && <Text style={styles.planCheckMark}>✓</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.recipeInner}
                          activeOpacity={0.95}
                          onPress={() => toggleExpand(`${mealKey}-${r.name}`)}>
                        <View style={styles.recipeLeft}>
                          <View style={styles.nameRow}>
                            <Text style={styles.recipeName}>{r.emoji} {r.name}</Text>
                            <Text style={styles.expandArrow}>{isOpen ? '▲' : '▼'}</Text>
                          </View>
                          <View style={styles.tagRow}>
                            {r.tags.map((t) => (
                              <View key={t} style={styles.tag}>
                                <Text style={styles.tagText}>{t}</Text>
                              </View>
                            ))}
                          </View>
                          <View style={styles.metaRow}>
                            <Text style={styles.metaText}>⏱ {r.time}</Text>
                            <Text style={styles.metaDot}>·</Text>
                            <Text style={styles.metaText}>🔥 {r.difficulty}</Text>
                            <Text style={styles.metaDot}>·</Text>
                            <Text style={styles.metaText}>用 {r.itemCount} 样</Text>
                          </View>
                          {r.missing && r.missing.length > 0 && (
                            <View style={styles.missingRow}>
                              <Text style={styles.missingText}>需采购: {r.missing.join('、')}</Text>
                            </View>
                          )}
                        </View>
                        <View style={[styles.foodCircle, { backgroundColor: r.color || '#e9f5e1' }]}>
                          <Text style={{ fontSize: 36 }}>{r.emoji}</Text>
                        </View>
                        </TouchableOpacity>
                      </View>

                      {/* Expanded content */}
                      {isOpen && (
                        <View style={styles.expanded}>
                          <View style={styles.divider} />

                          <Text style={styles.sectionTitle}>步骤</Text>
                          {r.steps.map((step, i) => (
                            <View key={i} style={styles.stepRow}>
                              <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>{i + 1}</Text>
                              </View>
                              <Text style={styles.stepText}>{step}</Text>
                            </View>
                          ))}

                          {r.nutrition && (
                            <>
                              <Text style={styles.sectionTitle}>营养</Text>
                              <View style={styles.nutRow}>
                                <Text style={styles.nutVal}>🔥 {r.nutrition.kcal}kcal</Text>
                                <Text style={styles.nutVal}>💪 P{r.nutrition.protein}g</Text>
                                <Text style={styles.nutVal}>🍚 C{r.nutrition.carbs}g</Text>
                                <Text style={styles.nutVal}>🧈 F{r.nutrition.fat}g</Text>
                              </View>
                            </>
                          )}

                          {r.tip && (
                            <View style={styles.tipBox}>
                              <Text style={styles.tipIcon}>💡</Text>
                              <Text style={styles.tipText}>{r.tip}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })
        )}

        <View style={styles.hintRow}>
          <Text style={styles.hintText}>
            食材不够？往冰箱里补点货，能解锁更多菜谱
          </Text>
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

  // ── Meal section header ──
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: PAGE_PX,
    marginBottom: 10,
    marginTop: 6,
  },
  mealTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
    color: Colors.title,
  },
  mealCount: {
    fontSize: Fonts.sizes.sm,
    color: Colors.subtitle,
  },

  // ── Empty state ──
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: Fonts.sizes.md,
    color: Colors.hint,
    marginBottom: 16,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.greenPrimary,
    borderRadius: Radius.lg,
  },
  emptyBtnText: {
    fontSize: Fonts.sizes.md,
    color: '#fff',
    fontWeight: Fonts.weights.medium,
  },

  // ── Recipe card ──
  recipeCard: {
    marginHorizontal: PAGE_PX,
    marginBottom: 14,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    paddingVertical: 18,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  recipeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planCheck: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2,
    borderColor: Colors.divider, alignItems: 'center', justifyContent: 'center',
  },
  planCheckDone: { backgroundColor: Colors.greenPrimary, borderColor: Colors.greenPrimary },
  planCheckMark: { color: '#fff', fontSize: 14, fontWeight: Fonts.weights.bold },
  recipeInner: { flexDirection: 'row', flex: 1, alignItems: 'center', gap: 8 },
  recipeLeft: { flex: 1, paddingRight: 4 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recipeName: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
    color: Colors.title,
    flex: 1,
  },
  expandArrow: {
    fontSize: 12,
    color: Colors.hint,
    marginLeft: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#f0f5ec',
    borderRadius: Radius.lg,
  },
  tagText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.medium,
    color: '#5a7a3a',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.subtitle,
  },
  metaDot: {
    fontSize: Fonts.sizes.sm,
    color: Colors.hint,
  },
  missingRow: {
    marginTop: 6,
  },
  missingText: {
    fontSize: Fonts.sizes.xs,
    color: '#b07020',
    backgroundColor: '#fef3e6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },

  foodCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Expanded ──
  expanded: { marginTop: 4 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e8e8e0',
    marginVertical: 14,
  },
  sectionTitle: {
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.weights.semibold,
    color: Colors.title,
    marginBottom: 10,
    marginTop: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0edd5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: Fonts.weights.bold,
    color: '#5a7a3a',
  },
  stepText: {
    flex: 1,
    fontSize: Fonts.sizes.md,
    color: Colors.body,
    lineHeight: 22,
  },
  nutRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  nutVal: {
    fontSize: Fonts.sizes.sm,
    color: Colors.subtitle,
    backgroundColor: '#f4f6f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.lg,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fdfaee',
    borderRadius: Radius.lg,
    padding: 12,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#f0eac8',
  },
  tipIcon: { fontSize: 16, marginTop: 1 },
  tipText: {
    flex: 1,
    fontSize: Fonts.sizes.sm,
    color: '#8a7a4a',
    lineHeight: 20,
  },

  hintRow: {
    paddingHorizontal: PAGE_PX,
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  hintText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.subtitle,
  },
});
