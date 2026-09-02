// ============================================================================
// RiskShield AI — ML Anomaly Score Bridge
// ----------------------------------------------------------------------------
// The trained model lives in Python (scikit-learn Isolation Forest), but the
// application is a Next.js/TypeScript app. Rather than running a separate
// always-on Python microservice for a hackathon demo, we call a short-lived
// Python process per request. This keeps the architecture modular — the ML
// model can later be swapped for a real hosted model or a FastAPI service
// without any change to the risk engine or the API routes that call this file.
//
// IMPORTANT — graceful fallback: if Python or the trained model is not
// available on the machine running this app, we NEVER crash the request.
// We fall back to a simple, clearly-labelled statistical approximation so
// the demo (and the rest of the risk pipeline) keeps working end to end.
// ============================================================================

import { spawn } from "node:child_process";
import path from "node:path";
import type { RawTransactionInput } from "@/lib/risk-engine/types";

export interface AnomalyScoreResult {
  score: number; // 0-100
  source: "isolation_forest" | "fallback_heuristic";
}

const PYTHON_BIN = process.env.ML_PYTHON_BIN || "python3";
const PREDICT_SCRIPT = path.join(process.cwd(), "ml", "inference", "predict.py");
const TIMEOUT_MS = 6000;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/** A simple, transparent statistical fallback used only if the Python model
 *  can't be reached. It intentionally does NOT reuse the rule engine's exact
 *  formula — it's a rough, independent "second opinion" so the blended score
 *  still means something even without the real model. */
function fallbackHeuristicScore(input: RawTransactionInput): number {
  const ratio =
    input.historicalAvgAmount > 0 ? input.amount / input.historicalAvgAmount : 1;

  let score = 0;
  score += clamp((ratio - 1) * 8, 0, 35);
  score += input.isNewDevice ? 15 : 0;
  score += input.isNewLocation ? 15 : 0;
  score += clamp(input.failedAttempts * 4, 0, 20);
  score += clamp((input.transactionsLast10Min - 1) * 5, 0, 15);
  score += input.accountAgeDays <= 2 ? 10 : 0;

  return clamp(Math.round(score), 0, 100);
}

function runPythonInference(input: RawTransactionInput): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON_BIN, [PREDICT_SCRIPT], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("ML inference timed out"));
    }, TIMEOUT_MS);

    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`predict.py exited with code ${code}: ${stderr}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        if (typeof parsed.ml_anomaly_score !== "number") {
          reject(new Error("predict.py did not return ml_anomaly_score"));
          return;
        }
        resolve(parsed.ml_anomaly_score);
      } catch (e) {
        reject(e);
      }
    });

    child.stdin.write(
      JSON.stringify({
        amount: input.amount,
        historicalAvgAmount: input.historicalAvgAmount,
        accountAgeDays: input.accountAgeDays,
        failedAttempts: input.failedAttempts,
        transactionsLast10Min: input.transactionsLast10Min,
        transactionsLast24h: input.transactionsLast24h,
        deviceAgeDays: input.deviceAgeDays,
        isNewDevice: input.isNewDevice,
        isNewLocation: input.isNewLocation,
      })
    );
    child.stdin.end();
  });
}

export async function getMlAnomalyScore(
  input: RawTransactionInput
): Promise<AnomalyScoreResult> {
  try {
    const score = await runPythonInference(input);
    return { score: clamp(score, 0, 100), source: "isolation_forest" };
  } catch (err) {
    // Never let a missing Python install / missing model file break the request.
    console.warn(
      "[ml/anomaly] Falling back to statistical heuristic:",
      err instanceof Error ? err.message : err
    );
    return { score: fallbackHeuristicScore(input), source: "fallback_heuristic" };
  }
}
