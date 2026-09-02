import { NextRequest, NextResponse } from "next/server";
import { assessRisk } from "@/lib/risk-engine";
import { getMlAnomalyScore } from "@/lib/ml/anomaly";
import { simulatorInputSchema } from "@/lib/utils/validation";
import { handleApiError } from "@/lib/utils/api-error";
import type { RawTransactionInput } from "@/lib/risk-engine/types";

/** The Transaction Simulator never writes to the database — it's a
 *  sandbox for judges/analysts to see the risk engine react live to
 *  hypothetical inputs, without polluting real dashboard numbers. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const input = simulatorInputSchema.parse(body);

    const rawInput: RawTransactionInput = {
      amount: input.amount,
      currency: "INR",
      paymentMethod: input.paymentMethod,
      accountAgeDays: input.accountAgeDays,
      historicalAvgAmount: input.historicalAvgAmount,
      transactionsLast10Min: input.transactionsLast10Min,
      transactionsLast24h: input.transactionsLast24h,
      failedAttempts: input.failedAttempts,
      isNewDevice: input.isNewDevice,
      deviceAgeDays: input.deviceAgeDays,
      isNewLocation: input.isNewLocation,
      location: input.location,
      previousLocation: input.previousLocation ?? null,
    };

    const ml = await getMlAnomalyScore(rawInput);
    const result = assessRisk(rawInput, ml.score);

    return NextResponse.json({ input: rawInput, assessment: result, mlSource: ml.source });
  } catch (err) {
    return handleApiError(err);
  }
}
