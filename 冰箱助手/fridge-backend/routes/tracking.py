from fastapi import APIRouter
from database import get_db
from models import RecordEntry
from typing import Optional

router = APIRouter(prefix="/api", tags=["tracking"])


@router.get("/records")
def get_records(limit: int = 20):
    """获取最近的历史记录"""
    conn = get_db()
    try:
        rows = conn.execute(
            """SELECT id, type, description, items_used, note, created_at
               FROM cooking_records
               ORDER BY id DESC LIMIT ?""",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.post("/records")
def create_record(entry: RecordEntry):
    """创建一条新记录"""
    conn = get_db()
    try:
        cursor = conn.execute(
            """INSERT INTO cooking_records (type, description, items_used, note)
               VALUES (?, ?, ?, ?)""",
            (entry.type, entry.description, entry.items_used, entry.note),
        )
        conn.commit()
        return {"id": cursor.lastrowid, "message": "记录已保存"}
    finally:
        conn.close()
