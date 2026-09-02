"""
RiskShield AI — Live ML Inference
------------------------------------
Scores a single, not-yet-seen transaction using the trained Isolation
Forest model. Designed to be called as a short-lived subprocess from the
Node.js/Next.js backend (see lib/ml/anomaly.ts), so the main application
never needs a long-running Python server for the demo.

Usage:
  echo '{"amount": 5000, "historicalAvgAmount": 1200, ...}' | python3 predict.py

Input (JSON via stdin) fields — same shape as RawTransactionInput in
lib/risk-engine/types.ts:
  amount, historicalAvgAmount, accountAgeDays, failedAttempts,
  transactionsLast10Min, transactionsLast24h, deviceAgeDays,
  isNewDevice, isNewLocation

Output (JSON via stdout):
  {"ml_anomaly_score": <float 0-100>, "model_version": "v1", "source": "isolation_forest"}

If the model file is missing or anything goes wrong, this script exits
with a non-zero status and an error message on stderr. The Node.js caller
is responsible for falling back to a statistical approximation in that case
(see lib/ml/anomaly.ts) so the application never crashes because of this.
"""

import json
import os
import sys

import joblib
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "model", "isolation_forest.joblib")

_model_cache = None


def load_model():
    global _model_cache
    if _model_cache is None:
        _model_cache = joblib.load(MODEL_PATH)
    return _model_cache


def build_feature_vector(payload: dict, feature_columns: list) -> np.ndarray:
    amount = float(payload.get("amount", 0))
    historical_avg = float(payload.get("historicalAvgAmount", 0) or 0)
    ratio = amount / historical_avg if historical_avg > 0 else amount / max(amount, 1)

    values_by_name = {
        "amount_to_avg_ratio": ratio,
        "account_age_days": float(payload.get("accountAgeDays", 0)),
        "failed_attempts": float(payload.get("failedAttempts", 0)),
        "transactions_last_10min": float(payload.get("transactionsLast10Min", 0)),
        "transactions_last_24h": float(payload.get("transactionsLast24h", 0)),
        "device_age_days": float(payload.get("deviceAgeDays", 0)),
        "is_new_device_num": 1.0 if payload.get("isNewDevice") else 0.0,
        "is_new_location_num": 1.0 if payload.get("isNewLocation") else 0.0,
    }
    return np.array([[values_by_name[col] for col in feature_columns]])


def score(payload: dict) -> float:
    artifact = load_model()
    scaler = artifact["scaler"]
    model = artifact["model"]
    feature_columns = artifact["feature_columns"]
    score_min = artifact["score_min"]
    score_max = artifact["score_max"]

    X = build_feature_vector(payload, feature_columns)
    X_scaled = scaler.transform(X)
    raw = float(-model.decision_function(X_scaled)[0])

    if score_max - score_min < 1e-9:
        return 0.0
    scaled = (raw - score_min) / (score_max - score_min) * 100
    return float(np.clip(scaled, 0, 100))


def main():
    raw_input = sys.stdin.read()
    try:
        payload = json.loads(raw_input)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"invalid JSON input: {e}"}), file=sys.stderr)
        sys.exit(1)

    try:
        anomaly_score = score(payload)
    except FileNotFoundError:
        print(json.dumps({"error": "model file not found — run `npm run ml:train` first"}), file=sys.stderr)
        sys.exit(2)
    except Exception as e:  # noqa: BLE001 — this is a CLI boundary, we want to report anything
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(3)

    print(json.dumps({
        "ml_anomaly_score": round(anomaly_score, 1),
        "model_version": "v1",
        "source": "isolation_forest",
    }))


if __name__ == "__main__":
    main()
