import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { DatabaseSchema, PurchaseRecord, StoredEstimate } from "@/types";

const DB_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DB_DIR, "repo-infra-cost.json");

const EMPTY_DB: DatabaseSchema = {
  purchases: [],
  estimates: []
};

async function readDatabase(): Promise<DatabaseSchema> {
  try {
    const raw = await readFile(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw) as DatabaseSchema;
    return {
      purchases: parsed.purchases ?? [],
      estimates: parsed.estimates ?? []
    };
  } catch {
    return EMPTY_DB;
  }
}

async function writeDatabase(db: DatabaseSchema): Promise<void> {
  await mkdir(DB_DIR, { recursive: true });
  await writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

export async function addPurchaseRecord(record: PurchaseRecord): Promise<void> {
  const db = await readDatabase();
  const email = record.email.trim().toLowerCase();

  const existingIndex = db.purchases.findIndex(
    (purchase) => purchase.sessionId === record.sessionId || purchase.email === email
  );

  const normalizedRecord: PurchaseRecord = {
    ...record,
    email
  };

  if (existingIndex >= 0) {
    db.purchases[existingIndex] = normalizedRecord;
  } else {
    db.purchases.push(normalizedRecord);
  }

  await writeDatabase(db);
}

export async function hasPaidAccess(email: string): Promise<boolean> {
  const db = await readDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  return db.purchases.some((record) => record.email === normalizedEmail);
}

export async function saveEstimate(estimate: StoredEstimate): Promise<void> {
  const db = await readDatabase();
  db.estimates.unshift(estimate);
  db.estimates = db.estimates.slice(0, 500);
  await writeDatabase(db);
}

export async function getEstimateById(id: string): Promise<StoredEstimate | null> {
  const db = await readDatabase();
  return db.estimates.find((estimate) => estimate.id === id) ?? null;
}
