import os
from fastapi import APIRouter, HTTPException
from database import get_db
from models import FoodItem
from datetime import datetime, date, timedelta
from verified_shelf_life import lookup_shelf_life

router = APIRouter(prefix="/api", tags=["inventory"])

# ── Freshness zones (percentage of shelf life consumed, with overflow tolerance) ──
# "尽快吃" spans from 70% of shelf_max up to shelf_max + TOLERANCE (20% of shelf_max)
# This gives foods a grace period past their estimated shelf life
FRESHNESS_ZONES = [
    (30,  "刚放入", "🟢", "#5ca85c"),
    (70,  "新鲜",   "🟢", "#5ca85c"),
    (120, "尽快吃", "🟡", "#e8953a"),
    (999, "过期",   "🔴", "#e0554a"),
]
SHELF_TOLERANCE = 0.2  # 20% grace period beyond shelf_max before "expired"


def compute_freshness(purchase_date: str, name: str, category: str) -> dict:
    """Return fuzzy freshness status using verified per-item shelf life."""
    shelf_min, shelf_max = lookup_shelf_life(name, category)
    purchased = datetime.strptime(purchase_date, "%Y-%m-%d").date()
    elapsed = (date.today() - purchased).days
    pct = min(100, round(elapsed / shelf_max * 100)) if shelf_max > 0 else 0

    for max_pct, label, emoji, color in FRESHNESS_ZONES:
        if pct <= max_pct:
            return {
                "status": label,
                "emoji": emoji,
                "color": color,
                "percent": pct,
                "elapsed_days": elapsed,
                "range_min": shelf_min,
                "range_max": shelf_max,
                "shelf_max_days": shelf_max,
            }
    # 过期
    return {
        "status": "过期",
        "emoji": "🔴",
        "color": "#e0554a",
        "percent": pct,
        "elapsed_days": elapsed,
        "range_min": shelf_min,
        "range_max": shelf_max,
        "shelf_max_days": shelf_max,
    }


def estimate_expiry(category: str, purchase_date: str | None = None) -> str:
    """Auto-estimate a reasonable expiry date based on category max shelf life.
    Falls back to +7 days for unknown categories.
    """
    _, shelf_max = CATEGORY_SHELF_RANGE.get(category, (3, 7))
    if purchase_date:
        base = datetime.strptime(purchase_date, "%Y-%m-%d").date()
    else:
        base = date.today()
    return (base + timedelta(days=shelf_max)).strftime("%Y-%m-%d")


@router.get("/inventory")
def get_inventory():
    """获取全部库存，用模糊保鲜区替代精确过期日"""
    conn = get_db()
    try:
        rows = conn.execute(
            """SELECT id, name, category, quantity, unit, purchase_date, expiry_date, image_url,
                      batch_label, expiry_source, production_date, shelf_life_days, opened_date
               FROM fridge_items
               ORDER BY purchase_date ASC"""
        ).fetchall()
        result = []
        for r in rows:
            item = dict(r)
            freshness = compute_freshness(item["purchase_date"], item["name"], item["category"])
            # Return new batch fields
            item["freshness"] = freshness
            item["shelf_range"] = {
                "min": freshness["range_min"],
                "max": freshness["range_max"],
            }
            item["batch_label"] = item.get("batch_label", "")
            item["expiry_source"] = item.get("expiry_source", "verified")
            item["production_date"] = item.get("production_date", "")
            item["shelf_life_days"] = item.get("shelf_life_days", 0)
            item["opened_date"] = item.get("opened_date", "")
            result.append(item)
        return result
    finally:
        conn.close()


@router.post("/inventory")
def add_inventory(item: FoodItem):
    """添加食材到库存。
    - expiry_date 可选，不提供则按品类最大保鲜期推算作为基准日
    - 前端展示模糊状态（刚放入/新鲜/尽快吃/今天吃），不展示精确过期
    """
    conn = get_db()
    try:
        purchase = item.purchase_date or datetime.now().strftime("%Y-%m-%d")
        if item.expiry_date:
            expiry = item.expiry_date
        else:
            expiry = estimate_expiry(item.category, purchase)

        cursor = conn.execute(
            """INSERT INTO fridge_items (name, category, quantity, unit, purchase_date, expiry_date, image_url)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (item.name, item.category, item.quantity, item.unit, purchase, expiry, item.image_url),
        )
        conn.commit()
        item_id = cursor.lastrowid
        freshness = compute_freshness(purchase, item.category)

        # Auto-refresh recipe cache after inventory change
        _try_refresh_cache(conn)

        return {
            "id": item_id,
            "message": f"已添加 {item.name}",
            "freshness": freshness,
        }
    finally:
        conn.close()


def _try_refresh_cache(db):
    """Attempt background recipe cache refresh. Silently fails if LLM unavailable."""
    import threading
    def _bg_refresh():
        try:
            from routes.recipes import _generate_via_deepseek, _write_cache, _fallback_generate
            conn = get_db()
            try:
                if os.environ.get("DEEPSEEK_API_KEY", "") not in ("", None):
                    recipes = _generate_via_deepseek(conn)
                else:
                    recipes = _fallback_generate(conn)
                _write_cache(conn, recipes)
            finally:
                conn.close()
        except Exception:
            pass
    threading.Thread(target=_bg_refresh, daemon=True).start()
