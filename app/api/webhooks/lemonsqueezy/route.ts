import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, hasPaidCheckoutRef, recordLemonPurchase, verifyLemonSignature } from "@/lib/lemonsqueezy";

function accessCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  };
}

export async function GET(request: NextRequest) {
  const checkoutRef = request.nextUrl.searchParams.get("checkoutRef");

  if (!checkoutRef) {
    return NextResponse.json({ granted: false, reason: "Missing checkoutRef." }, { status: 400 });
  }

  const granted = await hasPaidCheckoutRef(checkoutRef);
  const response = NextResponse.json({ granted });

  if (granted) {
    response.cookies.set(ACCESS_COOKIE, "granted", accessCookieOptions());
    response.cookies.set("ric_checkout_ref", "", {
      ...accessCookieOptions(),
      maxAge: 0,
      httpOnly: false
    });
  }

  return response;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");
  const secretConfigured = Boolean(process.env.LEMON_SQUEEZY_WEBHOOK_SECRET);

  if (secretConfigured && !verifyLemonSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as unknown;
    const record = await recordLemonPurchase(payload as Parameters<typeof recordLemonPurchase>[0]);

    return NextResponse.json({ ok: true, recorded: Boolean(record) });
  } catch {
    return NextResponse.json({ error: "Malformed JSON payload." }, { status: 400 });
  }
}
