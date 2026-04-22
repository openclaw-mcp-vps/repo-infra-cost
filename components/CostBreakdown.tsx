"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { RepoAnalysis, ScaleCostBreakdown } from "@/types";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

interface CostBreakdownProps {
  analysis: RepoAnalysis;
  scales: ScaleCostBreakdown[];
}

export function CostBreakdown({ analysis, scales }: CostBreakdownProps) {
  const [selectedScale, setSelectedScale] = useState(scales[1]?.mau ?? scales[0]?.mau ?? 1000);

  const activeScale = useMemo(
    () => scales.find((scale) => scale.mau === selectedScale) ?? scales[0],
    [scales, selectedScale]
  );

  const chartData = activeScale.platformCosts.map((platform) => ({
    platform: platform.platform,
    total: Number(platform.totalUsd.toFixed(2))
  }));

  return (
    <div className="space-y-8">
      <section className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6 md:grid-cols-4">
        <div>
          <p className="text-sm text-slate-400">Repo</p>
          <p className="text-lg font-semibold text-slate-100">
            {analysis.owner}/{analysis.repo}
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Frameworks Detected</p>
          <p className="text-lg font-semibold text-slate-100">
            {analysis.frameworks.length > 0 ? analysis.frameworks.join(", ") : "No framework signal"}
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Baseline Runtime</p>
          <p className="text-lg font-semibold text-slate-100">{analysis.resourceEstimate.runtime}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Initial Resource Hint</p>
          <p className="text-lg font-semibold text-slate-100">
            {analysis.resourceEstimate.baselineCpuCores} vCPU / {analysis.resourceEstimate.baselineMemoryMb} MB
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Cost by Platform</h2>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span>MAU Scale</span>
            <select
              value={selectedScale}
              onChange={(event) => setSelectedScale(Number(event.target.value) as 1000 | 10000 | 100000)}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            >
              {scales.map((scale) => (
                <option key={scale.mau} value={scale.mau}>
                  {scale.mau.toLocaleString()} MAU
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="mb-6 text-sm text-slate-400">
          {activeScale.monthlyRequests.toLocaleString()} monthly requests, ~
          {activeScale.estimatedOutboundGb.toLocaleString()} GB outbound transfer.
        </p>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="platform" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" tickFormatter={(value) => `$${value}`} />
              <Tooltip
                cursor={{ fill: "rgba(148,163,184,0.08)" }}
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: 12
                }}
                formatter={(value: number) => currency(value)}
              />
              <Bar dataKey="total" fill="#22d3ee" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="space-y-4">
        {activeScale.platformCosts
          .slice()
          .sort((a, b) => a.totalUsd - b.totalUsd)
          .map((platform) => (
            <div key={platform.platform} className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xl font-semibold text-slate-100">{platform.platform}</h3>
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200">
                  {currency(platform.totalUsd)} / month
                </span>
              </div>

              <div className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                {platform.lineItems.map((item) => (
                  <div key={item.label} className="rounded-md border border-slate-800 bg-slate-950/50 p-3">
                    <p className="font-medium text-slate-100">{item.label}</p>
                    <p className="text-cyan-300">{currency(item.amountUsd)}</p>
                    <p className="text-xs text-slate-400">{item.detail}</p>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Confidence: {platform.confidence}. Assumptions: {platform.assumptions.join(" • ")}
              </p>
            </div>
          ))}
      </section>
    </div>
  );
}
