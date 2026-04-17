"""
CladScore Model
===============
Computes a 0–100 trust and risk score for each worker.
Used for: premium adjustment, payout speed, fraud lane routing.

Architecture: Weighted ensemble of sub-scores, each independently
interpretable. Designed to be explainable to judges and workers.

Sub-scores:
  C1 — Delivery Consistency  (30%)
  C2 — Location Honesty       (25%)
  C3 — Claim Integrity        (25%)
  C4 — Zone Risk Inverse      (20%)
"""

import numpy as np
from dataclasses import dataclass
from typing import Optional


@dataclass
class CladScoreInput:
    # Delivery consistency signals
    active_days_last_30: int           # How many days worked in last 30
    avg_deliveries_per_day: float      # Average deliveries on working days
    delivery_streak_days: int          # Current consecutive working days
    platform_tenure_days: int          # Total days on platform

    # Location honesty signals
    gps_consistency_score: float       # 0–1, how consistent GPS traces are
    zone_adherence_rate: float         # 0–1, stays in registered zone
    cell_tower_match_rate: float       # 0–1, GPS matches cell tower

    # Claim integrity signals
    total_claims: int                  # All-time claims filed
    approved_claims: int               # Claims approved without review
    fraudulent_flags: int              # Times flagged by fraud engine
    claim_free_weeks: int              # Current streak without a claim
    false_positive_count: int          # Times wrongly flagged (not penalized)

    # Zone risk
    zone_disruption_days_per_year: float  # From zone risk table
    flood_frequency: float                 # 0–1 from zone risk table

    # Optional signals
    behavioral_consistency: Optional[float] = None   # 0–1, biometric stability
    pan_verified: bool = True
    account_age_days: int = 0


@dataclass
class CladScoreResult:
    total_score: float          # 0–100 final score
    grade: str                  # A+ / A / B+ / B / C / D
    payout_speed: str           # Instant / 2hr / 6hr / 24hr
    premium_modifier: float     # multiplier on base premium (0.7–1.3)

    # Sub-scores
    delivery_consistency: float
    location_honesty: float
    claim_integrity: float
    zone_risk_inverse: float

    # Explanation
    strengths: list
    flags: list
    recommendation: str


def compute_clad_score(inp: CladScoreInput) -> CladScoreResult:
    """
    Main CladScore computation.
    All sub-scores normalized to 0–100 before weighting.
    """
    strengths = []
    flags = []

    # ── C1: DELIVERY CONSISTENCY (30%) ────────────────────────────────────
    # Signals: active days, deliveries/day, streak, tenure
    active_rate = min(inp.active_days_last_30 / 22, 1.0)  # 22 working days/month
    delivery_rate = min(inp.avg_deliveries_per_day / 20, 1.0)  # 20 = excellent
    streak_score = min(inp.delivery_streak_days / 14, 1.0)  # 2-week streak = max
    tenure_score = min(inp.platform_tenure_days / 180, 1.0)  # 6 months = max

    c1_raw = (active_rate * 0.40 + delivery_rate * 0.30 + streak_score * 0.15 + tenure_score * 0.15)
    c1 = c1_raw * 100

    if active_rate > 0.85:
        strengths.append(f"Works {inp.active_days_last_30}/30 days consistently")
    if inp.delivery_streak_days >= 7:
        strengths.append(f"{inp.delivery_streak_days}-day delivery streak")
    if active_rate < 0.50:
        flags.append("Low activity in last 30 days")

    # ── C2: LOCATION HONESTY (25%) ────────────────────────────────────────
    gps_score = inp.gps_consistency_score
    zone_score = inp.zone_adherence_rate
    tower_score = inp.cell_tower_match_rate

    # PAN verified is a hard gate — if not verified, cap at 40
    pan_gate = 1.0 if inp.pan_verified else 0.40

    c2_raw = (gps_score * 0.35 + zone_score * 0.35 + tower_score * 0.30) * pan_gate
    c2 = c2_raw * 100

    if inp.cell_tower_match_rate > 0.90:
        strengths.append("Location signals consistent across GPS and cell tower")
    if not inp.pan_verified:
        flags.append("PAN not verified — location honesty capped")
    if inp.zone_adherence_rate < 0.70:
        flags.append("Frequently operates outside registered zone")

    # Add behavioral consistency if available
    if inp.behavioral_consistency is not None:
        bio_boost = (inp.behavioral_consistency - 0.5) * 10
        c2 = float(np.clip(c2 + bio_boost, 0, 100))
        if inp.behavioral_consistency > 0.85:
            strengths.append("Behavioral biometrics consistent (trusted device)")

    # ── C3: CLAIM INTEGRITY (25%) ─────────────────────────────────────────
    if inp.total_claims == 0:
        approval_rate = 1.0
        claim_score = 0.85  # New workers get slight trust discount
    else:
        # Penalize fraud flags heavily
        clean_claims = inp.approved_claims - inp.false_positive_count
        fraud_penalty = min(inp.fraudulent_flags * 0.25, 1.0)
        approval_rate = float(np.clip(clean_claims / max(inp.total_claims, 1), 0, 1))
        claim_score = approval_rate * (1 - fraud_penalty)

    streak_bonus = min(inp.claim_free_weeks * 0.02, 0.15)  # up to +15 pts
    c3 = float(np.clip((claim_score + streak_bonus) * 100, 0, 100))

    if inp.claim_free_weeks >= 4:
        strengths.append(f"{inp.claim_free_weeks}-week claim-free streak")
    if inp.fraudulent_flags > 0:
        flags.append(f"{inp.fraudulent_flags} fraud flag(s) on record")
    if inp.total_claims > 0 and approval_rate > 0.95:
        strengths.append(f"Clean claim history ({inp.approved_claims}/{inp.total_claims} approved)")

    # ── C4: ZONE RISK INVERSE (20%) ───────────────────────────────────────
    # High-risk zone workers get slight score reduction (not punishment,
    # but reflects higher expected claim frequency)
    zone_norm = inp.zone_disruption_days_per_year / 52  # weekly disruption rate
    flood_penalty = inp.flood_frequency * 20
    zone_raw = float(np.clip(100 - (zone_norm * 80) - flood_penalty, 20, 100))
    c4 = zone_raw

    if inp.flood_frequency < 0.2:
        strengths.append("Low flood-risk zone")
    if inp.flood_frequency > 0.7:
        flags.append("High flood-risk zone — premium adjusted accordingly")

    # ── FINAL WEIGHTED SCORE ──────────────────────────────────────────────
    total = (c1 * 0.30) + (c2 * 0.25) + (c3 * 0.25) + (c4 * 0.20)
    total = float(np.clip(total, 0, 100))

    # Account age gate — new workers capped at 65
    if inp.account_age_days < 21:
        total = min(total, 65.0)
        flags.append("New account — score capped at 65 until 21-day mark")
    elif inp.account_age_days < 60:
        total = min(total, 80.0)

    # ── GRADE & PAYOUT SPEED ──────────────────────────────────────────────
    if total >= 85:
        grade, payout_speed = "A+", "Instant"
        recommendation = "Elite worker. Instant payouts. Maximum discount."
    elif total >= 75:
        grade, payout_speed = "A", "2hr auto"
        recommendation = "Trusted worker. Auto-approve all claims."
    elif total >= 62:
        grade, payout_speed = "B+", "2hr auto"
        recommendation = "Good standing. Standard auto-approval."
    elif total >= 50:
        grade, payout_speed = "B", "6hr hold"
        recommendation = "Acceptable. Light review on high-value claims."
    elif total >= 35:
        grade, payout_speed = "C", "24hr review"
        recommendation = "Watch closely. Manual review recommended."
    else:
        grade, payout_speed = "D", "24hr review"
        recommendation = "High risk. All claims require manual review."

    # ── PREMIUM MODIFIER ──────────────────────────────────────────────────
    # Score 50 = 1.0x base. Each 10 points above = -4%. Each 10 below = +5%.
    if total >= 50:
        modifier = 1.0 - ((total - 50) / 10) * 0.04
    else:
        modifier = 1.0 + ((50 - total) / 10) * 0.05
    modifier = float(np.clip(modifier, 0.65, 1.40))

    return CladScoreResult(
        total_score=round(total, 1),
        grade=grade,
        payout_speed=payout_speed,
        premium_modifier=round(modifier, 3),
        delivery_consistency=round(c1, 1),
        location_honesty=round(c2, 1),
        claim_integrity=round(c3, 1),
        zone_risk_inverse=round(c4, 1),
        strengths=strengths,
        flags=flags,
        recommendation=recommendation,
    )


def compute_clad_score_simple(
    delivery_consistency_pct: float = 0.75,
    location_honesty_pct: float = 0.85,
    claim_history_score: float = 1.0,
    zone_disruption_days: float = 18,
    flood_frequency: float = 0.35,
    account_age_days: int = 90,
    claim_free_weeks: int = 0,
    fraudulent_flags: int = 0,
) -> float:
    """
    Simplified CladScore for use in the backend API.
    Returns just the 0–100 score.
    """
    c1 = delivery_consistency_pct * 100
    c2 = location_honesty_pct * 100

    fraud_penalty = min(fraudulent_flags * 25, 100)
    streak_bonus = min(claim_free_weeks * 2, 15)
    c3 = float(np.clip(claim_history_score * 100 - fraud_penalty + streak_bonus, 0, 100))

    zone_norm = zone_disruption_days / 52
    c4 = float(np.clip(100 - (zone_norm * 80) - (flood_frequency * 20), 20, 100))

    total = (c1 * 0.30) + (c2 * 0.25) + (c3 * 0.25) + (c4 * 0.20)
    total = float(np.clip(total, 0, 100))

    if account_age_days < 21:
        total = min(total, 65.0)
    elif account_age_days < 60:
        total = min(total, 80.0)

    return round(total, 1)