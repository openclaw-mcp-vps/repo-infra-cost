import { NextResponse } from "next/server";
import { z } from "zod";

import { hasPaidAccess } from "@/lib/database";
import { ACCESS_COOKIE_NAME, createAccessToken } from "@/lib/lemonsqueezy";

const claimSchema = z.object({
  email: z.string().email()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = claimSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Provide the email used for Stripe checkout." },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const purchased = await hasPaidAccess(email);

    if (!purchased) {
      return NextResponse.json(
        {
          error:
            "No completed payment found for that email yet. If you just paid, wait 10-20 seconds for the webhook to sync."
        },
        { status: 404 }
      );
    }

    const token = createAccessToken(email);
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: ACCESS_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
}
