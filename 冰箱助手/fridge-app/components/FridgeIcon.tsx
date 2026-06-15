import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Circle, Ellipse, G } from 'react-native-svg';

/**
 * 锁定 V7 版冰箱图标 - 3D粘土薄荷绿单门冰箱
 * 通体淡薄荷绿，上方小格(冷冻)+下方大格(冷藏)
 * 左侧银色把手，淡黄+白色方形磁铁，右侧陶盆植物
 */
export default function FridgeIcon({ size = 48 }: { size?: number }) {
  const scale = size / 100;
  const fridgeX = 0;
  const fridgeW = 44;
  const fridgeH = 62;
  const topSectionH = 18;
  
  return (
    <Svg width={size + 20} height={size} viewBox="0 0 100 80">
      {/* 阴影 */}
      <Ellipse cx={48} cy={72} rx={24} ry={4} fill="#d0d8cb" opacity={0.4} />
      
      {/* 冰箱主体 - 薄荷绿 */}
      <Rect
        x={fridgeX} y={5}
        width={fridgeW} height={fridgeH}
        rx={8} ry={8}
        fill="#c5ddb8"
      />
      
      {/* 冷冻室分隔线 */}
      <Line x1={4} y1={5 + topSectionH} x2={fridgeW - 4} y2={5 + topSectionH}
        stroke="#a8c99a" strokeWidth={1.5} />
      
      {/* 银色把手 - 上格（冷冻） */}
      <Rect
        x={fridgeX + 3} y={8 + topSectionH / 2 - 6}
        width={4} height={10} rx={2}
        fill="#d4d4d4"
      />
      {/* 银色把手 - 下格（冷藏） */}
      <Rect
        x={fridgeX + 3} y={5 + topSectionH + 10}
        width={4} height={12} rx={2}
        fill="#d4d4d4"
      />
      
      {/* 淡黄色磁铁 */}
      <Rect
        x={fridgeX + fridgeW - 16} y={5 + topSectionH + 4}
        width={8} height={8} rx={1}
        fill="#ede2b5"
      />
      {/* 白色磁铁 */}
      <Rect
        x={fridgeX + fridgeW - 16} y={5 + topSectionH + 14}
        width={8} height={8} rx={1}
        fill="#ffffff"
      />

      {/* 陶土色花盆 */}
      <Rect
        x={fridgeW + 2} y={fridgeH - 16}
        width={14} height={16} rx={3}
        fill="#c9a87c"
      />
      {/* 盆口 */}
      <Rect
        x={fridgeW} y={fridgeH - 16}
        width={18} height={4} rx={2}
        fill="#d4b896"
      />
      
      {/* 植物茎 */}
      <Line x1={fridgeW + 9} y1={fridgeH - 16} x2={fridgeW + 9} y2={fridgeH - 30}
        stroke="#8b6f47" strokeWidth={2} />
      {/* 叶片 1 */}
      <Ellipse cx={fridgeW + 9} cy={fridgeH - 32} rx={6} ry={3}
        fill="#7dab6e" transform={`rotate(-15, ${fridgeW + 9}, ${fridgeH - 32})`} />
      {/* 叶片 2 */}
      <Ellipse cx={fridgeW + 5} cy={fridgeH - 28} rx={5} ry={2.5}
        fill="#6fa060" transform={`rotate(-35, ${fridgeW + 5}, ${fridgeH - 28})`} />
      {/* 叶片 3 */}
      <Ellipse cx={fridgeW + 13} cy={fridgeH - 28} rx={5} ry={2.5}
        fill="#8bb87a" transform={`rotate(25, ${fridgeW + 13}, ${fridgeH - 28})`} />
    </Svg>
  );
}
