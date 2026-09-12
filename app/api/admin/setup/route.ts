import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/database/client";

function stripSqlComments(sql: string): string {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
}

function splitStatements(sql: string): string[] {
  return stripSqlComments(sql)
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function GET(req: NextRequest) {
  const providedSecret = req.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.ADMIN_SETUP_SECRET;

  if (!expectedSecret || expectedSecret.length < 8) {
    return NextResponse.json(
      { error: "ADMIN_SETUP_SECRET is not configured on the server. Set it in your environment variables first." },
      { status: 503 }
    );
  }
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawDbUrl = process.env.DATABASE_URL;
  const diagnostics = {
    databaseUrlPresent: !!rawDbUrl,
    databaseUrlLength: rawDbUrl ? rawDbUrl.length : 0,
    databaseUrlStartsWith: rawDbUrl ? rawDbUrl.slice(0, 12) : null,
  };

  if (!rawDbUrl) {
    return NextResponse.json(
      { error: "DATABASE_URL is not visible to this running function at all.", diagnostics },
      { status: 500 }
    );
  }

  try {
    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    if (!fs.existsSync(migrationsDir)) {
      return NextResponse.json({ error: "No migrations directory found in this deployment." }, { status: 500 });
    }

    const folders = fs
      .readdirSync(migrationsDir)
      .filter((f) => fs.statSync(path.join(migrationsDir, f)).isDirectory())
      .sort();

    const applied: { folder: string; statements: number; skipped: number }[] = [];

    for (const folder of folders) {
      const sqlPath = path.join(migrationsDir, folder, "migration.sql");
      if (!fs.existsSync(sqlPath)) continue;

      const sql = fs.readFileSync(sqlPath, "utf-8");
      const statements = splitStatements(sql);
      let skipped = 0;

      for (const statement of statements) {
        try {
          await prisma.$executeRawUnsafe(statement);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (message.includes("already exists")) {
            skipped++;
            continue;
          }
          throw err;
        }
      }
      applied.push({ folder, statements: statements.length, skipped });
    }

    return NextResponse.json({
      success: true,
      message: "Database schema is set up. You can now sign up / log in.",
      migrations: applied,
      diagnostics,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Setup failed", details: err instanceof Error ? err.message : String(err), diagnostics },
      { status: 500 }
    );
  }
}