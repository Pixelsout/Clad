"""
services/real_trigger_service.py
==================================
5 automated disruption triggers — each maps to a real income-loss event.
Trigger fires → payout computed → claims auto-created for all active workers.

Triggers:
  1. Heavy Rain       — rain_intensity > 7.5 AND duration > 45min
  2. AQI Spike        — AQI > 200 (Delhi-style pollution blackout)
  3. Waterlogging     — waterlogging_score > 0.65 (zone-based)
  4. Cyclone / Storm  — wind_speed > 60 km/h (mock weather API)
  5. Strike / Curfew  — curfew_active flag (mock civil alert API)
"""
import random
from datetime import datetime
from core.db import claims, workers, _save_state
from services.pricing_service import compute_dynamic_payout


# ── Simulated "live" API readings ─────────────────────────────
# In production: replace with httpx calls to Open-Meteo, AQICN, etc.
def _fetch_weather(pincode: str) -> dict:
    """Mock weather API — returns realistic values per pincode."""
    ZONE_WEATHER = {
        "400001": {"rain_intensity": 9.2, "duration": 52, "wind_speed": 35, "aqi": 148},
        "560034": {"rain_intensity": 8.1, "duration": 48, "wind_speed": 22, "aqi": 97},
        "560038": {"rain_intensity": 5.0, "duration": 30, "wind_speed": 18, "aqi": 89},
        "110001": {"rain_intensity": 3.5, "duration": 25, "wind_speed": 15, "aqi": 245},
    }
    base = ZONE_WEATHER.get(str(pincode), {"rain_intensity": 6.0, "duration": 35, "wind_speed": 20, "aqi": 130})
    # Add small random jitter so each call looks "live"
    return {
        "rain_intensity": round(base["rain_intensity"] + random.uniform(-0.5, 0.5), 1),
        "duration":       int(base["duration"] + random.randint(-5, 5)),
        "wind_speed":     int(base["wind_speed"] + random.randint(-3, 3)),
        "aqi":            int(base["aqi"] + random.randint(-10, 10)),
    }

def _fetch_zone_data(pincode: str) -> dict:
    from data.zone_risk import ZONE_RISK_PROFILES, DEFAULT_ZONE
    return ZONE_RISK_PROFILES.get(str(pincode), DEFAULT_ZONE)

def _fetch_civil_alerts(pincode: str) -> dict:
    """Mock civil alert API — simulates strike/curfew data."""
    HIGH_RISK_PINCODES = {"110001", "400001"}  # Delhi & Mumbai mock alerts
    return {"curfew_active": pincode in HIGH_RISK_PINCODES}


# ── Claim factory ─────────────────────────────────────────────
def _make_claim(user: dict, amount: float, trigger_type: str, reason: str) -> dict:
    claim = {
        "id":           len(claims) + 1,
        "user":         user.get("name", "unknown"),
        "amount":       amount,
        "status":       "approved",
        "trigger":      trigger_type,
        "reason":       reason,
        "created_at":   datetime.utcnow().isoformat() + "Z",
        "payout_speed": _payout_speed(user),
    }
    claims.append(claim)
    return claim

def _payout_speed(user: dict) -> str:
    score = float(user.get("clad_score", 50))
    if score >= 85: return "Instant"
    if score >= 75: return "2hr auto"
    if score >= 62: return "2hr auto"
    if score >= 50: return "6hr hold"
    return "24hr review"


# ── Main trigger runner ───────────────────────────────────────
async def run_triggers(pincode: str) -> dict:
    triggers_fired   = []
    triggers_checked = []
    claims_created   = []

    weather  = _fetch_weather(pincode)
    zone     = _fetch_zone_data(pincode)
    alerts   = _fetch_civil_alerts(pincode)

    # Eligible workers in this pincode (or all workers if pincode matches)
    eligible = [w for w in workers if str(w.get("pincode", "")) == str(pincode)]
    if not eligible and workers:
        eligible = [workers[-1]]   # fallback: last registered worker

    trigger_data_rain = {
        "rain_intensity": weather["rain_intensity"],
        "duration":       weather["duration"],
    }

    # ──────────────────────────────────────────────────────────
    # TRIGGER 1: Heavy Rain
    # ──────────────────────────────────────────────────────────
    t1 = {
        "trigger": "heavy_rain",
        "condition": f"rain_intensity={weather['rain_intensity']} > 7.5 AND duration={weather['duration']}min > 45",
        "fired": weather["rain_intensity"] > 7.5 and weather["duration"] > 45,
        "readings": {"rain_intensity": weather["rain_intensity"], "duration_min": weather["duration"]},
    }
    triggers_checked.append(t1)
    if t1["fired"]:
        triggers_fired.append("heavy_rain")
        for user in eligible:
            amt = compute_dynamic_payout(user, trigger_data_rain)
            c   = _make_claim(user, amt, "heavy_rain", f"Heavy rain {weather['rain_intensity']} intensity for {weather['duration']}min")
            claims_created.append(c)

    # ──────────────────────────────────────────────────────────
    # TRIGGER 2: AQI Spike
    # ──────────────────────────────────────────────────────────
    t2 = {
        "trigger": "aqi_spike",
        "condition": f"aqi={weather['aqi']} > 200 (hazardous threshold)",
        "fired": weather["aqi"] > 200,
        "readings": {"aqi": weather["aqi"]},
    }
    triggers_checked.append(t2)
    if t2["fired"]:
        triggers_fired.append("aqi_spike")
        for user in eligible:
            base = float(user.get("avg_daily_earning", 500))
            amt  = round(base * 0.30)     # 30% income loss for hazardous air
            c    = _make_claim(user, amt, "aqi_spike", f"Hazardous AQI {weather['aqi']} — outdoor work restricted")
            claims_created.append(c)

    # ──────────────────────────────────────────────────────────
    # TRIGGER 3: Waterlogging
    # ──────────────────────────────────────────────────────────
    waterlog = zone.get("waterlogging_score", 0)
    t3 = {
        "trigger": "waterlogging",
        "condition": f"waterlogging_score={waterlog} > 0.65 AND rain_intensity > 6",
        "fired": waterlog > 0.65 and weather["rain_intensity"] > 6,
        "readings": {"waterlogging_score": waterlog, "rain_intensity": weather["rain_intensity"]},
    }
    triggers_checked.append(t3)
    if t3["fired"] and "heavy_rain" not in triggers_fired:  # don't double-pay
        triggers_fired.append("waterlogging")
        for user in eligible:
            amt = compute_dynamic_payout(user, {**trigger_data_rain, "rain_intensity": 7.0})
            c   = _make_claim(user, amt, "waterlogging", f"Zone waterlogging score {waterlog} — roads blocked")
            claims_created.append(c)

    # ──────────────────────────────────────────────────────────
    # TRIGGER 4: Cyclone / High Wind
    # ──────────────────────────────────────────────────────────
    t4 = {
        "trigger": "cyclone_wind",
        "condition": f"wind_speed={weather['wind_speed']}km/h > 60",
        "fired": weather["wind_speed"] > 60,
        "readings": {"wind_speed_kmh": weather["wind_speed"]},
    }
    triggers_checked.append(t4)
    if t4["fired"]:
        triggers_fired.append("cyclone_wind")
        for user in eligible:
            base = float(user.get("avg_daily_earning", 500))
            amt  = round(base * 0.50)   # 50% loss — full-day disruption
            c    = _make_claim(user, amt, "cyclone_wind", f"Cyclonic wind {weather['wind_speed']}km/h — delivery halted")
            claims_created.append(c)

    # ──────────────────────────────────────────────────────────
    # TRIGGER 5: Strike / Curfew
    # ──────────────────────────────────────────────────────────
    t5 = {
        "trigger": "strike_curfew",
        "condition": f"curfew_active={alerts['curfew_active']}",
        "fired": alerts["curfew_active"],
        "readings": {"curfew_active": alerts["curfew_active"]},
    }
    triggers_checked.append(t5)
    if t5["fired"]:
        triggers_fired.append("strike_curfew")
        for user in eligible:
            base = float(user.get("avg_daily_earning", 500))
            amt  = round(base * 0.60)   # 60% loss — full-day blockage
            c    = _make_claim(user, amt, "strike_curfew", "Civil strike/curfew — movement restricted")
            claims_created.append(c)

    # Save to disk so claims persist across restarts
    _save_state()

    return {
        "pincode":          pincode,
        "checked_at":       datetime.utcnow().isoformat() + "Z",
        "weather_readings": weather,
        "zone_data":        zone,
        "triggers_checked": triggers_checked,
        "triggers_fired":   triggers_fired,
        "claims_created":   claims_created,
        "total_claims":     len(claims_created),
        "summary": f"{len(triggers_fired)}/5 triggers fired — {len(claims_created)} claim(s) auto-approved",
    }