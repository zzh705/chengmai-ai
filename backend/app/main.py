"""承脉 AI 后端服务入口。"""

import os
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.chat import router as chat_router
from app.api.creation import router as creation_router
from app.api.graph import router as graph_router
from app.api.heritage import router as heritage_router
from app.api.learning import router as learning_router
from app.api.quiz import router as quiz_router
from app.api.story import router as story_router
from app.api.user import router as user_router

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")

app = FastAPI(
    title="承脉 AI",
    description="中华非遗智能传承与活化智能体 - 后端 API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# 数千条知识库摘要体积可观，统一 gzip（流式响应按块压缩，不阻塞 SSE）
app.add_middleware(GZipMiddleware, minimum_size=1024)

app.include_router(chat_router)
app.include_router(learning_router)
app.include_router(graph_router)
app.include_router(creation_router)
app.include_router(heritage_router)
app.include_router(quiz_router)
app.include_router(story_router)
app.include_router(user_router)


@app.get("/api/health")
def health():
    """健康检查接口：验证后端是否存活。"""
    return {
        "status": "ok",
        "service": "chengmai-ai",
        "version": app.version,
        "time": datetime.now().isoformat(),
    }
