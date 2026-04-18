"""
FairGig Earnings Service — FastAPI
Handles shift logs, CSV import, screenshot references, verification.
Port: 8002
"""

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
import os, httpx, jwt, csv, io, uuid
from datetime import datetime, date
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="FairGig Earnings Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
JWT_SECRET = os.getenv("JWT_SECRET", "change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ANOMALY_SERVICE_URL = os.getenv("ANOMALY_SERVICE_URL", "http://localhost:8003")

SUPA_HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
}

security = HTTPBearer()

# ── Helpers ───────────────────────────────
def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        return decode_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

async def supa_get(path: str) -> list:
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=SUPA_HEADERS)
        r.raise_for_status()
        return r.json()

async def supa_post(path: str, data) -> list:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{SUPABASE_URL}/rest/v1/{path}",
            headers={**SUPA_HEADERS, "Prefer": "return=representation"},
            json=data
        )
        r.raise_for_status()
        return r.json()

async def supa_patch(path: str, data: dict) -> list:
    async with httpx.AsyncClient() as client:
        r = await client.patch(
            f"{SUPABASE_URL}/rest/v1/{path}",
            headers={**SUPA_HEADERS, "Prefer": "return=representation"},
            json=data
        )
        r.raise_for_status()
        return r.json()

async def supa_delete(path: str):
    async with httpx.AsyncClient() as client:
        r = await client.delete(f"{SUPABASE_URL}/rest/v1/{path}", headers=SUPA_HEADERS)
        r.raise_for_status()

# ── Models ────────────────────────────────
class ShiftCreate(BaseModel):
    platform: str
    shift_date: str         # ISO date YYYY-MM-DD
    hours_worked: Optional[float] = None
    gross_earned: float
    platform_deductions: float = 0.0
    net_received: float
    city: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None
    screenshot_url: Optional[str] = None

class ShiftUpdate(BaseModel):
    platform: Optional[str] = None
    shift_date: Optional[str] = None
    hours_worked: Optional[float] = None
    gross_earned: Optional[float] = None
    platform_deductions: Optional[float] = None
    net_received: Optional[float] = None
    notes: Optional[str] = None

class VerificationUpdate(BaseModel):
    verification_status: str   # verified | flagged | unverifiable
    verifier_note: Optional[str] = None

# ── Routes ────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "earnings"}

@app.post("/shifts", status_code=201)
async def create_shift(body: ShiftCreate, user=Depends(get_current_user)):
    if user["role"] != "worker":
        raise HTTPException(403, "Only workers can log shifts")

    shift_data = {
        "id": str(uuid.uuid4()),
        "worker_id": user["sub"],
        **body.dict(),
        "verification_status": "pending",
    }
    result = await supa_post("shifts", shift_data)
    shift = result[0] if isinstance(result, list) else result

    # Trigger anomaly check async (fire and forget)
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{ANOMALY_SERVICE_URL}/anomaly/check/{user['sub']}",
                headers={"Authorization": f"Bearer {user.get('_raw_token', '')}"}
            )
    except Exception:
        pass  # Non-blocking

    return shift

@app.get("/shifts")
async def list_shifts(
    platform: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    user=Depends(get_current_user)
):
    if user["role"] == "worker":
        q = f"shifts?worker_id=eq.{user['sub']}&order=shift_date.desc"
    else:
        q = "shifts?order=shift_date.desc"

    if platform:
        q += f"&platform=eq.{platform}"
    if from_date:
        q += f"&shift_date=gte.{from_date}"
    if to_date:
        q += f"&shift_date=lte.{to_date}"

    return await supa_get(q)

@app.get("/shifts/{shift_id}")
async def get_shift(shift_id: str, user=Depends(get_current_user)):
    rows = await supa_get(f"shifts?id=eq.{shift_id}&select=*")
    if not rows:
        raise HTTPException(404, "Shift not found")
    shift = rows[0]
    if user["role"] == "worker" and shift["worker_id"] != user["sub"]:
        raise HTTPException(403, "Not your shift")
    return shift

@app.patch("/shifts/{shift_id}")
async def update_shift(shift_id: str, body: ShiftUpdate, user=Depends(get_current_user)):
    rows = await supa_get(f"shifts?id=eq.{shift_id}&select=worker_id")
    if not rows:
        raise HTTPException(404, "Shift not found")
    if user["role"] == "worker" and rows[0]["worker_id"] != user["sub"]:
        raise HTTPException(403, "Not your shift")

    update_data = {k: v for k, v in body.dict().items() if v is not None}
    result = await supa_patch(f"shifts?id=eq.{shift_id}", update_data)
    return result[0] if isinstance(result, list) else result

@app.delete("/shifts/{shift_id}", status_code=204)
async def delete_shift(shift_id: str, user=Depends(get_current_user)):
    rows = await supa_get(f"shifts?id=eq.{shift_id}&select=worker_id")
    if not rows:
        raise HTTPException(404, "Shift not found")
    if user["role"] == "worker" and rows[0]["worker_id"] != user["sub"]:
        raise HTTPException(403, "Not your shift")
    await supa_delete(f"shifts?id=eq.{shift_id}")

@app.patch("/shifts/{shift_id}/verify")
async def verify_shift(shift_id: str, body: VerificationUpdate, user=Depends(get_current_user)):
    if user["role"] not in ("verifier", "advocate"):
        raise HTTPException(403, "Only verifiers can verify shifts")
    if body.verification_status not in ("verified", "flagged", "unverifiable"):
        raise HTTPException(400, "Invalid status")

    update_data = {
        "verification_status": body.verification_status,
        "verified_by": user["sub"],
        "verified_at": datetime.utcnow().isoformat(),
        "verifier_note": body.verifier_note,
    }
    result = await supa_patch(f"shifts?id=eq.{shift_id}", update_data)
    return result[0] if isinstance(result, list) else result

@app.get("/shifts/pending/verification")
async def pending_verifications(user=Depends(get_current_user)):
    if user["role"] not in ("verifier", "advocate"):
        raise HTTPException(403, "Insufficient permissions")
    return await supa_get(
        "shifts?verification_status=eq.pending&screenshot_url=not.is.null&order=created_at.asc"
    )

@app.post("/shifts/import/csv")
async def import_csv(file: UploadFile = File(...), user=Depends(get_current_user)):
    """
    CSV columns: platform,shift_date,hours_worked,gross_earned,platform_deductions,net_received,city,category,notes
    """
    if user["role"] != "worker":
        raise HTTPException(403, "Only workers can import shifts")

    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8")))

    records = []
    errors = []
    for i, row in enumerate(reader):
        try:
            records.append({
                "id": str(uuid.uuid4()),
                "worker_id": user["sub"],
                "platform": row["platform"].strip(),
                "shift_date": row["shift_date"].strip(),
                "hours_worked": float(row.get("hours_worked") or 0) or None,
                "gross_earned": float(row["gross_earned"]),
                "platform_deductions": float(row.get("platform_deductions") or 0),
                "net_received": float(row["net_received"]),
                "city": row.get("city", "").strip() or None,
                "category": row.get("category", "").strip() or None,
                "notes": row.get("notes", "").strip() or None,
                "verification_status": "pending",
            })
        except Exception as e:
            errors.append({"row": i + 2, "error": str(e)})

    if records:
        await supa_post("shifts", records)

    return {"imported": len(records), "errors": errors}

@app.get("/earnings/summary")
async def earnings_summary(user=Depends(get_current_user)):
    """Worker-facing earnings summary for analytics"""
    if user["role"] != "worker":
        raise HTTPException(403, "Workers only")

    shifts = await supa_get(
        f"shifts?worker_id=eq.{user['sub']}&order=shift_date.desc&select=*"
    )

    if not shifts:
        return {"shifts": [], "summary": {}}

    total_gross = sum(s["gross_earned"] for s in shifts)
    total_net = sum(s["net_received"] for s in shifts)
    total_hours = sum(s["hours_worked"] or 0 for s in shifts)
    total_deductions = sum(s["platform_deductions"] for s in shifts)

    platforms = {}
    for s in shifts:
        p = s["platform"]
        if p not in platforms:
            platforms[p] = {"gross": 0, "net": 0, "shifts": 0, "deductions": 0}
        platforms[p]["gross"] += s["gross_earned"]
        platforms[p]["net"] += s["net_received"]
        platforms[p]["deductions"] += s["platform_deductions"]
        platforms[p]["shifts"] += 1

    # Commission rate per platform
    for p in platforms:
        g = platforms[p]["gross"]
        platforms[p]["commission_rate"] = round(
            (platforms[p]["deductions"] / g * 100) if g > 0 else 0, 2
        )

    return {
        "summary": {
            "total_gross": round(total_gross, 2),
            "total_net": round(total_net, 2),
            "total_hours": round(total_hours, 2),
            "total_deductions": round(total_deductions, 2),
            "effective_hourly_rate": round(total_net / total_hours, 2) if total_hours > 0 else 0,
            "overall_commission_rate": round(total_deductions / total_gross * 100, 2) if total_gross > 0 else 0,
            "shift_count": len(shifts),
        },
        "by_platform": platforms,
        "recent_shifts": shifts[:10],
    }
