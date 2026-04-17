"""
services/vision_fraud.py  —  Clad Insurance v3.2
==================================================
Claude Vision API — Photo Authenticity Verification

Flow:
  Worker uploads base64 photo → analyze_claim_photo() →
  Claude Vision checks the image for:
    1. Weather/disruption evidence (rain, flooding, smog, wind damage)
    2. Image authenticity (stock photo, AI-generated, screenshot)
    3. Scene consistency with claimed trigger type
    4. Temporal signals (daylight matches claimed time)
  →  returns {authentic, confidence, verdict, reason, fraud_signals}
  →  fraud_engine.check_fraud() uses this as Layer 4 evidence score

Setup:
  pip install anthropic
  Set ANTHROPIC_API_KEY in .env
"""

import os
import base64
import httpx
from datetime import datetime
from typing import Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL      = "claude-opus-4-5"   # vision-capable model


# ══════════════════════════════════════════════════════════════
# PROMPT BUILDER  —  tells Claude exactly what to check
# ══════════════════════════════════════════════════════════════

def _build_prompt(trigger_type: str, claimed_pincode: str, claimed_time: str) -> str:
    trigger_descriptions = {
        "heavy_rain":    "heavy rain (precipitation, wet roads, puddles, rain falling, wet surfaces, people with umbrellas)",
        "aqi_spike":     "hazardous air quality / smog (hazy sky, reduced visibility, thick brown/grey haze, people wearing masks)",
        "waterlogging":  "waterlogging / flooding (standing water on roads, flooded streets, submerged vehicles or infrastructure)",
        "cyclone_wind":  "cyclonic wind / storm damage (fallen trees, damaged structures, debris on roads, strong wind effects)",
        "strike_curfew": "civil disruption / curfew (empty streets, blocked roads, security presence, closed shops)",
        "manual":        "any weather or civil disruption that would prevent delivery work",
    }
    expected = trigger_descriptions.get(trigger_type, trigger_descriptions["manual"])

    return f"""You are a fraud detection AI for Clad Insurance, a parametric income insurance platform for gig delivery workers in India.

A delivery worker has filed an insurance claim for income loss due to: **{trigger_type.replace('_',' ').upper()}**
They claim this happened at: **pincode {claimed_pincode}** around **{claimed_time} UTC**

They have uploaded the following photo as proof.

Your job is to analyze this photo and determine if it is AUTHENTIC EVIDENCE for their claim.

Analyze the image for ALL of the following:

**1. WEATHER/DISRUPTION EVIDENCE**
Does the image show clear visual evidence of: {expected}?
Rate the evidence: STRONG / MODERATE / WEAK / NONE

**2. IMAGE AUTHENTICITY**
- Does this look like a real photo taken on a mobile phone, or a stock photo / downloaded image?
- Are there watermarks, stock photo artifacts, or professional studio lighting?
- Does the image quality/metadata suggest it was taken on a smartphone?
- Does it look AI-generated or digitally manipulated?

**3. SCENE CONSISTENCY**
- Is this an outdoor Indian urban/suburban street scene consistent with a delivery worker's location?
- Does the lighting (day/night) roughly match the claimed time {claimed_time}?
- Is there any evidence this is from a different country or clearly staged?

**4. FRAUD SIGNALS**
Look for specific red flags:
- Generic stock photo of rain / flood (too perfect, no real people or vehicles)
- Screenshot of a news article or weather app (not a real outdoor photo)
- Indoor photo presented as outdoor weather evidence
- Clearly different season or geography (snow in summer, foreign city)
- Same photo being reused (common visual patterns)

Respond in this EXACT JSON format (no markdown, no explanation outside JSON):
{{
  "authentic": true or false,
  "confidence": 0.0 to 1.0,
  "verdict": "VERIFIED" or "SUSPICIOUS" or "REJECTED",
  "weather_evidence": "STRONG" or "MODERATE" or "WEAK" or "NONE",
  "is_stock_photo": true or false,
  "is_screenshot": true or false,
  "is_ai_generated": true or false,
  "scene_consistent": true or false,
  "fraud_signals": ["list", "of", "specific", "red", "flags", "found"],
  "reason": "One sentence explaining the decision",
  "recommended_action": "APPROVE" or "MANUAL_REVIEW" or "REJECT",
  "score_adjustment": -30 to +15
}}

score_adjustment rules:
  STRONG evidence + authentic photo = +10 to +15 (reduces fraud score)
  MODERATE evidence + authentic = 0 to +5
  WEAK/NO evidence = +10 to +20 (increases fraud score)
  Stock photo / screenshot detected = +25 to +30 (strong fraud signal)
  AI generated = +35 (very strong fraud signal)"""


# ══════════════════════════════════════════════════════════════
# MAIN VISION ANALYSIS
# ══════════════════════════════════════════════════════════════

async def analyze_claim_photo(
    image_base64:    str,
    image_mime_type: str,          # "image/jpeg" | "image/png" | "image/webp"
    trigger_type:    str,
    claimed_pincode: str = "unknown",
    claimed_time:    str = "",
) -> dict:
    """
    Send photo to Claude Vision for fraud analysis.

    Args:
        image_base64:    base64-encoded image string
        image_mime_type: MIME type of the image
        trigger_type:    heavy_rain | aqi_spike | waterlogging | cyclone_wind | strike_curfew | manual
        claimed_pincode: worker's registered pincode
        claimed_time:    ISO timestamp of when the event was claimed

    Returns:
        {
          authentic:         bool,
          confidence:        float (0-1),
          verdict:           "VERIFIED" | "SUSPICIOUS" | "REJECTED",
          weather_evidence:  "STRONG" | "MODERATE" | "WEAK" | "NONE",
          fraud_signals:     list[str],
          reason:            str,
          recommended_action:"APPROVE" | "MANUAL_REVIEW" | "REJECT",
          score_adjustment:  int  (negative = reduces fraud score, positive = increases it),
          vision_used:       bool,
          error:             str | None,
        }
    """
    if not claimed_time:
        claimed_time = datetime.utcnow().isoformat() + "Z"

    if not ANTHROPIC_API_KEY:
        return _fallback_result("No ANTHROPIC_API_KEY set in .env")

    prompt = _build_prompt(trigger_type, claimed_pincode, claimed_time)

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key":         ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type":      "application/json",
                },
                json={
                    "model":      CLAUDE_MODEL,
                    "max_tokens": 1024,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image",
                                    "source": {
                                        "type":       "base64",
                                        "media_type": image_mime_type,
                                        "data":       image_base64,
                                    },
                                },
                                {
                                    "type": "text",
                                    "text": prompt,
                                },
                            ],
                        }
                    ],
                },
            )

        if response.status_code != 200:
            return _fallback_result(f"Claude API error {response.status_code}: {response.text[:200]}")

        raw_text = response.json()["content"][0]["text"].strip()

        # Strip markdown fences if Claude added them
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]

        import json
        result = json.loads(raw_text.strip())

        # Normalise and add meta
        result["vision_used"] = True
        result["error"]       = None
        result["analyzed_at"] = datetime.utcnow().isoformat() + "Z"
        result["model"]       = CLAUDE_MODEL
        result["trigger_type"] = trigger_type

        # Clamp score_adjustment to safe range
        result["score_adjustment"] = max(-30, min(40, int(result.get("score_adjustment", 0))))

        return result

    except Exception as e:
        return _fallback_result(str(e)[:200])


def _fallback_result(error: str) -> dict:
    """Returned when Vision API is unavailable — neutral result, claim proceeds normally."""
    return {
        "authentic":          True,
        "confidence":         0.5,
        "verdict":            "UNVERIFIED",
        "weather_evidence":   "UNKNOWN",
        "is_stock_photo":     False,
        "is_screenshot":      False,
        "is_ai_generated":    False,
        "scene_consistent":   True,
        "fraud_signals":      [],
        "reason":             f"Vision analysis unavailable: {error}",
        "recommended_action": "MANUAL_REVIEW",
        "score_adjustment":   0,
        "vision_used":        False,
        "error":              error,
        "analyzed_at":        datetime.utcnow().isoformat() + "Z",
    }


# ══════════════════════════════════════════════════════════════
# HELPER — decode uploaded file to base64
# ══════════════════════════════════════════════════════════════

def file_to_base64(file_bytes: bytes) -> str:
    return base64.b64encode(file_bytes).decode("utf-8")


def url_to_base64_sync(image_url: str) -> tuple[str, str]:
    """
    Fetch an image from URL and return (base64_str, mime_type).
    Used for testing with image URLs.
    """
    import httpx as hx
    r = hx.get(image_url, timeout=10)
    mime = r.headers.get("content-type", "image/jpeg").split(";")[0]
    return base64.b64encode(r.content).decode("utf-8"), mime