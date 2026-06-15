from fastapi import APIRouter
from database import get_db
from nutrition_engine import compute_nutrition_scores

router = APIRouter(prefix="/api", tags=["nutrition"])


@router.get("/nutrition")
def get_nutrition():
    """综合营养评估 — 基于 DBI-16 + HEI-2020 + NOVA 三体系"""
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT name, category FROM fridge_items"
        ).fetchall()
        items = [dict(r) for r in rows]

        # Get family size from user profile
        profile = conn.execute(
            "SELECT family_size FROM user_profile ORDER BY id DESC LIMIT 1"
        ).fetchone()
        family_size = profile["family_size"] if profile else 2
    finally:
        conn.close()

    return compute_nutrition_scores(items, family_size=family_size)
