"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CostBreakdown } from "@/components/cost-breakdown";
import type { CostEstimationReport, RepoAnalysis } from "@/types";

interface AnalyzeResponse {
  analysis: RepoAnalysis;
}

interface CalculateResponse {
  report: CostEstimationReport;
}

export function RepoInput() {
  const [repoUrl, setRepoUrl] = useState("");
  const [requestsPerUser, setRequestsPerUser] = useState("35");
  const [responseKb, setResponseKb] = useState("220");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<RepoAnalysis | null>(null);
  const [report, setReport] = useState<CostEstimationReport | null>(null);

  async function runEstimate() {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setReport(null);

    try {
      const analyzeResponse = await fetch("/api/analyze-repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ repoUrl })
      });

      if (!analyzeResponse.ok) {
        const details = (await analyzeResponse.json()) as { error?: string };
        throw new Error(details.error ?? "Could not analyze repository.");
      }

      const analyzeData = (await analyzeResponse.json()) as AnalyzeResponse;
      setAnalysis(analyzeData.analysis);

      const calculateResponse = await fetch("/api/calculate-costs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          analysis: analyzeData.analysis,
          averageRequestsPerUser: Number(requestsPerUser),
          averageResponseKb: Number(responseKb)
        })
      });

      if (!calculateResponse.ok) {
        const details = (await calculateResponse.json()) as { error?: string };
        throw new Error(details.error ?? "Could not calculate costs.");
      }

      const calculateData = (await calculateResponse.json()) as CalculateResponse;
      setReport(calculateData.report);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error while running estimate.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-400" />
            Run Cost Estimate
          </CardTitle>
          <CardDescription>
            Paste a public GitHub repository URL and tune your traffic assumptions. The analyzer will inspect package.json and Dockerfile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="repo-url" className="text-sm text-slate-400">
              GitHub URL
            </label>
            <Input
              id="repo-url"
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="requests" className="text-sm text-slate-400">
                Avg. requests per user / month
              </label>
              <Input id="requests" type="number" min={1} max={1000} value={requestsPerUser} onChange={(event) => setRequestsPerUser(event.target.value)} />
            </div>

            <div className="space-y-2">
              <label htmlFor="response-size" className="text-sm text-slate-400">
                Avg. response size (KB)
              </label>
              <Input id="response-size" type="number" min={1} max={5000} value={responseKb} onChange={(event) => setResponseKb(event.target.value)} />
            </div>
          </div>

          <Button onClick={() => void runEstimate()} disabled={loading || !repoUrl.trim()} className="w-full sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing repository...
              </>
            ) : (
              "Generate estimate"
            )}
          </Button>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              <p className="inline-flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle>Repository Signals</CardTitle>
            <CardDescription>
              {analysis.parsedRepository.owner}/{analysis.parsedRepository.repo} on {analysis.parsedRepository.defaultBranch}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
            <div>
              <p className="text-slate-400">Framework</p>
              <p className="text-base text-slate-100">{analysis.runtime.framework}</p>
            </div>
            <div>
              <p className="text-slate-400">Complexity</p>
              <p className="text-base text-slate-100">{analysis.heuristics.complexity}</p>
            </div>
            <div>
              <p className="text-slate-400">Dependencies</p>
              <p className="text-base text-slate-100">{analysis.dependencyCounts.total}</p>
            </div>
            <div>
              <p className="text-slate-400">Dockerfile</p>
              <p className="text-base text-slate-100">{analysis.docker.found ? `Yes (${analysis.docker.filePath})` : "Not found"}</p>
            </div>
            {analysis.warnings.length > 0 && (
              <div className="md:col-span-2">
                <p className="mb-2 text-slate-400">Warnings</p>
                <div className="space-y-1">
                  {analysis.warnings.map((warning) => (
                    <p key={warning} className="text-amber-300">
                      {warning}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {report && <CostBreakdown report={report} />}
    </div>
  );
}
