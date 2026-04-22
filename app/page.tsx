import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowRight, Calculator, Cloud, GitBranch, LockKeyhole, Wallet } from "lucide-react";

import { PricingCard } from "@/components/PricingCard";
import { RepoAnalyzer } from "@/components/RepoAnalyzer";
import { AccordionItem } from "@/components/ui/accordion";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/lemonsqueezy";

export default async function HomePage() {
  const cookieStore = await cookies();
  const access = verifyAccessToken(cookieStore.get(ACCESS_COOKIE_NAME)?.value);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <section className="section-grid relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 px-6 py-14 sm:px-10">
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-52 w-52 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative space-y-6">
          <p className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">
            Repo Infra Cost
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-slate-100 sm:text-5xl">
            Paste a GitHub URL. Get a realistic self-hosted vs managed cloud cost estimate.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            We inspect `package.json` and `Dockerfile`, combine your traffic assumptions, and produce
            monthly cost breakdowns for AWS, Fly.io, Railway, and Vercel at 1k / 10k / 100k MAU.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="#analyzer"
              className="inline-flex items-center gap-2 rounded-md bg-cyan-400 px-5 py-3 font-semibold text-slate-900 transition hover:bg-cyan-300"
            >
              Start Estimating
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-5 py-3 font-semibold text-slate-100 transition hover:bg-slate-800"
            >
              See Pricing
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <p className="mb-3 inline-flex rounded-md bg-cyan-500/10 p-2 text-cyan-300">
            <GitBranch className="h-5 w-5" />
          </p>
          <h2 className="text-lg font-semibold">Problem</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Hosting pricing pages do not map cleanly to your actual code shape. Most developers still guess
            infra cost until an unexpected invoice shows up.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <p className="mb-3 inline-flex rounded-md bg-emerald-500/10 p-2 text-emerald-300">
            <Calculator className="h-5 w-5" />
          </p>
          <h2 className="text-lg font-semibold">Solution</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Repo Infra Cost performs repository-level signals plus workload assumptions to estimate compute,
            data, and bandwidth spend per platform.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <p className="mb-3 inline-flex rounded-md bg-indigo-500/10 p-2 text-indigo-300">
            <Wallet className="h-5 w-5" />
          </p>
          <h2 className="text-lg font-semibold">Why Pay</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            A single estimate costs less than one bad month of over-provisioned infra. Use it before you buy
            cloud services or commit to a platform.
          </p>
        </div>
      </section>

      <section id="analyzer" className="mt-14 scroll-mt-20">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Cloud className="h-5 w-5 text-cyan-300" />
          <h2 className="text-2xl font-semibold">Infrastructure Estimator</h2>
          {!access.valid && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
              <LockKeyhole className="h-3.5 w-3.5" />
              Paywall Active
            </span>
          )}
        </div>
        <RepoAnalyzer hasAccess={access.valid} />
      </section>

      <section id="pricing" className="mt-14 scroll-mt-20">
        <h2 className="mb-3 text-2xl font-semibold">Pricing</h2>
        <p className="mb-6 max-w-2xl text-sm leading-6 text-slate-300">
          Hosted checkout runs through Stripe. After payment, enter the same checkout email in the analyzer
          and you will receive a secure access cookie instantly.
        </p>
        <PricingCard />
      </section>

      <section className="mt-14">
        <h2 className="mb-4 text-2xl font-semibold">FAQ</h2>
        <div className="space-y-3">
          <AccordionItem
            question="How accurate are the estimates?"
            answer="These are engineering-grade ballparks, not invoices. We infer runtime profile from your code and show confidence per platform so you can compare tradeoffs before provisioning." 
          />
          <AccordionItem
            question="Can I analyze private repositories?"
            answer="Not yet. The current analyzer uses public GitHub repository metadata and root files. Private-repo support will require secure OAuth scopes." 
          />
          <AccordionItem
            question="What happens after I pay?"
            answer="Stripe sends a checkout webhook to this app. When the webhook confirms payment, claim access using your checkout email and the app sets a signed HTTP-only cookie." 
          />
          <AccordionItem
            question="Why do you model 1k, 10k, and 100k MAU?"
            answer="Those milestones are common for indie products. They reveal when managed platforms are cheaper early and when self-hosting starts to win at larger traffic." 
          />
        </div>
      </section>
    </main>
  );
}
