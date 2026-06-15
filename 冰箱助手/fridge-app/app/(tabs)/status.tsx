import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { HeaderWithFridge } from '../../components/PageHeader';
import { Colors, Fonts, Spacing, Radius } from '../../theme';
import { useInventory, CATEGORY_EMOJI } from '../../hooks/useLiveData';
import { getNutrition, NutritionScore } from '../../services/api';

const PAGE_PX = 20;

// ── Sub-component: Score ring ──
function ScoreRing({ score, color, label, sub }: { score: number; color: string; label: string; sub?: string }) {
  const ringSize = 72;
  const stroke = 4;
  const radius = (ringSize - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(score / 100, 1);
  return (
    <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: ringSize, height: ringSize, borderRadius: ringSize / 2,
        backgroundColor: color + '12', alignItems: 'center', justifyContent: 'center',
        borderWidth: stroke, borderColor: color + '30',
      }}>
        <Text style={{
          fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold,
          color: color, lineHeight: 28,
        }}>{score}</Text>
        {sub ? <Text style={{ fontSize: 10, color: Colors.subtitle, marginTop: -2 }}>{sub}</Text> : null}
      </View>
      <Text style={{
        fontSize: 9, color: Colors.subtitle, marginTop: 4,
        textAlign: 'center', width: 80,
      }}>{label}</Text>
    </View>
  );
}

// ── Sub-component: HEI bar ──
function HeiBar({
  label, score, max, comment,
}: { label: string; score: number; max: number; comment: string }) {
  const pct = max > 0 ? score / max : 0;
  const barColor = pct >= 0.7 ? '#7dab6e' : pct >= 0.4 ? '#e8953a' : '#e0554a';
  const commentColor = pct >= 0.7 ? '#3a7030' : pct >= 0.4 ? '#b07020' : '#c0392b';
  return (
    <View style={styles.heiRow}>
      <Text style={styles.heiLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.heiBarTrack}>
        <View style={[styles.heiBarFill, {
          width: `${Math.min(pct * 100, 100)}%`,
          backgroundColor: barColor,
        }]} />
      </View>
      <Text style={styles.heiScore}>{score}/{max}</Text>
      <Text style={[styles.heiComment, { color: commentColor }]}>{comment}</Text>
    </View>
  );
}

export default function StatusScreen() {
  const router = useRouter();
  const { items, alerts, expiring, watch, total, byCategory, loading: invLoading } = useInventory();
  const [nutrition, setNutrition] = useState<NutritionScore | null>(null);
  const [nutLoading, setNutLoading] = useState(true);

  const loadNutrition = useCallback(async () => {
    try {
      const data = await getNutrition();
      setNutrition(data);
    } catch {
      setNutrition(null);
    } finally {
      setNutLoading(false);
    }
  }, []);

  useEffect(() => { loadNutrition(); }, [loadNutrition]);

  const freshCount = items.filter((i) => i.freshness?.status === '新鲜' || i.freshness?.status === '刚放入').length;
  const watchCount = items.filter((i) => i.freshness?.status === '尽快吃').length;
  const expiredCount = items.filter((i) => i.freshness?.status === '过期').length;
  const freshnessScore = total > 0
    ? Math.max(0, Math.round(100 - (watchCount / total) * 50 - (expiredCount / total) * 100))
    : 100;

  const loading = invLoading || nutLoading;

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
          title="状态"
          subtitle={loading ? '加载中…' : `${total}样食材 · ${watchCount}样尽快吃 · ${expiredCount}样过期`}
          rightAction={{ label: '↻', onPress: loadNutrition }}
        />

        {loading ? (
          <ActivityIndicator color={Colors.greenPrimary} style={{ padding: 40 }} />
        ) : (
          <>
            {/* ── Overview cards row ── */}
            <View style={styles.overviewRow}>
              <ScoreRing score={freshnessScore} color={Colors.greenDark} label="新鲜度" />
              <View style={{ width: 12 }} />
              <ScoreRing
                score={nutrition?.hei_total || 0}
                color="#6a4a8a"
                label="HEI 营养"
                sub={nutrition?.overall_grade || '—'}
              />
              <View style={{ width: 12 }} />
              <ScoreRing
                score={nutrition?.nova_summary?.nova_score || 0}
                color="#3a7a8a"
                label="天然度"
                sub={`G1 ${nutrition?.nova_summary?.g1_pct || 0}%`}
              />
            </View>

            {/* ── DBI-16 膳食平衡指数 ── */}
            <View style={styles.card}>
              <View style={styles.cardSectionHeader}>
                <Text style={styles.cardSectionIcon}>📊</Text>
                <Text style={styles.cardTitle}>膳食平衡指数（DBI-16）</Text>
                <Text style={styles.citation}>引用自何宇纳等. 营养学报. 2018</Text>
              </View>

              <View style={styles.dbiRow}>
                <View style={styles.dbiMetric}>
                  <Text style={styles.dbiMetricLabel}>摄入不足</Text>
                  <Text style={[styles.dbiMetricVal, { color: '#c0392b' }]}>{nutrition?.dbi_lbs || 0}</Text>
                  <Text style={styles.dbiMetricDesc}>{nutrition?.dbi_lbs && nutrition.dbi_lbs > 12 ? '需补' : '正常'}</Text>
                </View>
                <View style={styles.dbiMetric}>
                  <Text style={styles.dbiMetricLabel}>摄入过量</Text>
                  <Text style={[styles.dbiMetricVal, { color: '#e8953a' }]}>{nutrition?.dbi_hbs || 0}</Text>
                  <Text style={styles.dbiMetricDesc}>{nutrition?.dbi_hbs && nutrition.dbi_hbs > 8 ? '需控' : '正常'}</Text>
                </View>
                <View style={styles.dbiMetric}>
                  <Text style={styles.dbiMetricLabel}>质量距</Text>
                  <Text style={[styles.dbiMetricVal, { color: '#6a4a8a' }]}>{nutrition?.dbi_dqd || 0}</Text>
                  <Text style={styles.dbiMetricDesc}>{nutrition?.dbi_level || '—'}</Text>
                </View>
              </View>
              <Text style={styles.dbiInterpretation}>{nutrition?.dbi_interpretation || ''}</Text>
            </View>

            {/* ── HEI-2020 子维度 ── */}
            <View style={styles.card}>
              <View style={styles.cardSectionHeader}>
                <Text style={styles.cardSectionIcon}>🧬</Text>
                <Text style={styles.cardTitle}>健康饮食指数（HEI-2020）</Text>
                <Text style={styles.citation}>基于 USDA/NCI 标准</Text>
              </View>

              {/* Adequacy section */}
              <Text style={styles.heiSectionLabel}>充足性指标</Text>
              {nutrition?.hei_components && Object.entries(nutrition.hei_components)
                .filter(([k]) => {
                  const isMod = ['refined_grain', 'sodium', 'added_sugar', 'sat_fat'].includes(k);
                  return !isMod;
                })
                .map(([key, comp]) => (
                  <HeiBar key={key} label={comp.label} score={comp.score} max={comp.max} comment={comp.comment} />
                ))}

              {/* Moderation section */}
              <Text style={[styles.heiSectionLabel, { marginTop: 14 }]}>节制性指标</Text>
              {nutrition?.hei_components && Object.entries(nutrition.hei_components)
                .filter(([k]) => ['refined_grain', 'sodium', 'added_sugar', 'sat_fat'].includes(k))
                .map(([key, comp]) => (
                  <HeiBar key={key} label={comp.label} score={comp.score} max={comp.max} comment={comp.comment} />
                ))}
            </View>

            {/* ── NOVA 食物加工度 ── */}
            <View style={styles.card}>
              <View style={styles.cardSectionHeader}>
                <Text style={styles.cardSectionIcon}>🌿</Text>
                <Text style={styles.cardTitle}>食物加工度（NOVA）</Text>
                <Text style={styles.citation}>Monteiro et al. BMJ 2023</Text>
              </View>
              <View style={styles.novaBarRow}>
                {[
                  { label: '天然食材', pct: nutrition?.nova_summary?.g1_pct || 0, color: '#7dab6e' },
                  { label: '烹饪调料', pct: nutrition?.nova_summary?.g2_pct || 0, color: '#d4c87a' },
                  { label: '加工食品', pct: nutrition?.nova_summary?.g3_pct || 0, color: '#e8953a' },
                  { label: '超加工', pct: nutrition?.nova_summary?.g4_pct || 0, color: '#e0554a' },
                ].map((seg) => (
                  <View key={seg.label} style={[styles.novaSegment, { flex: Math.max(seg.pct, 2) }]}>
                    <View style={[styles.novaSegmentFill, { backgroundColor: seg.color, width: '100%', height: 32, borderRadius: 6 }]} />
                    <Text style={styles.novaSegLabel}>{seg.label}</Text>
                    <Text style={styles.novaSegPct}>{seg.pct}%</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.novaInterp}>{nutrition?.nova_summary?.interpretation || ''}</Text>
            </View>

            {/* ── 营养建议 ── */}
            {nutrition?.recommendations && nutrition.recommendations.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardSectionHeader}>
                  <Text style={styles.cardSectionIcon}>💡</Text>
                  <Text style={styles.cardTitle}>营养建议</Text>
                </View>
                {nutrition.recommendations.map((rec, i) => (
                  <View key={i} style={styles.recRow}>
                    <Text style={styles.recDot}>•</Text>
                    <Text style={styles.recText}>{rec}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── 食材分类（精简版，不重复首页） ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>食材分类</Text>
              <View style={styles.pillRow}>
                {Object.entries(byCategory).map(([name, data]) => (
                  <View key={name} style={styles.pill}>
                    <Text style={styles.pillIcon}>{CATEGORY_EMOJI[name] || '📦'}</Text>
                    <Text style={styles.pillText}>{name} {data.count}</Text>
                  </View>
                ))}
              </View>
              <View style={{ height: 8 }} />
              {Object.entries(byCategory).map(([name, data]) => {
                const pct = total > 0 ? Math.round((data.count / total) * 100) : 0;
                return (
                  <View key={name} style={styles.barRow}>
                    <Text style={styles.barName}>{name}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, {
                        width: `${Math.min(pct * 2.6, 100)}%`,
                        backgroundColor: '#7dab6e',
                      }]} />
                    </View>
                    <Text style={styles.barPct}>{pct}%</Text>
                  </View>
                );
              })}
            </View>

            {/* ── 过期提醒（保留核心入口） ── */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={styles.cardTitle}>⚠️ 临期食材</Text>
                <TouchableOpacity onPress={() => router.navigate('/')}>
                  <Text style={{ fontSize: 12, color: Colors.greenPrimary }}>查看全部 →</Text>
                </TouchableOpacity>
              </View>
              {alerts.length === 0 ? (
                <Text style={{ color: Colors.subtitle, textAlign: 'center', padding: 12 }}>🎉 所有食材新鲜</Text>
              ) : (
                alerts.slice(0, 5).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.expiryMini}
                    activeOpacity={0.7}
                    onPress={() => router.navigate(`/item/${encodeURIComponent(item.name)}?id=${item.id}`)}
                  >
                    <Text style={styles.expiryMiniIcon}>{CATEGORY_EMOJI[item.category] || '📦'}</Text>
                    <Text style={styles.expiryMiniName}>{item.name}</Text>
                    <Text style={[styles.expiryMiniStatus, { color: item.freshness?.color || '#5ca85c' }]}>
                      {item.freshness?.emoji} {item.freshness?.status}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: PAGE_PX,
    marginBottom: 16,
    marginTop: 4,
  },

  card: {
    marginHorizontal: PAGE_PX,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.bold, color: Colors.title },
  cardSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  cardSectionIcon: { fontSize: 18 },
  citation: { fontSize: 9, color: Colors.hint, fontWeight: Fonts.weights.regular, marginLeft: 'auto' },

  // DBI
  dbiRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  dbiMetric: { alignItems: 'center' },
  dbiMetricLabel: { fontSize: 11, color: Colors.subtitle, marginBottom: 2 },
  dbiMetricVal: { fontSize: 28, fontWeight: Fonts.weights.bold },
  dbiMetricDesc: { fontSize: 10, color: Colors.hint, marginTop: 2 },
  dbiInterpretation: {
    fontSize: Fonts.sizes.sm, color: Colors.body, lineHeight: 20,
    backgroundColor: '#f8f9f5', padding: 10, borderRadius: Radius.md,
    marginTop: 4,
  },

  // HEI
  heiSectionLabel: { fontSize: 11, fontWeight: Fonts.weights.semibold, color: Colors.subtitle, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  heiRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  heiLabel: { width: 84, fontSize: 11, color: Colors.body, fontWeight: Fonts.weights.medium },
  heiBarTrack: { flex: 1, height: 6, backgroundColor: '#f0f3eb', borderRadius: 3, overflow: 'hidden' },
  heiBarFill: { height: 6, borderRadius: 3 },
  heiScore: { width: 34, fontSize: 11, color: Colors.subtitle, textAlign: 'right' },
  heiComment: { width: 48, fontSize: 10, fontWeight: Fonts.weights.medium, textAlign: 'center' },

  // NOVA
  novaBarRow: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  novaSegment: { alignItems: 'center' },
  novaSegmentFill: {},
  novaSegLabel: { fontSize: 9, color: Colors.body, marginTop: 4, fontWeight: Fonts.weights.medium },
  novaSegPct: { fontSize: 9, color: Colors.subtitle },
  novaInterp: { fontSize: Fonts.sizes.sm, color: Colors.body, fontStyle: 'italic' },

  // Recommendations
  recRow: { flexDirection: 'row', marginBottom: 8, gap: 6 },
  recDot: { fontSize: 12, color: Colors.greenDark, marginTop: 2 },
  recText: { flex: 1, fontSize: Fonts.sizes.sm, color: Colors.body, lineHeight: 20 },

  // Category
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f6f0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, gap: 4 },
  pillIcon: { fontSize: 14 },
  pillText: { fontSize: Fonts.sizes.sm, color: Colors.body, fontWeight: Fonts.weights.medium },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  barName: { width: 48, fontSize: Fonts.sizes.sm, color: Colors.body },
  barTrack: { flex: 1, height: 6, backgroundColor: '#f0f3eb', borderRadius: 3, overflow: 'hidden', marginHorizontal: 8 },
  barFill: { height: 6, borderRadius: 3 },
  barPct: { width: 36, fontSize: Fonts.sizes.sm, color: Colors.subtitle, textAlign: 'right' },

  // Expiry mini
  expiryMini: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  expiryMiniIcon: { fontSize: 20 },
  expiryMiniName: { flex: 1, fontSize: Fonts.sizes.sm, color: Colors.title, fontWeight: Fonts.weights.medium },
  expiryMiniStatus: { fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold },
});
