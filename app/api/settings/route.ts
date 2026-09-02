import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/client";
import { getAIProviderStatus } from "@/lib/ai/provider";
import { BLEND_WEIGHTS, CATEGORY_MAX_POINTS, RISK_LEVEL_THRESHOLDS } from "@/lib/risk-engine/config";

export async function GET() {
  const ai = getAIProviderStatus();

  let dbConnected = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbConnected = false;
  }

  return NextResponse.json({
    aiProvider: ai,
    riskEngine: {
      status: "operational",
      categoryWeights: CATEGORY_MAX_POINTS,
      blendWeights: BLEND_WEIGHTS,
      thresholds: RISK_LEVEL_THRESHOLDS,
    },
    mlModel: {
      status: "operational",
      description: "Isolation Forest anomaly detector (scikit-learn), blended 40% into the final score",
    },
    database: {
      status: dbConnected ? "connected" : "unreachable",
    },
    demoMode: true,
  });
}
