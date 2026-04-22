"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock, Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK as string;

interface RepoAnalyzerProps {
  hasAccess: boolean;
}

export function RepoAnalyzer({ hasAccess }: RepoAnalyzerProps) {
  const router = useRouter();

  const [repoUrl, setRepoUrl] = useState("");
  const [requestsPerUserPerMonth, setRequestsPerUserPerMonth] = useState("120");
  const [averageResponseKb, setAverageResponseKb] = useState("140");
  const [averageCpuMsPerRequest, setAverageCpuMsPerRequest] = useState("45");
  const [checkoutEmail, setCheckoutEmail] = useState("");

  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [accessUnlocked, setAccessUnlocked] = useState(hasAccess);
  const [error, setError] = useState<string | null>(null);

  const locked = useMemo(() => !accessUnlocked, [accessUnlocked]);

  async function claimAccess(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsUnlocking(true);

    try {
      const response = await fetch("/api/access/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: checkoutEmail })
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Could not unlock access with that email.");
      }

      setAccessUnlocked(true);
      setCheckoutEmail("");
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "Unlock failed.");
    } finally {
      setIsUnlocking(false);
    }
  }

  async function runAnalysis(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (locked) {
      setError("Purchase access first to run repository analysis.");
      return;
    }

    setError(null);
    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          repoUrl,
          requestsPerUserPerMonth: Number(requestsPerUserPerMonth),
          averageResponseKb: Number(averageResponseKb),
          averageCpuMsPerRequest: Number(averageCpuMsPerRequest)
        })
      });

      const data = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !data.id) {
        throw new Error(data.error || "Analysis failed.");
      }

      router.push(`/estimate/${data.id}`);
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <Card className="relative border-cyan-500/20 bg-slate-950/80">
      <CardHeader>
        <CardTitle className="text-2xl">Analyze Repository Infrastructure Cost</CardTitle>
        <CardDescription>
          Paste a GitHub URL, tune your traffic assumptions, and get cost ranges for AWS, Fly.io,
          Railway, and Vercel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {locked ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="flex items-center gap-2 text-sm text-amber-200">
              <Lock className="h-4 w-4" />
              This tool is behind the paywall. Buy access, then claim it with your checkout email.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="flex items-center gap-2 text-sm text-emerald-200">
              <Rocket className="h-4 w-4" />
              Access active. Run as many analyses as needed while your access cookie is valid.
            </p>
          </div>
        )}

        {locked && (
          <div className="grid gap-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4 md:grid-cols-[1fr_auto] md:items-end">
            <form className="space-y-3" onSubmit={claimAccess}>
              <label className="text-sm text-slate-300" htmlFor="checkout-email">
                Checkout Email
              </label>
              <Input
                id="checkout-email"
                type="email"
                value={checkoutEmail}
                onChange={(e) => setCheckoutEmail(e.target.value)}
                placeholder="you@domain.com"
                required
              />
              <Button type="submit" variant="secondary" disabled={isUnlocking}>
                {isUnlocking ? "Checking payment..." : "Claim Access"}
              </Button>
            </form>
            <a
              href={paymentLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-md bg-cyan-400 px-4 font-semibold text-slate-900 transition hover:bg-cyan-300"
            >
              Buy Access on Stripe
            </a>
          </div>
        )}

        <form className="grid gap-4 md:grid-cols-2" onSubmit={runAnalysis}>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-slate-300" htmlFor="repo-url">
              GitHub Repository URL
            </label>
            <Input
              id="repo-url"
              type="url"
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300" htmlFor="requests-per-user">
              Requests per User / Month
            </label>
            <Input
              id="requests-per-user"
              type="number"
              min={10}
              max={1000}
              value={requestsPerUserPerMonth}
              onChange={(event) => setRequestsPerUserPerMonth(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300" htmlFor="response-size">
              Average Response Size (KB)
            </label>
            <Input
              id="response-size"
              type="number"
              min={5}
              max={800}
              value={averageResponseKb}
              onChange={(event) => setAverageResponseKb(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-slate-300" htmlFor="cpu-ms">
              Average CPU Time per Request (ms)
            </label>
            <Input
              id="cpu-ms"
              type="number"
              min={5}
              max={2000}
              value={averageCpuMsPerRequest}
              onChange={(event) => setAverageCpuMsPerRequest(event.target.value)}
              required
            />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" size="lg" disabled={isAnalyzing || locked || !repoUrl}>
              {isAnalyzing ? "Analyzing Repository..." : "Generate Cost Estimate"}
            </Button>
          </div>
        </form>

        {error && (
          <p className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
