import crypto from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { calculateCostBreakdown } from "@/lib/cost-calculator";
import { saveEstimate } from "@/lib/database";
import { analyzeRepository } from "@/lib/github";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/lemonsqueezy";

const analyzeSchema = z.object({
  repoUrl: z.string().url(),
  requestsPerUserPerMonth: z.number().int().min(10).max(1000).optional(),
  averageResponseKb: z.number().min(5).max(800).optional(),
  averageCpuMsPerRequest: z.number().min(5).max(2000).optional()
});

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
    const access = verifyAccessToken(accessToken);

    if (!access.valid) {
      return NextResponse.json(
        {
          error:
            "This feature is behind the paywall. Purchase access and claim it with your checkout email first."
        },
        { status: 402 }
      );
    }

    const body = await req.json();
    const parsed = analyzeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const analysis = await analyzeRepository(parsed.data.repoUrl, {
      requestsPerUserPerMonth: parsed.data.requestsPerUserPerMonth,
      averageResponseKb: parsed.data.averageResponseKb,
      averageCpuMsPerRequest: parsed.data.averageCpuMsPerRequest
    });

    const scales = calculateCostBreakdown(analysis);
    const id = crypto.randomUUID();

    await saveEstimate({
      id,
      createdAt: new Date().toISOString(),
      analysis,
      scales
    });

    return NextResponse.json({
      id,
      createdAt: new Date().toISOString(),
      analysis,
      scales
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected analysis error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
