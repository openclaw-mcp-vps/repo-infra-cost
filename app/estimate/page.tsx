import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { PricingCard } from "@/components/pricing-card";
import { RepoInput } from "@/components/repo-input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ACCESS_COOKIE, getCheckoutBaseUrl } from "@/lib/lemonsqueezy";

export default async function EstimatePage() {
  const cookieStore = await cookies();
  const hasAccess = cookieStore.get(ACCESS_COOKIE)?.value === "granted";
  const checkoutBaseUrl = getCheckoutBaseUrl();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge>Estimator</Badge>
          <h1 className="mt-3 text-3xl font-semibold text-slate-100">Repo Infra Cost</h1>
          <p className="mt-1 text-slate-400">Compare AWS, Fly.io, Railway, and Vercel costs from a repository URL.</p>
        </div>
        <Link href="/" className="text-sm text-slate-300 hover:text-white">
          <span className="inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to homepage
          </span>
        </Link>
      </div>

      {hasAccess ? (
        <RepoInput />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LockKeyhole className="h-5 w-5 text-green-400" />
                Tool Access Locked
              </CardTitle>
              <CardDescription>
                This estimator is behind a paywall to keep analysis quality high and infrastructure costs sustainable.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <p>
                Purchase unlocks access cookie for this browser after payment webhook confirmation. If you already paid, click "Check unlock status" in the pricing card.
              </p>
              <ul className="list-disc space-y-2 pl-5 text-slate-400">
                <li>Analyzes package.json + Dockerfile</li>
                <li>Forecasts 1k, 10k, 100k MAU cost curves</li>
                <li>Includes line-item costs, not just a single total</li>
              </ul>
            </CardContent>
          </Card>

          <PricingCard checkoutBaseUrl={checkoutBaseUrl} compact />
        </div>
      )}
    </main>
  );
}
