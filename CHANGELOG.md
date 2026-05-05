# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.1.0] - 2026-05-04

### Added

- **GitHub 仓库初始化**
  - 仓库地址：https://github.com/xiageopenclaw-cmyk/fridge-assistant
  - 公开仓库，Python + FastAPI 技术栈

- **FastAPI 后端框架**
  - `/` — 服务健康检查
  - `/health` — 状态接口（返回时间戳）
  - `/recognize` — 食材识别 API（支持 MiniMax + 百度双源识别）
  - 完整 CORS 配置（允许跨域请求）
  - 依赖：`fastapi`, `uvicorn`, `httpx`, `pydantic`

- **双源识别方案**
  - `source=minimax`：调用 MiniMax 多模态模型（MiniMax-V01）识别食材，返回食物名称、置信度、估算保质期
  - `source=baidu`：调用百度云食材识别 API（需配合 Baidu API Key / Secret Key）

- **NAS 部署**
  - 后端已在 NAS（192.168.3.230:8000）运行
  - 通过 uvicorn 托管，监听 0.0.0.0:8000

- **Skill 集成**
  - `fridge-assistant` skill 已配置，自动加载项目上下文
  - 包含会前/会中/会后完整会议流程规范

### Project Structure

```
fridge-assistant/
├── backend/
│   ├── main.py          # FastAPI 后端主文件
│   ├── requirements.txt # Python 依赖
│   ├── README.md        # 后端说明文档
│   └── CHANGELOG.md     # 本文件
├── 对话记录/
│   ├── 2026-05-02-完整对话.md
│   └── 2026-05-04-完整对话.md
├── 技术方案.md           # 技术方案文档
└── fridge-assistant.skill
```

### Next Steps

- [ ] 申请百度食材识别 API Key + Secret Key
- [ ] 配置 MiniMax API Key 到 NAS 环境变量
- [ ] 数据库选型（待讨论）
- [ ] 麦克风 / 门磁开关硬件选型（待讨论）
- [ ] OCR 识别生产日期实现方案
- [ ] 保质期数据库建设
