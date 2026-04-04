import os
import pandas as pd

FEATURE_ORDER = [
    "base_premium",
    "account_age_days",
    "clad_score",
    "delivery_consistency",
    "avg_daily_earning",
    "claim_free_weeks",
    "past_claims_count",
    "is_monsoon",
    "is_aqi_season",
    "flood_frequency",
    "avg_rainfall_mm",
    "aqi_annual_avg",
    "waterlogging_score",
    "disruption_days_per_year",
    "weekly_disruption_prob",
    "expected_weekly_payout"
]

_model = None
_scaler = None

def _load():
    global _model, _scaler
    if _model is None:
        import joblib
        model_path  = os.path.join(os.path.dirname(__file__), "..", "models", "premium_model.pkl")
        scaler_path = os.path.join(os.path.dirname(__file__), "..", "models", "scaler.pkl")
        if not os.path.exists(model_path):
            raise RuntimeError(
                "Model not found. Run: python train_model.py  (from project root)"
            )
        _model  = joblib.load(model_path)
        _scaler = joblib.load(scaler_path)

def predict(data: dict) -> float:
    _load()
    df = pd.DataFrame([data])[FEATURE_ORDER]
    X_scaled = _scaler.transform(df)
    return float(_model.predict(X_scaled)[0])