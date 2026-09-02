// ============================================================================
// RiskShield AI — Input Validation Schemas
// ----------------------------------------------------------------------------
// Every API route validates its input with one of these schemas before it
// touches the database. Client input is never trusted directly.
// ============================================================================

import { z } from "zod";

export const simulatorInputSchema = z.object({
  amount: z.number().positive().max(100_000_000),
  customerRef: z.string().min(1).max(64).default("SIM-CUSTOMER"),
  paymentMethod: z.enum(["card", "upi", "netbanking", "wallet"]).default("upi"),
  location: z.string().min(1).max(120),
  previousLocation: z.string().max(120).optional().nullable(),
  device: z.string().min(1).max(120),
  previousDevice: z.string().max(120).optional().nullable(),
  isNewDevice: z.boolean().default(false),
  isNewLocation: z.boolean().default(false),
  deviceAgeDays: z.number().int().min(0).max(20_000).default(0),
  failedAttempts: z.number().int().min(0).max(100).default(0),
  transactionsLast10Min: z.number().int().min(0).max(1000).default(1),
  transactionsLast24h: z.number().int().min(0).max(5000).default(1),
  accountAgeDays: z.number().int().min(0).max(40_000).default(365),
  historicalAvgAmount: z.number().min(0).max(100_000_000).default(0),
});
export type SimulatorInput = z.infer<typeof simulatorInputSchema>;

export const transactionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(120).optional(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  paymentMethod: z.enum(["card", "upi", "netbanking", "wallet"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const caseListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["open", "investigating", "escalated", "resolved", "false_positive"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  search: z.string().max(120).optional(),
});

export const caseUpdateSchema = z.object({
  status: z.enum(["open", "investigating", "escalated", "resolved", "false_positive"]).optional(),
  assignedAnalystName: z.string().max(120).optional(),
  reason: z.string().max(2000).optional(),
});

export const caseActionSchema = z.object({
  action: z.enum(["approve", "block", "escalate", "verify", "false_positive", "reopen"]),
  reason: z.string().max(2000).optional(),
  analystName: z.string().max(120).default("Demo Analyst"),
});

export const caseNoteSchema = z.object({
  content: z.string().min(1).max(4000),
  authorName: z.string().max(120).default("Demo Analyst"),
});

export const aiAnalyzeSchema = z.object({
  transactionRef: z.string().min(1).max(64),
});

export const analystQuestionSchema = z.object({
  question: z.string().min(1).max(2000),
});

export const transactionAnalyzeSchema = z.object({
  transactionRef: z.string().min(1).max(64),
});

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().email("Enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address").max(255),
  password: z.string().min(1, "Password is required").max(200),
});
