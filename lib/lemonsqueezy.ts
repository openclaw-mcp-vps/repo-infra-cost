import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PURCHASES_FILE = path.join(process.cwd(), "data", "purchases.json");
export const ACCESS_COOKIE = "ric_access";

export interface PurchaseRecord {
  orderId: string;
  email: string | null;
  checkoutRef: string | null;
  eventName: string;
  paidAt: string;
}

interface LemonWebhookPayload {
  meta?: {
    event_name?: string;
    custom_data?: {
      checkout_ref?: string;
      email_hint?: string;
    };
  };
  data?: {
    id?: string;
    attributes?: {
      identifier?: string;
      order_number?: number;
      user_email?: string;
      customer_email?: string;
      status?: string;
    };
  };
}

async function ensurePurchasesFile() {
  await mkdir(path.dirname(PURCHASES_FILE), { recursive: true });

  try {
    await readFile(PURCHASES_FILE, "utf8");
  } catch {
    await writeFile(PURCHASES_FILE, "[]", "utf8");
  }
}

async function readPurchases(): Promise<PurchaseRecord[]> {
  await ensurePurchasesFile();
  const content = await readFile(PURCHASES_FILE, "utf8");

  try {
    const parsed = JSON.parse(content) as PurchaseRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writePurchases(records: PurchaseRecord[]) {
  await ensurePurchasesFile();
  await writeFile(PURCHASES_FILE, JSON.stringify(records, null, 2), "utf8");
}

function extractOrderId(payload: LemonWebhookPayload): string {
  const attributes = payload.data?.attributes;

  if (typeof attributes?.identifier === "string" && attributes.identifier.length > 0) {
    return attributes.identifier;
  }

  if (typeof attributes?.order_number === "number") {
    return String(attributes.order_number);
  }

  if (typeof payload.data?.id === "string" && payload.data.id.length > 0) {
    return payload.data.id;
  }

  return "unknown-order";
}

function extractEmail(payload: LemonWebhookPayload): string | null {
  const attributes = payload.data?.attributes;
  return attributes?.user_email ?? attributes?.customer_email ?? payload.meta?.custom_data?.email_hint ?? null;
}

export function verifyLemonSignature(rawBody: string, providedSignature: string | null): boolean {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret || !providedSignature) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  try {
    const expectedBuffer = Buffer.from(expected, "utf8");
    const providedBuffer = Buffer.from(providedSignature, "utf8");
    return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    return false;
  }
}

export function getCheckoutBaseUrl(): string | null {
  const productId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;

  if (!productId) {
    return null;
  }

  if (productId.startsWith("http://") || productId.startsWith("https://")) {
    return productId;
  }

  return `https://checkout.lemonsqueezy.com/buy/${productId}`;
}

export function buildCheckoutUrl(checkoutRef: string, email?: string): string | null {
  const baseUrl = getCheckoutBaseUrl();
  if (!baseUrl) return null;

  const url = new URL(baseUrl);
  url.searchParams.set("checkout[custom][checkout_ref]", checkoutRef);
  url.searchParams.set("checkout[custom][source]", "repo-infra-cost");

  if (email) {
    url.searchParams.set("checkout[email]", email);
    url.searchParams.set("checkout[custom][email_hint]", email);
  }

  return url.toString();
}

export async function recordLemonPurchase(payload: LemonWebhookPayload): Promise<PurchaseRecord | null> {
  const eventName = payload.meta?.event_name ?? "unknown";

  if (!eventName.includes("order") && !eventName.includes("subscription")) {
    return null;
  }

  const status = payload.data?.attributes?.status?.toLowerCase();
  if (status && !["paid", "active", "completed"].some((flag) => status.includes(flag))) {
    return null;
  }

  const record: PurchaseRecord = {
    orderId: extractOrderId(payload),
    email: extractEmail(payload),
    checkoutRef: payload.meta?.custom_data?.checkout_ref ?? null,
    eventName,
    paidAt: new Date().toISOString()
  };

  const purchases = await readPurchases();
  const dedupe = purchases.filter((item) => item.orderId !== record.orderId);
  dedupe.unshift(record);
  await writePurchases(dedupe.slice(0, 2000));

  return record;
}

export async function hasPaidCheckoutRef(checkoutRef: string): Promise<boolean> {
  if (!checkoutRef) return false;

  const purchases = await readPurchases();
  return purchases.some((item) => item.checkoutRef === checkoutRef);
}
