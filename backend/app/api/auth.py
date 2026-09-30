"""账号系统：注册 / 登录（PBKDF2 盐哈希落盘 + HMAC 无状态令牌）。

正式环境口径：名号与密码存于服务端 data/users.json，密码不落明文；
令牌为 HMAC 签名的 base64 载荷（30 天有效），签名密钥独立存 data/auth_secret.key。
"""

import base64
import hashlib
import hmac
import json
import secrets
import threading
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/auth", tags=["auth"])

_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
_USERS_FILE = _DATA_DIR / "users.json"
_KEY_FILE = _DATA_DIR / "auth_secret.key"
_LOCK = threading.Lock()

# PBKDF2 迭代次数与令牌有效期
_PBKDF2_ITER = 60_000
_TOKEN_TTL = 30 * 86400


def _load_secret() -> bytes:
    """签名密钥：首次启动自动生成并持久化，之后保持不变（否则旧令牌全部失效）。"""
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    if _KEY_FILE.exists():
        return _KEY_FILE.read_bytes().strip()
    key = secrets.token_hex(32).encode()
    _KEY_FILE.write_bytes(key)
    return key


_SECRET = _load_secret()


class AuthRequest(BaseModel):
    name: str = Field(min_length=1, max_length=12)
    password: str = Field(min_length=6, max_length=64)


class AuthResponse(BaseModel):
    name: str
    token: str


def _load_users() -> dict:
    if not _USERS_FILE.exists():
        return {}
    try:
        return json.loads(_USERS_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def _save_users(users: dict) -> None:
    tmp = _USERS_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(users, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(_USERS_FILE)


def _hash_password(password: str, salt: bytes) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ITER).hex()


def _issue_token(name: str) -> str:
    payload = json.dumps(
        {"name": name, "exp": int(time.time()) + _TOKEN_TTL}, separators=(",", ":")
    )
    body = base64.urlsafe_b64encode(payload.encode()).decode().rstrip("=")
    sig = hmac.new(_SECRET, body.encode(), hashlib.sha256).hexdigest()[:32]
    return f"{body}.{sig}"


@router.post("/register", response_model=AuthResponse)
def register(req: AuthRequest) -> AuthResponse:
    """新客造册：名号查重后写入用户表，返回带令牌的会话。"""
    name = req.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="请先题写名号")
    if name == "游客":
        raise HTTPException(status_code=400, detail="「游客」为保留名号，请另题一个")
    salt = secrets.token_bytes(16)
    with _LOCK:
        users = _load_users()
        if name in users:
            raise HTTPException(status_code=409, detail="这个名号已被人题用，换一个或直接入馆")
        users[name] = {
            "salt": salt.hex(),
            "hash": _hash_password(req.password, salt),
            "created": time.strftime("%Y-%m-%d %H:%M"),
        }
        _save_users(users)
    return AuthResponse(name=name, token=_issue_token(name))


@router.post("/login", response_model=AuthResponse)
def login(req: AuthRequest) -> AuthResponse:
    """老客登馆：核对口令后签发令牌。"""
    name = req.name.strip()
    users = _load_users()
    record = users.get(name)
    if not record:
        raise HTTPException(status_code=404, detail="馆中查无此名号，可先造册登记")
    salt = bytes.fromhex(record["salt"])
    expect = record["hash"]
    got = _hash_password(req.password, salt)
    if not hmac.compare_digest(expect, got):
        raise HTTPException(status_code=401, detail="名号与口令不相符，再试一次")
    return AuthResponse(name=name, token=_issue_token(name))
