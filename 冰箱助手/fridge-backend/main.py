from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import init_db
from routes.inventory import router as inventory_router
from routes.recipes import router as recipes_router
from routes.tracking import router as tracking_router
from routes.chat import router as chat_router
from routes.conflicts import router as conflicts_router
from routes.nutrition import router as nutrition_router
from routes.shopping import router as shopping_router

app = FastAPI(title="冰箱助手 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


class UTF8JSONMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response: Response = await call_next(request)
        ct = response.headers.get("content-type", "")
        if "application/json" in ct and "charset" not in ct:
            response.headers["content-type"] = "application/json; charset=utf-8"
        return response


app.add_middleware(UTF8JSONMiddleware)

app.include_router(inventory_router)
app.include_router(recipes_router)
app.include_router(tracking_router)
app.include_router(chat_router)
app.include_router(conflicts_router)
app.include_router(nutrition_router)
app.include_router(shopping_router)

# ── Serve Expo Web build ──
app.mount("/_expo", StaticFiles(directory="app/_expo"), name="expo_static")
app.mount("/assets", StaticFiles(directory="app/assets"), name="app_assets")


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def root():
    return FileResponse("app/index.html")
