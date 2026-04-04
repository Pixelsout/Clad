"""
services/pricing_engine.py
===========================
Main pricing pipeline:
  Worker inputs → CladScore → Zone Risk → LightGBM → Calibration → Breakdown

This is what /premium calls. It's the real ML model — not the old rules stub.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from data.zone_risk import ZONE_RISK_PROFILES, DEFAULT_ZONE
from data.clad_score import compute_clad_score_simple
from src.predict import predict

def compute_premium(user: dict) -> dict:
    # ── 1. Zone lookup ────────────────────────────────────────
    pincode = str(user.get("pincode", "560034"))
    zone    = ZONE_RISK_PROFILES.get(pincode, DEFAULT_ZONE)

    # ── 2. CladScore ─────────────────────────────────────────
    clad_score = compute_clad_score_simple(
        delivery_consistency_pct = float(user.get("delivery_consistency", 0.80)),
        location_honesty_pct     = float(user.get("location_honesty", 0.85)),
        claim_history_score      = float(user.get("claim_history_score", 1.0)),
        zone_disruption_days     = zone["disruption_days_per_year"],
        flood_frequency          = zone["flood_frequency"],
        account_age_days         = int(user.get("account_age_days", 90)),
        claim_free_weeks         = int(user.get("claim_free_weeks", 0)),
        fraudulent_flags         = int(user.get("fraudulent_flags", 0)),
    )

    # ── 3. Derive grade & payout speed from CladScore ────────
    if clad_score >= 85:
        grade, payout_speed = "A+", "Instant"
    elif clad_score >= 75:
        grade, payout_speed = "A",  "2hr auto"
    elif clad_score >= 62:
        grade, payout_speed = "B+", "2hr auto"
    elif clad_score >= 50:
        grade, payout_speed = "B",  "6hr hold"
    elif clad_score >= 35:
        grade, payout_speed = "C",  "24hr review"
    else:
        grade, payout_speed = "D",  "24hr review"

    # ── 4. Build ML feature vector ───────────────────────────
    month              = int(user.get("month", 4))
    avg_daily_earning  = float(user.get("avg_daily_earning", 600))
    claim_free_weeks_v = int(user.get("claim_free_weeks", 0))
    past_claims        = int(user.get("past_claims_count", 0))

    is_monsoon    = int(month in [6, 7, 8, 9])
    is_aqi_season = int(month in [10, 11, 12, 1, 2])
    weekly_prob   = zone["disruption_days_per_year"] / 365 * 7
    if is_monsoon:
        weekly_prob *= 2.5

    model_input = {
        "base_premium":            49,
        "account_age_days":        int(user.get("account_age_days", 90)),
        "clad_score":              clad_score,
        "delivery_consistency":    float(user.get("delivery_consistency", 0.80)),
        "avg_daily_earning":       avg_daily_earning,
        "claim_free_weeks":        claim_free_weeks_v,
        "past_claims_count":       past_claims,
        "is_monsoon":              is_monsoon,
        "is_aqi_season":           is_aqi_season,
        "flood_frequency":         zone["flood_frequency"],
        "avg_rainfall_mm":         zone["avg_rainfall_mm"],
        "aqi_annual_avg":          zone["aqi_annual_avg"],
        "waterlogging_score":      zone["waterlogging_score"],
        "disruption_days_per_year": zone["disruption_days_per_year"],
        "weekly_disruption_prob":  weekly_prob,
        "expected_weekly_payout":  weekly_prob * avg_daily_earning * 0.5,
    }

    # ── 5. LightGBM prediction ────────────────────────────────
    try:
        raw_premium = predict(model_input)
        ml_used     = True
    except RuntimeError:
        # Model not trained yet — fall back to actuarial formula
        raw_premium = (
            49
            + zone["flood_frequency"] * 18
            + zone["aqi_annual_avg"] / 220 * 6
            - ((clad_score - 50) / 50) * 12
            + (8 if is_monsoon else 0)
        )
        ml_used = False

    # ── 6. Calibration & safety bounds ───────────────────────
    premium = raw_premium * 0.7
    premium = round(max(20.0, min(120.0, premium)), 2)

    # ── 7. Explainability breakdown ───────────────────────────
    breakdown = []

    base_prem = 49
    breakdown.append({"factor": "Base Premium (Plus plan)", "amount": base_prem, "direction": "base"})

    flood_adj = round(zone["flood_frequency"] * 18, 2)
    breakdown.append({"factor": f"Flood Risk — {zone.get('city', pincode)}", "amount": flood_adj, "direction": "increase"})

    aqi_adj = round(zone["aqi_annual_avg"] / 220 * 6, 2)
    breakdown.append({"factor": "Air Quality Index (AQI) Risk", "amount": aqi_adj, "direction": "increase"})

    disruption_adj = round((zone["disruption_days_per_year"] / 52) * 2.5, 2)
    breakdown.append({"factor": "Zone Disruption Frequency", "amount": disruption_adj, "direction": "increase"})

    if is_monsoon:
        breakdown.append({"factor": "Monsoon Season Surcharge", "amount": 8, "direction": "increase"})
    else:
        breakdown.append({"factor": "Non-Monsoon Stability", "amount": -5, "direction": "discount"})

    if is_aqi_season:
        breakdown.append({"factor": "Winter AQI Season Surcharge", "amount": 4, "direction": "increase"})

    clad_adj = round(((clad_score - 50) / 50) * 12, 2)
    if clad_adj > 0:
        breakdown.append({"factor": f"CladScore Discount (grade {grade})", "amount": -clad_adj, "direction": "discount"})
    else:
        breakdown.append({"factor": f"CladScore Risk Premium (grade {grade})", "amount": abs(clad_adj), "direction": "increase"})

    if claim_free_weeks_v > 0:
        streak_disc = round(min(1.0, claim_free_weeks_v / 12) * 8, 2)
        breakdown.append({"factor": f"No-Claim Streak ({claim_free_weeks_v} weeks)", "amount": -streak_disc, "direction": "discount"})

    account_age = int(user.get("account_age_days", 90))
    if account_age < 90:
        nu_surcharge = round((1 - account_age / 90) * 5, 2)
        breakdown.append({"factor": "New Account Surcharge", "amount": nu_surcharge, "direction": "increase"})

    return {
        "predicted_premium": premium,
        "clad_score":        round(clad_score, 1),
        "clad_grade":        grade,
        "payout_speed":      payout_speed,
        "zone":              zone,
        "breakdown":         breakdown,
        "ml_used":           ml_used,
        "confidence":        "High" if ml_used else "Medium (actuarial fallback)",
        "model_version":     "LightGBM-v1" if ml_used else "actuarial-v1",
    }