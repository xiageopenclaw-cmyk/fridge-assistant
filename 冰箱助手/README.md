# 冰箱助手 (Fridge Assistant) v0.2.0

> AI 智能冰箱助手 · 双职工家庭 / 健身减脂 / 银发族 / 囤货族
> Expo Web + FastAPI + SQLite · 部署在腾讯云 Lighthouse

**线上预览**：[http://106.53.188.184/](http://106.53.188.184/)

---

## 项目状态

| 维度 | 状态 |
|------|------|
| 前端 MVP | ✅ Expo Web 已上线 |
| 后端 API | ✅ FastAPI 已部署 |
| 食材识别 | ⏳ MiniMax 多模态（demo 阶段） |
| 硬件 (ESP32 摄像头) | ⏳ 选型完成，固件未写 |
| 营养评估 (HEI/DBI/NOVA) | ✅ 已实现 |
| 冲突检测 (食材相克) | ✅ 已实现 |
| 购物清单 + 健康标签 | ✅ 已实现 |
| 深色模式 / 移动端 | ⏳ v0.3 计划 |

## 子项目

| 目录 | 用途 | 端口 |
|------|------|------|
| `fridge-app/` | Expo Web 前端 (React Native + react-native-web) | 80 (nginx) |
| `fridge-backend/` | FastAPI 后端 + SQLite | 8000 (uvicorn) |
| `产品文档/` | 需求 / 设计 / UX 审查 | — |
| `开发LOG/` | 每日小结 + 完整对话记录 | — |

## 快速开始

```bash
# 启动后端
cd fridge-backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 启动前端（另一个终端）
cd fridge-app
npm install
npx expo start --web
# 浏览器打开 http://localhost:19006
```

## 部署

```bash
# 1. 本地打包前端
cd fridge-app
npx expo export --platform web --output-dir dist
tar czf /tmp/fridge-dist.tar.gz -C dist .

# 2. 上传到服务器
scp /tmp/fridge-dist.tar.gz ubuntu@<server>:/tmp/

# 3. 服务器解压
ssh ubuntu@<server>
cd /home/ubuntu/fridge-backend/app
sudo rm -rf _expo assets index.html metadata.json
sudo tar xzf /tmp/fridge-dist.tar.gz
sudo systemctl reload nginx
```

后端通过 `systemd` (fridge-api.service) 守护，前端通过 `nginx` 静态托管 + `/api/` 反代到 uvicorn。

## 架构

```
[浏览器]
   ↓ http
[nginx :80] ─→ /_expo/ /assets/  (静态)
             ─→ /api/*  ─→ [uvicorn :8000] ─→ [SQLite]
                                          ─→ [MiniMax API] (识别/对话)
```

## 设计语言

- **主色**：绿 #6a9a52 / 深绿 #3a5030
- **风格**：水彩 / 食物插画风（WebP 透明背景）
- **字体**：系统字体（iOS / Android / Web 同体验）
- **触觉**：iOS 风格阴影 + 圆角 16px

详细见 `产品文档/设计系统-Aesthetic-Foundation-v1.md`。

## License

MIT © 2026 Jarry Liu
