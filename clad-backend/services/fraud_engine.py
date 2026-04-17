"""
services/fraud_engine.py  —  Clad Insurance v3.2
==================================================
5-Layer Fraud Detection Engine

Layer 0 — Account Integrity  : PAN, delivery history, account age, platform links
Layer 1 — Rule Engine        : 10 hard signals (GPS, timing, amount, history)
Layer 2 — Network Graph      : Coordinated rings via networkx
Layer 3 — ML Anomaly         : Isolation Forest (6-feature vector)
Layer 4 — Vision AI          : Claude Vision photo authenticity verification

Scoring: Rules 50% + ML 25% + Network 15% + Vision adjustment
"""

import math
import random
from datetime import datetime, timedelta
from typing import Optional
import numpy as np

HONEYPOT_PINCODES = {"999999", "000001", "111111", "560000", "000000"}
GHOST_ZONES       = {"560099", "400099", "110099"}
HISTORICAL_WEATHER_CACHE: dict = {}
SUSPICIOUS_PATTERNS = {
    "gps_jump_km_threshold":      50,
    "cell_tower_mismatch_threshold": 0.30,
    "delivery_velocity_max_kmh":  80,
}


# ══════════════════════════════════════════════════════════════
# ISOLATION FOREST
# ══════════════════════════════════════════════════════════════
_iso_forest = None

def _get_iso_forest():
    global _iso_forest
    if _iso_forest is not None:
        return _iso_forest
    try:
        from sklearn.ensemble import IsolationForest
        rng = np.random.default_rng(42)
        normal = rng.normal(
            loc=[0.35, 13.5/23, 3.0/6, 1.2/10, 0.78, 0.60],
            scale=[0.12, 0.15, 0.20, 0.08, 0.12, 0.20],
            size=(2000, 6)
        )
        normal = np.clip(normal, 0, 1)
        fraud = rng.normal(
            loc=[0.88, 3.0/23, 1.0/6, 4.5/10, 0.28, 0.08],
            scale=[0.06, 0.06, 0.08, 0.10, 0.06, 0.04],
            size=(180, 6)
        )
        fraud = np.clip(fraud, 0, 1)
        iso = IsolationForest(n_estimators=200, contamination=0.08, random_state=42)
        iso.fit(np.vstack([normal, fraud]))
        _iso_forest = iso
    except Exception:
        _iso_forest = None
    return _iso_forest


def _ml_features(worker: dict, claim: dict) -> Optional[np.ndarray]:
    try:
        avg_e  = float(worker.get("avg_daily_earning", 500))
        amount = float(claim.get("amount", 0))
        now    = datetime.utcnow()
        return np.array([[
            min(amount / max(avg_e, 1), 1.0),
            now.hour / 23.0,
            now.weekday() / 6.0,
            min(float(worker.get("past_claims_count", 0)) / 10.0, 1.0),
            float(worker.get("clad_score") or 50) / 100.0,
            min(float(worker.get("account_age_days", 0)) / 365.0, 1.0),
        ]])
    except Exception:
        return None


# ══════════════════════════════════════════════════════════════
# NETWORK GRAPH
# ══════════════════════════════════════════════════════════════
import networkx as nx
_claim_graph    = nx.DiGraph()
_zone_claim_log: dict = {}
_device_claim_log: dict = {}


def _register_in_graph(worker_name: str, pincode: str, amount: float, device_id: Optional[str] = None):
    wn = f"w:{worker_name}"
    zn = f"z:{pincode}"
    for n in [wn, zn]:
        if not _claim_graph.has_node(n):
            _claim_graph.add_node(n)
    _claim_graph.add_edge(wn, zn, amount=amount, ts=datetime.utcnow().isoformat())
    now = datetime.utcnow()
    _zone_claim_log.setdefault(pincode, []).append(now)
    _zone_claim_log[pincode] = [t for t in _zone_claim_log[pincode] if (now-t).total_seconds()<3600]
    if device_id:
        _device_claim_log.setdefault(device_id, set()).add(worker_name)


def _network_signals(worker_name: str, pincode: str, device_id: Optional[str]) -> list:
    flags = []
    if len(_zone_claim_log.get(pincode, [])) > 8:
        flags.append(f"ZONE_BURST: {len(_zone_claim_log[pincode])} claims from {pincode} in 1hr")
    wn = f"w:{worker_name}"
    if _claim_graph.has_node(wn) and len(list(_claim_graph.successors(wn))) > 3:
        flags.append(f"MULTI_ZONE: Claims from {len(list(_claim_graph.successors(wn)))} zones")
    if device_id and len(_device_claim_log.get(device_id, set()) - {worker_name}) > 0:
        others = _device_claim_log[device_id] - {worker_name}
        flags.append(f"SHARED_DEVICE: Device used by {len(others)} other account(s) — farm suspected")
    return flags


# ══════════════════════════════════════════════════════════════
# LAYER 0 — ACCOUNT INTEGRITY
# ══════════════════════════════════════════════════════════════

def check_account_integrity(worker: dict) -> dict:
    flags = []
    score = 0
    pan        = worker.get("pan_number", "")
    pan_ok     = worker.get("pan_verified", False)
    age        = int(worker.get("account_age_days", 0))
    history    = worker.get("has_delivery_history", False)
    deliveries = int(worker.get("total_deliveries", 0))
    platforms  = worker.get("platform_links", [])

    if not pan:
        flags.append("NO_PAN: No PAN provided")
        score += 45
    elif not pan_ok:
        flags.append("PAN_UNVERIFIED: PAN not verified with NSDL")
        score += 25
    else:
        import re
        if not re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]$', str(pan).upper()):
            flags.append(f"PAN_INVALID: '{pan}' bad format")
            score += 35

    if not history:
        flags.append("NO_DELIVERY_HISTORY: No platform delivery history")
        score += 30
    elif deliveries < 5:
        flags.append(f"SPARSE_HISTORY: Only {deliveries} deliveries")
        score += 15
    elif deliveries >= 50:
        score = max(0, score - 10)

    if age < 3 and worker.get("past_claims_count", 0) > 0:
        flags.append(f"INSTANT_CLAIM: {age}-day account with claims — fraud farm")
        score += 50
    elif age < 7:
        flags.append(f"VERY_NEW_ACCOUNT: {age} days old")
        score += 20

    if not platforms:
        flags.append("NO_PLATFORM_LINK: Not linked to Swiggy/Zomato/Blinkit/Zepto")
        score += 20

    score = min(score, 100)
    return {
        "integrity_score": score,
        "flags":           flags,
        "pan_ok":          bool(pan_ok),
        "history_ok":      bool(history and deliveries >= 5),
        "passes_gate":     score < 50,
    }


# ══════════════════════════════════════════════════════════════
# LAYER 4 — PHOTO METADATA VALIDATION
# (Vision AI result is passed in separately — see check_fraud)
# ══════════════════════════════════════════════════════════════

def validate_photo_metadata(
    claim:           dict,
    photo_submitted: bool,
    photo_metadata:  Optional[dict] = None,
    worker_pincode:  str = "",
) -> dict:
    flags   = []
    penalty = 0
    trigger = claim.get("trigger", "manual")
    requires_photo = trigger in ("heavy_rain", "waterlogging", "aqi_spike", "cyclone_wind")

    if requires_photo and not photo_submitted:
        return {
            "valid": False, "score_penalty": 40,
            "flags": [f"NO_PHOTO: {trigger} claim requires photo proof"],
            "verdict": "REJECT_NO_EVIDENCE", "required": True,
        }
    if not photo_submitted:
        return {"valid": True, "score_penalty": 0, "flags": [], "verdict": "NOT_REQUIRED", "required": False}

    if photo_metadata:
        # Timestamp check
        try:
            pts  = datetime.fromisoformat(photo_metadata.get("timestamp_utc","").replace("Z",""))
            cts  = datetime.fromisoformat(claim.get("created_at", datetime.utcnow().isoformat()).replace("Z",""))
            diff = abs((cts - pts).total_seconds()) / 3600
            if diff > 2:
                flags.append(f"PHOTO_TIMESTAMP: Photo taken {diff:.1f}hr from claim — recycled image")
                penalty += 25
        except Exception:
            flags.append("PHOTO_TIMESTAMP_INVALID")
            penalty += 10

        # EXIF stripped
        if photo_metadata.get("exif_stripped"):
            flags.append("EXIF_STRIPPED: Metadata removed — possible stock/downloaded image")
            penalty += 20

        # GPS vs pincode
        from data.pincode_coords import PINCODE_COORDS
        coords = PINCODE_COORDS.get(str(worker_pincode), {})
        if coords and photo_metadata.get("gps_lat"):
            plat = float(photo_metadata["gps_lat"])
            plon = float(photo_metadata["gps_lon"])
            rlat = float(coords.get("lat", plat))
            rlon = float(coords.get("lon", plon))
            dlat = math.radians(plat - rlat)
            dlon = math.radians(plon - rlon)
            a    = math.sin(dlat/2)**2 + math.cos(math.radians(rlat))*math.cos(math.radians(plat))*math.sin(dlon/2)**2
            dist = 6371 * 2 * math.asin(math.sqrt(a))
            if dist > 25:
                flags.append(f"PHOTO_GPS_MISMATCH: Photo {dist:.0f}km from registered pincode")
                penalty += 30

        # Historical weather cross-check
        today_wx = HISTORICAL_WEATHER_CACHE.get(str(worker_pincode), {}).get(
            datetime.utcnow().strftime("%Y-%m-%d"), {})
        if trigger == "heavy_rain" and today_wx and not today_wx.get("had_rain", True):
            flags.append("WEATHER_MISMATCH: No rain recorded today in this pincode — fake claim")
            penalty += 35

    penalty = min(penalty, 60)
    valid   = penalty < 30 and not any("MISMATCH" in f or "REJECT" in f for f in flags)
    return {"valid": valid, "score_penalty": penalty, "flags": flags,
            "verdict": "PASS" if valid else "SUSPECT", "required": requires_photo}


def update_weather_cache(pincode: str, date: str, had_rain: bool, rain_mm: float = 0.0, aqi: float = 0.0):
    HISTORICAL_WEATHER_CACHE.setdefault(str(pincode), {})[date] = {
        "had_rain": had_rain, "rain_mm": rain_mm, "aqi": aqi,
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }


# ══════════════════════════════════════════════════════════════
# GPS SPOOFING
# ══════════════════════════════════════════════════════════════

def detect_gps_spoof(gps_trace: list) -> dict:
    flags = []
    if not gps_trace or len(gps_trace) < 2:
        return {"spoofed": False, "confidence": 0.0, "flags": ["INSUFFICIENT_GPS_DATA"]}

    for i in range(1, len(gps_trace)):
        p1, p2 = gps_trace[i-1], gps_trace[i]
        try:
            t1  = datetime.fromisoformat(p1["timestamp_utc"].replace("Z",""))
            t2  = datetime.fromisoformat(p2["timestamp_utc"].replace("Z",""))
            dtm = max((t2-t1).total_seconds()/60, 0.1)
            dlat = math.radians(float(p2["lat"])-float(p1["lat"]))
            dlon = math.radians(float(p2["lon"])-float(p1["lon"]))
            a    = math.sin(dlat/2)**2 + math.cos(math.radians(float(p1["lat"])))*math.cos(math.radians(float(p2["lat"])))*math.sin(dlon/2)**2
            dist = 6371 * 2 * math.asin(math.sqrt(a))
            spd  = dist / (dtm/60)
            if dist > 50 and dtm < 10:
                flags.append(f"GPS_JUMP: {dist:.0f}km in {dtm:.0f}min — impossible")
            if spd > 80:
                flags.append(f"GPS_VELOCITY: {spd:.0f}km/h — exceeds delivery bike limit")
        except Exception:
            continue

    lats = [float(p.get("lat",0)) for p in gps_trace]
    if len(set(round(l,4) for l in lats)) == 1:
        flags.append("GPS_STATIC: All points identical — emulator detected")

    return {"spoofed": len(flags) > 0, "confidence": round(min(len(flags)*0.35,1.0),2), "flags": flags}


# ══════════════════════════════════════════════════════════════
# MAIN FRAUD CHECK
# ══════════════════════════════════════════════════════════════

def check_fraud(
    worker:          dict,
    claim:           dict,
    photo_submitted: bool = False,
    photo_metadata:  Optional[dict] = None,
    gps_trace:       Optional[list] = None,
    device_id:       Optional[str]  = None,
    vision_result:   Optional[dict] = None,   # ← from analyze_claim_photo()
) -> dict:
    """
    5-layer fraud check.
    vision_result is injected by the API endpoint after async Vision call.
    """
    flags      = []
    rule_score = 0

    pincode     = str(worker.get("pincode", ""))
    name        = worker.get("name", "unknown")
    amount      = float(claim.get("amount", 0))
    avg_earning = float(worker.get("avg_daily_earning", 500))
    clad_score  = float(worker.get("clad_score") or 50)
    account_age = int(worker.get("account_age_days", 0))
    past_claims = int(worker.get("past_claims_count", 0))
    fraud_flags = int(worker.get("fraudulent_flags", 0))

    # ── Honeypot ──────────────────────────────────────────────
    if pincode in HONEYPOT_PINCODES:
        return {
            "risk_level": "CRITICAL", "score": 100,
            "flags": ["HONEYPOT: Synthetic pincode — auto block"],
            "approved": False,
            "action": "REJECT — honeypot triggered",
            "ml_score": None, "ml_anomaly": False,
            "layers_triggered": ["Layer 3 Proactive"],
            "evidence_check": None, "gps_check": None,
            "account_integrity": None, "vision_result": None,
        }

    if pincode in GHOST_ZONES:
        flags.append("GHOST_ZONE: Unserviced coverage area")
        rule_score += 55

    # ── Layer 0: Account Integrity ────────────────────────────
    integrity = check_account_integrity(worker)
    if not integrity["passes_gate"]:
        flags.extend([f"[L0] {f}" for f in integrity["flags"]])
        rule_score += int(integrity["integrity_score"] * 0.5)
    elif integrity["flags"]:
        flags.extend([f"[L0] {f}" for f in integrity["flags"]])
        rule_score += int(integrity["integrity_score"] * 0.25)

    # ── Layer 4: Photo Metadata ───────────────────────────────
    evidence = validate_photo_metadata(claim, photo_submitted, photo_metadata, pincode)
    if not evidence["valid"]:
        flags.extend([f"[L4] {f}" for f in evidence["flags"]])
        rule_score += evidence["score_penalty"]
    elif evidence["flags"]:
        flags.extend([f"[L4] {f}" for f in evidence["flags"]])
        rule_score += int(evidence["score_penalty"] * 0.5)

    # ── Layer 4b: Vision AI result ────────────────────────────
    vision_score_adj = 0
    if vision_result:
        adj = int(vision_result.get("score_adjustment", 0))
        vision_score_adj = adj
        if not vision_result.get("authentic", True):
            vflags = vision_result.get("fraud_signals", [])
            flags.extend([f"[VISION] {f}" for f in vflags])
            flags.append(f"[VISION] Verdict: {vision_result.get('verdict')} — {vision_result.get('reason','')}")
            rule_score += max(0, adj)   # positive adj = more fraud
        elif vision_result.get("verdict") == "VERIFIED":
            # Authentic photo — small reward (reduce score)
            rule_score = max(0, rule_score + adj)  # adj is negative here
            flags.append(f"[VISION] ✓ Photo verified — {vision_result.get('weather_evidence')} weather evidence")

    # ── GPS check ─────────────────────────────────────────────
    gps_result = None
    if gps_trace:
        gps_result = detect_gps_spoof(gps_trace)
        if gps_result["spoofed"]:
            flags.extend([f"[GPS] {f}" for f in gps_result["flags"]])
            rule_score += int(gps_result["confidence"] * 40)

    # ── Layer 1: Rule Signals ─────────────────────────────────
    if amount > avg_earning * 0.90:
        flags.append(f"HIGH_CLAIM_RATIO: ₹{amount:.0f} = {amount/avg_earning*100:.0f}% of daily earning")
        rule_score += 20
    if account_age < 14 and amount > 300:
        flags.append(f"NEW_ACCOUNT_HIGH_CLAIM: {account_age}-day account, ₹{amount:.0f}")
        rule_score += 25
    if fraud_flags > 0:
        flags.append(f"FRAUD_HISTORY: {fraud_flags} prior flag(s)")
        rule_score += min(fraud_flags * 18, 54)
    if clad_score < 35 and amount > 500:
        flags.append(f"LOW_SCORE_HIGH_CLAIM: Score {clad_score:.0f}, ₹{amount:.0f}")
        rule_score += 18
    if past_claims > 8:
        flags.append(f"HIGH_FREQUENCY: {past_claims} lifetime claims")
        rule_score += 12
    ist_hour = (datetime.utcnow().hour + 5) % 24
    if 2 <= ist_hour <= 5:
        flags.append(f"ODD_HOURS: Filed at {ist_hour:02d}:xx IST")
        rule_score += 10
    if amount > 100 and amount % 500 == 0:
        flags.append(f"ROUND_AMOUNT: Exactly ₹{amount:.0f}")
        rule_score += 8
    reason = str(claim.get("reason","")).lower()
    if claim.get("trigger")=="manual" and amount > avg_earning*0.50:
        if not any(w in reason for w in ["rain","aqi","flood","storm","curfew","strike","wind"]):
            flags.append("REASON_MISMATCH: Large manual claim, no disruption keyword")
            rule_score += 8
    if not worker.get("has_delivery_history") and past_claims > 0:
        flags.append("CLAIM_WITHOUT_HISTORY: Claims with no delivery history")
        rule_score += 22
    if device_id:
        others = _device_claim_log.get(device_id, set()) - {name}
        if others:
            flags.append(f"DEVICE_FARM: Device linked to {len(others)} other account(s)")
            rule_score += 35

    rule_score = min(rule_score, 100)

    # ── Layer 2: Network ──────────────────────────────────────
    net_flags = _network_signals(name, pincode, device_id)
    if net_flags:
        flags.extend([f"[L2] {f}" for f in net_flags])
        rule_score = min(rule_score + len(net_flags)*15, 100)

    # ── Layer 3: Isolation Forest ─────────────────────────────
    ml_score   = None
    ml_anomaly = False
    iso = _get_iso_forest()
    if iso is not None:
        feat = _ml_features(worker, claim)
        if feat is not None:
            try:
                pred       = iso.predict(feat)[0]
                raw        = iso.decision_function(feat)[0]
                ml_score   = round(float(np.clip((0.3-raw)/0.6*100, 0, 100)), 1)
                ml_anomaly = bool(pred == -1)
            except Exception:
                ml_score = None

    # ── Combine ───────────────────────────────────────────────
    if ml_score is not None:
        final_score = round(rule_score*0.65 + ml_score*0.35, 1)
    else:
        final_score = float(rule_score)
    final_score = min(max(final_score, 0), 100)

    # ── Decision ──────────────────────────────────────────────
    if final_score >= 75:
        risk_level, approved = "CRITICAL", False
        action = "REJECT — high confidence fraud"
    elif final_score >= 50:
        risk_level, approved = "HIGH", False
        action = "HOLD — manual review required"
    elif final_score >= 25:
        risk_level, approved = "MEDIUM", True
        action = "APPROVE with monitoring"
    else:
        risk_level, approved = "LOW", True
        action = "APPROVE — clean"

    # Vision override — if Claude says REJECT, honour it regardless of score
    if vision_result and vision_result.get("recommended_action") == "REJECT":
        approved   = False
        risk_level = "HIGH"
        action     = f"REJECT — Vision AI: {vision_result.get('reason','fake photo detected')}"

    _register_in_graph(name, pincode, amount, device_id)

    layers = []
    if any("[L0]" in f for f in flags):      layers.append("Layer 0 Account Integrity")
    if any(k in " ".join(flags) for k in
           ["HIGH_CLAIM","NEW_ACCOUNT","FRAUD_HISTORY","LOW_SCORE","HIGH_FREQ",
            "ODD_HOURS","ROUND","REASON","HISTORY","DEVICE_FARM"]): layers.append("Layer 1 Rules")
    if any("[L2]" in f for f in flags):      layers.append("Layer 2 Network Graph")
    if ml_anomaly:                            layers.append("Layer 3 Isolation Forest")
    if any("[L4]" in f or "[GPS]" in f or "[VISION]" in f for f in flags):
        layers.append("Layer 4 Vision+Evidence")

    return {
        "risk_level":        risk_level,
        "score":             round(final_score, 1),
        "rule_score":        rule_score,
        "ml_score":          ml_score,
        "ml_anomaly":        ml_anomaly,
        "flags":             flags,
        "approved":          approved,
        "action":            action,
        "layers_triggered":  layers if layers else ["None — clean"],
        "signals_checked":   10 + len(net_flags),
        "evidence_check":    evidence,
        "gps_check":         gps_result,
        "account_integrity": integrity,
        "vision_result":     vision_result,
        "photo_required":    evidence.get("required", False),
        "photo_submitted":   photo_submitted,
        "vision_score_adj":  vision_score_adj,
    }