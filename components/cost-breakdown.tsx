"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CostEstimationReport, ScaleCostBreakdown, ScaleKey } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CostBreakdownProps {
  report: CostEstimationReport;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function getScale(report: CostEstimationReport, key: ScaleKey): ScaleCostBreakdown {
  return report.scales.find((scale) => scale.scale.key === key) ?? report.scales[0];
}

export function CostBreakdown({ report }: CostBreakdownProps) {
  const [selectedScale, setSelectedScale] = useState<ScaleKey>("10k");

  const activeScale = useMemo(() => getScale(report, selectedScale), [report, selectedScale]);

  const chartData = activeScale.estimates.map((estimate) => ({
    platform: estimate.platform,
    monthlyCost: estimate.monthlyCost
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Estimated Monthly Cost by Platform</CardTitle>
          <CardDescription>
            Framework: {report.analysisSummary.framework} | Complexity: {report.analysisSummary.complexity}
          </CardDescription>
          <div className="flex flex-wrap gap-2">
            {(["1k", "10k", "100k"] as ScaleKey[]).map((key) => (
              <Button key={key} variant={selectedScale === key ? "default" : "outline"} size="sm" onClick={() => setSelectedScale(key)}>
                {key.toUpperCase()} MAU
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="platform" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #1f2937",
                    borderRadius: "10px",
                    color: "#e2e8f0"
                  }}
                  formatter={(value: number) => [formatMoney(value), "Monthly"]}
                />
                <Bar dataKey="monthlyCost" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {activeScale.estimates.map((estimate) => (
          <Card key={estimate.platform}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{estimate.platform}</CardTitle>
                <Badge variant="secondary">{formatMoney(estimate.monthlyCost)} / mo</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {estimate.lineItems.map((lineItem) => (
                <div key={`${estimate.platform}-${lineItem.name}`} className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{lineItem.name}</span>
                  <span className="text-slate-200">{formatMoney(lineItem.monthlyCost)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resource Plan @ {activeScale.scale.key.toUpperCase()} MAU</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-300 md:grid-cols-3">
          <div>
            <p className="text-slate-400">Instances</p>
            <p className="text-base font-medium text-slate-100">{activeScale.resourcePlan.appInstances}</p>
          </div>
          <div>
            <p className="text-slate-400">Total vCPU</p>
            <p className="text-base font-medium text-slate-100">{activeScale.resourcePlan.totalVcpu}</p>
          </div>
          <div>
            <p className="text-slate-400">Total Memory</p>
            <p className="text-base font-medium text-slate-100">{activeScale.resourcePlan.totalMemoryGb} GB</p>
          </div>
          <div>
            <p className="text-slate-400">Monthly Requests</p>
            <p className="text-base font-medium text-slate-100">{activeScale.scale.monthlyRequests.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-slate-400">Peak RPS</p>
            <p className="text-base font-medium text-slate-100">{activeScale.scale.peakRps}</p>
          </div>
          <div>
            <p className="text-slate-400">Bandwidth</p>
            <p className="text-base font-medium text-slate-100">{activeScale.resourcePlan.bandwidthGb} GB/mo</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Important Caveats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-400">
          {report.caveats.map((caveat) => (
            <p key={caveat}>{caveat}</p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
