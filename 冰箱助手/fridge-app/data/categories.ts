// Shared category data — single source of truth for both 首页 and 状态

export interface Category {
  name: string;
  count: number;
  bg: string;
  accent: string;
}

export interface CategoryItem {
  name: string;
  qty: string;
  days: number;
}

export const CATEGORIES: Category[] = [
  { name: '乳制品', count: 3, bg: '#dbeaf6', accent: '#7cb6e0' },
  { name: '肉类',   count: 4, bg: '#fbe1d3', accent: '#e8953a' },
  { name: '蔬菜',   count: 7, bg: '#d8e9ce', accent: '#7dab6e' },
  { name: '水果',   count: 5, bg: '#fad4d4', accent: '#e06b6b' },
  { name: '蛋类',   count: 1, bg: '#fbeed3', accent: '#e0b04c' },
  { name: '海鲜',   count: 2, bg: '#cde5f0', accent: '#5b9ec4' },
  { name: '饮料',   count: 3, bg: '#d6e3f5', accent: '#8a7be0' },
  { name: '零食',   count: 3, bg: '#f0dbd3', accent: '#c47b5b' },
  { name: '熟食',   count: 2, bg: '#fce8d5', accent: '#e8953a' },
  { name: '其他',   count: 2, bg: '#e8e4dc', accent: '#8a8178' },
];

export const CATEGORY_ITEMS: Record<string, CategoryItem[]> = {
  '乳制品': [
    { name: '牛奶',     qty: '1L',   days: 1 },
    { name: '酸奶',     qty: '4杯',  days: 5 },
    { name: '芝士片',   qty: '200g', days: 12 },
  ],
  '肉类': [
    { name: '鸡胸肉',   qty: '300g', days: 2 },
    { name: '牛肉',     qty: '250g', days: 3 },
    { name: '猪肉片',   qty: '200g', days: 4 },
  ],
  '蔬菜': [
    { name: '菠菜',     qty: '1把',  days: 1 },
    { name: '西兰花',   qty: '1棵',  days: 2 },
    { name: '番茄',     qty: '3个',  days: 7 },
    { name: '黄瓜',     qty: '2根',  days: 6 },
    { name: '白菜',     qty: '半棵', days: 10 },
    { name: '胡萝卜',   qty: '2根',  days: 8 },
    { name: '蘑菇',     qty: '150g', days: 3 },
  ],
  '水果': [
    { name: '苹果',     qty: '3个',  days: 14 },
    { name: '香蕉',     qty: '4根',  days: 4 },
    { name: '葡萄',     qty: '1串',  days: 5 },
    { name: '橙子',     qty: '2个',  days: 10 },
    { name: '蓝莓',     qty: '1盒',  days: 3 },
  ],
  '蛋类': [
    { name: '鸡蛋',     qty: '6个',  days: 12 },
  ],
  '海鲜': [
    { name: '三文鱼',   qty: '200g', days: 2 },
    { name: '虾仁',     qty: '200g', days: 1 },
  ],
  '饮料': [
    { name: '橙汁',     qty: '1瓶',  days: 20 },
    { name: '豆浆',     qty: '1瓶',  days: 4 },
    { name: '椰青',     qty: '2个',  days: 7 },
  ],
  '零食': [
    { name: '巧克力布丁', qty: '2杯', days: 7 },
    { name: '奶酪棒',   qty: '4支',  days: 14 },
    { name: '酸奶杯',   qty: '3杯',  days: 5 },
  ],
  '熟食': [
    { name: '蛋炒饭',   qty: '1盒',  days: 2 },
    { name: '红烧肉',   qty: '1盒',  days: 3 },
  ],
  '其他': [
    { name: '豆腐',     qty: '1块',  days: 3 },
    { name: '火锅底料', qty: '1包',  days: 30 },
  ],
};

// Flatten all items to a single list
export const ALL_ITEMS = Object.entries(CATEGORY_ITEMS).flatMap(
  ([cat, items]) => items.map((it) => ({ ...it, category: cat }))
);

// Total count
export const TOTAL_ITEMS = ALL_ITEMS.length;
