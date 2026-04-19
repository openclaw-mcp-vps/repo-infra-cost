import type {
  CostEstimationReport,
  PlatformEstimate,
  RepoAnalysis,
  ResourcePlan,
  ScaleCostBreakdown,
  TrafficScale
} from "@/types";

interface CostInput {
  analysis: RepoAnalysis;
  averageRequestsPerUser?: number;
  averageResponseKb?: number;
}

const SCALE_TARGETS: Array<{ key: "1k" | "10k" | "100k"; mau: number }> = [
  { key: "1k", mau: 1_000 },
  { key: "10k", mau: 10_000 },
  { key: "100k", mau: 100_000 }
];

function round2(input: number) {
  return Math.round(input * 100) / 100;
}

function buildTrafficScale(mau: number, key: "1k" | "10k" | "100k", requestsPerUser: number, avgResponseKb: number): TrafficScale {
  const monthlyRequests = Math.max(1, Math.round(mau * requestsPerUser));
  const averageRps = monthlyRequests / (30 * 24 * 3600);
  const peakRps = Math.max(0.1, averageRps * 14);

  return {
    key,
    mau,
    monthlyRequests,
    averageResponseKb: avgResponseKb,
    peakRps: round2(peakRps)
  };
}

function buildResourcePlan(analysis: RepoAnalysis, scale: TrafficScale): ResourcePlan {
  const complexityFactor = analysis.heuristics.complexity === "high" ? 1.35 : analysis.heuristics.complexity === "medium" ? 1.15 : 1;
  const throughputPerVcpu = analysis.runtime.framework === "Next.js" ? 35 : 45;

  const baselineCpu = analysis.heuristics.cpuBaseline;
  const requiredCpuForPeak = (scale.peakRps / throughputPerVcpu) * complexityFactor;
  const totalVcpu = Math.max(baselineCpu, requiredCpuForPeak);

  const memoryGbBase = Math.max(0.5, analysis.heuristics.memoryMb / 1024);
  const memoryForScale = memoryGbBase * Math.max(1, Math.log10(scale.mau));
  const totalMemoryGb = Math.max(memoryGbBase, memoryForScale);

  const appInstances = Math.max(1, Math.ceil(scale.peakRps / 4));
  const vcpuPerInstance = round2(Math.max(0.25, totalVcpu / appInstances));
  const memoryGbPerInstance = round2(Math.max(0.5, totalMemoryGb / appInstances));

  const bandwidthGb = round2((scale.monthlyRequests * scale.averageResponseKb) / (1024 * 1024));
  const buildMinutes = Math.ceil(analysis.heuristics.buildMinutes * Math.max(1, Math.log10(scale.mau)));

  return {
    appInstances,
    vcpuPerInstance,
    memoryGbPerInstance,
    totalVcpu: round2(appInstances * vcpuPerInstance),
    totalMemoryGb: round2(appInstances * memoryGbPerInstance),
    bandwidthGb,
    buildMinutes
  };
}

function estimateAws(plan: ResourcePlan, scale: TrafficScale, dbNeeded: boolean): PlatformEstimate {
  const vcpuHourPrice = 0.04048;
  const gbHourPrice = 0.004445;

  const compute = plan.totalVcpu * 730 * vcpuHourPrice + plan.totalMemoryGb * 730 * gbHourPrice;
  const loadBalancer = 18;
  const storage = Math.max(4, plan.totalMemoryGb) * 0.115;
  const db = dbNeeded ? (scale.mau >= 100_000 ? 160 : scale.mau >= 10_000 ? 55 : 18) : 0;
  const bandwidth = Math.max(0, scale.mau >= 10_000 ? plan.bandwidthGb - 100 : plan.bandwidthGb) * 0.09;
  const ops = 12;

  const monthlyCost = round2(compute + loadBalancer + storage + db + bandwidth + ops);

  return {
    platform: "AWS",
    monthlyCost,
    lineItems: [
      { name: "ECS/Fargate Compute", monthlyCost: round2(compute) },
      { name: "Load Balancer", monthlyCost: loadBalancer },
      { name: "Block Storage", monthlyCost: round2(storage) },
      { name: "Managed Database", monthlyCost: db },
      { name: "Data Transfer", monthlyCost: round2(bandwidth) },
      { name: "Operational Buffer", monthlyCost: ops }
    ],
    assumptions: [
      "Uses on-demand Fargate-style pricing for containerized web workloads.",
      "Includes managed DB baseline only when database dependencies were detected."
    ]
  };
}

function estimateFly(plan: ResourcePlan, scale: TrafficScale, dbNeeded: boolean): PlatformEstimate {
  const cpuHour = 0.034;
  const memoryHour = 0.0052;

  const compute = plan.totalVcpu * 730 * cpuHour + plan.totalMemoryGb * 730 * memoryHour;
  const volumes = Math.max(1, Math.ceil(plan.totalMemoryGb)) * 0.15;
  const db = dbNeeded ? (scale.mau >= 100_000 ? 70 : scale.mau >= 10_000 ? 26 : 10) : 0;
  const egress = plan.bandwidthGb * 0.02;

  const monthlyCost = round2(compute + volumes + db + egress);

  return {
    platform: "Fly.io",
    monthlyCost,
    lineItems: [
      { name: "Machine Runtime", monthlyCost: round2(compute) },
      { name: "Volumes", monthlyCost: round2(volumes) },
      { name: "Managed Postgres", monthlyCost: db },
      { name: "Network Egress", monthlyCost: round2(egress) }
    ],
    assumptions: [
      "Assumes regional deployment with always-on machines.",
      "Excludes enterprise support and private networking add-ons."
    ]
  };
}

function estimateRailway(plan: ResourcePlan, scale: TrafficScale, dbNeeded: boolean): PlatformEstimate {
  const cpuHour = 0.03;
  const memoryHour = 0.0035;

  const compute = plan.totalVcpu * 730 * cpuHour + plan.totalMemoryGb * 730 * memoryHour;
  const db = dbNeeded ? (scale.mau >= 100_000 ? 120 : scale.mau >= 10_000 ? 36 : 12) : 0;
  const network = plan.bandwidthGb * 0.05;
  const platform = 5;

  const monthlyCost = round2(compute + db + network + platform);

  return {
    platform: "Railway",
    monthlyCost,
    lineItems: [
      { name: "Runtime Usage", monthlyCost: round2(compute) },
      { name: "Managed Database", monthlyCost: db },
      { name: "Data Transfer", monthlyCost: round2(network) },
      { name: "Base Plan", monthlyCost: platform }
    ],
    assumptions: [
      "Modeled as usage-based services with one primary region.",
      "Plan credits, discounts, and idle scaling behavior are not included."
    ]
  };
}

function estimateVercel(analysis: RepoAnalysis, plan: ResourcePlan, scale: TrafficScale): PlatformEstimate {
  const base = 20;
  const complexityMultiplier = analysis.heuristics.complexity === "high" ? 1.25 : analysis.heuristics.complexity === "medium" ? 1.1 : 1;

  const functionUnits = (scale.monthlyRequests / 1_000_000) * 14 * complexityMultiplier;
  const functionCost = functionUnits;
  const bandwidthIncludedGb = 100;
  const bandwidthCost = Math.max(0, plan.bandwidthGb - bandwidthIncludedGb) * 0.12;
  const dbAddOn = analysis.runtime.hasDatabaseDependency
    ? scale.mau >= 100_000
      ? 95
      : scale.mau >= 10_000
        ? 38
        : 15
    : 0;

  const monthlyCost = round2(base + functionCost + bandwidthCost + dbAddOn);

  return {
    platform: "Vercel",
    monthlyCost,
    lineItems: [
      { name: "Pro Base", monthlyCost: base },
      { name: "Compute + Edge Functions", monthlyCost: round2(functionCost) },
      { name: "Bandwidth Overages", monthlyCost: round2(bandwidthCost) },
      { name: "Managed Data Add-on", monthlyCost: dbAddOn }
    ],
    assumptions: [
      "Assumes one Pro seat and API-heavy serverless usage.",
      "Includes external DB add-on only for apps that appear stateful."
    ]
  };
}

function calculateScaleBreakdown(
  analysis: RepoAnalysis,
  scale: TrafficScale,
  resourcePlan: ResourcePlan
): ScaleCostBreakdown {
  const dbNeeded = analysis.runtime.hasDatabaseDependency;

  const estimates = [
    estimateAws(resourcePlan, scale, dbNeeded),
    estimateFly(resourcePlan, scale, dbNeeded),
    estimateRailway(resourcePlan, scale, dbNeeded),
    estimateVercel(analysis, resourcePlan, scale)
  ].sort((a, b) => a.monthlyCost - b.monthlyCost);

  return {
    scale,
    resourcePlan,
    estimates
  };
}

export function calculateCostReport({ analysis, averageRequestsPerUser = 35, averageResponseKb = 220 }: CostInput): CostEstimationReport {
  const scaleBreakdowns = SCALE_TARGETS.map(({ key, mau }) => {
    const scale = buildTrafficScale(mau, key, averageRequestsPerUser, averageResponseKb);
    const plan = buildResourcePlan(analysis, scale);
    return calculateScaleBreakdown(analysis, scale, plan);
  });

  return {
    generatedAt: new Date().toISOString(),
    analysisSummary: {
      framework: analysis.runtime.framework,
      complexity: analysis.heuristics.complexity,
      packageJsonFound: analysis.packageJsonFound,
      dockerfileFound: analysis.docker.found
    },
    scales: scaleBreakdowns,
    caveats: [
      "These are directional estimates, not cloud-provider invoices.",
      "Burst traffic, background jobs, and global redundancy can materially change cost.",
      "Always validate against provider calculators before committing procurement spend."
    ]
  };
}
