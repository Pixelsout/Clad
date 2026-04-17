def create_worker(data):
    return {
        "id": len(data),
        "name": data["name"],
        "pincode": data["pincode"],
        "account_age_days": data["account_age_days"],
        "delivery_consistency": data["delivery_consistency"],
        "avg_daily_earning": data["avg_daily_earning"]
    }