# 智能冰箱助手 · 设计系统文档
## Aesthetic Foundation v1.0 — V8 "Restrained Warmth"

---

### The Vibe

> 一款安静、不打扰、像家人一样了解你冰箱的设计。
> 没有花哨动画，没有冰冷科技感——温暖、克制、食物本身会说话。

核心感受：打开冰箱那一刻的安心感。食材整整齐齐，临期有提醒，今晚吃啥不用动脑。App 不是一个"工具"，而是一个"家庭成员"。

---

### Inspirations 灵感来源

| 来源 | 提取了什么 |
|------|-----------|
| **苹果 健康 App** | 无边框卡片 + 圆角大彩块 + 进度环 |
| **Notion 的克制** | emoji 做 icon、极简线条图标、大量留白 |
| **MUJI 美学** | 自然色系、无 logo 感、材质本身的美 |
| **日式便当** | 每种食材有自己的"格子"，彩色分区，一目了然 |
| **Cookpad / 下厨房** | 食物摄影是主体，UI 退后 |
| **Stripe Dashboard** | 数据可视化不冰冷，用色块代替图表 |

---

### Emotions 情感关键词

| 情感 | 翻译成设计语言 |
|------|--------------|
| **安心** | 低对比度、柔和圆角、不急促的动画 |
| **新鲜** | 绿色渐变、白色卡片、半透明层次 |
| **聪明** | 临期分级（红/橙/绿）、今天吃啥一键推荐、过期倒计时 |
| **家庭感** | 3D 粘土插画（食物本身，不拟人）、emoji 辅助表达 |
| **不打扰** | 无色块大按钮、不弹窗、信息层级清晰 |

---

### Design Principles

1. **食物是第一视觉主体** — 每个食材/分类都要有独立的"肖像"
2. **倒计时即 UI** — 红/橙/绿三色就是主视觉层，不需要更多装饰
3. **一次一件事** — 每个页面只有一个核心动作
4. **留白是语言** — 卡片之间用白色呼吸，不是分隔线
5. **圆角是温度** — 18-24px 大圆角 > 直角/小圆角

---

### Color System

| Token | 色值 | 用途 |
|-------|------|-----|
| `--bg-primary` | `#f5f5f3` | 全局底色（暖白） |
| `--bg-gradient-top` | `#CDE4B9` | 顶部渐变起点（鼠尾草嫩绿） |
| `--bg-gradient-mid` | `#d5e8c4` | 渐变中点 |
| `--card` | `#FFFFFF` | 卡片底色 |
| `--text-primary` | `#3a5030` | 主文字（深橄榄绿） |
| `--text-secondary` | `#8a8a7e` | 辅助文字（暖灰） |
| `--text-body` | `#5a5a4a` | 正文 |
| `--green-primary` | `#6a9a52` | 品牌绿（CTA/active） |
| `--green-light` | `#8cb87a` | 浅绿 |
| `--green-faded` | `#bfe1b1` | 渐变按钮绿 |
| `--status-red` | `#e0554a` | 临期≤1天 |
| `--status-amber` | `#e8953a` | 临期2-3天 |
| `--status-green` | `#5ca85c` | 新鲜7天+ |
| `--divider` | `#e8e8e0` | 分割线 |
| `--tag-bg` | `#eef4ea` | 标签背景 |

---

### Typography Scale（375pt iPhone 基准）

| Token | Size | Weight | 用途 |
|-------|------|--------|------|
| `caption` | 11 | Regular | 时间戳/辅助信息 |
| `xs` | 12 | Medium | badge 文字 |
| `sm` | 13 | Medium | 标签/卡片副标题 |
| `base` | 15 | Regular | 正文 |
| `md` | 17 | Semibold | 卡片标题 |
| `lg` | 20 | Bold | Section 标题 |
| `xl` | 24 | Bold | 页面标题（"状态"） |
| `xxl` | 28 | Bold | Header 标题（"Hi Jarry!"） |

**字体策略**：系统默认中文字体（PingFang SC），不引入额外 web font。React Native 原生渲染已经够好。

---

### Spacing（4pt Grid）

```
xs: 4  | sm: 8  | md: 12 | lg: 16 | xl: 20 | xxl: 24 | xxxl: 32
```

- 页面水平 padding: 20pt
- 卡片内部 padding: 16-18pt
- 卡片间距: 10-12pt
- Section 标题顶部间距: 28pt

---

### Radius

| Token | Value | 用途 |
|-------|-------|------|
| `sm` | 6 | 小 badge |
| `md` | 10 | 内部元素 |
| `lg` | 14 | 按钮/badge |
| `xl` | 18 | 卡片 |
| `xxl` | 24 | 大卡片 |
| `full` | 999 | 圆形头像/按钮环 |

---

### Shadow Strategy

**Never heavy.** iOS 阴影只用于卡片浮起，透明度 ≤ 0.05。不是 glassmorphism 路线，而是 subtle elevation。

```
card: shadowOpacity 0.05, shadowRadius 8-10
```

---

### Icon Strategy

- **导航栏**: 手写 SVG 极细线条（1.5px stroke），#4a6141
- **内容 icon**: emoji 为主（食材前的小图、过期标识）
- **3D 粘土**: 冰箱 icon + 6 张食物分类图 + 菜谱插图（photorealistic matte clay，不要拟人化）

---

### Page Structure

| 页 | 核心任务 | 主视觉 |
|----|---------|--------|
| 首页 | 一眼看清冰箱情况 | 2×3 食材分类 + 临期提醒 |
| 状态 | 数据分析 | 新鲜度环 + 分类占比 + 营养 |
| 今天吃啥 | 推荐菜谱 | 英文菜名 + 标签 + 粘土插图 |
| 记录 | 记录/拍照/对话 | 时间线 + 拍照按钮 + AI 聊天 |
| 我的 | 设置/账号 | 列表式卡片 + 展开档案 |

---

### Anti-Patterns（NOT Do）

- ❌ 纯黑 `#000` 或纯白 `#FFF` 作为主色
- ❌ 高饱和度颜色大面积使用（食物图除外）
- ❌ 直角卡片（radius < 14 太硬）
- ❌ 深阴影 / 浮雕效果
- ❌ 弹窗打断流程
- ❌ 大段文字 — 用 emoji + 短句
- ❌ 拟人化食物（粘土图不能有脸）
