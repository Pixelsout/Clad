"""
train_model.py
==============
Trains the LightGBM premium prediction model on the 8,000-sample dataset.

Run from project root:
    python train_model.py

Outputs:
    models/premium_model.pkl
    models/scaler.pkl
    models/model_card.json   ← metadata judges can inspect
"""
import pandas as pd
import joblib
import json
import os
from datetime import datetime

from lightgbm import LGBMRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, r2_score
import numpy as np

os.makedirs("models", exist_ok=True)

# ── Load data ──────────────────────────────────────────────────
df = pd.read_csv("../data/training_data.csv")
print(f"Dataset: {df.shape[0]} rows × {df.shape[1]} columns")

target   = "optimal_premium"
features = [c for c in df.columns if c != target]

X = df[features]
y = df[target]

print(f"Target range: ₹{y.min():.2f} – ₹{y.max():.2f}  |  mean: ₹{y.mean():.2f}")

# ── Scale ──────────────────────────────────────────────────────
scaler   = StandardScaler()
X_scaled = scaler.fit_transform(X)

# ── Split ──────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42
)

# ── Model ──────────────────────────────────────────────────────
model = LGBMRegressor(
    n_estimators      = 400,
    learning_rate     = 0.03,
    max_depth         = 6,
    subsample         = 0.8,
    colsample_bytree  = 0.8,
    min_child_samples = 20,
    reg_alpha         = 0.1,
    reg_lambda        = 0.1,
    random_state      = 42,
    verbose           = -1,
)

model.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    callbacks=[],
)

# ── Evaluate ───────────────────────────────────────────────────
y_pred_train = model.predict(X_train)
y_pred_test  = model.predict(X_test)

train_r2  = r2_score(y_train, y_pred_train)
test_r2   = r2_score(y_test,  y_pred_test)
test_mae  = mean_absolute_error(y_test, y_pred_test)

print(f"\n{'─'*40}")
print(f"Train R²  : {train_r2:.4f}")
print(f"Test  R²  : {test_r2:.4f}")
print(f"Test  MAE : ₹{test_mae:.2f}")
print(f"{'─'*40}\n")

# ── Feature importance ─────────────────────────────────────────
importance = dict(zip(features, model.feature_importances_))
importance = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))
print("Top features:")
for feat, score in list(importance.items())[:8]:
    print(f"  {feat:35s}  {score:.0f}")

# ── Save ───────────────────────────────────────────────────────
joblib.dump(model,  "models/premium_model.pkl")
joblib.dump(scaler, "models/scaler.pkl")

model_card = {
    "model":           "LightGBMRegressor",
    "version":         "1.0.0",
    "trained_at":      datetime.utcnow().isoformat() + "Z",
    "training_rows":   len(X_train),
    "test_rows":       len(X_test),
    "train_r2":        round(train_r2, 4),
    "test_r2":         round(test_r2, 4),
    "test_mae_inr":    round(test_mae, 2),
    "features":        features,
    "target":          target,
    "feature_importance": {k: int(v) for k, v in importance.items()},
    "hyperparameters": {
        "n_estimators":      400,
        "learning_rate":     0.03,
        "max_depth":         6,
        "subsample":         0.8,
        "colsample_bytree":  0.8,
    },
    "calibration_factor": 0.7,
    "premium_bounds_inr": {"min": 20, "max": 120},
}

with open("models/model_card.json", "w") as f:
    json.dump(model_card, f, indent=2)

print(f"\nModel saved → models/premium_model.pkl")
print(f"Scaler saved → models/scaler.pkl")
print(f"Model card  → models/model_card.json")