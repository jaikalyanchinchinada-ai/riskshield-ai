// ============================================================================
// RiskShield AI — AI Analyst Types
// ----------------------------------------------------------------------------
// The AI layer is explicitly separated into "context we hand the AI" and
// "what the AI hands back", so we can always tell the UI: this part is
// observed evidence, this part is the AI's inference/recommendation.
// ============================================================================

import type { RiskFactorResult, RiskLevel, RecommendedAction } from "@/lib/risk-engine/types";

/** Everything the AI is allowed to know about a transaction. Nothing more. */
export interface TransactionAIContext {
  transactionRef: string;
  amount: number;
  currency: string;
  merchantName: string;
  paymentMethod: string;
  timestamp: string;
  customerRef: string;
  accountAgeDays: number;
  historicalAvgAmount: number;
  location: string;
  previousLocation?: string | null;
  isNewDevice: boolean;
  isNewLocation: boolean;
  failedAttempts: number;
  transactionsLast10Min: number;
  transactionsLast24h: number;

  ruleScore: number;
  mlAnomalyScore: number;
  finalScore: number;
  riskLevel: RiskLevel;
  riskFactors: RiskFactorResult[];
  recommendedAction: RecommendedAction;
  actionReason: string;
}

export interface AIInvestigationSummary {
  riskSummary: string;
  whyItIsSuspicious: string[]; // grounded in riskFactors
  evidence: string[]; // direct references to transaction_features / historical_features
  recommendedAction: RecommendedAction;
  actionRationale: string;
  confidence: "low" | "medium" | "high";
  source: "llm" | "fallback_template";
  disclaimer: string;
}

export interface AnalystAnswer {
  answer: string;
  source: "llm" | "fallback_template";
}

/** The clean abstraction every provider must implement. */
export interface AIProvider {
  name: string;
  isConfigured: boolean;
  generateJSON(systemPrompt: string, userPrompt: string): Promise<string>;
}
