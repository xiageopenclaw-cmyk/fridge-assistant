import { useState, useEffect, useCallback } from 'react';
import { getInventory, getRecipes, getRecords, sendChat, DailyRecipes, RecipeItem } from '../services/api';

// ── Types ──
export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  purchase_date: string;
  expiry_date: string;
  batch_label?: string;
  expiry_source?: 'package' | 'verified' | 'estimated';
  production_date?: string;
  shelf_life_days?: number;
  opened_date?: string;
  freshness: {
    status: '刚放入' | '新鲜' | '尽快吃' | '过期';
    emoji: string;
    color: string;
    percent: number;
    elapsed_days: number;
    range_min: number;
    range_max: number;
    shelf_max_days: number;
  };
  shelf_range: { min: number; max: number };
}

export interface RecipeItem {
  name: string;
  emoji: string;
  tags: string[];
  time: string;
  difficulty: string;
  itemCount: number;
  color: string;
  steps: string[];
  nutrition?: { kcal: number; protein: number; carbs: number; fat: number };
  missing?: string[];
  tip?: string;
}

export interface DailyRecipes {
  breakfast: RecipeItem[];
  lunch: RecipeItem[];
  dinner: RecipeItem[];
}

export interface RecordItem {
  id: number;
  type: string;
  description: string;
  items_used?: string;
  note?: string;
  created_at: string;
}

// ── Hooks ──
export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInventory();
      setItems(data);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Derived freshness groups
  const expiring = items.filter((i) => i.freshness?.status === '过期');
  const watch = items.filter((i) => i.freshness?.status === '尽快吃');
  const fresh = items.filter((i) => i.freshness?.status === '新鲜' || i.freshness?.status === '刚放入');
  const total = items.length;

  // Sorted alerts: 尽快吃 by urgency (percent descending), then 过期 at the bottom
  const alerts = [...watch, ...expiring].sort((a, b) => {
    const aIsExpired = a.freshness?.status === '过期';
    const bIsExpired = b.freshness?.status === '过期';
    if (aIsExpired && !bIsExpired) return 1;
    if (!aIsExpired && bIsExpired) return -1;
    return (b.freshness?.percent || 0) - (a.freshness?.percent || 0);
  });

  // Group by category
  const byCategory: Record<string, { items: InventoryItem[]; count: number }> = {};
  items.forEach((i) => {
    if (!byCategory[i.category]) byCategory[i.category] = { items: [], count: 0 };
    byCategory[i.category].items.push(i);
    byCategory[i.category].count++;
  });

  return { items, alerts, expiring, watch, fresh, total, byCategory, loading, error, refresh };
}

export function useRecipes() {
  const [meals, setMeals] = useState<DailyRecipes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRecipes();
      setMeals(data);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Flatten all recipes into array for backward compat (hero carousel etc)
  const allRecipes: RecipeItem[] = meals
    ? [...meals.breakfast, ...meals.lunch, ...meals.dinner]
    : [];

  return { meals, recipes: allRecipes, loading, error, refresh };
}

export function useRecords(limit: number = 20) {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRecords(limit);
      setRecords(data);
    } catch {
      // silent fail for records
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { refresh(); }, [refresh]);
  return { records, loading, refresh };
}

export function useChat() {
  const [sending, setSending] = useState(false);

  const send = useCallback(async (message: string): Promise<string> => {
    setSending(true);
    try {
      const res = await sendChat(message);
      return res.reply;
    } catch (e: any) {
      return '😅 网络不太好，请稍后再试…';
    } finally {
      setSending(false);
    }
  }, []);

  return { send, sending };
}

// ── Helpers ──

export const CATEGORY_EMOJI: Record<string, string> = {
  '乳制品': '🥛',
  '肉类': '🥩',
  '蔬菜': '🥬',
  '水果': '🍎',
  '蛋类': '🥚',
  '海鲜': '🐟',
  '饮料': '🧃',
  '零食': '🍮',
  '熟食': '🍱',
  '豆制品': '🧈',
  '调味品': '🧂',
  '其他': '📦',
};

export const CATEGORY_BG: Record<string, string> = {
  '乳制品': '#dbeaf6',
  '肉类': '#fbe1d3',
  '蔬菜': '#d8e9ce',
  '水果': '#fad4d4',
  '蛋类': '#fbeed3',
  '海鲜': '#cde5f0',
  '饮料': '#d6e3f5',
  '零食': '#f0dbd3',
  '熟食': '#fce8d5',
  '豆制品': '#f4f0e8',
  '调味品': '#e8e4dc',
  '其他': '#e8e4dc',
};

export const CATEGORY_ACCENT: Record<string, string> = {
  '乳制品': '#7cb6e0',
  '肉类': '#e8953a',
  '蔬菜': '#7dab6e',
  '水果': '#e06b6b',
  '蛋类': '#e0b04c',
  '海鲜': '#5b9ec4',
  '饮料': '#8a7be0',
  '零食': '#c47b5b',
  '熟食': '#e8953a',
  '豆制品': '#b8a080',
  '调味品': '#a09888',
  '其他': '#8a8178',
};
