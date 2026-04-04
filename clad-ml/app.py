"""
app.py  —  Clad Insurance API
==============================
Run:  uvicorn app:app --reload --port 8000
Docs: http://localhost:8000/docs

Routes:
  POST /register              Register a gig worker
  POST /policy/create         Create an insurance policy
  GET  /policy                List all policies
  GET  /policy/{name}         Get one worker's policy
  POST /premium               ML-powered dynamic premium calculation
  GET  /trigger/check         Run all 5 disruption triggers for a pincode
  GET  /claims                All claims
  GET  /claims/{user}         Claims for one worker
  POST /claims/create         Manual (zero-touch) worker-initiated claim
  GET  /worker/{name}         Full worker profile
  GET  /workers               All workers
  POST /admin/reset           Wipe DB for demo reset
  GET  /health                Health check
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

app = FastAPI(
    title="Clad — Dynamic Gig Worker Insurance API",
    description="ML-powered insurance platform for India's gig economy. "
                "CladScore + LightGBM premium engine + 5 auto-triggers.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Imports after sys.path fix ────────────────────────────────
from core.db import workers, policies, claims, reset_db, _save_state
from services.pricing_engine import compute_premium          # ← real ML pipeline
from services.real_trigger_service import run_triggers
from services.claim_service import create_claim as svc_create_claim, get_all_claims, get_claims_for_user


# ══════════════════════════════════════════════════════════════
# PYDANTIC MODELS  (input validation — prevents KeyError crashes)
# ══════════════════════════════════════════════════════════════

class RegisterRequest(BaseModel):
    name:                 str
    pincode:              str
    plan:                 str           = "plus"    # basic | plus | pro
    account_age_days:     int           = 90
    delivery_consistency: float         = 0.80
    avg_daily_earning:    float         = 600.0
    claim_free_weeks:     int           = 0
    past_claims_count:    int           = 0
    location_honesty:     float         = 0.85
    claim_history_score:  float         = 1.0
    fraudulent_flags:     int           = 0

class PolicyRequest(BaseModel):
    name: str
    plan: str   = "plus"

class PremiumRequest(BaseModel):
    name:                 Optional[str]   = None
    pincode:              str             = "560034"
    plan:                 str             = "plus"
    account_age_days:     int             = 90
    delivery_consistency: float           = 0.80
    avg_daily_earning:    float           = 600.0
    claim_free_weeks:     int             = 0
    past_claims_count:    int             = 0
    location_honesty:     float           = 0.85
    claim_history_score:  float           = 1.0
    fraudulent_flags:     int             = 0
    month:                int             = datetime.utcnow().month

class ClaimRequest(BaseModel):
    user:   str
    amount: float
    reason: str = "manual claim"


# ══════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════

@app.get("/health")
def health():
    return {
        "status":    "ok",
        "version":   "2.0.0",
        "workers":   len(workers),
        "policies":  len(policies),
        "claims":    len(claims),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


# ── Registration ──────────────────────────────────────────────
@app.post("/register", summary="Register a gig worker")
def register(req: RegisterRequest):
    # Prevent duplicate registrations
    existing = next((w for w in workers if w["name"] == req.name), None)
    if existing:
        return {"status": "already_registered", "user": existing}

    user = req.dict()
    user["registered_at"] = datetime.utcnow().isoformat() + "Z"
    user["clad_score"]    = None   # computed on first premium call
    workers.append(user)
    _save_state()
    return {"status": "registered", "user": user}


# ── Worker profile ────────────────────────────────────────────
@app.get("/workers", summary="List all registered workers")
def list_workers():
    return {"count": len(workers), "workers": workers}

@app.get("/worker/{name}", summary="Get one worker's full profile")
def get_worker(name: str):
    w = next((w for w in workers if w["name"] == name), None)
    if not w:
        raise HTTPException(404, f"Worker '{name}' not found")
    return w


# ── Policy ────────────────────────────────────────────────────
@app.post("/policy/create", summary="Create an insurance policy for a worker")
def create_policy(req: PolicyRequest):
    worker = next((w for w in workers if w["name"] == req.name), None)
    if not worker:
        raise HTTPException(404, f"Worker '{req.name}' not registered. Call /register first.")

    existing = next((p for p in policies if p["user"] == req.name), None)
    if existing:
        existing["plan"]       = req.plan
        existing["updated_at"] = datetime.utcnow().isoformat() + "Z"
        worker["plan"]         = req.plan
        _save_state()
        return {"status": "policy_updated", "policy": existing}

    policy = {
        "id":         len(policies) + 1,
        "user":       req.name,
        "plan":       req.plan,
        "status":     "active",
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    policies.append(policy)
    worker["plan"] = req.plan
    _save_state()
    return {"status": "policy_created", "policy": policy}

@app.get("/policy", summary="List all policies")
def get_policies():
    return {"count": len(policies), "policies": policies}

@app.get("/policy/{name}", summary="Get policy for one worker")
def get_policy(name: str):
    p = next((p for p in policies if p["user"] == name), None)
    if not p:
        raise HTTPException(404, f"No policy found for '{name}'")
    return p


# ── Premium (REAL ML PIPELINE) ────────────────────────────────
@app.post("/premium", summary="ML-powered dynamic premium calculation")
def get_premium(req: PremiumRequest):
    data = req.dict()

    # If name provided, enrich with stored worker data
    if req.name:
        worker = next((w for w in workers if w["name"] == req.name), None)
        if worker:
            for k in ["pincode", "delivery_consistency", "avg_daily_earning",
                      "account_age_days", "claim_free_weeks", "past_claims_count",
                      "location_honesty", "claim_history_score", "fraudulent_flags", "plan"]:
                if k in worker:
                    data.setdefault(k, worker[k])

    result = compute_premium(data)

    # Write CladScore back to worker record
    if req.name:
        worker = next((w for w in workers if w["name"] == req.name), None)
        if worker:
            worker["clad_score"] = result["clad_score"]
            _save_state()

    return result


# ── Triggers (5 automated disruption checks) ──────────────────
@app.get("/trigger/check", summary="Run all 5 disruption triggers for a pincode")
async def check_triggers(pincode: str):
    return await run_triggers(pincode)


# ── Claims ────────────────────────────────────────────────────
@app.get("/claims", summary="Get all claims")
def list_claims():
    return {"count": len(claims), "claims": get_all_claims()}

@app.get("/claims/{user}", summary="Get claims for one worker")
def user_claims(user: str):
    c = get_claims_for_user(user)
    return {"user": user, "count": len(c), "claims": c}

@app.post("/claims/create", summary="Zero-touch worker-initiated claim")
def manual_claim(req: ClaimRequest):
    worker = next((w for w in workers if w["name"] == req.user), None)
    if not worker:
        raise HTTPException(404, f"Worker '{req.user}' not found. Register first.")
    claim = svc_create_claim(req.user, req.amount, req.reason)
    return {"status": "claim_submitted", "claim": claim}


# ── Admin ─────────────────────────────────────────────────────
@app.post("/admin/reset", summary="Reset DB — use before demo")
def admin_reset(confirm: str = "no"):
    if confirm != "yes":
        return {"status": "not_reset", "message": "Pass ?confirm=yes to confirm"}
    reset_db()
    return {"status": "reset_complete", "message": "All workers, policies, claims cleared"}