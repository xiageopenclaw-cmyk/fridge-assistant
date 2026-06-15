# 智能冰箱助手 · Landing Page 设计方向
## Frontend Design Skill 产出

---

### 选定的美学方向：**Warm Organic / Natural**

> 鼠尾草绿 + 暖白底 + 大圆角 + 食材肖像 + 渐变呼吸

区别于科技产品的"暗色玻璃 + 霓虹边框"，冰箱助手定位是家庭产品。Landing page 应该像打开一本日式生活杂志——柔软、精致、食物是第一主角。

---

### 设计关键词
- 鼠尾草绿渐变 hero
- 食材粘土图漂浮动画
- 手写体标题（"今晚吃啥？"）
- 大 blockquote 引用真用户场景
- 底部"加入等待列表"表单（简约到只有邮箱 + 按钮）

---

### 页面结构（5 屏）

| 屏 | 内容 | 动画 |
|----|------|------|
| **Hero** | 冰箱粘土图居中，鼠尾草绿渐变背景，"让冰箱替你想" headline | 食材图从四周 float-in |
| **Problem** | "买了菜忘了吃？不知道今晚做什么？" 两个痛点卡片 | scroll 渐显 |
| **Solution** | 3 张手机 mockup 横排（首页/今天吃啥/状态） | 中间那张稍大，hover 浮起 |
| **Features** | 拍照识别 · AI 推荐 · 临期提醒 · 营养分析 四个 icon+文案 | 2×2 grid |
| **CTA** | 邮箱输入 + "加入等待列表" 按钮，鼠尾草绿 footer | 按钮 hover 发光 |

---

### 字体方案
- **Display**: "Instrument Serif"（Google Fonts，优雅衬线，hero 标题）
- **Body**: 系统 sans-serif（中文 PingFang SC + 英文 SF Pro）

### 颜色
```
hero-bg: linear-gradient(135deg, #CDE4B9 0%, #d5e8c4 40%, #f5f5f3 100%)
card-bg: #FFFFFF
text: #3a5030
accent: #6a9a52
cta-hover: #8cb87a
```

### 禁止
- ❌ Inter / Roboto
- ❌ 紫色渐变
- ❌ glassmorphism（不符合家庭感）
- ❌ 自动轮播 carousel

---

### 产出物
此文档是方向指导。实际代码待 Jarry 确认后产出（React/Next.js + Tailwind 单页）。
