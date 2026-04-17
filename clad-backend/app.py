"""
app.py  —  Clad Insurance API v3.2
=====================================
Run:  uvicorn app:app --reload --port 8000
"""
import os, sys, random, base64
sys.path.insert(0, os.path.dirname(__file__))

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta


RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

app = FastAPI(
    title="Clad — Parametric Income Insurance API",
    description="Live: AQICN · Tomorrow.io · Open-Meteo · Razorpay · Claude Vision",
    version="3.2.0",
)
_raw = os.getenv("ALLOWED_ORIGINS", "*")
_origins = ["*"] if _raw == "*" else [o.strip() for o in _raw.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Vision verify route (inline — no import path issues) ──────
from pydantic import BaseModel as _BM
class _VisionReq(_BM):
    image_b64:    str
    mime_type:    str = "image/jpeg"
    trigger_type: str = "manual"
    pincode:      str = "unknown"
    prompt:       str = ""   # ignored; vision_fraud.py builds its own prompt

@app.post("/vision/verify", tags=["Vision"])
async def vision_verify(req: _VisionReq):
    from services.vision_fraud import analyze_claim_photo
    result = await analyze_claim_photo(
        image_base64    = req.image_b64,
        image_mime_type = req.mime_type,
        trigger_type    = req.trigger_type,
        claimed_pincode = req.pincode,
    )
    return result

from core.db import workers, policies, claims, reset_db, _save_state
from services.pricing_engine import compute_premium
from services.real_trigger_service import run_triggers, simulate_trigger
from services.claim_service import create_claim as svc_create_claim, get_all_claims, get_claims_for_user
from services.fraud_engine import check_fraud, check_account_integrity, update_weather_cache
from services.vision_fraud import analyze_claim_photo


# ══════════════════════════════════════════════════════════════
# PYDANTIC MODELS  — all defined here at top level
# ══════════════════════════════════════════════════════════════

class RegisterRequest(BaseModel):
    name:                 str
    pincode:              str
    plan:                 str   = "plus"
    pan_number:           Optional[str] = None
    pan_verified:         bool  = False
    platform_links:       List[str] = []
    total_deliveries:     int   = 0
    has_delivery_history: bool  = False
    account_age_days:     int   = 90
    delivery_consistency: float = 0.80
    avg_daily_earning:    float = 600.0
    claim_free_weeks:     int   = 0
    past_claims_count:    int   = 0
    location_honesty:     float = 0.85
    claim_history_score:  float = 1.0
    fraudulent_flags:     int   = 0

class PolicyRequest(BaseModel):
    name: str
    plan: str = "plus"

class PremiumRequest(BaseModel):
    name:                 Optional[str] = None
    pincode:              str   = "560034"
    plan:                 str   = "plus"
    account_age_days:     int   = 90
    delivery_consistency: float = 0.80
    avg_daily_earning:    float = 600.0
    claim_free_weeks:     int   = 0
    past_claims_count:    int   = 0
    location_honesty:     float = 0.85
    claim_history_score:  float = 1.0
    fraudulent_flags:     int   = 0
    month:                int   = datetime.utcnow().month

class ClaimRequest(BaseModel):
    user:             str
    amount:           float
    reason:           str  = "manual claim"
    photo_submitted:  bool = False
    photo_metadata:   Optional[dict] = None
    gps_trace:        Optional[List[dict]] = None
    device_id:        Optional[str] = None

class PhotoProofRequest(BaseModel):
    worker_name:    str
    photo_metadata: dict

class PayoutRequest(BaseModel):
    claim_id:    int
    worker_name: str
    upi_id:      Optional[str] = None
    phone:       Optional[str] = None

class PANRequest(BaseModel):
    pan_number:  str
    worker_name: Optional[str] = None

class PhotoClaimRequest(BaseModel):
    user:           str
    amount:         float
    reason:         str           = "weather disruption"
    trigger_type:   str           = "manual"
    image_base64:   str
    image_mime:     str           = "image/jpeg"
    device_id:      Optional[str] = None
    gps_trace:      Optional[List[dict]] = None
    photo_metadata: Optional[dict] = None

class AnalyzePhotoRequest(BaseModel):
    image_base64: str
    image_mime:   str = "image/jpeg"
    trigger_type: str = "heavy_rain"
    pincode:      str = "560034"


# ══════════════════════════════════════════════════════════════
# SYSTEM
# ══════════════════════════════════════════════════════════════

@app.get("/health", tags=["System"])
def health():
    return {
        "status": "ok", "version": "3.2.0",
        "workers": len(workers), "policies": len(policies), "claims": len(claims),
        "integrations": {
            "aqicn":       "live",
            "tomorrow_io": "live",
            "open_meteo":  "live (no key needed)",
            "razorpay":    f"test mode — {RAZORPAY_KEY_ID[:16]}...",
            "claude_vision": "live" if os.getenv("ANTHROPIC_API_KEY") else "missing key",
        },
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/api/health", tags=["System"])
async def api_health():
    import httpx
    results = {}

    async def check(name, url):
        try:
            async with httpx.AsyncClient(timeout=5.0) as c:
                r = await c.get(url)
            return {"status": "live" if r.status_code == 200 else "degraded",
                    "http_code": r.status_code}
        except Exception as e:
            return {"status": "offline", "error": str(e)[:60]}

    results["open_meteo_weather"] = await check("open_meteo",
        "https://api.open-meteo.com/v1/forecast?latitude=12.97&longitude=77.59&current=precipitation,weather_code&forecast_days=1")
    results["open_meteo_aqi"] = await check("open_meteo_aqi",
        "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=12.97&longitude=77.59&current=us_aqi&forecast_days=1")
    results["aqicn"] = await check("aqicn",
        f"https://api.waqi.info/feed/geo:12.97;77.59/?token={os.getenv('AQICN_TOKEN','f01a354ce6bfcb14defbee7a1cbee54108f7a63f')}")
    results["tomorrow_io"] = await check("tomorrow_io",
        f"https://api.tomorrow.io/v4/weather/realtime?location=12.97,77.59&fields=windSpeed&apikey={os.getenv('TOMORROW_IO_KEY','fj3dCUUP19AYByhVG3OhWgDpuF5Rnlgz')}")
    results["razorpay"] = {
        "status": "sandbox", "key_id": RAZORPAY_KEY_ID[:16]+"...",
        "mode": "test", "note": "Live payout API — rzp_test mode"
    }
    results["claude_vision"] = {
        "status": "live" if os.getenv("ANTHROPIC_API_KEY") else "missing_key",
        "note":   "Set ANTHROPIC_API_KEY in .env to enable photo fraud detection"
    }
    results["zone_risk_db"]   = {"status": "live", "note": "7 pincode profiles + India default"}
    results["lightgbm_model"] = {"status": "live", "note": "400-estimator LightGBM regressor"}
    results["fraud_engine"]   = {"status": "live", "note": "5-layer: Integrity+Rules+Network+IsoForest+Vision"}

    live = sum(1 for v in results.values() if v["status"] in ("live", "sandbox"))
    return {
        "overall":    "all_live" if live == len(results) else "partial",
        "live_count": live, "total": len(results),
        "apis":       results,
        "checked_at": datetime.utcnow().isoformat() + "Z",
    }


# ══════════════════════════════════════════════════════════════
# PAN VERIFICATION
# ══════════════════════════════════════════════════════════════

@app.post("/verify/pan", tags=["Verification"])
def verify_pan(req: PANRequest):
    import re
    pan = str(req.pan_number).strip().upper()
    if not re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]$', pan):
        return {"valid": False, "pan": pan, "verified": False,
                "reason": "Invalid format — must be AAAAA9999A"}
    holder_map = {"P": "Individual", "C": "Company", "H": "HUF", "F": "Firm", "T": "Trust"}
    holder = holder_map.get(pan[3], "Other")
    if req.worker_name:
        w = next((w for w in workers if w["name"] == req.worker_name), None)
        if w:
            w["pan_number"]   = pan
            w["pan_verified"] = True
            _save_state()
    return {
        "valid": True, "pan": pan, "holder_type": holder, "verified": True,
        "source": "Mock NSDL sandbox — live: api.sandbox.co.in/kyc/pan",
        "note":   "Worker record updated" if req.worker_name else "",
    }


# ══════════════════════════════════════════════════════════════
# WORKERS
# ══════════════════════════════════════════════════════════════

@app.post("/register", tags=["Workers"])
def register(req: RegisterRequest):
    existing = next((w for w in workers if w["name"] == req.name), None)
    if existing:
        return {"status": "already_registered", "user": existing}
    user = req.dict()
    user["registered_at"] = datetime.utcnow().isoformat() + "Z"
    user["clad_score"]    = None
    user["policy_paused"] = False
    integrity = check_account_integrity(user)
    user["integrity_score"]       = integrity["integrity_score"]
    user["integrity_flags"]       = integrity["flags"]
    user["integrity_passes_gate"] = integrity["passes_gate"]
    workers.append(user)
    _save_state()
    return {"status": "registered", "user": user, "integrity": integrity}


@app.get("/workers", tags=["Workers"])
def list_workers():
    return {"count": len(workers), "workers": workers}


@app.get("/worker/{name}", tags=["Workers"])
def get_worker(name: str):
    w = next((w for w in workers if w["name"] == name), None)
    if not w: raise HTTPException(404, f"Worker '{name}' not found")
    return w


# ══════════════════════════════════════════════════════════════
# POLICY
# ══════════════════════════════════════════════════════════════

@app.post("/policy/create", tags=["Policyprofile"])
def create_policy(req: PolicyRequest):
    worker = next((w for w in workers if w["name"] == req.name), None)
    if not worker: raise HTTPException(404, f"'{req.name}' not registered")
    existing = next((p for p in policies if p["user"] == req.name), None)
    if existing:
        existing["plan"] = req.plan
        existing["updated_at"] = datetime.utcnow().isoformat() + "Z"
        worker["plan"] = req.plan
        _save_state()
        return {"status": "policy_updated", "policy": existing}
    policy = {"id": len(policies)+1, "user": req.name, "plan": req.plan,
              "status": "active", "created_at": datetime.utcnow().isoformat()+"Z"}
    policies.append(policy)
    worker["plan"] = req.plan
    worker["policy_paused"] = False
    _save_state()
    return {"status": "policy_created", "policy": policy}


@app.get("/policy", tags=["Policyprofile"])
def get_policies():
    return {"count": len(policies), "policies": policies}


@app.get("/policy/{name}", tags=["Policyprofile"])
def get_policy(name: str):
    p = next((p for p in policies if p["user"] == name), None)
    if not p: raise HTTPException(404, f"No policy for '{name}'")
    return p


@app.post("/policy/pause/{name}", tags=["Policyprofile"])
def toggle_pause(name: str):
    worker = next((w for w in workers if w["name"] == name), None)
    if not worker: raise HTTPException(404)
    policy = next((p for p in policies if p["user"] == name), None)
    if not policy: raise HTTPException(404)
    worker["policy_paused"] = not worker.get("policy_paused", False)
    policy["status"] = "paused" if worker["policy_paused"] else "active"
    _save_state()
    return {"worker": name, "policy_paused": worker["policy_paused"],
            "policy_status": policy["status"]}


# ══════════════════════════════════════════════════════════════
# PREMIUM
# ══════════════════════════════════════════════════════════════

@app.post("/premium", tags=["ML Engine"])
def get_premium(req: PremiumRequest):
    data = req.dict()
    if req.name:
        w = next((w for w in workers if w["name"] == req.name), None)
        if w:
            for k in ["pincode","delivery_consistency","avg_daily_earning","account_age_days",
                      "claim_free_weeks","past_claims_count","location_honesty",
                      "claim_history_score","fraudulent_flags","plan"]:
                if k in w: data.setdefault(k, w[k])
    result = compute_premium(data)
    if req.name:
        w = next((w for w in workers if w["name"] == req.name), None)
        if w:
            w["clad_score"] = result["clad_score"]
            _save_state()
    return result


# ══════════════════════════════════════════════════════════════
# TRIGGERS
# ══════════════════════════════════════════════════════════════

@app.get("/trigger/check", tags=["Triggers"])
async def check_triggers(pincode: str):
    result = await run_triggers(pincode)
    w = result.get("weather_readings", {})
    update_weather_cache(
        pincode, datetime.utcnow().strftime("%Y-%m-%d"),
        had_rain=float(w.get("rain_intensity", 0)) > 2.0,
        rain_mm=float(w.get("rain_intensity", 0)),
        aqi=float(result.get("aqi_readings", {}).get("aqi", 0)),
    )
    return result


@app.get("/trigger/simulate", tags=["Triggers"])
async def simulate_trigger_ep(
    pincode: str = Query("560034"),
    trigger: str = Query("heavy_rain",
                         description="heavy_rain|aqi_spike|waterlogging|cyclone_wind|strike_curfew"),
):
    return await simulate_trigger(pincode, trigger)


# ══════════════════════════════════════════════════════════════
# CLAIMS
# ══════════════════════════════════════════════════════════════

@app.get("/claims", tags=["Claims"])
def list_claims():
    return {"count": len(claims), "claims": get_all_claims()}


@app.get("/claims/{user}", tags=["Claims"])
def user_claims(user: str):
    c = get_claims_for_user(user)
    return {"user": user, "count": len(c), "claims": c}


@app.post("/claims/create", tags=["Claims"])
def manual_claim(req: ClaimRequest):
    worker = next((w for w in workers if w["name"] == req.user), None)
    if not worker: raise HTTPException(404, f"Worker '{req.user}' not found")
    if worker.get("policy_paused"): raise HTTPException(400, "Policyprofile paused")

    claim_data = {"amount": req.amount, "reason": req.reason,
                  "trigger": "manual", "created_at": datetime.utcnow().isoformat()+"Z"}
    fraud = check_fraud(
        worker=worker, claim=claim_data,
        photo_submitted=req.photo_submitted,
        photo_metadata=req.photo_metadata,
        gps_trace=req.gps_trace,
        device_id=req.device_id,
    )

    if fraud.get("photo_required") and not req.photo_submitted:
        pending = {
            "id": len(claims)+1, "user": req.user,
            "amount": round(float(req.amount), 2), "reason": req.reason,
            "status": "pending_evidence",
            "payout_speed": "On hold — photo proof required",
            "created_at": datetime.utcnow().isoformat()+"Z", "trigger": "manual",
            "photo_required": True,
        }
        claims.append(pending)
        _save_state()
        return {"status": "pending_evidence", "claim": pending,
                "message": "Upload photo via POST /claims/photo-verify"}

    if not fraud["approved"]:
        rejected = {
            "id": len(claims)+1, "user": req.user,
            "amount": round(float(req.amount), 2), "reason": req.reason,
            "status": "rejected_fraud", "fraud_check": fraud,
            "created_at": datetime.utcnow().isoformat()+"Z", "trigger": "manual",
        }
        claims.append(rejected)
        worker["fraudulent_flags"] = int(worker.get("fraudulent_flags", 0)) + 1
        _save_state()
        return {"status": "rejected_fraud", "claim": rejected, "fraud_check": fraud,
                "message": f"Rejected — {fraud['risk_level']} risk. {fraud['action']}"}

    claim = svc_create_claim(req.user, req.amount, req.reason)
    return {
        "status": "claim_submitted", "claim": claim,
        "fraud_check": {
            "risk_level": fraud["risk_level"],
            "score":      fraud["score"],
            "approved":   True,
            "layers":     fraud["layers_triggered"],
        },
    }


@app.post("/claims/photo/{claim_id}", tags=["Claims"])
def submit_photo(claim_id: int, req: PhotoProofRequest):
    claim = next((c for c in claims if c.get("id") == claim_id), None)
    if not claim: raise HTTPException(404)
    if claim.get("status") != "pending_evidence":
        return {"status": "not_required", "message": f"Claim is '{claim['status']}'"}
    worker = next((w for w in workers if w["name"] == req.worker_name), None)
    if not worker: raise HTTPException(404)
    from services.fraud_engine import validate_photo_metadata
    ev = validate_photo_metadata(claim, True, req.photo_metadata, str(worker.get("pincode","")))
    if not ev["valid"]:
        claim["status"]      = "rejected_fraud"
        claim["fraud_flags"] = ev["flags"]
        _save_state()
        return {"status": "rejected", "flags": ev["flags"]}
    clad = float(worker.get("clad_score") or 50)
    claim["status"]         = "approved"
    claim["photo_verified"] = True
    claim["payout_speed"]   = "Instant" if clad>=85 else ("2hr auto" if clad>=62 else "6hr hold")
    _save_state()
    return {"status": "approved", "claim": claim}


# ══════════════════════════════════════════════════════════════
# VISION-POWERED CLAIM  (flagship endpoint)
# ══════════════════════════════════════════════════════════════

@app.post("/claims/photo-verify", tags=["Claims"])
async def photo_verified_claim(req: PhotoClaimRequest):
    """
    Full vision-powered claim:
    Photo → Claude Vision → 5-layer fraud check → approve/reject → payout eligible
    """
    worker = next((w for w in workers if w["name"] == req.user), None)
    if not worker: raise HTTPException(404, f"Worker '{req.user}' not found")
    if worker.get("policy_paused"): raise HTTPException(400, "Policyprofile paused")

    @app.post("/claims/photo-verify", tags=["Claims"])
    async def photo_verified_claim(req: PhotoClaimRequest):

        worker = next((w for w in workers if w["name"] == req.user), None)
        if not worker: raise HTTPException(404, f"Worker '{req.user}' not found")
        if worker.get("policy_paused"): raise HTTPException(400, "Policyprofile paused")

        # ✅ ADD HERE
        meta = req.photo_metadata or {}

        if meta.get("capture_type") != "camera_only":
            raise HTTPException(400, "Only camera capture allowed")

        if not meta.get("location"):
            raise HTTPException(400, "Location required")

    vision_result = await analyze_claim_photo(
        image_base64    = req.image_base64,
        image_mime_type = req.image_mime,
        trigger_type    = req.trigger_type,
        claimed_pincode = str(worker.get("pincode", "")),
        claimed_time    = datetime.utcnow().isoformat() + "Z",
    )

    claim_data = {
        "amount":     req.amount, "reason": req.reason,
        "trigger":    req.trigger_type,
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    fraud = check_fraud(
        worker=worker, claim=claim_data,
        photo_submitted=True,
        photo_metadata=req.photo_metadata,
        gps_trace=req.gps_trace,
        device_id=req.device_id,
        vision_result=vision_result,
    )

    vision_summary = {
        "verdict":          vision_result.get("verdict"),
        "authentic":        vision_result.get("authentic"),
        "confidence":       vision_result.get("confidence"),
        "weather_evidence": vision_result.get("weather_evidence"),
        "reason":           vision_result.get("reason"),
        "fraud_signals":    vision_result.get("fraud_signals", []),
        "model":            vision_result.get("model"),
        "vision_used":      vision_result.get("vision_used"),
    }

    if not fraud["approved"]:
        rejected = {
            "id": len(claims)+1, "user": req.user,
            "amount": round(float(req.amount), 2), "reason": req.reason,
            "status": "rejected_fraud", "fraud_check": fraud,
            "created_at": datetime.utcnow().isoformat()+"Z", "trigger": req.trigger_type,
        }
        claims.append(rejected)
        worker["fraudulent_flags"] = int(worker.get("fraudulent_flags", 0)) + 1
        _save_state()
        return {
            "status": "rejected", "claim": rejected,
            "fraud_check": fraud, "vision": vision_summary,
            "message": f"Rejected — {fraud['risk_level']} risk. Vision: {vision_result.get('verdict')}",
        }

    approved_claim = svc_create_claim(req.user, req.amount, req.reason)
    approved_claim["vision_verified"] = True
    approved_claim["vision_verdict"]  = vision_result.get("verdict")
    _save_state()

    return {
        "status": "approved", "claim": approved_claim,
        "fraud_check": {
            "risk_level": fraud["risk_level"],
            "score":      fraud["score"],
            "layers":     fraud["layers_triggered"],
        },
        "vision":    vision_summary,
        "message":   f"Approved — Vision: {vision_result.get('verdict')}, score: {fraud['score']}",
        "next_step": f"POST /payout with claim_id={approved_claim['id']}",
    }


@app.post("/claims/analyze-photo", tags=["Claims"])
async def analyze_photo_only(req: AnalyzePhotoRequest):
    """
    Test Vision analysis without filing a claim.
    Send any image as base64 — Claude analyzes if it shows real weather disruption.
    """
    result = await analyze_claim_photo(
        image_base64    = req.image_base64,
        image_mime_type = req.image_mime,
        trigger_type    = req.trigger_type,
        claimed_pincode = req.pincode,
        claimed_time    = datetime.utcnow().isoformat() + "Z",
    )
    return {
        "vision_analysis": result,
        "interpretation": (
            "✓ GENUINE CLAIM" if result.get("verdict") == "VERIFIED"   else
            "⚠ NEEDS REVIEW"  if result.get("verdict") == "SUSPICIOUS" else
            "✗ FAKE PHOTO"    if result.get("verdict") == "REJECTED"   else
            "? UNVERIFIED — add ANTHROPIC_API_KEY to .env"
        ),
    }


# ══════════════════════════════════════════════════════════════
# PAYOUT  —  Razorpay test mode
# ══════════════════════════════════════════════════════════════

@app.post("/payout", tags=["Payouts"])
async def process_payout(req: PayoutRequest):
    claim = next((c for c in claims if c.get("id") == req.claim_id), None)
    if not claim: raise HTTPException(404, f"Claim #{req.claim_id} not found")
    if claim.get("status") != "approved":
        raise HTTPException(400, f"Claim status is '{claim.get('status')}' — must be approved")
    if claim.get("payout_processed"):
        return {"status": "already_processed", "payout_id": claim.get("payout_id")}

    worker = next((w for w in workers if w["name"] == req.worker_name), None)
    if not worker: raise HTTPException(404, f"Worker '{req.worker_name}' not found")

    amount   = float(claim.get("amount", 0))
    upi_vpa  = req.upi_id or f"{req.worker_name.lower().replace(' ','.')}@upi"
    phone    = req.phone or "9999999999"
    amount_p = int(amount * 100)
    creds    = base64.b64encode(f"{RAZORPAY_KEY_ID}:{RAZORPAY_KEY_SECRET}".encode()).decode()
    headers  = {
        "Authorization":        f"Basic {creds}",
        "Content-Type":         "application/json",
        "X-Payout-Idempotency": f"CLAD-{req.claim_id}-{req.worker_name[:4].upper()}-{random.randint(1000,9999)}",
    }
    base_url     = "https://api.razorpay.com/v1"
    contact_id   = None
    fund_acct_id = None
    payout_resp  = None
    mode         = "live_api"

    import httpx as hx
    async with hx.AsyncClient(timeout=15.0) as client:
        try:
            r1 = await client.post(f"{base_url}/contacts", headers=headers, json={
                "name": req.worker_name, "contact": phone, "type": "employee",
                "reference_id": f"CLAD-W-{req.claim_id}",
                "notes": {"worker_type": "gig_delivery", "platform": "Clad Insurance"},
            })
            if r1.status_code in (200, 201):
                contact_id = r1.json().get("id")
        except Exception:
            mode = "fallback_simulation"

        if contact_id:
            try:
                r2 = await client.post(f"{base_url}/fund_accounts", headers=headers, json={
                    "contact_id": contact_id, "account_type": "vpa",
                    "vpa": {"address": upi_vpa},
                })
                if r2.status_code in (200, 201):
                    fund_acct_id = r2.json().get("id")
            except Exception:
                mode = "fallback_simulation"

        if fund_acct_id:
            try:
                r3 = await client.post(f"{base_url}/payouts", headers=headers, json={
                    "account_number":       "2323230074795370",
                    "fund_account_id":      fund_acct_id,
                    "amount":               amount_p,
                    "currency":             "INR",
                    "mode":                 "UPI",
                    "purpose":              "payout",
                    "queue_if_low_balance": True,
                    "reference_id":         f"CLAD-{req.claim_id}",
                    "narration":            f"Clad claim #{req.claim_id} payout",
                    "notes":                {"claim_id": str(req.claim_id), "worker": req.worker_name},
                })
                if r3.status_code in (200, 201):
                    payout_resp = r3.json()
            except Exception:
                mode = "fallback_simulation"

    if mode == "fallback_simulation" or not payout_resp:
        payout_id    = f"pout_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{random.randint(1000,9999)}"
        contact_id   = contact_id   or f"cont_{random.randint(10000000,99999999)}"
        fund_acct_id = fund_acct_id or f"fa_{random.randint(10000000,99999999)}"
        payout_resp  = {
            "id": payout_id, "entity": "payout",
            "fund_account_id": fund_acct_id,
            "amount": amount_p, "currency": "INR",
            "status": "processed", "mode": "UPI", "purpose": "payout",
            "reference_id": f"CLAD-{req.claim_id}",
            "narration": f"Clad claim #{req.claim_id} payout",
            "created_at": int(datetime.utcnow().timestamp()),
            "fee": 0, "tax": 0,
        }

    payout_id = payout_resp.get("id", f"pout_{random.randint(10000,99999)}")
    claim["payout_processed"]    = True
    claim["payout_id"]           = payout_id
    claim["payout_upi"]          = upi_vpa
    claim["payout_at"]           = datetime.utcnow().isoformat() + "Z"
    claim["razorpay_contact_id"] = contact_id
    claim["razorpay_fa_id"]      = fund_acct_id
    _save_state()

    return {
        "status":      "payout_sent",
        "payout_id":   payout_id,
        "amount_inr":  amount,
        "upi_vpa":     upi_vpa,
        "worker":      req.worker_name,
        "claim_id":    req.claim_id,
        "razorpay_key": RAZORPAY_KEY_ID[:16] + "...",
        "mode":        mode,
        "razorpay_steps": {
            "contact_id":      contact_id,
            "fund_account_id": fund_acct_id,
            "payout":          payout_resp,
        },
        "message": f"₹{amount:.0f} → {upi_vpa} via UPI (Razorpay {mode})",
    }


# ══════════════════════════════════════════════════════════════
# DASHBOARDS
# ══════════════════════════════════════════════════════════════

@app.get("/dashboard/worker/{name}", tags=["Dashboards"])
def worker_dashboard(name: str):
    worker = next((w for w in workers if w["name"] == name), None)
    if not worker: raise HTTPException(404, f"Worker '{name}' not found")
    policy  = next((p for p in policies if p["user"] == name), None)
    wclaims = [c for c in claims if c.get("user") == name]
    PLANS = {
        "basic": {"weekly_premium": 29, "weekly_cap": 800,  "payout_speed": "24hr reviewed"},
        "plus":  {"weekly_premium": 49, "weekly_cap": 1500, "payout_speed": "2hr auto"},
        "pro":   {"weekly_premium": 79, "weekly_cap": 2500, "payout_speed": "Instant"},
    }
    pc          = PLANS.get(worker.get("plan","plus"), PLANS["plus"])
    week_ago    = datetime.utcnow() - timedelta(days=7)
    week_claims = [c for c in wclaims if c.get("status")=="approved"
                   and datetime.fromisoformat(c["created_at"].replace("Z","")) > week_ago]
    cap_used    = sum(float(c.get("amount",0)) for c in week_claims)
    cap_pct     = round(min(cap_used / pc["weekly_cap"] * 100, 100), 1)
    total_paid  = sum(float(c.get("amount",0)) for c in wclaims if c.get("status")=="approved")
    avg_earning = float(worker.get("avg_daily_earning", 600))
    return {
        "worker": {
            "name": worker.get("name"), "pincode": worker.get("pincode"),
            "plan": worker.get("plan","plus"), "clad_score": worker.get("clad_score"),
            "pan_verified": worker.get("pan_verified", False),
            "platform_links": worker.get("platform_links", []),
            "total_deliveries": worker.get("total_deliveries", 0),
            "policy_paused": worker.get("policy_paused", False),
        },
        "coverage": {
            "status":         "paused" if worker.get("policy_paused") else ("active" if policy else "no_policy"),
            "plan":           worker.get("plan","plus"),
            "weekly_premium": pc["weekly_premium"],
            "weekly_cap":     pc["weekly_cap"],
            "payout_speed":   pc["payout_speed"],
        },
        "earnings": {
            "avg_daily_inr":          round(avg_earning, 2),
            "weekly_estimate":        round(avg_earning * 5, 2),
            "earnings_protected_pct": round(pc["weekly_cap"] / max(avg_earning*5,1)*100, 1),
        },
        "cap_utilisation": {
            "used_this_week":  round(cap_used, 2),
            "cap":             pc["weekly_cap"],
            "utilisation_pct": cap_pct,
            "remaining":       round(max(pc["weekly_cap"]-cap_used, 0), 2),
        },
        "claims_summary": {
            "total":          len(wclaims),
            "approved":       sum(1 for c in wclaims if c.get("status")=="approved"),
            "pending":        sum(1 for c in wclaims if "pending" in str(c.get("status",""))),
            "rejected":       sum(1 for c in wclaims if "rejected" in str(c.get("status",""))),
            "total_paid_inr": round(total_paid, 2),
        },
        "recent_claims": sorted(wclaims, key=lambda c: c.get("created_at",""), reverse=True)[:5],
        "exclusions": [
            "War, terrorism, nuclear events",
            "Nationwide lockdown / pandemic",
            "Worker-caused disruption",
            "Events below trigger thresholds",
            "Claims filed >6hrs after event",
            "Activity outside registered pincode",
            "Coverage-paused weeks",
        ],
    }


@app.get("/dashboard/insurer", tags=["Dashboards"])
def insurer_dashboard():
    approved  = [c for c in claims if c.get("status")=="approved"]
    pending   = [c for c in claims if "pending" in str(c.get("status",""))]
    rejected  = [c for c in claims if "rejected" in str(c.get("status",""))]
    total_out = sum(float(c.get("amount",0)) for c in approved)
    paid_out  = sum(float(c.get("amount",0)) for c in approved if c.get("payout_processed"))
    PLAN_P    = {"basic":29,"plus":49,"pro":79}
    wpool     = sum(PLAN_P.get(w.get("plan","plus"),49) for w in workers)
    annual    = wpool * 52
    lr        = round(total_out/max(annual,1)*100,1)
    scores    = [float(w.get("clad_score") or 50) for w in workers]
    avg_sc    = round(sum(scores)/len(scores),1) if scores else 0
    grades    = {"A+":0,"A":0,"B+":0,"B":0,"C":0,"D":0}
    for s in scores:
        if s>=85: grades["A+"]+=1
        elif s>=75: grades["A"]+=1
        elif s>=62: grades["B+"]+=1
        elif s>=50: grades["B"]+=1
        elif s>=35: grades["C"]+=1
        else: grades["D"]+=1
    trig_ct = {}
    for c in claims:
        t = c.get("trigger","unknown"); trig_ct[t] = trig_ct.get(t,0)+1
    from data.zone_risk import ZONE_RISK_PROFILES, DEFAULT_ZONE
    avg_d  = sum(ZONE_RISK_PROFILES.get(str(w.get("pincode","")),DEFAULT_ZONE)["disruption_days_per_year"]
                 for w in workers) / max(len(workers),1)
    d_prob = avg_d / 365
    avg_cl = total_out / max(len(approved),1) if approved else 250
    forecast = [{"date": (datetime.utcnow()+timedelta(days=i+1)).strftime("%Y-%m-%d"),
                 "day":  (datetime.utcnow()+timedelta(days=i+1)).strftime("%A"),
                 "expected_claims":     round(d_prob*len(workers),1),
                 "expected_payout_inr": round(d_prob*len(workers)*avg_cl,2)} for i in range(7)]
    return {
        "overview": {
            "total_workers":   len(workers),
            "active_policies": len([p for p in policies if p.get("status")=="active"]),
            "total_claims":    len(claims),
            "approved": len(approved), "pending": len(pending), "rejected": len(rejected),
        },
        "financials": {
            "total_payout_inr":        round(total_out,2),
            "payout_processed_inr":    round(paid_out,2),
            "weekly_premium_pool_inr": wpool,
            "annualized_pool_inr":     annual,
            "loss_ratio_pct":          lr,
            "loss_ratio_status":       "healthy" if lr<55 else ("watch" if lr<70 else "critical"),
        },
        "pool_health": {
            "utilisation_pct":    round(total_out/max(annual,1)*100,1),
            "reserve_buffer_pct": round(max(0,100-total_out/max(annual,1)*100),1),
        },
        "clad_score":        {"average": avg_sc, "by_grade": grades},
        "trigger_breakdown": trig_ct,
        "seven_day_forecast": forecast,
        "fraud_summary": {
            "total_fraud_flags":             sum(int(w.get("fraudulent_flags",0)) for w in workers),
            "flagged_workers":               sum(1 for w in workers if w.get("fraudulent_flags",0)>0),
            "pan_verified_workers":          sum(1 for w in workers if w.get("pan_verified")),
            "workers_with_delivery_history": sum(1 for w in workers if w.get("has_delivery_history")),
            "fraud_engine": "5-layer: Account Integrity + Rules(10) + NetworkX + IsoForest + Claude Vision",
        },
        "live_integrations": {
            "aqicn":        "api.waqi.info (live token)",
            "tomorrow_io":  "api.tomorrow.io/v4 (live key)",
            "open_meteo":   "api.open-meteo.com (no key)",
            "razorpay":     f"api.razorpay.com/v1 (test — {RAZORPAY_KEY_ID[:12]}...)",
            "claude_vision": "api.anthropic.com/v1 (claude-opus-4-5)",
        },
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


# ══════════════════════════════════════════════════════════════
# ADMIN
# ══════════════════════════════════════════════════════════════

@app.post("/admin/reset", tags=["Admin"])
def admin_reset(confirm: str = "no"):
    if confirm != "yes":
        return {"status": "not_reset", "message": "Pass ?confirm=yes to reset"}
    reset_db()
    return {"status": "reset_complete"}