spawn /usr/bin/ssh -o StrictHostKeyChecking=no Jarry@192.168.3.230 cat /home/Jarry/fridge-assistant/main.py
Jarry@192.168.3.230's password: 
"""
Fridge Assistant - FastAPI 后端
"""
import re
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import base64
import os
from datetime import datetime

app = FastAPI(title="Fridge Assistant API", version="0.1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── 配置 ───
BAIDU_API_KEY = os.getenv("BAIDU_API_KEY", "")
BAIDU_SECRET_KEY = os.getenv("BAIDU_SECRET_KEY", "")
MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY", "")
MINIMAX_BASE_URL = "https://api.minimaxi.com/anthropic"

# ─── 数据模型 ───
class FoodItem(BaseModel):
    name: str
    confidence: float = 1.0
    expiry_days: int | None = None

class RecognizeResponse(BaseModel):
    source: str
    foods: list[FoodItem]
    raw: dict | None = None

# ─── 路由 ───
@app.get("/")
async def root():
    return {"status": "ok", "service": "fridge-assistant", "version": "0.1.0"}

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/recognize", response_model=RecognizeResponse)
async def recognize(
    image: UploadFile = File(...),
    source: str = Form("minimax")
):
    """
    食材识别 API
    - image: 图片文件
    - source: "baidu" | "minimax"
    """
    if source not in ("baidu", "minimax"):
        raise HTTPException(400, f"Unknown source: {source}")

    contents = await image.read()
    b64_image = base64.b64encode(contents).decode()

    if source == "minimax":
        return await _recognize_minimax(b64_image, contents)
    else:
        return await _recognize_baidu(b64_image)

async def _recognize_minimax(b64_image: str, raw_bytes: bytes) -> RecognizeResponse:
    """调用 MiniMax VLM 模型（/v1/coding_plan/vlm 专用视觉接口）"""
    if not MINIMAX_API_KEY:
        raise HTTPException(500, "MINIMAX_API_KEY not configured")

    prompt = (
        "你是一个食材识别助手。请仔细看这张冰箱内食物的图片，"
        "列出图片中所有可见的食物/食材名称，以及你对识别结果的置信度（0-1）。"
        "同时给出每种食物的估算保质期（天），如果无法估算则写null。"
        "以 JSON 格式返回："
        '{"foods": [{"name": "食物名", "confidence": 0.95, "expiry_days": 3}]}'
    )

    data_url = f"data:image/jpeg;base64,{b64_image}"

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://api.minimaxi.com/v1/coding_plan/vlm",
            headers={
                "Authorization": f"Bearer {MINIMAX_API_KEY}",
                "Content-Type": "application/json",
                "MM-API-Source": "OpenClaw",
            },
            json={
                "prompt": prompt,
                "image_url": data_url,
            },
        )
        if resp.status_code != 200:
            raise HTTPException(502, f"MiniMax VLM API error: {resp.status_code} {resp.text}")

        data = resp.json()
        text = data.get("content", "")
        import json as json_mod
        # Strip markdown code blocks if present (MiniMax may return ```json...```)
        text_clean = re.sub(r"^```json\s*", "", text.strip()).strip()
        text_clean = re.sub(r"\s*```$", "", text_clean).strip()
        try:
            result = json_mod.loads(text_clean)
        except Exception:
            result = {"foods": [{"name": text.strip(), "confidence": 1.0, "expiry_days": None}]}

        return RecognizeResponse(source="minimax", foods=result.get("foods", []), raw=data)

async def _get_baidu_token() -> str:
    """获取百度 API access_token"""
    BAIDU_API_KEY = os.environ.get("BAIDU_API_KEY", "")
    BAIDU_SECRET_KEY = os.environ.get("BAIDU_SECRET_KEY", "")
    if not BAIDU_API_KEY or not BAIDU_SECRET_KEY:
        raise HTTPException(500, "BAIDU_API_KEY or BAIDU_SECRET_KEY not configured")
    token_url = (f"https://aip.baidubce.com/oauth/2.0/token"
                 f"?grant_type=client_credentials&client_id={BAIDU_API_KEY}&client_secret={BAIDU_SECRET_KEY}")
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(token_url)
        data = resp.json()
        return data.get("access_token", "")


async def _recognize_baidu(b64_image: str) -> RecognizeResponse:
    """调用百度果蔬食材识别 API"""
    BAIDU_API_KEY = os.environ.get("BAIDU_API_KEY", "")
    BAIDU_SECRET_KEY = os.environ.get("BAIDU_SECRET_KEY", "")
    if not BAIDU_API_KEY or not BAIDU_SECRET_KEY:
        raise HTTPException(500, "BAIDU_API_KEY or BAIDU_SECRET_KEY not configured")

    token = await _get_baidu_token()
    api_url = f"https://aip.baidubce.com/rest/2.0/image-classify/v1/ingredient?access_token={token}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(api_url, data={"image": b64_image})
        if resp.status_code != 200:
            raise HTTPException(502, f"Baidu API error: {resp.status_code} {resp.text}")

        data = resp.json()
        result = data.get("result", [])
        foods = []
        for item in result:
            name = item.get("name", "")
            confidence = float(item.get("score", 1.0))
            if name:
                foods.append({"name": name, "confidence": confidence, "expiry_days": None})

        if not foods:
            raise HTTPException(400, "未识别到食物")

        return RecognizeResponse(source="baidu", foods=foods, raw=data)
