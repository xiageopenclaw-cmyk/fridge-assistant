# 冰箱助手 - ESP32 后端 API 文档

> 最后更新：2026-05-06

---

## 基本信息

| 项目 | 值 |
|------|-----|
| 后端地址 | `http://192.168.3.230:8000` |
| 内容类型 | `multipart/form-data` |
| 字符编码 | UTF-8 |

---

## 接口列表

### 1. 健康检查

```
GET /health
```

**响应 (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-05-06T10:00:00.000000"
}
```

---

### 2. 食材识别

```
POST /recognize
Content-Type: multipart/form-data
```

**Form 字段：**

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `image` | 文件 | ✅ | JPEG/PNG 图片，建议 320x240 QVGA |
| `source` | string | ❌ | `minimax`（默认）或 `baidu` |

**示例 (curl):**
```bash
curl -X POST http://192.168.3.230:8000/recognize \
  -F "image=@/tmp/fridge.jpg" \
  -F "source=minimax"
```

**响应 (200 OK):**
```json
{
  "source": "minimax",
  "foods": [
    {
      "name": "山竹",
      "confidence": 0.95,
      "expiry_days": 5
    }
  ],
  "raw": {
    "content": "识别结果的原始文本",
    "base_resp": {"status_code": 0, "status_msg": "success"}
  }
}
```

**字段说明：**

| 字段 | 说明 |
|------|------|
| `foods[].name` | 食物名称 |
| `foods[].confidence` | 置信度 (0~1) |
| `foods[].expiry_days` | 估算保质期（天），无法估算时为 `null` |

---

## MiniMax VLM API（ESP32 直接调用）

> 如果后端不可用，ESP32 可直接调用此接口。

**端点:** `POST https://api.minimaxi.com/v1/coding_plan/vlm`

**请求头:**
```
Authorization: Bearer <MINIMAX_API_KEY>
Content-Type: application/json
MM-API-Source: OpenClaw
```

**请求体:**
```json
{
  "prompt": "你是一个食材识别助手...",
  "image_url": "data:image/jpeg;base64,<图片base64>"
}
```

**响应:**
```json
{
  "content": "{\"foods\": [{\"name\": \"山竹\", \"confidence\": 0.95, \"expiry_days\": 5}]}",
  "base_resp": {"status_code": 0, "status_msg": "success"}
}
```
