"""承脉 AI 后端服务入口。"""

import os
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

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


@app.get("/api/health")
def health():
    """健康检查接口：验证后端是否存活。"""
    return {
        "status": "ok",
        "service": "chengmai-ai",
        "version": app.version,
        "time": datetime.now().isoformat(),
    }
