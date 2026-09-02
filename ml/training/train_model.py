"""
RiskShield AI — ML Anomaly Detector Training
----------------------------------------------
Trains an unsupervised Isolation Forest on behavioral transaction features.
We use an *unsupervised* model on purpose: in a real payment system, most
transactions are never conclusively labeled as fraud or not, so a model
that can flag "this looks unusual" without needing labels is more realistic
than a supervised classifier. The `risk_label` column in the synthetic
dataset is only used here to *evaluate* how well the anomaly model lines up
with known-bad behavior — it is never fed into the model as an input.

Outputs:
  ml/model/isolation_forest.joblib          <- trained pipeline + scaling info
  ml/training/data/synthetic_transactions_scored.csv  <- dataset + ml_anomaly_score column (0-100)

The scored CSV is what prisma/seed.ts reads, so the seed script never has to
shell out to Python at seed time. Live, one-off scoring (e.g. from the
Transaction Simulator) is handled separately by ml/inference/predict.py.
"""

import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, "data", "synthetic_transactions.csv")
SCORED_PATH = os.path.join(BASE_DIR, "data", "synthetic_transactions_scored.csv")
MODEL_DIR = os.path.join(os.path.dirname(BASE_DIR), "model")
MODEL_PATH = os.path.join(MODEL_DIR, "isolation_forest.joblib")

FEATURE_COLUMNS = [
    "amount_to_avg_ratio",
    "account_age_days",
    "failed_attempts",
    "transactions_last_10min",
    "transactions_last_24h",
    "device_age_days",
    "is_new_device_num",
    "is_new_location_num",
]


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    safe_avg = df["historical_avg_amount"].replace(0, np.nan)
    df["amount_to_avg_ratio"] = (df["amount"] / safe_avg).fillna(df["amount"] / df["amount"].mean())
    df["is_new_device_num"] = df["is_new_device"].astype(int)
    df["is_new_location_num"] = df["is_new_location"].astype(int)
    return df


def train():
    df = pd.read_csv(DATA_PATH)
    df = engineer_features(df)

    X = df[FEATURE_COLUMNS].values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(
        n_estimators=200,
        contamination=0.1,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_scaled)

    # decision_function: higher = more normal, lower = more anomalous.
    # We flip the sign so higher = more anomalous, then min-max scale to 0-100.
    raw_scores = -model.decision_function(X_scaled)
    score_min, score_max = float(raw_scores.min()), float(raw_scores.max())

    def to_0_100(raw: np.ndarray) -> np.ndarray:
        if score_max - score_min < 1e-9:
            return np.zeros_like(raw)
        scaled = (raw - score_min) / (score_max - score_min) * 100
        return np.clip(scaled, 0, 100)

    anomaly_scores = to_0_100(raw_scores)
    df["ml_anomaly_score"] = np.round(anomaly_scores, 1)

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(
        {
            "scaler": scaler,
            "model": model,
            "feature_columns": FEATURE_COLUMNS,
            "score_min": score_min,
            "score_max": score_max,
            "version": "v1",
        },
        MODEL_PATH,
    )

    df.drop(columns=["amount_to_avg_ratio", "is_new_device_num", "is_new_location_num"]).to_csv(
        SCORED_PATH, index=False
    )

    # ---- Evaluation against ground-truth synthetic labels (for the README / demo) ----
    df["is_risky_label"] = df["risk_label"].isin(["suspicious", "fraud"]).astype(int)
    threshold = np.percentile(anomaly_scores, 90)  # top 10% flagged as anomalous
    df["flagged"] = (anomaly_scores >= threshold).astype(int)

    tp = int(((df["flagged"] == 1) & (df["is_risky_label"] == 1)).sum())
    fp = int(((df["flagged"] == 1) & (df["is_risky_label"] == 0)).sum())
    fn = int(((df["flagged"] == 0) & (df["is_risky_label"] == 1)).sum())
    tn = int(((df["flagged"] == 0) & (df["is_risky_label"] == 0)).sum())

    precision = tp / (tp + fp) if (tp + fp) else 0
    recall = tp / (tp + fn) if (tp + fn) else 0

    summary = {
        "rows": len(df),
        "flagged_top_10_pct_threshold_score": round(float(threshold), 2),
        "true_positives": tp,
        "false_positives": fp,
        "false_negatives": fn,
        "true_negatives": tn,
        "precision_at_top_10_pct": round(precision, 3),
        "recall_at_top_10_pct": round(recall, 3),
    }
    print("Isolation Forest trained.")
    print(json.dumps(summary, indent=2))
    print(f"Model saved to: {MODEL_PATH}")
    print(f"Scored dataset saved to: {SCORED_PATH}")


if __name__ == "__main__":
    train()
