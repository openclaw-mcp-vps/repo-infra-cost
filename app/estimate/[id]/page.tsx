import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CostBreakdown } from "@/components/CostBreakdown";
import { getEstimateById } from "@/lib/database";

interface EstimatePageProps {
  params: Promise<{ id: string }>;
}

export default async function EstimatePage({ params }: EstimatePageProps) {
  const { id } = await params;
  const estimate = await getEstimateById(id);

  if (!estimate) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8">
          <h1 className="text-2xl font-semibold text-slate-100">Estimate not found</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            This estimate ID does not exist, may have expired, or has been removed from local storage.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-cyan-400 px-4 py-2 font-semibold text-slate-900 transition hover:bg-cyan-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Analyzer
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-cyan-300 transition hover:text-cyan-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Run another estimate
      </Link>

      <h1 className="mb-2 text-3xl font-bold">Estimate Report</h1>
      <p className="mb-8 text-sm text-slate-400">
        Created {new Date(estimate.createdAt).toLocaleString()} from {estimate.analysis.repoUrl}
      </p>

      <CostBreakdown analysis={estimate.analysis} scales={estimate.scales} />
    </main>
  );
}
