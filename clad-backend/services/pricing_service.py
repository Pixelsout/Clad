def compute_dynamic_payout(user, trigger):
    base_earning = user.get("avg_daily_earning", 500)

    rain_intensity = trigger.get("rain_intensity", 5)
    duration = trigger.get("duration", 30)
    plan = user.get("plan", "basic")

    intensity_factor = rain_intensity / 10
    duration_factor = duration / 60

    plan_multiplier = {
        "basic": 0.4,
        "plus": 0.6,
        "pro": 0.8
    }.get(plan, 0.4)

    payout = base_earning * intensity_factor * duration_factor * plan_multiplier

    return round(payout)
def compute_premium(data: dict):
    base = data.get("avg_daily_earning", 500)
    clad_score = data.get("clad_score", 70)

    # simple premium logic
    premium = 40 + (base * 0.02) - (clad_score * 0.1)

    return {
        "predicted_premium": round(max(20, min(premium, 120)), 2)
    }