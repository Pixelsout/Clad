"""
services/claim_service.py
==========================
Manual claim creation — the "zero-touch" worker-initiated flow.
Auto-approval logic is driven by CladScore grade:
  A+/A → Instant approve
  B+/B → Auto-approve after 2hr hold
  C/D  → Manual review queue
"""
from datetime import datetime
from core.db import claims, workers, _save_state


def _get_worker(name: str) -> dict:
    for w in workers:
        if w.get("name") == name:
            return w
    return {}


def create_claim(user_name: str, amount: float, reason: str = "manual") -> dict:
    """Worker-initiated claim — called from POST /claims/create."""
    user       = _get_worker(user_name)
    clad_score = float(user.get("clad_score", 50))

    # Auto-approval routing by CladScore
    if clad_score >= 75:
        status       = "approved"
        payout_speed = "Instant" if clad_score >= 85 else "2hr auto"
        review_note  = "Auto-approved — CladScore grade A/A+"
    elif clad_score >= 50:
        status       = "approved"
        payout_speed = "6hr hold"
        review_note  = "Auto-approved — CladScore grade B/B+, 6hr processing"
    else:
        status       = "pending_review"
        payout_speed = "24hr review"
        review_note  = "Manual review required — CladScore grade C/D"

    claim = {
        "id":           len(claims) + 1,
        "user":         user_name,
        "amount":       round(float(amount), 2),
        "reason":       reason,
        "status":       status,
        "payout_speed": payout_speed,
        "review_note":  review_note,
        "clad_score":   clad_score,
        "created_at":   datetime.utcnow().isoformat() + "Z",
        "trigger":      "manual",
    }
    claims.append(claim)
    _save_state()
    return claim


def get_claims_for_user(user_name: str) -> list:
    return [c for c in claims if c.get("user") == user_name]


def get_all_claims() -> list:
    return claims