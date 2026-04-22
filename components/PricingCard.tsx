import { CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK as string;

export function PricingCard() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="card-shadow border-cyan-500/30 bg-slate-900/80">
        <CardHeader>
          <CardTitle className="text-xl">One-Time Estimate</CardTitle>
          <CardDescription>Perfect for choosing where to launch your next side project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-4xl font-bold text-cyan-300">$3</p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-cyan-300" />
              Analyze any public GitHub repository
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-cyan-300" />
              AWS vs Fly.io vs Railway vs Vercel breakdown
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-cyan-300" />
              1k / 10k / 100k MAU scenarios
            </li>
          </ul>
          <a
            href={paymentLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center rounded-md bg-cyan-400 px-4 py-2 font-semibold text-slate-900 transition hover:bg-cyan-300"
          >
            Buy $3 Estimate
          </a>
        </CardContent>
      </Card>

      <Card className="border-slate-700 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-xl">Unlimited</CardTitle>
          <CardDescription>For indie hackers validating ideas every week.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-4xl font-bold text-emerald-300">$12/mo</p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Unlimited repository estimates
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Re-run with different traffic assumptions
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Keep estimate history while cookie is active
            </li>
          </ul>
          <a
            href={paymentLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center rounded-md border border-emerald-400/60 px-4 py-2 font-semibold text-emerald-300 transition hover:bg-emerald-400/10"
          >
            Start Unlimited
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
