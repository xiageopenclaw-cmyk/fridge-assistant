import os
import json
import time
import httpx
from fastapi import APIRouter
from database import get_db

router = APIRouter(prefix="/api", tags=["recipes"])

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE = "https://api.deepseek.com/v1"
CACHE_SIZE = 6  # 早2 + 午2 + 晚2

RECIPE_SYSTEM_PROMPT = """你是"冰箱小管家"专属菜谱推荐引擎。根据用户冰箱里的实际食材，推荐今天三顿饭的菜谱。

## 输出格式
返回一个纯JSON对象（不要markdown，不要解释文字），结构如下：

```json
{
  "breakfast": [
    { 菜谱对象1 },
    { 菜谱对象2 }
  ],
  "lunch": [
    { 菜谱对象1 },
    { 菜谱对象2 }
  ],
  "dinner": [
    { 菜谱对象1 },
    { 菜谱对象2 }
  ]
}
```

每个菜谱对象格式：
{
  "name": "菜名",
  "emoji": "对应emoji",
  "tags": ["用到的冰箱食材"],
  "time": "15 min",
  "difficulty": "简单",
  "itemCount": 2,
  "color": "#fef0d9",
  "steps": ["步骤1", "步骤2", "步骤3"],
  "nutrition": {"kcal": 300, "protein": 15, "carbs": 30, "fat": 12},
  "missing": ["需额外采购的食材"],
  "tip": "烹饪小贴士"
}

## 三餐推荐规则
- 早餐：快手为主（≤15分钟），偏清淡，蛋/奶/水果/面包/粥类
- 午餐：营养均衡，荤素搭配，有主食，适合带便当
- 晚餐：少油少盐，多蔬菜，容易消化，温热为主

## 通用规则
- 优先消耗⚠️临期食材
- 三餐之间食材不重复做主菜
- 步骤不超过4步
- 调味品（盐/油/酱油）不算缺失
"""


def _build_inventory_text(db) -> str:
    rows = db.execute(
        "SELECT name, category, quantity, unit, expiry_date FROM fridge_items ORDER BY expiry_date ASC"
    ).fetchall()
    if not rows:
        return "冰箱是空的。"

    from datetime import date
    lines = []
    for r in rows:
        ed = r["expiry_date"]
        remaining = (date.fromisoformat(ed) - date.today()).days if ed else 999
        urgent = " 今天到期" if remaining <= 0 else (" 临期" if remaining <= 2 else "")
        lines.append(f"- {r['name']}（{r['category']}）{r['quantity']}{r['unit']}，{remaining}天后到期{urgent}")
    return "\n".join(lines)


def _build_user_text(db) -> str:
    row = db.execute(
        "SELECT family_size, preferences, allergies, dislikes, cook_time FROM user_profile LIMIT 1"
    ).fetchone()
    if not row:
        return "暂无用户偏好。"
    prefs = json.loads(row["preferences"] or "[]")
    allergies = json.loads(row["allergies"] or "[]")
    dislikes = json.loads(row["dislikes"] or "[]")
    parts = [f"家庭人数：{row['family_size']}人"]
    if prefs:
        parts.append(f"口味偏好：{', '.join(prefs)}")
    if allergies:
        parts.append(f"过敏原：{', '.join(allergies)}")
    if dislikes:
        parts.append(f"忌口：{', '.join(dislikes)}")
    return "\n".join(parts)


FALLBACK = {
    "breakfast": [
        {
            "name": "牛奶燕麦粥", "emoji": "🥣",
            "tags": ["牛奶", "燕麦"], "time": "5 min", "difficulty": "简单",
            "itemCount": 1, "color": "#fef9e7",
            "steps": ["牛奶加热至微沸", "加入即食燕麦搅匀", "小火煮2分钟即可"],
            "nutrition": {"kcal": 280, "protein": 12, "carbs": 40, "fat": 8},
            "missing": ["燕麦"], "tip": "加点蓝莓更营养"
        },
        {
            "name": "水煮蛋配面包", "emoji": "🥚",
            "tags": ["鸡蛋"], "time": "10 min", "difficulty": "简单",
            "itemCount": 1, "color": "#fef0d9",
            "steps": ["鸡蛋冷水下锅", "水开后煮6分钟捞出", "搭配面包食用"],
            "nutrition": {"kcal": 200, "protein": 13, "carbs": 15, "fat": 10},
            "missing": ["面包"], "tip": "蛋黄流心煮6分钟"
        }
    ],
    "lunch": [
        {
            "name": "番茄炒蛋盖饭", "emoji": "🍳",
            "tags": ["番茄", "鸡蛋"], "time": "10 min", "difficulty": "简单",
            "itemCount": 2, "color": "#fef0d9",
            "steps": ["番茄切块鸡蛋打散", "热油炒蛋盛出", "炒番茄出汁加蛋翻炒"],
            "nutrition": {"kcal": 420, "protein": 18, "carbs": 45, "fat": 16},
            "missing": ["米饭"], "tip": "加点糖中和番茄酸味"
        },
        {
            "name": "蒜蓉西兰花炒虾仁", "emoji": "🥦",
            "tags": ["西兰花", "虾仁", "蒜"], "time": "12 min", "difficulty": "简单",
            "itemCount": 3, "color": "#e9f5e1",
            "steps": ["西兰花焯水虾仁料酒腌", "热油爆香蒜蓉", "下虾仁炒变色加西兰花翻匀"],
            "nutrition": {"kcal": 280, "protein": 28, "carbs": 10, "fat": 12},
            "missing": [], "tip": "虾仁不要炒老，变色即可"
        }
    ],
    "dinner": [
        {
            "name": "菠菜豆腐汤", "emoji": "🍲",
            "tags": ["菠菜", "豆腐"], "time": "10 min", "difficulty": "简单",
            "itemCount": 2, "color": "#e9f5e1",
            "steps": ["菠菜焯水豆腐切块", "锅中水烧开放豆腐煮3分钟", "加菠菜煮软调味"],
            "nutrition": {"kcal": 150, "protein": 14, "carbs": 8, "fat": 6},
            "missing": [], "tip": "菠菜焯水去草酸"
        },
        {
            "name": "口蘑鸡胸肉", "emoji": "🍗",
            "tags": ["鸡胸肉", "口蘑"], "time": "15 min", "difficulty": "简单",
            "itemCount": 2, "color": "#fde8e0",
            "steps": ["鸡胸肉切片生抽料酒腌", "口蘑切片", "热油炒鸡肉变色加口蘑翻炒熟"],
            "nutrition": {"kcal": 260, "protein": 35, "carbs": 6, "fat": 10},
            "missing": [], "tip": "鸡胸肉逆纹切片更嫩"
        }
    ]
}


# ── Cache I/O ──

def _read_cache(db) -> tuple:
    """Returns (data_dict, generated_at_str) or (None, None)."""
    row = db.execute(
        "SELECT recipe_json, generated_at FROM recipe_cache ORDER BY position ASC LIMIT 1"
    ).fetchone()
    if not row:
        return None, None
    try:
        data = json.loads(row["recipe_json"])
        if "breakfast" in data and "lunch" in data and "dinner" in data:
            return data, row["generated_at"]
    except (json.JSONDecodeError, KeyError):
        pass
    return None, None


def _write_cache(db, recipes: dict):
    db.execute("DELETE FROM recipe_cache")
    db.execute(
        "INSERT INTO recipe_cache (position, recipe_json) VALUES (0, ?)",
        (json.dumps(recipes, ensure_ascii=False),),
    )
    db.commit()


def _cache_is_fresh(generated_at) -> bool:
    """True if cache was generated today."""
    if not generated_at:
        return False
    from datetime import date
    gen_date = generated_at[:10]  # YYYY-MM-DD
    return gen_date >= date.today().isoformat()


# ── LLM Generation ──

def _generate_via_deepseek(db) -> dict:
    inventory_text = _build_inventory_text(db)
    user_text = _build_user_text(db)

    user_prompt = f"""## 用户偏好
{user_text}

## 当前冰箱库存
{inventory_text}

请根据以上库存推荐今天三顿饭：早餐2道、午餐2道、晚餐2道。优先用临期食材。只返回JSON对象。"""

    try:
        with httpx.Client(timeout=120) as client:
            resp = client.post(
                f"{DEEPSEEK_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "deepseek-v4-pro",
                    "messages": [
                        {"role": "system", "content": RECIPE_SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    "max_tokens": 5000,
                    "temperature": 0.8,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            raw = data["choices"][0]["message"]["content"].strip()

            if raw.startswith("```"):
                lines = raw.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                raw = "\n".join(lines).strip()

            parsed = json.loads(raw)
            if not isinstance(parsed, dict):
                raise ValueError("Not a dict")
            return parsed
    except json.JSONDecodeError:
        try:
            last_brace = raw.rfind('}')
            if last_brace > 0:
                parsed = json.loads(raw[:last_brace + 1])
                if isinstance(parsed, dict):
                    return parsed
        except Exception:
            pass
        raise
    except Exception:
        raise


def _fallback_generate(db) -> dict:
    return FALLBACK


# ── Background Refresh ──

def _trigger_bg_refresh():
    """Fire-and-forget background cache refresh via v4-pro."""
    import threading
    def _run():
        conn = get_db()
        try:
            if DEEPSEEK_API_KEY not in ("", None):
                try:
                    data = _generate_via_deepseek(conn)
                except Exception:
                    data = _fallback_generate(conn)
            else:
                data = _fallback_generate(conn)
            _write_cache(conn, data)
        except Exception:
            pass
        finally:
            conn.close()
    threading.Thread(target=_run, daemon=True).start()


# ── Routes ──

@router.get("/recipes")
def get_recipes():
    """获取今日三餐菜谱推荐（从缓存读取，秒回）。

    返回格式：{ "breakfast": [2道], "lunch": [2道], "dinner": [2道] }
    若缓存过期（跨天），返回旧数据同时后台触发 v4-pro 重新生成。
    """
    conn = get_db()
    try:
        data, generated_at = _read_cache(conn)
        if data is None:
            data = _fallback_generate(conn)
            _write_cache(conn, data)
        elif not _cache_is_fresh(generated_at):
            _trigger_bg_refresh()
        return data
    finally:
        conn.close()


@router.post("/recipes/refresh")
def refresh_recipes():
    """强制刷新：重新生成三餐菜谱并写入缓存。库存变动后、手动换一批时触发。"""
    conn = get_db()
    try:
        item_count = conn.execute("SELECT COUNT(*) FROM fridge_items").fetchone()[0]
        t0 = time.time()

        if DEEPSEEK_API_KEY not in ("", None):
            try:
                data = _generate_via_deepseek(conn)
            except Exception:
                data = _fallback_generate(conn)
        else:
            data = _fallback_generate(conn)

        elapsed = int((time.time() - t0) * 1000)
        _write_cache(conn, data)

        conn.execute(
            "INSERT INTO recipe_refresh_log (item_count, generation_ms, status) VALUES (?, ?, 'ok')",
            (item_count, elapsed),
        )
        conn.commit()

        return {
            "message": "已刷新三餐菜谱",
            "count": sum(len(v) for v in data.values()),
            "generation_ms": elapsed,
        }
    except Exception as e:
        return {"message": f"刷新失败: {e}", "count": 0, "generation_ms": 0}
    finally:
        conn.close()
