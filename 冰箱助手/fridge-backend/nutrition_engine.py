"""
Nutrition scoring engine based on:
  - DBI-16 (中国膳食平衡指数, He et al. 营养学报 2018)
  - HEI-2020 (Healthy Eating Index, USDA/NCI)
  - NOVA food processing classification (Monteiro et al. BMJ 2023)

All scoring is computed from inventory data — no user food diary required.
"""

from typing import TypedDict

# ── DBI-16 Component Definitions ──
# Each component has direction: "deficit" (only penalize under-consumption),
# "excess" (only penalize over-consumption), or "both" (penalize both ends).
# 负端分(LBS) = sum of deficit/negative scores; 正端分(HBS) = sum of excess/positive scores
# DQD (膳食质量距) = LBS + HBS

# Score range reference (from DBI-16 paper):
#   0-12: adequate / 13-24: mild / 25-48: moderate / >48: severe
# LBS > 12 means significant under-consumption
# HBS > 8 means significant over-consumption

DBI_INDICATORS = [
    # (key, label, direction, max_deficit, max_excess)
    # C1-C4 are deficit+excess, C5-C7 are excess-only, C8-C9 are deficit-only
    ("cereals",     "谷薯类",     "both",   12, 12),
    ("veggie_fruit","蔬菜水果",   "deficit", 12, 0),
    ("dairy_soy",   "奶豆类",     "deficit", 12, 0),
    ("animal_food", "动物性食物", "both",    12, 8),
    ("oil",         "烹调油",     "excess",   0, 6),
    ("salt",        "盐/调味品",  "excess",   0, 6),
    ("variety",     "食物多样性", "deficit",  10, 0),
    ("water",       "饮品",       "both",     6, 6),
]

# ── HEI-2020 Sub-components (adapted for Chinese ingredients) ──
HEI_COMPONENTS = [
    # (key, label, max_points, type)
    ("total_veg",      "总蔬菜",          5,  "adequacy"),
    ("dark_green",     "深色蔬菜占比",     5,  "adequacy"),
    ("total_fruit",    "总水果",          5,  "adequacy"),
    ("whole_fruit",    "完整水果(非果汁)", 5,  "adequacy"),
    ("whole_grain",    "全谷物/薯类",      10, "adequacy"),
    ("dairy",          "乳制品",           10, "adequacy"),
    ("total_protein",  "总蛋白质",         5,  "adequacy"),
    ("seafood_plant",  "水产+植物蛋白",    5,  "adequacy"),
    ("fatty_acid",     "脂肪酸均衡",       10, "adequacy"),
    ("refined_grain",  "精制谷物(反向)",   10, "moderation"),
    ("sodium",         "钠(反向)",         10, "moderation"),
    ("added_sugar",    "添加糖(反向)",     10, "moderation"),
    ("sat_fat",        "饱和脂肪(反向)",   10, "moderation"),
]

# ── NOVA Classification ──
NOVA_CLASSIFICATION = {
    # G1: unprocessed/minimally processed
    "蔬菜":   1, "水果": 1, "肉类": 1, "海鲜": 1,
    "蛋类":   1, "乳制品": 1,
    # G2: processed culinary ingredients
    "调味品": 2, "豆制品": 2,
    # G3: processed foods
    "熟食":   3,
    # G4: ultra-processed
    "零食":   4, "饮料": 4,
    # fallback
    "其他":   2,
}

# ── Category → food group mapping for DBI scoring ──
# Each category maps to one or more DBI indicators
DBI_CATEGORY_MAP = {
    "蔬菜":   ["veggie_fruit", "variety"],
    "水果":   ["veggie_fruit", "total_fruit", "variety"],
    "肉类":   ["animal_food", "variety"],
    "蛋类":   ["animal_food", "variety"],
    "海鲜":   ["animal_food", "seafood_plant", "variety"],
    "乳制品": ["dairy_soy", "dairy", "variety"],
    "豆制品": ["dairy_soy", "seafood_plant", "variety"],
    "调味品": ["salt", "variety"],
    "熟食":   ["animal_food", "variety"],
    "零食":   ["added_sugar", "variety"],
    "饮料":   ["water", "added_sugar", "variety"],
    "其他":   ["variety"],
}

# ── Sub-category mapping for HEI dark_green ──
DARK_GREEN_VEGGIES = {"菠菜", "西兰花", "芥蓝", "羽衣甘蓝", "生菜", "油麦菜", "青菜", "油菜", "空心菜", "茼蒿", "苋菜"}
DEEP_COLORED_FRUITS = {"蓝莓", "草莓", "桑葚", "樱桃", "葡萄", "火龙果", "猕猴桃", "芒果", "橙", "柑橘", "柚子"}

# ── Chinese Food Pagoda daily targets (per person, in item-count equivalents) ──
# Since we count items not grams, we use normalized equivalents:
#   1 item roughly = 1 serving/day equivalent (since items vary in quantity)
# Targets are scaled by family_size
CHINESE_FOOD_PAGODA = {
    "cereals":     {"target": 3, "unit": "种/天"},   # 谷薯类
    "veggie_fruit":{"target": 4, "unit": "种/天"},   # 蔬菜+水果
    "dairy_soy":   {"target": 2, "unit": "种/天"},   # 奶+豆
    "animal_food": {"target": 3, "unit": "种/天"},   # 肉蛋鱼
    "oil":         {"limit": 1,  "unit": "种"},       # 油类上限
    "salt":        {"limit": 2,  "unit": "种"},       # 调味品上限
    "variety":     {"target": 12,"unit": "种/周"},    # 每天12种
    "water":       {"target": 2, "unit": "种"},       # 饮品
}


class NutritionScores(TypedDict):
    # DBI-16
    dbi_lbs: int       # 负端分 (0 is best, higher = more deficit)
    dbi_hbs: int       # 正端分 (0 is best, higher = more excess)
    dbi_dqd: int       # 膳食质量距 (0 is best)
    dbi_level: str     # 评价等级
    dbi_interpretation: str

    # HEI-2020 total
    hei_total: int     # 0-100

    # HEI sub-scores
    hei_components: dict  # {key: {score, max, label, comment}}

    # NOVA
    nova_summary: dict    # {g1_pct, g4_pct, interpretation}

    # Integrated
    overall_score: int    # 0-100 weighted composite
    overall_grade: str
    recommendations: list[str]


def compute_nutrition_scores(items: list[dict], family_size: int = 2) -> NutritionScores:
    """
    Compute comprehensive nutrition quality scores from fridge inventory.
    
    Args:
        items: list of inventory items with 'category' and 'name' fields
        family_size: number of people eating (from user profile), defaults to 2
    
    Returns:
        NutritionScores dict with DBI-16, HEI-2020, NOVA, and recommendations
    """
    total_items = len(items)
    if total_items == 0:
        return _empty_scores()

    # ── Categorize items into DBI food groups ──
    group_counts: dict[str, int] = {k: 0 for k in CHINESE_FOOD_PAGODA}
    variety_set: set[str] = set()  # unique food items (for variety scoring)

    for item in items:
        cat = item.get("category", "其他")
        name = item.get("name", "")
        # Map category to DBI groups
        for grp in DBI_CATEGORY_MAP.get(cat, ["variety"]):
            if grp in group_counts:
                group_counts[grp] += 1
        variety_set.add(name)

    group_counts["variety"] = len(variety_set)

    # ── DBI-16 Scoring ──
    dbi_scores = {}
    lbs = 0  # negative end score
    hbs = 0  # positive end score

    for key, label, direction, max_def, max_exc in DBI_INDICATORS:
        count = group_counts.get(key, 0)
        target = CHINESE_FOOD_PAGODA.get(key, {})
        
        if direction in ("deficit", "both"):
            # If count < target, assign negative score (proportional)
            target_val = target.get("target", 3)
            if count < target_val:
                ratio = 1 - (count / target_val)
                score = -round(ratio * max_def)
            else:
                score = 0
            dbi_scores[f"{key}_def"] = score
            if score < 0:
                lbs += abs(score)

        if direction in ("excess", "both"):
            limit_val = target.get("limit", target.get("target", 3))
            if count > limit_val:
                ratio = min(1, (count - limit_val) / max(limit_val, 1))
                score = round(ratio * max_exc)
            else:
                score = 0
            dbi_scores[f"{key}_exc"] = score
            if score > 0:
                hbs += score

    dqd = lbs + hbs

    # Interpret DBI
    if dqd <= 12:
        dbi_level = "均衡" 
        dbi_interp = "膳食结构良好，各类食物摄入较为均衡"
    elif dqd <= 24:
        dbi_level = "轻度不均衡"
        dbi_interp = f"{'摄入不足' if lbs > hbs else '摄入过量'}为主要问题，建议调整部分品类"
    elif dqd <= 48:
        dbi_level = "中度不均衡"
        dbi_interp = f"存在明显的{'摄入不足' if lbs > hbs else '摄入过量'}，需系统改善"
    else:
        dbi_level = "高度不均衡" 
        dbi_interp = "膳食结构严重失调，建议尽快补充缺失品类"

    # ── HEI-2020 Adapted Scoring ──
    hei_total = 0
    hei_components = {}

    # Adequacy components
    for key, label, max_pts, comp_type in HEI_COMPONENTS:
        if comp_type == "adequacy":
            score = _score_hei_adequacy(key, items, group_counts, max_pts)
            hei_total += score
            hei_components[key] = {"score": score, "max": max_pts, "label": label, "comment": _hei_comment(key, score, max_pts)}

    # Moderation components (processed separately)
    for key, label, max_pts, comp_type in HEI_COMPONENTS:
        if comp_type == "moderation":
            score = _score_hei_moderation(key, items, group_counts, max_pts)
            hei_total += score
            hei_components[key] = {"score": score, "max": max_pts, "label": label, "comment": _hei_comment(key, score, max_pts)}

    # ── NOVA Processing Score ──
    nova_counts = {1: 0, 2: 0, 3: 0, 4: 0}
    for item in items:
        cat = item.get("category", "其他")
        level = NOVA_CLASSIFICATION.get(cat, 2)
        nova_counts[level] += 1

    g1_pct = round(nova_counts[1] / total_items * 100) if total_items > 0 else 0
    g4_pct = round(nova_counts[4] / total_items * 100) if total_items > 0 else 0
    nova_score = max(0, min(100, round(g1_pct - g4_pct * 2 + 50)))

    if g4_pct <= 10:
        nova_interp = "以天然食材为主，加工度极低 ✓"
    elif g4_pct <= 25:
        nova_interp = "有一定加工食品，建议减少零食和含糖饮料"
    else:
        nova_interp = "加工食品占比偏高，建议多选新鲜食材"

    nova_summary = {
        "g1_pct": g1_pct,
        "g2_pct": round(nova_counts[2] / total_items * 100),
        "g3_pct": round(nova_counts[3] / total_items * 100),
        "g4_pct": g4_pct,
        "nova_score": nova_score,
        "interpretation": nova_interp,
    }

    # ── Integrated Score ──
    # Weight: HEI 50%, DBI (inverted) 30%, NOVA 20%
    dbi_norm = max(0, 100 - dqd * 1.5)  # invert: lower DQD = higher score
    overall = round(hei_total * 0.5 + dbi_norm * 0.3 + nova_score * 0.2)

    if overall >= 85:
        grade = "A 优秀"
    elif overall >= 70:
        grade = "B 良好"
    elif overall >= 55:
        grade = "C 一般"
    elif overall >= 40:
        grade = "D 需改善"
    else:
        grade = "E 亟待改善"

    # ── Recommendations ──
    recommendations = _generate_recommendations(group_counts, hei_components, nova_summary, items)

    return {
        "dbi_lbs": lbs,
        "dbi_hbs": hbs,
        "dbi_dqd": dqd,
        "dbi_level": dbi_level,
        "dbi_interpretation": dbi_interp,
        "hei_total": hei_total,
        "hei_components": hei_components,
        "nova_summary": nova_summary,
        "overall_score": overall,
        "overall_grade": grade,
        "recommendations": recommendations,
    }


def _score_hei_adequacy(key: str, items: list[dict], groups: dict, max_pts: int) -> int:
    """Score a HEI adequacy component based on inventory counts."""
    cat_ids = {item.get("category", "") for item in items}
    names = {item.get("name", "") for item in items}
    total = len(items)

    if key == "total_veg":
        count = groups.get("veggie_fruit", 0)
        # target: at least 3 items of vegetables
        ratio = min(1, count / 3)
        return round(ratio * max_pts)

    elif key == "dark_green":
        dark = sum(1 for item in items if item.get("category") == "蔬菜" and item.get("name", "") in DARK_GREEN_VEGGIES)
        veg_count = sum(1 for item in items if item.get("category") == "蔬菜")
        ratio = min(1, dark / max(1, veg_count) / 0.5)
        return round(ratio * max_pts)

    elif key == "total_fruit":
        fruit_count = sum(1 for item in items if item.get("category") == "水果")
        ratio = min(1, fruit_count / 2)
        return round(ratio * max_pts)

    elif key == "whole_fruit":
        # All fruit in fridge are whole fruit (no juice), but penalize if only 1 type
        fruit_types = len({item.get("name") for item in items if item.get("category") == "水果"})
        ratio = min(1, fruit_types / 2)
        return round(ratio * max_pts)

    elif key == "whole_grain":
        # Check for whole grain / tuber indicators
        grain_keywords = {"糙米", "燕麦", "小米", "全麦", "藜麦", "玉米", "红薯", "土豆", "紫薯", "山药", "芋头"}
        has_grain = any(kw in name for item in items for kw in grain_keywords for name in [item.get("name", "")])
        # Also check for "主食" in vegetables (potato, sweet potato are under 蔬菜)
        ratio = 0.6 if has_grain else 0.15
        return round(ratio * max_pts)

    elif key == "dairy":
        dairy_count = sum(1 for item in items if item.get("category") == "乳制品")
        ratio = min(1, dairy_count / 2)
        return round(ratio * max_pts)

    elif key == "total_protein":
        protein_cats = {"肉类", "蛋类", "海鲜", "乳制品", "豆制品", "熟食"}
        count = sum(1 for item in items if item.get("category") in protein_cats)
        ratio = min(1, count / 3)
        return round(ratio * max_pts)

    elif key == "seafood_plant":
        seafood = sum(1 for item in items if item.get("category") == "海鲜")
        plant_protein = sum(1 for item in items if item.get("category") == "豆制品")
        total_protein_cats = {"肉类", "蛋类", "海鲜", "乳制品", "豆制品", "熟食"}
        total_p = sum(1 for item in items if item.get("category") in total_protein_cats)
        ratio = min(1, (seafood + plant_protein) / max(1, total_p) / 0.4)
        return round(ratio * max_pts)

    elif key == "fatty_acid":
        # Check for healthy fat sources: fish, soy, nuts, vegetable oils
        has_fish = any(item.get("category") == "海鲜" for item in items)
        has_soy = any(item.get("category") == "豆制品" for item in items)
        # Red meat / saturated fat heavy
        red_meat = sum(1 for item in items if item.get("category") == "肉类")
        # 海鲜+豆制品 vs 红肉 ratio
        ratio = 0.5
        if has_fish or has_soy:
            ratio = min(1, 0.6 + (0.4 if red_meat <= 2 else 0))
        return round(ratio * max_pts)

    else:
        return max_pts  # unknown → give full credit


def _score_hei_moderation(key: str, items: list[dict], groups: dict, max_pts: int) -> int:
    """Score a HEI moderation component (higher = less consumption = better)."""
    total = len(items)

    if key == "refined_grain":
        # Few items in "精制碳水" → good. Since we don't track grains explicitly,
        # penalize high proportion of 零食/熟食/饮料
        refined_count = sum(1 for item in items if item.get("category") in ("零食", "熟食", "饮料"))
        ratio = max(0, 1 - refined_count / max(1, total) / 0.3)
        return round(ratio * max_pts)

    elif key == "sodium":
        #调味品/腌制/熟食 count → more = worse
        sodium_items = sum(1 for item in items if item.get("category") in ("调味品", "熟食"))
        ratio = max(0, 1 - sodium_items / max(1, total) / 0.15)
        return round(ratio * max_pts)

    elif key == "added_sugar":
        sugar_items = sum(1 for item in items if item.get("category") in ("零食", "饮料"))
        ratio = max(0, 1 - sugar_items / max(1, total) / 0.15)
        return round(ratio * max_pts)

    elif key == "sat_fat":
        # Red meat heavy → more saturated fat
        red_meat = sum(1 for item in items if item.get("category") == "肉类")
        butter_cheese = sum(1 for item in items if item.get("category") == "乳制品" and item.get("name", "") in ("黄油", "奶油", "奶酪"))
        sat_source = red_meat + butter_cheese
        ratio = max(0, 1 - sat_source / max(1, total) / 0.2)
        return round(ratio * max_pts)

    else:
        return max_pts


def _hei_comment(key: str, score: int, max_pts: int) -> str:
    """Generate a human-readable comment for a HEI component."""
    pct = score / max_pts if max_pts > 0 else 1
    if pct >= 0.8:
        return "充足"
    elif pct >= 0.5:
        return "可补充"
    elif pct >= 0.3:
        return "不足"
    else:
        return "严重缺乏"


def _generate_recommendations(groups: dict, hei: dict, nova: dict, items: list[dict]) -> list[str]:
    """Generate actionable recommendations based on nutrition analysis."""
    recs = []

    # Check NOVA
    if nova.get("g4_pct", 0) > 20:
        recs.append("加工食品占比偏高，建议减少零食和含糖饮料，多选新鲜蔬果肉类")

    # Check HEI gaps
    for key, comp in hei.items():
        ratio = comp["score"] / comp["max"] if comp["max"] > 0 else 1
        if ratio < 0.4 and comp["label"] in ("总蔬菜", "深色蔬菜占比"):
            recs.append("蔬菜种类偏少，建议补充深绿色叶菜（菠菜/西兰花/油菜）")
        elif ratio < 0.4 and comp["label"] == "总水果":
            recs.append("水果摄入不足，建议每天补2种时令水果")
        elif ratio < 0.4 and comp["label"] == "乳制品":
            recs.append("奶制品摄入不足，建议补牛奶/酸奶，保障钙质")
        elif ratio < 0.4 and comp["label"] == "全谷物/薯类":
            recs.append("缺少全谷物，建议增加糙米/燕麦/红薯等替代精米白面")
        elif ratio < 0.4 and comp["label"] == "水产+植物蛋白":
            recs.append("蛋白来源单一，建议增加鱼虾或豆制品，减少红肉占比")

    # Check variety
    variety = groups.get("variety", 0)
    if variety < 8:
        recs.append(f"食材种类仅{variety}种，《膳食指南》建议每天12种以上")

    # Deduplicate and limit
    seen = set()
    unique_recs = []
    for r in recs:
        if r not in seen:
            seen.add(r)
            unique_recs.append(r)

    return unique_recs[:5]


def _empty_scores() -> NutritionScores:
    return {
        "dbi_lbs": 0, "dbi_hbs": 0, "dbi_dqd": 0,
        "dbi_level": "无数据", "dbi_interpretation": "冰箱暂无食材，无法评估",
        "hei_total": 0,
        "hei_components": {},
        "nova_summary": {"g1_pct": 0, "g2_pct": 0, "g3_pct": 0, "g4_pct": 0, "nova_score": 0, "interpretation": "无数据"},
        "overall_score": 0,
        "overall_grade": "—",
        "recommendations": ["往冰箱添加食材即可开始营养评估"],
    }
