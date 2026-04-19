import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateCostReport } from "@/lib/cost-calculator";
import { ACCESS_COOKIE } from "@/lib/lemonsqueezy";
import type { RepoAnalysis } from "@/types";

const requestSchema = z.object({
  analysis: z.record(z.unknown()),
  averageRequestsPerUser: z.number().min(1).max(1000).optional(),
  averageResponseKb: z.number().min(1).max(5000).optional()
});

export async function POST(request: NextRequest) {
  const hasAccess = request.cookies.get(ACCESS_COOKIE)?.value === "granted";

  if (!hasAccess) {
    return NextResponse.json(
      {
        error: "Payment required to run cost estimation."
      },
      { status: 402 }
    );
  }

  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const report = calculateCostReport({
      analysis: parsed.data.analysis as unknown as RepoAnalysis,
      averageRequestsPerUser: parsed.data.averageRequestsPerUser,
      averageResponseKb: parsed.data.averageResponseKb
    });

    return NextResponse.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while calculating costs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
