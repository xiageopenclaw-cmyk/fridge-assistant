import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions,
  ActivityIndicator, LayoutAnimation, Platform, UIManager, TextInput,
  Clipboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HeaderWithFridge } from '../../components/PageHeader';
import { Colors, Fonts, Spacing, Radius } from '../../theme';
import {
  getShopping, HealthTag, ShoppingSuggestion, ShoppingData,
  getSavedLists, saveList, loadList, SavedList, renameList,
} from '../../services/api';
import { useCart, CartItem } from '../../stores/CartContext';

const { width: SCREEN_W } = Dimensions.get('window');
const PAGE_PX = 20;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SEV_COLORS = ['#b8d8a8', '#f5d88a', '#f0b878', '#e0837a'];
const SEV_LABELS = ['正常', '轻度', '注意', '严重'];

export default function ShoppingScreen() {
  const { items: cart, addItem, removeItem, toggleItem, updateQuantity, updateUnit, clearAll } = useCart();
  const [data, setData] = useState<ShoppingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [savedLists, setSavedLists] = useState<SavedList[]>([]);
  const [showSavePicker, setShowSavePicker] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [listening, setListening] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, lists] = await Promise.all([getShopping(), getSavedLists()]);
      setData(d);
      setSavedLists(lists);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleTag = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTag(activeTag === key ? null : key);
  };

  const handleAddToCart = (suggestion: ShoppingSuggestion) => {
    if (cart.find((c) => c.name === suggestion.name)) {
      removeItem(suggestion.name);
    } else {
      addItem({
        name: suggestion.name,
        category: suggestion.category,
        reason: suggestion.reason,
        shelf_hint: suggestion.shelf_hint,
      });
    }
  };

  const handleManualAdd = () => {
    const text = manualInput.trim();
    if (!text) return;
    const parts = text.split(/[\s,，、]+/).filter(Boolean);
    parts.forEach((p) => {
      if (!cart.find((c) => c.name === p)) {
        addItem({ name: p, category: '其他', reason: '手动添加', shelf_hint: '' });
      }
    });
    setManualInput('');
  };

  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setManualInput((prev) => prev + (prev ? ' ' : '') + transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  const copyList = () => {
    const text = cart.map((c) => `${c.name} x${c.quantity}${c.unit}`).join('\n');
    try { Clipboard.setString(text); } catch {}
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#CDE4B9', '#d5e8c4', '#f5f5f3']}
        locations={[0, 0.4, 1]}
        style={styles.topGradient}
        pointerEvents="none"
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <HeaderWithFridge title="采购清单" subtitle="智能推荐 · 一键入库" />

        {loading ? (
          <ActivityIndicator color={Colors.greenPrimary} style={{ padding: 60 }} />
        ) : !data ? (
          <Text style={styles.empty}>加载失败</Text>
        ) : (
          <>
            {/* 1. 冰箱健康标签 */}
            <Text style={styles.sectionLabel}>冰箱状态</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={styles.tagScroll} contentContainerStyle={styles.tagScrollInner}>
              {data.health_tags.map((tag) => {
                const isActive = activeTag === tag.key;
                const sevColor = SEV_COLORS[tag.severity] || SEV_COLORS[0];
                return (
                  <TouchableOpacity key={tag.key} style={[styles.tagChip, {
                    backgroundColor: isActive ? sevColor : Colors.card,
                    borderColor: sevColor,
                  }]} activeOpacity={0.8} onPress={() => toggleTag(tag.key)}>
                    <Text style={styles.tagEmoji}>{tag.emoji}</Text>
                    <Text style={[styles.tagLabel, { color: isActive ? '#fff' : Colors.title }]}>
                      {tag.label}
                    </Text>
                    {tag.severity > 0 && (
                      <Text style={[styles.tagSev, { color: isActive ? '#fff' : sevColor }]}>
                        {SEV_LABELS[tag.severity]}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 2. 点击标签展开推荐 */}
            {activeTag && (
              <View style={styles.recommendBox}>
                {data.tags_with_recommendations
                  .filter((tr) => tr.tag.key === activeTag)
                  .map((tr) => (
                    <View key={tr.tag.key}>
                      <Text style={styles.recTitle}>{tr.tag.detail}</Text>
                      {tr.recommendations.map((rec, i) => {
                        const inCart = cart.find((c) => c.name === rec.name);
                        return (
                          <TouchableOpacity key={i} style={[styles.recRow,
                            inCart && styles.recRowAdded]} activeOpacity={0.7}
                            onPress={() => handleAddToCart(rec)}>
                            <View style={styles.recLeft}>
                              <Text style={styles.recName}>{rec.name}</Text>
                              <Text style={styles.recReason}>{rec.reason}</Text>
                            </View>
                            <View style={styles.recRight}>
                              <Text style={styles.recShelf}>{rec.shelf_hint}</Text>
                              <Text style={[styles.recAction, inCart && styles.recActionRemove]}>
                                {inCart ? '移除' : '+ 添加'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
              </View>
            )}

            {/* 3. 菜谱缺失食材 */}
            {data.recipe_missing.length > 0 && (
              <View style={styles.missingBox}>
                <Text style={styles.missingTitle}>今日菜谱需要采购</Text>
                {data.recipe_missing.map((m, i) => {
                  const inCart = cart.find((c) => c.name === m.ingredient);
                  return (
                    <TouchableOpacity key={i} style={[styles.missingRow,
                      inCart && styles.missingRowDone]} activeOpacity={0.7}
                      onPress={() => {
                        if (inCart) {
                          removeItem(m.ingredient);
                        } else {
                          addItem({ name: m.ingredient, category: '其他', reason: `菜谱需要: ${m.for_recipe}`, shelf_hint: '' });
                        }
                      }}>
                      <Text style={styles.missingName}>{m.ingredient}</Text>
                      <Text style={styles.missingRecipe}>for {m.for_recipe}</Text>
                      <Text style={[styles.missingBtn, inCart && styles.missingBtnDone]}>
                        {inCart ? '已加' : '+ 加清单'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* 4. 我的采购清单 (主体放在中部) */}
            <View style={styles.listHeader}>
              <Text style={styles.sectionLabel}>
                采购清单{cart.length > 0 ? ` (${cart.length})` : ''}
              </Text>
              <View style={styles.listActions}>
                <TouchableOpacity onPress={() => { setShowSavePicker(!showSavePicker); getSavedLists().then(setSavedLists); }} style={styles.actionBtn}>
                  <Text style={styles.actionBtnText}>预存</Text>
                </TouchableOpacity>
                {cart.length > 0 && (<>
                  <TouchableOpacity onPress={copyList} style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>复制</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={clearAll} style={[styles.actionBtn, styles.actionBtnDanger]}>
                    <Text style={[styles.actionBtnText, { color: Colors.red }]}>清空</Text>
                  </TouchableOpacity>
                </>)}
              </View>
            </View>

            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <Text style={styles.emptyCartText}>清单是空的</Text>
                <Text style={styles.emptyCartHint}>点击上方推荐或手动输入食材加入清单</Text>
              </View>
            ) : (
              cart.map((item, i) => {
                const isEditing = editingItem === item.name;
                return (
                  <View key={i} style={[styles.cartRow, item.checked && styles.cartRowDone]}>
                    <TouchableOpacity onPress={() => toggleItem(item.name)}
                      style={[styles.checkbox, item.checked && styles.checkboxDone]}>
                      {item.checked && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>

                    <View style={styles.cartInfo}>
                      {isEditing ? (
                        <View style={styles.editRow}>
                          <TouchableOpacity onPress={() => setEditingItem(null)}
                            style={styles.doneEditBtn}>
                            <Text style={styles.doneEditText}>完成</Text>
                          </TouchableOpacity>
                          <View style={styles.qtyAdjust}>
                            <TouchableOpacity onPress={() => updateQuantity(item.name, item.quantity - 1)}
                              style={styles.qtyBtn}><Text style={styles.qtyBtnText}>−</Text></TouchableOpacity>
                            <Text style={styles.qtyVal}>{item.quantity}</Text>
                            <TouchableOpacity onPress={() => updateQuantity(item.name, item.quantity + 1)}
                              style={styles.qtyBtn}><Text style={styles.qtyBtnText}>+</Text></TouchableOpacity>
                          </View>
                          <TouchableOpacity onPress={() => {
                            const units = ['个', '件', '斤', '把', '盒', '瓶', '袋', '颗', '根', '块'];
                            const idx = units.indexOf(item.unit);
                            updateUnit(item.name, units[(idx + 1) % units.length]);
                          }} style={styles.unitBtn}>
                            <Text style={styles.unitText}>{item.unit}</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <>
                          <TouchableOpacity onPress={() => setEditingItem(item.name)}>
                            <Text style={[styles.cartName, item.checked && styles.cartNameDone]}>
                              {item.name} ×{item.quantity}{item.unit}
                            </Text>
                          </TouchableOpacity>
                          <Text style={styles.cartMeta}>{item.category} · {item.reason}</Text>
                        </>
                      )}
                    </View>

                    <TouchableOpacity onPress={() => removeItem(item.name)}
                      style={styles.deleteBtn}>
                      <Text style={styles.deleteBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}

            {/* 5. 预存清单槽位选择器 */}
            {showSavePicker && (
              <View style={styles.savePicker}>
                <Text style={styles.savePickerTitle}>预存采购清单</Text>
                <View style={styles.saveSlots}>
                  {[1, 2, 3].map((slot) => {
                    const sl = savedLists.find((l) => l.slot === slot);
                    const hasItems = sl && sl.items.length > 0;
                    return (
                      <View key={slot} style={[styles.saveSlot, hasItems && styles.saveSlotFilled]}>
                        <Text style={styles.saveSlotNum}>{slot}</Text>
                        {editingSlot === slot ? (
                          <TextInput autoFocus value={editLabel} onChangeText={setEditLabel}
                            onSubmitEditing={async () => {
                              await renameList(slot, editLabel);
                              getSavedLists().then(setSavedLists);
                              setEditingSlot(null);
                            }}
                            onBlur={() => setEditingSlot(null)}
                            style={styles.labelInput} />
                        ) : (
                          <TouchableOpacity onPress={() => { setEditingSlot(slot); setEditLabel(hasItems ? sl.label : ''); }}>
                            <Text style={[styles.saveSlotLabel, { textDecorationLine: 'underline' }]}>
                              {hasItems ? sl.label : '空清单'}
                            </Text>
                          </TouchableOpacity>
                        )}
                        <Text style={styles.saveSlotCount}>
                          {hasItems ? `${sl.items.length}项` : '—'}
                        </Text>
                        {hasItems && (
                          <Text style={styles.saveSlotPreview} numberOfLines={2}>
                            {sl.items.slice(0, 3).map((i: any) => i.name).join('、')}
                            {sl.items.length > 3 ? '…' : ''}
                          </Text>
                        )}
                        <View style={styles.saveSlotBtns}>
                          {hasItems && (
                            <TouchableOpacity onPress={async () => {
                              clearAll();
                              sl.items.forEach((i: any) => addItem({ name: i.name, category: i.category, reason: '从预存加载', shelf_hint: '' }));
                              setShowSavePicker(false);
                            }} style={styles.saveSlotBtn}>
                              <Text style={styles.saveSlotBtnText}>加载</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity onPress={async () => {
                            await saveList(slot, cart.map((c) => ({ name: c.name, category: c.category, quantity: c.quantity, unit: c.unit, checked: false })));
                            getSavedLists().then(setSavedLists);
                          }} style={styles.saveSlotBtn}>
                            <Text style={styles.saveSlotBtnText}>保存</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
                <TouchableOpacity onPress={() => setShowSavePicker(false)} style={styles.savePickerClose}>
                  <Text style={styles.savePickerCloseText}>关闭</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 7. 手动/语音输入栏 */}
            <View style={styles.inputBar}>
              <TouchableOpacity onPress={startVoice} style={[styles.voiceBtn, listening && styles.voiceBtnActive]}>
                <Text style={styles.voiceBtnText}>{listening ? '●' : '🎤'}</Text>
              </TouchableOpacity>
              <TextInput style={styles.textInput} placeholder="输入或语音添加食材，逗号分隔"
                placeholderTextColor={Colors.hint} value={manualInput}
                onChangeText={setManualInput} onSubmitEditing={handleManualAdd}
                returnKeyType="done" />
              <TouchableOpacity onPress={handleManualAdd} style={styles.addBtn}>
                <Text style={styles.addBtnText}>添加</Text>
              </TouchableOpacity>
            </View>

            {/* 6. 习惯性复购 */}
            {data.habit_repurchase && data.habit_repurchase.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 18 }]}>常买推荐</Text>
                <View style={styles.habitGrid}>
                  {data.habit_repurchase.map((item, i) => {
                    const inCart = cart.find((c) => c.name === item.name);
                    return (
                      <TouchableOpacity key={i} style={[styles.habitChip, inCart && styles.habitChipAdded]}
                        activeOpacity={0.7} onPress={() => handleAddToCart(item)}>
                        <Text style={styles.habitName}>{item.name}</Text>
                        <Text style={styles.habitReason}>{item.reason}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* 8. 应季推荐 */}
            {data.seasonal && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 18 }]}>
                  {data.seasonal.label}推荐
                </Text>
                <View style={styles.seasonalGrid}>
                  {data.seasonal.items.map((item, i) => {
                    const inCart = cart.find((c) => c.name === item.name);
                    return (
                      <TouchableOpacity key={i} style={[styles.seasonalChip,
                        inCart && styles.seasonalChipAdded]} activeOpacity={0.7}
                        onPress={() => handleAddToCart(item)}>
                        <Text style={styles.seasonalName}>{item.name}</Text>
                        <Text style={styles.seasonalHint}>{item.reason}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <View style={{ height: 140 }} />
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
  empty: { textAlign: 'center', color: Colors.hint, padding: 40, fontSize: Fonts.sizes.md },
  sectionLabel: {
    fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold,
    color: Colors.title,
  },

  // ── Tags ──
  tagScroll: { marginBottom: 6 },
  tagScrollInner: { paddingHorizontal: PAGE_PX, gap: 10, flexDirection: 'row' },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: Radius.lg, borderWidth: 1.5, gap: 6,
  },
  tagEmoji: { fontSize: 16 },
  tagLabel: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold },
  tagSev: { fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.bold },

  // ── Recommendations ──
  recommendBox: {
    marginHorizontal: PAGE_PX, marginTop: 10, backgroundColor: Colors.card,
    borderRadius: Radius.xl, padding: 16, borderLeftWidth: 4,
    borderLeftColor: Colors.greenPrimary,
  },
  recTitle: { fontSize: Fonts.sizes.sm, color: Colors.subtitle, marginBottom: 12 },
  recRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  recRowAdded: { backgroundColor: '#f4faf0', borderRadius: Radius.lg },
  recLeft: { flex: 1 },
  recName: { fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold, color: Colors.title },
  recReason: { fontSize: Fonts.sizes.xs, color: Colors.subtitle, marginTop: 2 },
  recRight: { alignItems: 'flex-end', gap: 4 },
  recShelf: { fontSize: Fonts.sizes.xs, color: Colors.hint },
  recAction: {
    fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.bold, color: Colors.greenPrimary,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm,
    backgroundColor: '#eaf4e4',
  },
  recActionRemove: { color: Colors.red, backgroundColor: '#fde8e8' },

  // ── Recipe missing ──
  missingBox: {
    marginHorizontal: PAGE_PX, marginTop: 14, backgroundColor: '#fff8f0',
    borderRadius: Radius.xl, padding: 16, borderLeftWidth: 4, borderLeftColor: Colors.orange,
  },
  missingTitle: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold, color: '#8a6020', marginBottom: 10 },
  missingRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0e0c0',
  },
  missingRowDone: { opacity: 0.5 },
  missingName: { flex: 1, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.medium, color: Colors.title },
  missingRecipe: { fontSize: Fonts.sizes.xs, color: Colors.hint, marginRight: 10 },
  missingBtn: {
    fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.bold, color: Colors.orange,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm,
    backgroundColor: '#fef3e6',
  },
  missingBtnDone: { color: Colors.hint, backgroundColor: Colors.divider },

  // ── Shopping list header ──
  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: PAGE_PX, marginTop: 20, marginBottom: 10,
  },
  listActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.lg,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.divider,
  },
  actionBtnDanger: { borderColor: '#f8d0d0' },
  actionBtnText: { fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.medium, color: Colors.greenPrimary },

  // ── Cart items ──
  emptyCart: { marginHorizontal: PAGE_PX, alignItems: 'center', paddingVertical: 30 },
  emptyCartText: { fontSize: Fonts.sizes.md, color: Colors.hint, marginBottom: 6 },
  emptyCartHint: { fontSize: Fonts.sizes.xs, color: Colors.hint, textAlign: 'center' },
  cartRow: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: PAGE_PX,
    paddingVertical: 12, paddingHorizontal: 16, backgroundColor: Colors.card,
    borderRadius: Radius.lg, marginBottom: 8, gap: 10,
  },
  cartRowDone: { opacity: 0.45 },
  checkbox: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: Colors.divider, alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: Colors.greenPrimary, borderColor: Colors.greenPrimary },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: Fonts.weights.bold },
  cartInfo: { flex: 1 },
  cartName: { fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.medium, color: Colors.title },
  cartNameDone: { textDecorationLine: 'line-through', color: Colors.hint },
  cartMeta: { fontSize: Fonts.sizes.xs, color: Colors.subtitle, marginTop: 2 },

  // ── Edit mode ──
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  doneEditBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm,
    backgroundColor: Colors.greenPrimary,
  },
  doneEditText: { color: '#fff', fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.bold },
  qtyAdjust: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#f0f5ec',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 16, fontWeight: Fonts.weights.bold, color: Colors.greenPrimary },
  qtyVal: { fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.bold, color: Colors.title, minWidth: 24, textAlign: 'center' },
  unitBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm,
    backgroundColor: '#f4f6f0', borderWidth: 1, borderColor: Colors.divider,
  },
  unitText: { fontSize: Fonts.sizes.xs, color: Colors.subtitle },

  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 14, color: Colors.hint },

  // ── Input bar ──
  voiceBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.card,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.divider,
  },
  voiceBtnActive: { backgroundColor: Colors.red, borderColor: Colors.red },
  voiceBtnText: { fontSize: 18 },
  inputBar: {
    flexDirection: 'row', marginHorizontal: PAGE_PX, marginTop: 16, gap: 8,
    alignItems: 'center',
  },
  textInput: {
    flex: 1, backgroundColor: Colors.card, borderRadius: Radius.lg,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: Fonts.sizes.md,
    color: Colors.title, borderWidth: 1, borderColor: Colors.divider,
  },
  addBtn: {
    paddingHorizontal: 20, paddingVertical: 12, backgroundColor: Colors.greenPrimary,
    borderRadius: Radius.lg,
  },
  addBtnText: { color: '#fff', fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold },

  // ── Seasonal ──
  seasonalGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: PAGE_PX,
  },
  seasonalChip: {
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: Colors.card,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.divider,
  },
  seasonalChipAdded: { backgroundColor: '#eaf4e4', borderColor: Colors.greenLight },
  seasonalName: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.medium, color: Colors.title },
  seasonalHint: { fontSize: Fonts.sizes.xs, color: Colors.subtitle, marginTop: 2 },

  // ── Save picker ──
  savePicker: {
    marginHorizontal: PAGE_PX, marginTop: 12, backgroundColor: Colors.card,
    borderRadius: Radius.xl, padding: 16, borderWidth: 1, borderColor: Colors.greenLight,
  },
  savePickerTitle: { fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.bold, color: Colors.title, marginBottom: 12, textAlign: 'center' },
  saveSlots: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: 12 },
  saveSlot: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 8,
    backgroundColor: '#f8f8f5', borderRadius: Radius.lg, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.divider, borderStyle: 'dashed', gap: 4,
  },
  saveSlotFilled: { borderColor: Colors.greenPrimary, borderStyle: 'solid', backgroundColor: '#f0f8ea' },
  saveSlotNum: { fontSize: 20, fontWeight: Fonts.weights.bold, color: Colors.title },
  saveSlotLabel: { fontSize: Fonts.sizes.xs, color: Colors.subtitle },
  labelInput: {
    fontSize: Fonts.sizes.xs, color: Colors.title, borderBottomWidth: 1,
    borderBottomColor: Colors.greenPrimary, paddingVertical: 2, textAlign: 'center',
    minWidth: 40,
  },
  saveSlotCount: { fontSize: Fonts.sizes.xs, color: Colors.hint },
  saveSlotPreview: {
    fontSize: 10, color: Colors.subtitle, textAlign: 'center',
    marginHorizontal: 2, marginTop: 2, lineHeight: 13,
  },
  saveSlotBtns: { flexDirection: 'row', gap: 6, marginTop: 6 },
  saveSlotBtn: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm,
    backgroundColor: Colors.greenPrimary,
  },
  saveSlotBtnText: { fontSize: 10, color: '#fff', fontWeight: Fonts.weights.bold },
  savePickerClose: { alignItems: 'center', paddingTop: 8 },
  savePickerCloseText: { fontSize: Fonts.sizes.sm, color: Colors.hint },

  // ── Habit repurchase ──
  habitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: PAGE_PX },
  habitChip: {
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: Colors.card,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.divider,
  },
  habitChipAdded: { backgroundColor: '#eaf4e4', borderColor: Colors.greenLight },
  habitName: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.medium, color: Colors.title },
  habitReason: { fontSize: Fonts.sizes.xs, color: Colors.subtitle, marginTop: 2 },
});
