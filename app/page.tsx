import Link from "next/link";
import { ArrowRight, CircleDollarSign, GitFork, Server, ShieldCheck, TrendingUp } from "lucide-react";
import { FAQSection } from "@/components/faq-section";
import { PricingCard } from "@/components/pricing-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCheckoutBaseUrl } from "@/lib/lemonsqueezy";

export default function HomePage() {
  const checkoutBaseUrl = getCheckoutBaseUrl();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-8 sm:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.18),transparent_45%)]" />
        <div className="relative z-10 max-w-3xl space-y-6">
          <Badge>Repo Infra Cost</Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-100 sm:text-5xl">
            Paste a GitHub URL. Get self-host vs managed cost estimates before you commit.
          </h1>
          <p className="text-lg text-slate-300">
            Repo Infra Cost analyzes your package.json, Dockerfile, and traffic assumptions to model monthly spend across AWS, Fly.io, Railway, and Vercel at 1k, 10k, and 100k MAU.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/estimate">
              <Button size="lg">
                Start Estimating <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#pricing">
              <Button variant="outline" size="lg">
                View Pricing
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitFork className="h-4 w-4 text-green-400" />
              Problem: Guesswork
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">
            Most devs pick a platform first, then discover hidden runtime, data transfer, and database costs once traffic grows.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="h-4 w-4 text-green-400" />
              Solution: Repo-Aware Modeling
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">
            We read what your app actually uses, infer resource profile, and show cost tradeoffs by platform and user scale.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDollarSign className="h-4 w-4 text-green-400" />
              Outcome: Faster Decisions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">
            Avoid migration pain by choosing infra that matches your budget envelope before engineering time gets sunk.
          </CardContent>
        </Card>
      </section>

      <section className="mt-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-100">How it works</h2>
          <Badge variant="secondary">Built for indie hackers</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Paste Repository URL</CardTitle>
              <CardDescription>Public GitHub repo link is enough to start.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Analyzer Reads Runtime Signals</CardTitle>
              <CardDescription>Package and Docker patterns drive CPU, memory, and bandwidth assumptions.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">3. Compare Platform Spend</CardTitle>
              <CardDescription>Get side-by-side monthly totals and line items for each target scale.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-green-400" />
              Built for scaling conversations
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-slate-400">
            Every estimate includes 1k, 10k, and 100k MAU scenarios so you can compare short-term affordability with mid-term headroom.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-green-400" />
              Paywall protects compute-heavy analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-slate-400">
            Checkout via Lemon Squeezy. Access is granted through secure cookies after verified payment webhook events.
          </CardContent>
        </Card>
      </section>

      <section id="pricing" className="mt-16">
        <h2 className="mb-6 text-2xl font-semibold text-slate-100">Pricing</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <PricingCard checkoutBaseUrl={checkoutBaseUrl} variant="single" />
          <PricingCard checkoutBaseUrl={checkoutBaseUrl} variant="subscription" />
        </div>
      </section>

      <section className="mt-16">
        <h2 className="mb-6 text-2xl font-semibold text-slate-100">FAQ</h2>
        <FAQSection />
      </section>

      <section className="mt-16 rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
        <h2 className="text-2xl font-semibold text-slate-100">Ready to de-risk your hosting choice?</h2>
        <p className="mx-auto mt-2 max-w-2xl text-slate-400">
          Stop committing to infra blind. Run an estimate and see where cost and operational complexity diverge.
        </p>
        <div className="mt-6">
          <Link href="/estimate">
            <Button size="lg">
              Go to Estimator <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
