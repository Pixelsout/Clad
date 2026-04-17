"""
vision_route.py  —  Add this to your FastAPI app (main.py / app.py)
====================================================================
Exposes POST /vision/verify so the React frontend can call Claude
Vision without ever touching an API key in the browser.

Usage in main FastAPI file:
    from vision_route import router as vision_router
    app.include_router(vision_router)

Requires:
    ANTHROPIC_API_KEY set in .env
    pip install anthropic  (or httpx — vision_fraud.py uses httpx already)
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.vision_fraud import analyze_claim_photo   # adjust path if needed

router = APIRouter()


class VisionRequest(BaseModel):
    image_b64:    str
    mime_type:    str = "image/jpeg"
    trigger_type: str = "manual"
    pincode:      str = "unknown"
    prompt:       Optional[str] = None   # frontend passes its own prompt; ignored here
                                         # vision_fraud.py builds its own prompt internally


@router.post("/vision/verify")
async def vision_verify(req: VisionRequest):
    """
    Accepts a base64 photo from the React frontend and runs it through
    Claude Vision (vision_fraud.py → analyze_claim_photo).

    Returns the raw vision result dict:
    {
      authentic, confidence, verdict, weather_evidence,
      is_stock_photo, is_screenshot, is_ai_generated,
      scene_consistent, fraud_signals, reason,
      recommended_action, score_adjustment, vision_used, error
    }
    """
    result = await analyze_claim_photo(
        image_base64    = req.image_b64,
        image_mime_type = req.mime_type,
        trigger_type    = req.trigger_type,
        claimed_pincode = req.pincode,
    )
    return result