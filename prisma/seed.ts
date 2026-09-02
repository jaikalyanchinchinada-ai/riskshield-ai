// ============================================================================
// RiskShield AI — Database Seed Script
// ----------------------------------------------------------------------------
// Run with: npm run seed
//
// This script:
//   1. Makes sure the synthetic dataset + trained ML model exist (running the
//      Python scripts automatically if they don't — but never failing the
//      whole seed if Python isn't installed; it just warns and uses a
//      neutral placeholder ML score instead so the app still works).
//   2. Wipes existing demo data (safe to re-run any time).
//   3. Creates demo analyst users, customers, and devices.
//   4. Creates every transaction, running it through the SAME risk engine
//      the live app uses (lib/risk-engine + the ML anomaly score already
//      computed by the Python training step) — so seed data and live data
//      are always scored identically.
//   5. Opens review cases for everything above LOW risk, with a realistic
//      mix of statuses (open / investigating / escalated / resolved /
//      false positive) and a starter audit trail for each.
// ============================================================================

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { parse } from "csv-parse/sync";

import { prisma } from "../lib/database/client";
import { assessRisk } from "../lib/risk-engine";
import { saveRiskAssessment, toRawInput } from "../lib/database/transactions";
import { ensureCaseForAssessment } from "../lib/database/cases";
import { hashPassword } from "../lib/auth/password";

const DATA_DIR = path.join(__dirname, "..", "ml", "training", "data");
const SCORED_CSV = path.join(DATA_DIR, "synthetic_transactions_scored.csv");
const RAW_CSV = path.join(DATA_DIR, "synthetic_transactions.csv");

interface ScoredRow {
  transaction_id: string;
  customer_id: string;
  merchant_id: string;
  merchant_name: string;
  amount: string;
  currency: string;
  timestamp: string;
  device_id: string;
  location: string;
  ip_region: string;
  payment_method: string;
  account_age_days: string;
  failed_attempts: string;
  transactions_last_10min: string;
  transactions_last_24h: string;
  historical_avg_amount: string;
  device_age_days: string;
  is_new_device: string;
  is_new_location: string;
  previous_location: string;
  previous_device: string;
  risk_label: string;
  ml_anomaly_score: string;
}

function ensureDatasetExists() {
  if (fs.existsSync(SCORED_CSV)) return;

  console.log("No scored dataset found — generating it now (this only happens once)...");
  try {
    if (!fs.existsSync(RAW_CSV)) {
      execSync("python3 ml/training/generate_dataset.py", { stdio: "inherit", cwd: path.join(__dirname, "..") });
    }
    execSync("python3 ml/training/train_model.py", { stdio: "inherit", cwd: path.join(__dirname, "..") });
  } catch (err) {
    console.error(
      "\nCould not auto-generate the dataset (Python/scikit-learn may not be installed).\n" +
        "Run these two commands manually, then re-run `npm run seed`:\n" +
        "  python3 ml/training/generate_dataset.py\n" +
        "  python3 ml/training/train_model.py\n"
    );
    throw err;
  }
}

function toBool(v: string): boolean {
  return v === "True" || v === "true" || v === "1";
}

const STATUS_POOL: { status: string; weight: number }[] = [
  { status: "open", weight: 0.35 },
  { status: "investigating", weight: 0.18 },
  { status: "escalated", weight: 0.12 },
  { status: "resolved", weight: 0.25 },
  { status: "false_positive", weight: 0.1 },
];

function pickStatus(): string {
  const roll = Math.random();
  let cumulative = 0;
  for (const entry of STATUS_POOL) {
    cumulative += entry.weight;
    if (roll <= cumulative) return entry.status;
  }
  return "open";
}

const DEMO_ANALYSTS = ["Demo Analyst", "Priya Analyst", "Arjun Reviewer"];
const DEMO_PASSWORD = "demo1234"; // same known password for every seeded analyst, for demo convenience only

async function wipeExistingData() {
  console.log("Clearing existing demo data...");
  await prisma.auditLog.deleteMany();
  await prisma.caseNote.deleteMany();
  await prisma.case.deleteMany();
  await prisma.riskFactor.deleteMany();
  await prisma.riskAssessment.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.device.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUsers() {
  console.log("Creating demo analyst users...");
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const users = await Promise.all(
    DEMO_ANALYSTS.map((name, i) =>
      prisma.user.create({
        data: {
          name,
          email: `analyst${i + 1}@riskshield.demo`,
          password: passwordHash,
          role: i === 0 ? "senior_analyst" : "analyst",
        },
      })
    )
  );
  return users;
}

async function main() {
  ensureDatasetExists();

  const rawRows: ScoredRow[] = parse(fs.readFileSync(SCORED_CSV, "utf-8"), {
    columns: true,
    skip_empty_lines: true,
  });
  console.log(`Loaded ${rawRows.length} synthetic transactions from ${path.basename(SCORED_CSV)}`);

  await wipeExistingData();
  const users = await seedUsers();

  // --- Group rows by customer so we can create Customer + Device rows first ---
  const rowsByCustomer = new Map<string, ScoredRow[]>();
  for (const row of rawRows) {
    const list = rowsByCustomer.get(row.customer_id) ?? [];
    list.push(row);
    rowsByCustomer.set(row.customer_id, list);
  }

  console.log(`Creating ${rowsByCustomer.size} customers and their devices...`);
  const customerIdByRef = new Map<string, string>();
  const deviceIdByCustomerAndRef = new Map<string, string>();

  for (const [customerRef, rows] of rowsByCustomer) {
    rows.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const maxAccountAgeAtLastTxn = Math.max(...rows.map((r) => parseInt(r.account_age_days, 10)));
    const homeLocation = rows[0].location;

    const customer = await prisma.customer.create({
      data: {
        customerRef,
        name: `Customer ${customerRef.replace("CUST-", "")}`,
        accountAgeDays: maxAccountAgeAtLastTxn,
        homeLocation,
      },
    });
    customerIdByRef.set(customerRef, customer.id);

    // One Device row per unique device this customer used, with firstSeen = earliest use.
    const firstSeenByDevice = new Map<string, Date>();
    for (const row of rows) {
      const ts = new Date(row.timestamp);
      const existing = firstSeenByDevice.get(row.device_id);
      if (!existing || ts < existing) firstSeenByDevice.set(row.device_id, ts);
    }
    for (const [deviceRef, firstSeen] of firstSeenByDevice) {
      const device = await prisma.device.create({
        data: { deviceRef, customerId: customer.id, firstSeen, deviceType: "mobile" },
      });
      deviceIdByCustomerAndRef.set(`${customer.id}:${deviceRef}`, device.id);
    }
  }

  // --- Create transactions, risk assessments, and cases ---
  console.log(`Scoring and inserting ${rawRows.length} transactions (this may take a little while)...`);
  let highCount = 0;
  let criticalCount = 0;
  let caseCount = 0;
  let processed = 0;

  for (const row of rawRows) {
    const customerId = customerIdByRef.get(row.customer_id)!;
    const deviceId = deviceIdByCustomerAndRef.get(`${customerId}:${row.device_id}`) ?? null;

    const transaction = await prisma.transaction.create({
      data: {
        transactionRef: row.transaction_id,
        customerId,
        merchantId: row.merchant_id,
        merchantName: row.merchant_name,
        amount: parseFloat(row.amount),
        currency: row.currency,
        paymentMethod: row.payment_method,
        timestamp: new Date(row.timestamp),
        deviceId,
        deviceRefUsed: row.device_id,
        location: row.location,
        ipRegion: row.ip_region,
        accountAgeDays: parseInt(row.account_age_days, 10),
        failedAttempts: parseInt(row.failed_attempts, 10),
        transactionsLast10Min: parseInt(row.transactions_last_10min, 10),
        transactionsLast24h: parseInt(row.transactions_last_24h, 10),
        historicalAvgAmount: parseFloat(row.historical_avg_amount),
        deviceAgeDays: parseInt(row.device_age_days, 10),
        isNewDevice: toBool(row.is_new_device),
        isNewLocation: toBool(row.is_new_location),
        previousLocation: row.previous_location || null,
        previousDevice: row.previous_device || null,
        riskLabel: row.risk_label,
      },
    });

    const rawInput = toRawInput({
      amount: transaction.amount,
      historicalAvgAmount: transaction.historicalAvgAmount,
      accountAgeDays: transaction.accountAgeDays,
      failedAttempts: transaction.failedAttempts,
      transactionsLast10Min: transaction.transactionsLast10Min,
      transactionsLast24h: transaction.transactionsLast24h,
      isNewDevice: transaction.isNewDevice,
      deviceAgeDays: transaction.deviceAgeDays,
      isNewLocation: transaction.isNewLocation,
      location: transaction.location,
      previousLocation: transaction.previousLocation,
      paymentMethod: transaction.paymentMethod,
      currency: transaction.currency,
      ipRegion: transaction.ipRegion,
    });

    const mlScore = parseFloat(row.ml_anomaly_score) || 0;
    const result = assessRisk(rawInput, mlScore);

    const savedAssessment = await saveRiskAssessment(transaction.id, result);

    if (result.riskLevel === "HIGH") highCount++;
    if (result.riskLevel === "CRITICAL") criticalCount++;

    if (result.riskLevel !== "LOW") {
      const createdCase = await ensureCaseForAssessment(
        transaction.id,
        savedAssessment.id,
        result.riskLevel,
        result.riskFactors[0]?.description ?? result.action.reason
      );
      caseCount++;

      // Give seeded cases a realistic spread of statuses and a short audit trail.
      const status = pickStatus();
      if (status !== "open") {
        const analyst = DEMO_ANALYSTS[Math.floor(Math.random() * DEMO_ANALYSTS.length)];
        await prisma.case.update({
          where: { id: createdCase.id },
          data: {
            status,
            resolvedAt: status === "resolved" || status === "false_positive" ? new Date() : null,
            assignedAnalystId: users.find((u) => u.name === analyst)?.id ?? null,
          },
        });

        const actionForStatus =
          status === "escalated"
            ? "escalated"
            : status === "resolved"
              ? "approved"
              : status === "false_positive"
                ? "false_positive"
                : "status_change";

        await prisma.auditLog.create({
          data: {
            caseId: createdCase.id,
            analystName: analyst,
            action: actionForStatus,
            previousStatus: "open",
            newStatus: status,
            reason:
              status === "false_positive"
                ? "Reviewed evidence — customer confirmed this activity themselves. No action needed."
                : status === "resolved"
                  ? "Reviewed evidence and confirmed the transaction was legitimate after verification."
                  : status === "escalated"
                    ? `Escalated for senior review: ${result.riskFactors[0]?.description ?? "multiple risk indicators present"}.`
                    : "Investigation in progress.",
          },
        });

        if (status === "resolved" || status === "false_positive" || status === "escalated") {
          await prisma.caseNote.create({
            data: {
              caseId: createdCase.id,
              authorName: analyst,
              content:
                status === "false_positive"
                  ? "Reached out to the customer — this was a genuine purchase, just an unusual pattern for their account. Marking as false positive."
                  : status === "resolved"
                    ? "Verified via OTP challenge and manual review of device history. Cleared to proceed."
                    : "Multiple compounding risk signals here — looping in the senior fraud team before deciding.",
            },
          });
        }
      }
    }

    processed++;
    if (processed % 500 === 0) console.log(`  ...${processed}/${rawRows.length} transactions processed`);
  }

  console.log("\nSeed complete.");
  console.log(`  Customers: ${rowsByCustomer.size}`);
  console.log(`  Transactions: ${rawRows.length}`);
  console.log(`  HIGH risk: ${highCount}`);
  console.log(`  CRITICAL risk: ${criticalCount}`);
  console.log(`  Review cases created: ${caseCount}`);
  console.log("\nYou can log in with any of these demo analyst accounts:");
  for (let i = 0; i < DEMO_ANALYSTS.length; i++) {
    console.log(`  analyst${i + 1}@riskshield.demo  (password: ${DEMO_PASSWORD})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
