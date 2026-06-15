from fastapi import APIRouter
from database import get_db
from fridge_conflicts import check_conflicts

router = APIRouter(prefix="/api", tags=["conflicts"])


@router.get("/conflicts")
def get_conflicts():
    """检查当前冰箱库存中的食物冲突"""
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT name, category FROM fridge_items"
        ).fetchall()
        inventory = [dict(r) for r in rows]
        conflicts = check_conflicts(inventory)
        return {"conflicts": conflicts, "count": len(conflicts)}
    finally:
        conn.close()
