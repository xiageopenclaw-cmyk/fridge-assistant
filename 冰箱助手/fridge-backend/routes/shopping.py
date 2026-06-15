"""
采购清单 API — 健康标签 + 智能推荐 + 清单管理
"""
import json
from fastapi import APIRouter
from database import get_db
from pydantic import BaseModel

router = APIRouter(prefix="/api/shopping", tags=["shopping"])

CATEGORY_PRIORITY = {
    "蔬菜": 100, "水果": 95, "蛋类": 85, "肉类": 80,
    "乳制品": 75, "海鲜": 70, "豆制品": 65, "调味品": 50,
    "熟食": 40, "饮料": 30, "零食": 20, "其他": 10,
}

# ── Health Tag Rules ──
# Each rule: (tag_key, label, emoji, check_fn returning (active, severity, detail))
# severity: 0=none 1=light 2=warning 3=critical

HEALTH_TAG_RULES = [
    {
        "key": "low_veggie",
        "label": "缺蔬菜",
        "emoji": "🥬",
        "severity_thresholds": [(3, 1), (2, 2), (0, 3)],  # (count, severity)
        "category": "蔬菜",
        "description": "绿叶蔬菜摄入不足",
        "detail": "建议每天至少3种蔬菜，深色蔬菜占一半",
    },
    {
        "key": "low_protein",
        "label": "蛋白质偏低",
        "emoji": "🥩",
        "categories": ["肉类", "海鲜", "蛋类", "豆制品"],
        "severity_thresholds": [(3, 1), (2, 2), (1, 3)],
        "description": "肉蛋豆类蛋白质来源不足",
        "detail": "建议每天至少2种蛋白质来源",
    },
    {
        "key": "low_dairy",
        "label": "乳制品不足",
        "emoji": "🥛",
        "category": "乳制品",
        "severity_thresholds": [(1, 1), (0, 2)],
        "description": "钙摄入可能不足",
        "detail": "建议每天1份乳制品，牛奶/酸奶/奶酪",
    },
    {
        "key": "no_fruit",
        "label": "水果空缺",
        "emoji": "🍎",
        "category": "水果",
        "severity_thresholds": [(2, 1), (1, 2), (0, 3)],
        "description": "冰箱里没有水果",
        "detail": "每天200-350g新鲜水果，选当季的",
    },
    {
        "key": "breakfast_short",
        "label": "早餐不够",
        "emoji": "🌅",
        "breakfast_check": True,
        "severity_thresholds": [(2, 1), (1, 2), (0, 3)],
        "description": "明天早餐做不出来",
        "detail": "牛奶/鸡蛋/面包/燕麦/水果，至少2样",
    },
    {
        "key": "dark_green_low",
        "label": "深色蔬菜少",
        "emoji": "🥦",
        "severity_thresholds": [(2, 1), (1, 2), (0, 3)],
        "description": "深色蔬菜占比不够",
        "detail": "菠菜/西兰花/紫甘蓝/胡萝卜，富含维生素A/C",
    },
    {
        "key": "no_staple",
        "label": "主食空缺",
        "emoji": "🍚",
        "description": "未检测到主食储备",
        "detail": "米/面/馒头/面条，碳水是能量基础",
    },
    {
        "key": "low_variety",
        "label": "品类单一",
        "emoji": "📊",
        "categories_count": True,
        "severity_thresholds": [(5, 1), (3, 2)],
        "description": "食材种类太少，营养不均衡",
        "detail": "建议冰箱保持5种以上不同品类",
    },
    {
        "key": "expiring_soon",
        "label": "临期需替换",
        "emoji": "⚠️",
        "expiring_check": True,
        "severity_thresholds": [(1, 2), (3, 3)],
        "description": "有食材快过期了，建议买新的替换",
        "detail": "临期食材优先吃掉，同时补新货",
    },
]

# ── Recommendation rules per tag ──
# When user clicks a tag, show these specific food recommendations

TAG_RECOMMENDATIONS = {
    "low_veggie": [
        {"name": "菠菜", "category": "蔬菜", "reason": "绿叶菜，维生素A/C丰富", "shelf_hint": "3-5天"},
        {"name": "生菜", "category": "蔬菜", "reason": "沙拉/快炒两用，清爽百搭", "shelf_hint": "3-5天"},
        {"name": "西兰花", "category": "蔬菜", "reason": "深色蔬菜，抗氧化", "shelf_hint": "5-7天"},
        {"name": "黄瓜", "category": "蔬菜", "reason": "凉拌生吃都行，低卡", "shelf_hint": "5-7天"},
        {"name": "番茄", "category": "蔬菜", "reason": "万能搭配，维C丰富", "shelf_hint": "5-7天"},
        {"name": "胡萝卜", "category": "蔬菜", "reason": "耐放，炖炒都好用", "shelf_hint": "7-14天"},
    ],
    "low_protein": [
        {"name": "鸡胸肉", "category": "肉类", "reason": "高蛋白低脂，快手百搭", "shelf_hint": "1-2天"},
        {"name": "猪肉片", "category": "肉类", "reason": "日常炒菜必备", "shelf_hint": "1-2天"},
        {"name": "鸡蛋", "category": "蛋类", "reason": "最实用蛋白质来源", "shelf_hint": "30天"},
        {"name": "虾仁", "category": "海鲜", "reason": "高蛋白低脂，快熟", "shelf_hint": "1-2天"},
        {"name": "老豆腐", "category": "豆制品", "reason": "植物蛋白，炖煮皆宜", "shelf_hint": "3-5天"},
        {"name": "牛腱子", "category": "肉类", "reason": "红烧/炖汤，饱腹感强", "shelf_hint": "3-5天"},
    ],
    "low_dairy": [
        {"name": "鲜牛奶", "category": "乳制品", "reason": "基础钙来源，每天一杯", "shelf_hint": "4-7天"},
        {"name": "酸奶", "category": "乳制品", "reason": "益生菌，当零食或早餐", "shelf_hint": "7天"},
        {"name": "奶酪片", "category": "乳制品", "reason": "夹面包/做焗饭", "shelf_hint": "14天"},
    ],
    "no_fruit": [
        {"name": "香蕉", "category": "水果", "reason": "即食方便，补钾", "shelf_hint": "3-5天"},
        {"name": "苹果", "category": "水果", "reason": "耐放，每天一个", "shelf_hint": "7-14天"},
        {"name": "蓝莓", "category": "水果", "reason": "抗氧化，拌酸奶", "shelf_hint": "3-5天"},
        {"name": "橙子", "category": "水果", "reason": "维C炸弹", "shelf_hint": "7-10天"},
        {"name": "西瓜", "category": "水果", "reason": "夏季应季，清热解暑", "shelf_hint": "切开当天"},
    ],
    "breakfast_short": [
        {"name": "鲜牛奶", "category": "乳制品", "reason": "早餐喝一杯", "shelf_hint": "4-7天"},
        {"name": "鸡蛋", "category": "蛋类", "reason": "水煮最快最营养", "shelf_hint": "30天"},
        {"name": "面包", "category": "其他", "reason": "配牛奶鸡蛋就是一顿", "shelf_hint": "3-5天"},
        {"name": "即食燕麦", "category": "其他", "reason": "两分钟煮好", "shelf_hint": "30天"},
        {"name": "香蕉", "category": "水果", "reason": "剥开就能吃", "shelf_hint": "3-5天"},
    ],
    "dark_green_low": [
        {"name": "菠菜", "category": "蔬菜", "reason": "深绿色蔬菜代表", "shelf_hint": "3-5天"},
        {"name": "西兰花", "category": "蔬菜", "reason": "深色蔬菜，高维C", "shelf_hint": "5-7天"},
        {"name": "油麦菜", "category": "蔬菜", "reason": "深绿叶菜，清炒最香", "shelf_hint": "3-5天"},
        {"name": "紫甘蓝", "category": "蔬菜", "reason": "凉拌沙拉，花青素丰富", "shelf_hint": "7-10天"},
        {"name": "胡萝卜", "category": "蔬菜", "reason": "橙色蔬菜，维A丰富", "shelf_hint": "7-14天"},
    ],
    "no_staple": [
        {"name": "大米", "category": "其他", "reason": "基础主食", "shelf_hint": "长期"},
        {"name": "面条", "category": "其他", "reason": "快餐首选", "shelf_hint": "长期"},
        {"name": "馒头", "category": "其他", "reason": "加热即食", "shelf_hint": "3-5天"},
    ],
    "low_variety": [
        {"name": "口蘑", "category": "蔬菜", "reason": "菌菇类，提升鲜味", "shelf_hint": "3-5天"},
        {"name": "海带", "category": "其他", "reason": "藻类，补充碘", "shelf_hint": "7天"},
        {"name": "豆腐", "category": "豆制品", "reason": "植物蛋白多样性", "shelf_hint": "3-5天"},
        {"name": "洋葱", "category": "蔬菜", "reason": "耐放的调味蔬菜", "shelf_hint": "7-14天"},
    ],
    "expiring_soon": [
        {"name": "替换同款", "category": "auto", "reason": "临期食材的同品类补货", "shelf_hint": "同品类"},
    ],
}

# ── Supermarket aisle grouping for list display ──
AISLE_ORDER = ["蔬果区", "肉禽蛋", "乳制品", "豆制品", "干货调料", "其他"]

CATEGORY_AISLE = {
    "蔬菜": "蔬果区", "水果": "蔬果区",
    "肉类": "肉禽蛋", "蛋类": "肉禽蛋", "海鲜": "肉禽蛋",
    "乳制品": "乳制品",
    "豆制品": "豆制品",
    "调味品": "干货调料",
    "饮料": "其他", "零食": "其他", "熟食": "其他", "其他": "其他",
}

# ── Seasonal recommendations ──
SEASONAL = {
    "summer": {
        "label": "夏季应季",
        "items": [
            {"name": "西瓜", "category": "水果", "reason": "消暑解渴", "shelf_hint": "切开当天"},
            {"name": "冬瓜", "category": "蔬菜", "reason": "煲汤清热", "shelf_hint": "5-7天"},
            {"name": "苦瓜", "category": "蔬菜", "reason": "清热败火", "shelf_hint": "3-5天"},
            {"name": "丝瓜", "category": "蔬菜", "reason": "清炒鲜甜", "shelf_hint": "3-5天"},
            {"name": "绿豆", "category": "其他", "reason": "绿豆汤解暑", "shelf_hint": "长期"},
        ],
    },
}

# ── Response Models ──
class TagItem(BaseModel):
    key: str
    label: str
    emoji: str
    severity: int  # 0=none 1=light 2=warning 3=critical
    description: str
    detail: str

class RecommendItem(BaseModel):
    name: str
    category: str
    reason: str
    shelf_hint: str
    checked: bool = False

class AisleGroup(BaseModel):
    aisle: str
    items: list[dict]

class RecipeMissingItem(BaseModel):
    ingredient: str
    for_recipe: str
    checked: bool = False


@router.get("")
def get_shopping():
    """全量采购清单数据：
    - health_tags: 冰箱健康标签
    - recipe_missing: 今日菜谱缺失食材
    - seasonal: 应季推荐
    - list_groups: 按货架分组的采购清单（初始为空，由用户从前两类添加）
    """
    conn = get_db()
    try:
        # ── Inventory snapshot ──
        items = conn.execute(
            "SELECT name, category, quantity, unit, expiry_date FROM fridge_items"
        ).fetchall()
        item_dicts = [dict(r) for r in items]

        inventory_by_cat: dict[str, list] = {}
        for it in item_dicts:
            cat = it["category"]
            if cat not in inventory_by_cat:
                inventory_by_cat[cat] = []
            inventory_by_cat[cat].append(it)

        all_names = {it["name"] for it in item_dicts}
        all_cats = set(inventory_by_cat.keys())
        cat_count = len(all_cats)

        # ── Check expiring items (today or overdue) ──
        from datetime import date
        expiring_count = sum(
            1 for it in item_dicts
            if it["expiry_date"] and (date.fromisoformat(it["expiry_date"]) - date.today()).days <= 0
        )

        # ── Check breakfast capability ──
        breakfast_items = {"牛奶", "鸡蛋", "面包", "馒头", "燕麦", "酸奶", "香蕉", "苹果"}
        breakfast_available = sum(1 for n in breakfast_items if n in all_names)

        # ── Check dark green veggies ──
        dark_green = {"菠菜", "西兰花", "油麦菜", "紫甘蓝", "芥蓝", "羽衣甘蓝"}
        dark_green_count = sum(1 for n in dark_green if n in all_names)

        # ── Check staple ──
        staples = {"大米", "米", "面条", "馒头", "面包", "面粉"}
        has_staple = any(n in all_names for n in staples)

        # ── Build health tags ──
        health_tags = []
        for rule in HEALTH_TAG_RULES:
            key = rule["key"]
            severity = 0

            if "category" in rule:
                cat = rule["category"]
                count = len(inventory_by_cat.get(cat, []))
                for threshold, sev in sorted(rule.get("severity_thresholds", []), reverse=True):
                    if count <= threshold:
                        severity = sev

            elif "categories" in rule:
                count = sum(len(inventory_by_cat.get(c, [])) for c in rule["categories"])
                for threshold, sev in sorted(rule.get("severity_thresholds", []), reverse=True):
                    if count <= threshold:
                        severity = sev

            elif "breakfast_check" in rule:
                count = breakfast_available
                for threshold, sev in sorted(rule.get("severity_thresholds", []), reverse=True):
                    if count <= threshold:
                        severity = sev

            elif "categories_count" in rule:
                count = cat_count
                for threshold, sev in sorted(rule.get("severity_thresholds", []), reverse=True):
                    if count <= threshold:
                        severity = sev

            elif "expiring_check" in rule:
                count = expiring_count
                for threshold, sev in sorted(rule.get("severity_thresholds", []), reverse=True):
                    if count >= threshold:
                        severity = sev

            # Staple check: only trigger if truly missing
            if key == "no_staple" and has_staple:
                severity = 0

            # Breakfast: only trigger if not enough
            if key == "breakfast_short" and breakfast_available >= 2:
                severity = 0

            if severity > 0:
                health_tags.append(TagItem(
                    key=key, label=rule["label"], emoji=rule["emoji"],
                    severity=severity, description=rule["description"],
                    detail=rule["detail"],
                ))
            else:
                # Show all tags as analysis — healthy ones get severity=0 (green)
                health_tags.append(TagItem(
                    key=key, label=rule["label"], emoji=rule["emoji"],
                    severity=0, description=rule["description"],
                    detail=rule["detail"],
                ))

        # ── Recipe missing ingredients ──
        recipe_missing = []
        try:
            cache = conn.execute(
                "SELECT recipe_json FROM recipe_cache ORDER BY position ASC LIMIT 1"
            ).fetchone()
            if cache:
                recipes = json.loads(cache["recipe_json"])
                seen = set()
                for meal in ["breakfast", "lunch", "dinner"]:
                    for r in recipes.get(meal, []):
                        for m in r.get("missing", []):
                            if m not in seen and m not in all_names:
                                seen.add(m)
                                recipe_missing.append({
                                    "ingredient": m,
                                    "for_recipe": r.get("name", ""),
                                    "checked": False,
                                })
        except Exception:
            pass

        # ── Seasonal ──
        seasonal = SEASONAL.get("summer")

        # ── Recommendations by tag (summary) ──
        tags_with_recommendations = []
        for tag in health_tags:
            recs = TAG_RECOMMENDATIONS.get(tag.key, [])
            if recs:
                tags_with_recommendations.append({
                    "tag": tag.model_dump(),
                    "recommendations": [
                        {**r, "checked": False} for r in recs
                    ],
                })

        return {
            "health_tags": [t.model_dump() for t in health_tags],
            "tags_with_recommendations": tags_with_recommendations,
            "recipe_missing": recipe_missing,
            "seasonal": seasonal,
            "habit_repurchase": _get_habit_repurchase(conn, all_names),
        }
    finally:
        conn.close()


def _get_habit_repurchase(db, current_names: set) -> list[dict]:
    """Recommend items the user frequently buys but doesn't currently have."""
    if not current_names:
        rows = db.execute(
            "SELECT name, category, COUNT(*) as cnt, MAX(purchased_at) as last_buy "
            "FROM purchase_history GROUP BY name ORDER BY cnt DESC, last_buy DESC LIMIT 6"
        ).fetchall()
    else:
        placeholders = ','.join(['?' for _ in current_names])
        query = (
            f"SELECT name, category, COUNT(*) as cnt, MAX(purchased_at) as last_buy "
            f"FROM purchase_history WHERE name NOT IN ({placeholders}) "
            f"GROUP BY name ORDER BY cnt DESC, last_buy DESC LIMIT 6"
        )
        rows = db.execute(query, list(current_names)).fetchall()
    return [
        {
            "name": r["name"],
            "category": r["category"] or "其他",
            "reason": f"回购 {r['cnt']} 次",
            "shelf_hint": "",
            "checked": False,
        }
        for r in rows
    ]


# ── POST /api/shopping/stock — 一键入库 ──
class StockItem(BaseModel):
    name: str
    category: str
    quantity: float = 1
    unit: str = "件"


class StockRequest(BaseModel):
    items: list[StockItem]


@router.post("/stock")
def add_to_inventory(req: StockRequest):
    """将采购清单中勾选的食材一键加入冰箱库存"""
    from datetime import datetime
    from routes.inventory import estimate_expiry

    conn = get_db()
    try:
        added = []
        for item in req.items:
            purchase = datetime.now().strftime("%Y-%m-%d")
            expiry = estimate_expiry(item.category, purchase)
            conn.execute(
                """INSERT INTO fridge_items (name, category, quantity, unit, purchase_date, expiry_date)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (item.name, item.category, item.quantity, item.unit, purchase, expiry),
            )
            added.append(item.name)
            # Track habit
            conn.execute(
                "INSERT INTO purchase_history (name, category) VALUES (?, ?)",
                (item.name, item.category),
            )
        conn.commit()
        return {"message": f"已入库 {len(added)} 样食材", "added": added}
    finally:
        conn.close()

# ── Saved shopping lists ──

class SavedItem(BaseModel):
    name: str
    category: str
    quantity: float = 1
    unit: str = "件"
    checked: bool = False


class SaveListRequest(BaseModel):
    items: list[SavedItem]
    label: str = ""


@router.get("/lists")
def get_saved_lists():
    conn = get_db()
    try:
        rows = conn.execute("SELECT slot, label, items_json, updated_at FROM saved_lists ORDER BY slot").fetchall()
        return [{"slot": r["slot"], "label": r["label"], "items": json.loads(r["items_json"] or "[]"), "updated_at": r["updated_at"]} for r in rows]
    finally:
        conn.close()


@router.post("/lists/{slot}")
def save_list(slot: int, req: SaveListRequest):
    if slot not in (1, 2, 3):
        return {"error": "slot must be 1/2/3"}
    conn = get_db()
    try:
        conn.execute(
            "UPDATE saved_lists SET items_json=?, label=?, updated_at=datetime('now') WHERE slot=?",
            (json.dumps([i.model_dump() for i in req.items], ensure_ascii=False), req.label or f"list{slot}", slot),
        )
        conn.commit()
        return {"message": f"saved to slot {slot}", "slot": slot}
    finally:
        conn.close()


@router.get("/lists/{slot}")
def load_list(slot: int):
    if slot not in (1, 2, 3):
        return {"error": "slot must be 1/2/3"}
    conn = get_db()
    try:
        row = conn.execute("SELECT slot, label, items_json, updated_at FROM saved_lists WHERE slot=?", (slot,)).fetchone()
        if not row:
            return {"slot": slot, "label": "", "items": [], "updated_at": ""}
        return {"slot": row["slot"], "label": row["label"], "items": json.loads(row["items_json"] or "[]"), "updated_at": row["updated_at"]}
    finally:
        conn.close()


@router.patch("/lists/{slot}/rename")
def rename_list(slot: int, label: str = ""):
    if slot not in (1, 2, 3):
        return {"error": "slot must be 1/2/3"}
    conn = get_db()
    try:
        conn.execute("UPDATE saved_lists SET label=? WHERE slot=?", (label.strip() or f"list{slot}", slot))
        conn.commit()
        return {"message": "renamed", "slot": slot, "label": label.strip() or f"list{slot}"}
    finally:
        conn.close()
