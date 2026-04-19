import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeGitHubRepository } from "@/lib/github-analyzer";
import { ACCESS_COOKIE } from "@/lib/lemonsqueezy";

const requestSchema = z.object({
  repoUrl: z.string().url().max(500)
});

export async function POST(request: NextRequest) {
  const hasAccess = request.cookies.get(ACCESS_COOKIE)?.value === "granted";

  if (!hasAccess) {
    return NextResponse.json(
      {
        error: "Payment required to run repository analysis."
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

    const analysis = await analyzeGitHubRepository(parsed.data.repoUrl);

    return NextResponse.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while analyzing repo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
