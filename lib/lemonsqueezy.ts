import crypto from "node:crypto";

const ACCESS_TOKEN_VERSION = "v1";
export const ACCESS_COOKIE_NAME = "repo_infra_cost_access";
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

interface AccessPayload {
  v: string;
  email: string;
  exp: number;
}

function getSigningSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || "dev-only-secret";
}

function base64UrlEncode(data: string) {
  return Buffer.from(data).toString("base64url");
}

function base64UrlDecode(data: string) {
  return Buffer.from(data, "base64url").toString("utf8");
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSigningSecret()).update(payload).digest("base64url");
}

function secureCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

export function createAccessToken(email: string) {
  const payload: AccessPayload = {
    v: ACCESS_TOKEN_VERSION,
    email: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAccessToken(token?: string | null) {
  if (!token) {
    return { valid: false as const };
  }

  const [payloadPart, signaturePart] = token.split(".");

  if (!payloadPart || !signaturePart) {
    return { valid: false as const };
  }

  const expectedSignature = sign(payloadPart);
  const isSignatureMatch = secureCompare(signaturePart, expectedSignature);

  if (!isSignatureMatch) {
    return { valid: false as const };
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadPart)) as AccessPayload;
    const now = Math.floor(Date.now() / 1000);

    if (payload.v !== ACCESS_TOKEN_VERSION || payload.exp < now) {
      return { valid: false as const };
    }

    return {
      valid: true as const,
      email: payload.email,
      expiresAt: payload.exp
    };
  } catch {
    return { valid: false as const };
  }
}

export function getStripePaymentLink() {
  return process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK as string;
}

export function verifyStripeWebhookSignature(rawBody: string, signatureHeader: string, secret: string) {
  const components = signatureHeader.split(",").map((part) => part.trim().split("="));
  const values = new Map<string, string>();

  for (const [key, value] of components) {
    if (key && value) {
      values.set(key, value);
    }
  }

  const timestamp = values.get("t");
  const signature = values.get("v1");

  if (!timestamp || !signature) {
    return false;
  }

  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");

  return secureCompare(signature, expected);
}
