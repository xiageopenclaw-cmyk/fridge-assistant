export const BASE_URL = 'http://106.53.188.184:8000';

export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  purchase_date: string;
  expiry_date: string;
  freshness: {
    status: '刚放入' | '新鲜' | '尽快吃' | '过期';
    emoji: string;
    color: string;
    percent: number;
    elapsed_days: number;
    range_min: number;
    range_max: number;
  };
  shelf_range: { min: number; max: number };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// ---------- AI 对话 ----------
export interface ChatReply {
  reply: string;
}

export async function sendChat(message: string): Promise<ChatReply> {
  return request<ChatReply>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

// ---------- 食材识别 ----------
export async function recognizeFood(imageUri: string) {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'photo.jpg',
  } as any);
  return request<any>('/api/recognize', {
    method: 'POST',
    body: formData,
    headers: {}, // let RN set multipart boundary
  });
}

// ---------- 库存 ----------
export async function getInventory() {
  return request<any[]>('/api/inventory');
}

export async function addInventory(item: {
  name: string;
  category: string;
  quantity: number;
  expiry_date: string;
}) {
  return request<any>('/api/inventory', {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

// ---------- 菜谱 ----------
export interface DailyRecipes {
  breakfast: RecipeItem[];
  lunch: RecipeItem[];
  dinner: RecipeItem[];
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
  nutrition: { kcal: number; protein: number; carbs: number; fat: number };
  missing: string[];
  tip: string;
}

export async function getRecipes(): Promise<DailyRecipes> {
  return request<DailyRecipes>('/api/recipes');
}

// ---------- 记录 ----------
export async function getRecords(limit?: number) {
  const qs = limit ? `?limit=${limit}` : '';
  return request<any[]>(`/api/records${qs}`);
}

export async function addRecord(entry: {
  type: string;
  description: string;
  items_used?: string[];
  note?: string;
}) {
  return request<any>('/api/records', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

// ---------- 营养评估 ----------
export interface NutritionScore {
  dbi_lbs: number;
  dbi_hbs: number;
  dbi_dqd: number;
  dbi_level: string;
  dbi_interpretation: string;
  hei_total: number;
  hei_components: Record<string, { score: number; max: number; label: string; comment: string }>;
  nova_summary: { g1_pct: number; g2_pct: number; g3_pct: number; g4_pct: number; nova_score: number; interpretation: string };
  overall_score: number;
  overall_grade: string;
  recommendations: string[];
}

export async function getNutrition(): Promise<NutritionScore> {
  return request<NutritionScore>('/api/nutrition');
}

// ---------- 采购清单 ----------
export interface HealthTag {
  key: string;
  label: string;
  emoji: string;
  severity: number;
  description: string;
  detail: string;
}

export interface TagRecommendation {
  tag: HealthTag;
  recommendations: ShoppingSuggestion[];
}

export interface ShoppingSuggestion {
  name: string;
  category: string;
  reason: string;
  shelf_hint: string;
  checked: boolean;
}

export interface RecipeMissing {
  ingredient: string;
  for_recipe: string;
  checked: boolean;
}

export interface ShoppingData {
  health_tags: HealthTag[];
  tags_with_recommendations: TagRecommendation[];
  recipe_missing: RecipeMissing[];
  seasonal: { label: string; items: ShoppingSuggestion[] } | null;
  habit_repurchase: ShoppingSuggestion[];
}

export async function getShopping(): Promise<ShoppingData> {
  return request<ShoppingData>('/api/shopping');
}

// ── Saved shopping lists ──
export interface SavedList {
  slot: number;
  label: string;
  items: Array<{ name: string; category: string; quantity: number; unit: string; checked: boolean }>;
  updated_at: string;
}

export async function getSavedLists(): Promise<SavedList[]> {
  return request<SavedList[]>('/api/shopping/lists');
}

export async function saveList(slot: number, items: any[], label?: string) {
  return request<any>(`/api/shopping/lists/${slot}`, {
    method: 'POST',
    body: JSON.stringify({ items, label: label || `清单${slot}` }),
  });
}

export async function loadList(slot: number): Promise<SavedList> {
  return request<SavedList>(`/api/shopping/lists/${slot}`);
}

export async function renameList(slot: number, label: string) {
  return request<any>(`/api/shopping/lists/${slot}/rename?label=${encodeURIComponent(label)}`, { method: 'PATCH' });
}
