import sqlite3
from datetime import datetime, timedelta

DB_PATH = "fridge.db"


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # ── Inventory ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fridge_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            quantity REAL NOT NULL DEFAULT 1,
            unit TEXT DEFAULT '件',
            purchase_date TEXT NOT NULL,
            expiry_date TEXT NOT NULL,
            image_url TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # ── Cooking Records ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cooking_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            description TEXT NOT NULL,
            items_used TEXT,
            note TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # ── Nutrition Logs ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS nutrition_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            protein_g REAL DEFAULT 0,
            fat_g REAL DEFAULT 0,
            carbs_g REAL DEFAULT 0,
            fiber_g REAL DEFAULT 0,
            calories REAL DEFAULT 0,
            note TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # ── User Profile (new) ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_profile (
            id INTEGER PRIMARY KEY DEFAULT 1,
            family_size INTEGER DEFAULT 2,
            preferences TEXT DEFAULT '["中式","清淡"]',
            allergies TEXT DEFAULT '[]',
            dislikes TEXT DEFAULT '[]',
            special_needs TEXT DEFAULT NULL,
            cook_time TEXT DEFAULT '30min',
            completed BOOLEAN DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # ── User Behavior (new) ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_behavior (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            payload TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # ── Chat History (new) ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # ── Recipe Cache (daily pre-generated) ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recipe_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            position INTEGER NOT NULL DEFAULT 0,
            recipe_json TEXT NOT NULL,
            generated_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # ── Recipe Refresh Log ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recipe_refresh_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_count INTEGER,
            generation_ms INTEGER,
            status TEXT DEFAULT 'ok',
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # ── Purchase History (habit tracking) ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS purchase_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT,
            purchased_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # ── Saved Shopping Lists (3 slots) ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS saved_lists (
            slot INTEGER PRIMARY KEY,
            label TEXT DEFAULT '',
            items_json TEXT DEFAULT '[]',
            updated_at TEXT DEFAULT (datetime('now'))
        )
    """)
    # Ensure 3 slots exist
    for s in range(1, 4):
        cursor.execute(
            "INSERT OR IGNORE INTO saved_lists (slot, label, items_json) VALUES (?, ?, '[]')",
            (s, f'清单{s}'),
        )
    conn.commit()

    conn.commit()

    # ── Seed data if empty ──
    if cursor.execute("SELECT COUNT(*) FROM fridge_items").fetchone()[0] == 0:
        now = datetime.now()
        items = [
            ("牛奶", "乳制品", 1, "L", "1"),
            ("西兰花", "蔬菜", 1, "颗", "2"),
            ("牛肉", "肉类", 250, "g", "3"),
            ("鸡蛋", "蛋类", 6, "个", "12"),
            ("番茄", "蔬菜", 3, "个", "7"),
            ("菠菜", "蔬菜", 1, "把", "1"),
            ("鸡胸肉", "肉类", 300, "g", "2"),
            ("豆腐", "其他", 1, "块", "5"),
            ("口蘑", "蔬菜", 200, "g", "4"),
            ("小葱", "蔬菜", 3, "根", "10"),
            ("蒜", "蔬菜", 5, "瓣", "20"),
            ("姜", "蔬菜", 2, "块", "15"),
        ]
        for name, cat, qty, unit, days in items:
            expiry = (now + timedelta(days=int(days))).strftime("%Y-%m-%d")
            cursor.execute(
                """INSERT INTO fridge_items (name, category, quantity, unit, purchase_date, expiry_date)
                   VALUES (?, ?, ?, ?, date('now'), ?)""",
                (name, cat, qty, unit, expiry),
            )
        conn.commit()

    if cursor.execute("SELECT COUNT(*) FROM cooking_records").fetchone()[0] == 0:
        records = [
            ("补货", "添加了牛奶、鸡蛋、西兰花、鸡胸肉等6样食材", "牛奶,鸡蛋,西兰花,鸡胸肉,葱,姜", None),
            ("做饭", "做了番茄炒蛋和蒜蓉菠菜豆腐", "番茄,鸡蛋,菠菜,豆腐,蒜", "用掉7样食材"),
            ("外出", "今晚和朋友吃了火锅，冰箱没动", None, None),
            ("补货", "超市买了牛腱子、土豆、胡萝卜", "牛腱子,土豆,胡萝卜", None),
        ]
        for rtype, desc, items, note in records:
            cursor.execute(
                """INSERT INTO cooking_records (type, description, items_used, note)
                   VALUES (?, ?, ?, ?)""",
                (rtype, desc, items, note),
            )
        conn.commit()

    # Seed user_profile if empty
    if cursor.execute("SELECT COUNT(*) FROM user_profile").fetchone()[0] == 0:
        cursor.execute(
            """INSERT INTO user_profile (family_size, preferences, allergies, dislikes, special_needs, cook_time, completed)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (2, '["中式","清淡"]', '[]', '[]', None, '30min', 0),
        )
        conn.commit()

    conn.close()
