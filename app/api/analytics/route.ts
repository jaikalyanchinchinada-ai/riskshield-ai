import { NextRequest, NextResponse } from "next/server";
import {
  getRiskTrend,
  getRiskByLocation,
  getRiskByPaymentMethod,
  getRiskByDeviceFamiliarity,
  getReviewOutcomes,
  getRiskDistribution,
  getTopRiskFactors,
} from "@/lib/database/analytics";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get("days") ?? 30);

    const [riskTrend, riskByLocation, riskByPaymentMethod, riskByDevice, reviewOutcomes, riskDistribution, topRiskFactors] =
      await Promise.all([
        getRiskTrend(days),
        getRiskByLocation(10),
        getRiskByPaymentMethod(),
        getRiskByDeviceFamiliarity(),
        getReviewOutcomes(),
        getRiskDistribution(),
        getTopRiskFactors(7),
      ]);

    return NextResponse.json({
      riskTrend,
      riskByLocation,
      riskByPaymentMethod,
      riskByDevice,
      reviewOutcomes,
      riskDistribution,
      topRiskFactors,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
