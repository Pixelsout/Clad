import numpy as np
import pandas as pd
import random
import os
from data.zone_risk import ZONE_RISK_PROFILES, DEFAULT_ZONE, MONSOON_MONTHS

np.random.seed(42)
random.seed(42)

def generate_data(n=8000):
    data = []
    pincodes = list(ZONE_RISK_PROFILES.keys())

    for _ in range(n):
        pincode = random.choice(pincodes)
        zone = ZONE_RISK_PROFILES.get(pincode, DEFAULT_ZONE)

        account_age_days = int(np.random.exponential(180))
        clad_score = float(np.clip(np.random.beta(5,3)*100, 10, 100))
        delivery_consistency = np.random.beta(6,2)

        avg_daily_earning = float(np.clip(np.random.normal(700,120),300,1200))
        claim_free_weeks = int(np.random.exponential(6))
        past_claims_count = int(np.random.poisson(2))

        month = random.randint(1,12)
        is_monsoon = int(month in MONSOON_MONTHS)

        weekly_prob = zone["disruption_days_per_year"]/365*7
        if is_monsoon:
            weekly_prob *= 2.5

        expected_payout = weekly_prob * avg_daily_earning * 0.5

        premium = expected_payout * 1.35
        premium = float(np.clip(premium, 20, 120))

        data.append({
            "base_premium": 49,
            "account_age_days": account_age_days,
            "clad_score": clad_score,
            "delivery_consistency": delivery_consistency,
            "avg_daily_earning": avg_daily_earning,
            "claim_free_weeks": claim_free_weeks,
            "past_claims_count": past_claims_count,
            "is_monsoon": is_monsoon,
            "is_aqi_season": int(month in [10,11,12,1,2]),
            "flood_frequency": zone["flood_frequency"],
            "avg_rainfall_mm": zone["avg_rainfall_mm"],
            "aqi_annual_avg": zone["aqi_annual_avg"],
            "waterlogging_score": zone["waterlogging_score"],
            "disruption_days_per_year": zone["disruption_days_per_year"],
            "weekly_disruption_prob": weekly_prob,
            "expected_weekly_payout": expected_payout,
            "optimal_premium": premium
        })

    return pd.DataFrame(data)

if __name__ == "__main__":
    df = generate_data()
    os.makedirs("data", exist_ok=True)
    df.to_csv("data/training_data.csv", index=False)
    print("Data generated successfully")