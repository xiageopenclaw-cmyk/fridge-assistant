"""
冰箱食物冲突检测
基于查证数据（澎湃新闻/渔歌医疗/博禾医生/搜狐/头条 2024-2026）

核心原理：
1. 乙烯释放型食物催熟敏感食材
2. 浓烈气味渗透蛋壳
3. 生熟混放细菌交叉污染
"""

# ── 乙烯释放型（成熟时会释放乙烯气体，加速其他食物变质）──
ETHYLENE_PRODUCERS = {
    "苹果", "香蕉", "番茄", "西红柿", "猕猴桃", "奇异果",
    "芒果", "桃子", "梨", "哈密瓜", "木瓜", "百香果",
    "李子", "杏", "柿子", "甜桃",
}

# ── 乙烯敏感型（接触乙烯会加速变黄、变蔫、腐烂）──
ETHYLENE_SENSITIVE = {
    "菠菜", "生菜", "西兰花", "花椰菜", "黄瓜", "萝卜",
    "胡萝卜", "绿豆", "甜菜", "绿叶蔬菜", "香菜", "豌豆",
    "菠菜", "南瓜", "红薯", "土豆", "马铃薯", "西瓜",
    "芦笋", "四季豆", "秋葵", "水芹",
}

# ── 强烈气味型（气味会渗透到其他食物）──
STRONG_ODOR = {
    "洋葱", "姜", "蒜", "大葱", "小葱",
}

# ── 易吸味型 ──
ODOR_ABSORBING = {
    "鸡蛋", "面包", "馒头", "米饭",
}

# ── 香蕉特殊：几乎对任何水果都催熟 ──
BANANA_CONFLICT_ALL_FRUITS = True

# ── 具体冲突对 ──
SPECIFIC_CONFLICTS = [
    ("番茄", "黄瓜", "番茄释放乙烯使黄瓜变质腐烂"),
    ("苹果", "西瓜", "苹果乙烯让西瓜果肉变软烂"),
    ("洋葱", "土豆", "土豆吸收洋葱气味"),
    ("洋葱", "鸡蛋", "洋葱气味渗透蛋壳加速变质"),
    ("姜",   "鸡蛋", "姜味渗透蛋壳加速变质"),
    ("蒜",   "鸡蛋", "蒜味渗透蛋壳加速变质"),
    ("小葱", "鸡蛋", "葱味渗透蛋壳加速变质"),
    ("面包", "饼干", "饼干吸水变软，面包失水变硬"),
]


def check_conflicts(inventory: list[dict[str, str]]) -> list[dict]:
    """
    检查冰箱库存中的食物冲突。

    Args:
        inventory: 当前库存列表，每项至少包含 name, category

    Returns:
        冲突列表，每项包含 item_a, item_b, reason, severity
    """
    names = {item["name"] for item in inventory}
    categories = {item["category"] for item in inventory}
    conflicts = []
    seen = set()

    # 1. 查具体冲突对
    for a, b, reason in SPECIFIC_CONFLICTS:
        if a in names and b in names:
            key = tuple(sorted([a, b]))
            if key not in seen:
                conflicts.append({
                    "item_a": a, "item_b": b,
                    "reason": reason, "severity": "warning",
                })
                seen.add(key)

    # 2. 乙烯释放型 vs 敏感型
    producers_in = names & ETHYLENE_PRODUCERS
    sensitive_in = names & ETHYLENE_SENSITIVE
    if producers_in and sensitive_in:
        producers_str = "、".join(sorted(producers_in)[:3])
        sensitive_str = "、".join(sorted(sensitive_in)[:3])
        if len(producers_in) > 3:
            producers_str += f"等{len(producers_in)}种"
        if len(sensitive_in) > 3:
            sensitive_str += f"等{len(sensitive_in)}种"
        key = ("乙烯释放组", "乙烯敏感组")
        if key not in seen:
            conflicts.append({
                "item_a": producers_str,
                "item_b": sensitive_str,
                "reason": f"{producers_str}释放乙烯，会催熟{sensitive_str}，建议分开放置",
                "severity": "warning",
            })
            seen.add(key)

    # 3. 香蕉 vs 任何水果/蔬菜
    if "香蕉" in names:
        other_fruits = (names & ETHYLENE_SENSITIVE) | ((names & {"其他"}) - {"香蕉"})  # also check if other fruits/veggies exist
        # More general: banana vs any vegetable or fresh fruit
        fresh_cats = {"水果", "蔬菜"}
        other_fresh = {item["name"] for item in inventory if item["category"] in fresh_cats and item["name"] != "香蕉"}
        if other_fresh:
            other_str = "、".join(sorted(other_fresh)[:3])
            if len(other_fresh) > 3:
                other_str += f"等{len(other_fresh)}种"
            key = ("香蕉", "香蕉隔离")
            if key not in seen:
                conflicts.append({
                    "item_a": "香蕉",
                    "item_b": other_str,
                    "reason": "香蕉释放大量乙烯，几乎催熟所有水果蔬菜，建议单独存放",
                    "severity": "danger",
                })
                seen.add(key)

    # 4. 气味型 vs 易吸味型
    odor_in = names & STRONG_ODOR
    absorb_in = names & ODOR_ABSORBING
    if odor_in and absorb_in:
        for o in odor_in:
            for a in absorb_in:
                key = tuple(sorted([o, a]))
                if key not in seen:
                    conflicts.append({
                        "item_a": o, "item_b": a,
                        "reason": f"{o}气味浓烈，会渗透{a}表面加速变质",
                        "severity": "warning",
                    })
                    seen.add(key)

    # 5. 生熟混放（肉类/海鲜 + 熟食在同一冰箱）
    raw_cats = {"肉类", "海鲜"}
    cooked_cats = {"熟食"}
    has_raw = bool(set(categories) & raw_cats)
    has_cooked = bool(set(categories) & cooked_cats)
    if has_raw and has_cooked:
        key = ("生食", "熟食")
        if key not in seen:
            conflicts.append({
                "item_a": "生肉/海鲜",
                "item_b": "熟食",
                "reason": "生食细菌可能污染熟食，建议分层存放，生食放下层，熟食放上层",
                "severity": "danger",
            })
            seen.add(key)

    return conflicts
