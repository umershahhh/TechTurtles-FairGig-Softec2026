"""
FairGig Anomaly Detection Service — FastAPI
Statistically flags unusual deductions, income drops, rate spikes.
Port: 8003
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
import os, httpx, jwt, statistics, uuid
from datetime import datetime, date, timedelta
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="FairGig Anomaly Service", version="1.0.0")

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

SUPA_HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
}

security = HTTPBearer()

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

# ── Models ────────────────────────────────
class ShiftRecord(BaseModel):
    id: str
    platform: str
    shift_date: str
    hours_worked: Optional[float] = None
    gross_earned: float
    platform_deductions: float
    net_received: float

class AnomalyCheckRequest(BaseModel):
    worker_id: str
    shifts: List[ShiftRecord]

class AnomalyResult(BaseModel):
    flag_type: str
    severity: str
    explanation: str
    shift_id: Optional[str] = None
    value: Optional[float] = None
    baseline: Optional[float] = None

# ── Core Detection Logic ──────────────────

def detect_unusual_deductions(shifts: List[ShiftRecord]) -> List[AnomalyResult]:
    """Flag shifts where deduction % is an outlier vs the worker's own history"""
    flags = []
    rates = []
    for s in shifts:
        if s.gross_earned > 0:
            rates.append((s.id, s.platform, s.platform_deductions / s.gross_earned * 100))

    if len(rates) < 3:
        return flags

    values = [r[2] for r in rates]
    mean = statistics.mean(values)
    try:
        stdev = statistics.stdev(values)
    except statistics.StatisticsError:
        return flags

    if stdev < 0.5:
        return flags  # No variance, nothing to flag

    for shift_id, platform, rate in rates:
        z_score = (rate - mean) / stdev if stdev else 0
        if z_score > 2.0:
            severity = "high" if z_score > 3.0 else "medium"
            flags.append(AnomalyResult(
                flag_type="unusual_deduction",
                severity=severity,
                shift_id=shift_id,
                value=round(rate, 2),
                baseline=round(mean, 2),
                explanation=(
                    f"On {platform}, the platform took {rate:.1f}% of your earnings as deductions. "
                    f"Your typical rate is around {mean:.1f}%. This is {z_score:.1f} standard deviations "
                    f"above your normal — it may indicate an undisclosed rate change or a calculation error. "
                    f"We recommend checking your {platform} earnings statement for that shift."
                )
            ))
    return flags

def detect_income_drop(shifts: List[ShiftRecord]) -> List[AnomalyResult]:
    """Detect month-on-month income drops > 20%"""
    flags = []
    if len(shifts) < 4:
        return flags

    # Group by month
    monthly: dict = {}
    for s in shifts:
        try:
            d = date.fromisoformat(s.shift_date)
            key = f"{d.year}-{d.month:02d}"
            monthly.setdefault(key, 0)
            monthly[key] += s.net_received
        except Exception:
            continue

    sorted_months = sorted(monthly.keys())
    for i in range(1, len(sorted_months)):
        prev_month = sorted_months[i - 1]
        curr_month = sorted_months[i]
        prev_income = monthly[prev_month]
        curr_income = monthly[curr_month]

        if prev_income > 0:
            change_pct = (curr_income - prev_income) / prev_income * 100
            if change_pct <= -20:
                severity = "high" if change_pct <= -40 else "medium"
                flags.append(AnomalyResult(
                    flag_type="income_drop",
                    severity=severity,
                    value=round(curr_income, 2),
                    baseline=round(prev_income, 2),
                    explanation=(
                        f"Your net income in {curr_month} was PKR {curr_income:,.0f}, "
                        f"down {abs(change_pct):.0f}% from {prev_month} (PKR {prev_income:,.0f}). "
                        f"A drop this large may be caused by platform policy changes, account restrictions, "
                        f"or reduced work availability. Consider filing a grievance if you believe this is "
                        f"platform-driven."
                    )
                ))
    return flags

def detect_rate_spike(shifts: List[ShiftRecord]) -> List[AnomalyResult]:
    """Detect sudden commission rate increases per platform"""
    flags = []

    # Group by platform
    platforms: dict = {}
    for s in shifts:
        if s.gross_earned > 0:
            platforms.setdefault(s.platform, [])
            platforms[s.platform].append({
                "date": s.shift_date,
                "rate": s.platform_deductions / s.gross_earned * 100,
                "id": s.id,
            })

    for platform, records in platforms.items():
        records.sort(key=lambda x: x["date"])
        if len(records) < 4:
            continue

        # Compare last 2 vs previous batch
        baseline_rates = [r["rate"] for r in records[:-2]]
        recent_rates = [r["rate"] for r in records[-2:]]

        baseline_avg = statistics.mean(baseline_rates)
        recent_avg = statistics.mean(recent_rates)

        if baseline_avg > 0:
            change = (recent_avg - baseline_avg) / baseline_avg * 100
            if change > 15:
                flags.append(AnomalyResult(
                    flag_type="rate_spike",
                    severity="high" if change > 30 else "medium",
                    value=round(recent_avg, 2),
                    baseline=round(baseline_avg, 2),
                    explanation=(
                        f"{platform}'s commission rate appears to have increased from "
                        f"{baseline_avg:.1f}% to {recent_avg:.1f}% in your recent shifts — "
                        f"a {change:.0f}% jump. This may indicate a platform policy change that "
                        f"was not communicated. Check {platform}'s announcements or post in the "
                        f"community board to see if other drivers/riders experienced the same."
                    )
                ))
    return flags

# ── Routes ────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "anomaly"}

@app.post("/anomaly/analyze")
async def analyze(body: AnomalyCheckRequest):
    """Accept shifts payload, return all anomaly flags"""
    all_flags = []
    all_flags.extend(detect_unusual_deductions(body.shifts))
    all_flags.extend(detect_income_drop(body.shifts))
    all_flags.extend(detect_rate_spike(body.shifts))
    return {
        "worker_id": body.worker_id,
        "analyzed_shifts": len(body.shifts),
        "flags": [f.dict() for f in all_flags],
        "summary": (
            f"Found {len(all_flags)} anomalies: "
            f"{sum(1 for f in all_flags if f.severity=='high')} high, "
            f"{sum(1 for f in all_flags if f.severity=='medium')} medium."
        ) if all_flags else "No anomalies detected in your recent earnings history."
    }

@app.post("/anomaly/check/{worker_id}")
async def check_worker(worker_id: str):
    """Fetch worker shifts from Supabase and run anomaly detection, persisting flags"""
    shifts_raw = await supa_get(
        f"shifts?worker_id=eq.{worker_id}&order=shift_date.desc&limit=90&select=*"
    )

    if not shifts_raw:
        return {"flags": [], "message": "No shifts to analyze"}

    shifts = [ShiftRecord(**s) for s in shifts_raw]
    all_flags = []
    all_flags.extend(detect_unusual_deductions(shifts))
    all_flags.extend(detect_income_drop(shifts))
    all_flags.extend(detect_rate_spike(shifts))

    # Persist new flags (avoid duplicates by checking flag_type + shift_id)
    existing = await supa_get(f"anomaly_flags?worker_id=eq.{worker_id}&select=flag_type,shift_id")
    existing_keys = {(e["flag_type"], e.get("shift_id")) for e in existing}

    new_flags = []
    for flag in all_flags:
        key = (flag.flag_type, flag.shift_id)
        if key not in existing_keys:
            new_flags.append({
                "id": str(uuid.uuid4()),
                "worker_id": worker_id,
                "shift_id": flag.shift_id,
                "flag_type": flag.flag_type,
                "severity": flag.severity,
                "explanation": flag.explanation,
            })

    if new_flags:
        await supa_post("anomaly_flags", new_flags)

    return {
        "worker_id": worker_id,
        "new_flags": len(new_flags),
        "flags": [f.dict() for f in all_flags],
    }

@app.get("/anomaly/flags/{worker_id}")
async def get_flags(worker_id: str, user=Depends(get_current_user)):
    if user["role"] == "worker" and user["sub"] != worker_id:
        raise HTTPException(403, "Cannot view another worker's flags")
    return await supa_get(
        f"anomaly_flags?worker_id=eq.{worker_id}&order=created_at.desc&select=*"
    )

@app.patch("/anomaly/flags/{flag_id}/acknowledge")
async def acknowledge_flag(flag_id: str, user=Depends(get_current_user)):
    async with httpx.AsyncClient() as client:
        r = await client.patch(
            f"{SUPABASE_URL}/rest/v1/anomaly_flags?id=eq.{flag_id}",
            headers={**SUPA_HEADERS, "Prefer": "return=representation"},
            json={"is_acknowledged": True}
        )
        r.raise_for_status()
        return r.json()
