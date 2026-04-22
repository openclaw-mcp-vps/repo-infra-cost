import { NextResponse } from "next/server";

import { addPurchaseRecord } from "@/lib/database";
import { verifyStripeWebhookSignature } from "@/lib/lemonsqueezy";

interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: {
      id?: string;
      customer_email?: string;
      customer_details?: {
        email?: string;
      };
      metadata?: Record<string, string | undefined>;
    };
  };
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET. Webhook cannot be verified." },
      { status: 500 }
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const valid = verifyStripeWebhookSignature(rawBody, signature, webhookSecret);
  if (!valid) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  let event: StripeWebhookEvent;
  try {
    event = JSON.parse(rawBody) as StripeWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const object = event.data.object;
    const email =
      object.customer_details?.email || object.customer_email || object.metadata?.email || null;

    if (!email) {
      return NextResponse.json({ error: "Checkout session is missing customer email." }, { status: 400 });
    }

    await addPurchaseRecord({
      email,
      sessionId: object.id || event.id,
      purchasedAt: new Date().toISOString(),
      source: "stripe_webhook"
    });
  }

  return NextResponse.json({ received: true });
}
