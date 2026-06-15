"""
数据库迁移 v2: 添加包装追踪 + 生产日期 + 过期来源
- batch_label: 同一食材的批次标识（如 "6月13日补货"）
- expiry_source: "package" | "verified" | "estimated"
- production_date: 包装上的生产日期
- shelf_life_days: 包装上的保质期天数
- opened_date: 开封日期（乳制品/饮料等开封后保鲜期缩短）
"""

MIGRATION_SQL = """
-- 新增字段（SQLite只支持ADD COLUMN，不能DROP或ALTER类型）
ALTER TABLE fridge_items ADD COLUMN batch_label TEXT DEFAULT '';
ALTER TABLE fridge_items ADD COLUMN expiry_source TEXT DEFAULT 'verified';
ALTER TABLE fridge_items ADD COLUMN production_date TEXT DEFAULT '';
ALTER TABLE fridge_items ADD COLUMN shelf_life_days INTEGER DEFAULT 0;
ALTER TABLE fridge_items ADD COLUMN opened_date TEXT DEFAULT '';
"""

import sqlite3
from database import DB_PATH

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    try:
        cur.executescript(MIGRATION_SQL)
        conn.commit()
        print("✅ 数据库迁移 v2 完成")
        # Show new schema
        cur.execute("PRAGMA table_info(fridge_items)")
        for row in cur.fetchall():
            print(f"  {row[1]:20s} {row[2]:10s}")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("⏭  字段已存在，跳过迁移")
        else:
            raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
