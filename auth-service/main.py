"""
FairGig Auth Service — FastAPI
Handles JWT login, registration, role management, token refresh.
Port: 8001
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
import os, httpx, hashlib, hmac, jwt, uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="FairGig Auth Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Config ────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
JWT_SECRET = os.getenv("JWT_SECRET", "change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

SUPA_HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
}

security = HTTPBearer()

# ── Helpers ───────────────────────────────
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hmac.compare_digest(hash_password(password), hashed)

def create_token(payload: dict, expires_delta: timedelta) -> str:
    data = payload.copy()
    data["exp"] = datetime.utcnow() + expires_delta
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

async def supa_get(path: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=SUPA_HEADERS)
        r.raise_for_status()
        return r.json()

async def supa_post(path: str, data: dict) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{SUPABASE_URL}/rest/v1/{path}",
            headers={**SUPA_HEADERS, "Prefer": "return=representation"},
            json=data
        )
        r.raise_for_status()
        return r.json()

async def supa_patch(path: str, data: dict) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.patch(
            f"{SUPABASE_URL}/rest/v1/{path}",
            headers={**SUPA_HEADERS, "Prefer": "return=representation"},
            json=data
        )
        r.raise_for_status()
        return r.json()

# ── Models ────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "worker"   # worker | verifier | advocate
    city: Optional[str] = None
    category: Optional[str] = None  # ride-hailing | food-delivery | freelancer

class LoginRequest(BaseModel):
    email: str
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    city: Optional[str] = None
    category: Optional[str] = None

# ── Routes ────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "auth"}

@app.post("/auth/register", status_code=201)
async def register(body: RegisterRequest):
    # Check if email exists
    existing = await supa_get(f"users?email=eq.{body.email}&select=id")
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    if body.role not in ("worker", "verifier", "advocate"):
        raise HTTPException(status_code=400, detail="Invalid role")

    user_id = str(uuid.uuid4())
    user = await supa_post("users", {
        "id": user_id,
        "email": body.email,
        "password_hash": hash_password(body.password),
        "full_name": body.full_name,
        "role": body.role,
        "city": body.city,
        "category": body.category,
    })

    created = user[0] if isinstance(user, list) else user
    access_token = create_token(
        {"sub": created["id"], "email": created["email"], "role": created["role"]},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE)
    )
    refresh_token = create_token(
        {"sub": created["id"], "type": "refresh"},
        timedelta(days=REFRESH_TOKEN_EXPIRE)
    )
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {k: created[k] for k in ("id", "email", "full_name", "role", "city", "category")}
    }

@app.post("/auth/login")
async def login(body: LoginRequest):
    users = await supa_get(f"users?email=eq.{body.email}&select=*")
    if not users:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = users[0]

    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_token(
        {"sub": user["id"], "email": user["email"], "role": user["role"]},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE)
    )
    refresh_token = create_token(
        {"sub": user["id"], "type": "refresh"},
        timedelta(days=REFRESH_TOKEN_EXPIRE)
    )
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {k: user[k] for k in ("id", "email", "full_name", "role", "city", "category")}
    }

@app.post("/auth/refresh")
async def refresh(body: RefreshRequest):
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    users = await supa_get(f"users?id=eq.{payload['sub']}&select=*")
    if not users:
        raise HTTPException(status_code=401, detail="User not found")
    user = users[0]

    access_token = create_token(
        {"sub": user["id"], "email": user["email"], "role": user["role"]},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE)
    )
    return {"access_token": access_token}

@app.get("/auth/me")
async def me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = decode_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    users = await supa_get(f"users?id=eq.{payload['sub']}&select=id,email,full_name,role,city,category,created_at")
    if not users:
        raise HTTPException(status_code=404, detail="User not found")
    return users[0]

@app.patch("/auth/me")
async def update_profile(
    body: UpdateProfileRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        payload = decode_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    update_data = {k: v for k, v in body.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow().isoformat()
    result = await supa_patch(f"users?id=eq.{payload['sub']}", update_data)
    return result[0] if isinstance(result, list) else result

@app.get("/auth/users")
async def list_users(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Advocate/verifier only — list all workers"""
    try:
        payload = decode_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") not in ("verifier", "advocate"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return await supa_get("users?select=id,email,full_name,role,city,category,created_at")
