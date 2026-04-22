import type { PlatformCost, RepoAnalysis, ScaleCostBreakdown } from "@/types";

const HOURS_PER_MONTH = 730;
const SECONDS_PER_MONTH = 30 * 24 * 60 * 60;
const MAU_SCALES: Array<ScaleCostBreakdown["mau"]> = [1000, 10000, 100000];

function roundUsd(value: number) {
  return Number(value.toFixed(2));
}

function estimateDemand(analysis: RepoAnalysis, mau: number) {
  const monthlyRequests = mau * analysis.trafficProfile.requestsPerUserPerMonth;
  const avgRps = monthlyRequests / SECONDS_PER_MONTH;
  const peakRps = avgRps * 8;

  const baseCpu = analysis.resourceEstimate.baselineCpuCores;
  const cpuFromTraffic = peakRps * (analysis.trafficProfile.averageCpuMsPerRequest / 1000) * 1.35;
  const requiredCpu = Math.max(baseCpu, cpuFromTraffic + baseCpu * 0.4);

  const baseMemoryGb = analysis.resourceEstimate.baselineMemoryMb / 1024;
  const memoryFromTraffic = Math.min(8, peakRps * 0.025);
  const requiredMemoryGb = Math.max(
    baseMemoryGb,
    baseMemoryGb + memoryFromTraffic + (analysis.resourceEstimate.hasBackgroundWorkers ? 0.35 : 0)
  );

  const outboundGb =
    (monthlyRequests * analysis.trafficProfile.averageResponseKb) / 1024 / 1024 * 1.18;

  return {
    monthlyRequests,
    requiredCpu,
    requiredMemoryGb,
    outboundGb
  };
}

function awsCost(analysis: RepoAnalysis, mau: number, demand: ReturnType<typeof estimateDemand>): PlatformCost {
  const computeCost =
    demand.requiredCpu * HOURS_PER_MONTH * 0.04048 +
    demand.requiredMemoryGb * HOURS_PER_MONTH * 0.004445;
  const loadBalancer = 18;
  const logsAndMonitoring = 8 + demand.monthlyRequests / 1_000_000;

  const dbCost = analysis.resourceEstimate.hasPersistentDatabase
    ? Math.max(18, 15 + mau * 0.0012)
    : Math.max(12, 10 + mau * 0.0004);

  const bandwidth = Math.max(0, demand.outboundGb - 100) * 0.09;
  const opsOverhead = 0.18 * (computeCost + dbCost + loadBalancer);
  const total = computeCost + loadBalancer + logsAndMonitoring + dbCost + bandwidth + opsOverhead;

  return {
    platform: "AWS",
    confidence: "medium",
    totalUsd: roundUsd(total),
    lineItems: [
      {
        label: "Compute (ECS/Fargate equivalent)",
        amountUsd: roundUsd(computeCost),
        detail: `${demand.requiredCpu.toFixed(2)} vCPU + ${demand.requiredMemoryGb.toFixed(2)} GB RAM across 730h`
      },
      {
        label: "Managed database",
        amountUsd: roundUsd(dbCost),
        detail: analysis.resourceEstimate.hasPersistentDatabase
          ? "Assumes db.t4g.micro-class baseline with incremental IO"
          : "Assumes lightweight persistence for sessions and job state"
      },
      {
        label: "Load balancer + observability",
        amountUsd: roundUsd(loadBalancer + logsAndMonitoring),
        detail: "ALB baseline plus CloudWatch/metrics"
      },
      {
        label: "Bandwidth",
        amountUsd: roundUsd(bandwidth),
        detail: `${demand.outboundGb.toFixed(1)} GB outbound after free tier`
      },
      {
        label: "Ops overhead",
        amountUsd: roundUsd(opsOverhead),
        detail: "Time cost for patching, deployments, and incident handling"
      }
    ],
    assumptions: [
      "Single-region deployment",
      "No CDN offload beyond basic caching",
      "Uses managed services but includes self-hosting operational overhead"
    ]
  };
}

function flyCost(analysis: RepoAnalysis, mau: number, demand: ReturnType<typeof estimateDemand>): PlatformCost {
  const appCompute = demand.requiredCpu * 14 + demand.requiredMemoryGb * 4.8;
  const workerCompute = analysis.resourceEstimate.hasBackgroundWorkers ? 8 + demand.requiredCpu * 3.2 : 0;
  const volume = Math.max(analysis.resourceEstimate.storageGb, 3) * 0.15;
  const dbCost = analysis.resourceEstimate.hasPersistentDatabase
    ? Math.max(20, 16 + mau * 0.0011)
    : 0;
  const bandwidth = Math.max(0, demand.outboundGb - 100) * 0.02;
  const total = appCompute + workerCompute + volume + dbCost + bandwidth;

  return {
    platform: "Fly.io",
    confidence: "medium",
    totalUsd: roundUsd(total),
    lineItems: [
      {
        label: "App VMs",
        amountUsd: roundUsd(appCompute),
        detail: "shared-cpu style VM footprint based on inferred runtime demand"
      },
      {
        label: "Background worker",
        amountUsd: roundUsd(workerCompute),
        detail: analysis.resourceEstimate.hasBackgroundWorkers
          ? "Extra worker process for queues/cron"
          : "No worker tier assumed"
      },
      {
        label: "Volumes + database",
        amountUsd: roundUsd(volume + dbCost),
        detail: analysis.resourceEstimate.hasPersistentDatabase
          ? "Persistent volume and managed Postgres"
          : "Persistent volume only"
      },
      {
        label: "Bandwidth",
        amountUsd: roundUsd(bandwidth),
        detail: `${demand.outboundGb.toFixed(1)} GB outbound`
      }
    ],
    assumptions: [
      "Region pinned close to primary users",
      "Managed Postgres only when DB deps are detected",
      "No private networking surcharge"
    ]
  };
}

function railwayCost(
  analysis: RepoAnalysis,
  mau: number,
  demand: ReturnType<typeof estimateDemand>
): PlatformCost {
  const compute = demand.requiredCpu * HOURS_PER_MONTH * 0.035;
  const memory = demand.requiredMemoryGb * HOURS_PER_MONTH * 0.0042;
  const serviceFee = 5;
  const dbCost = analysis.resourceEstimate.hasPersistentDatabase
    ? Math.max(15, 12 + mau * 0.0013)
    : 6;
  const bandwidth = Math.max(0, demand.outboundGb - 100) * 0.05;
  const total = compute + memory + serviceFee + dbCost + bandwidth;

  return {
    platform: "Railway",
    confidence: "medium",
    totalUsd: roundUsd(total),
    lineItems: [
      {
        label: "CPU usage",
        amountUsd: roundUsd(compute),
        detail: `${demand.requiredCpu.toFixed(2)} vCPU equivalent usage`
      },
      {
        label: "Memory usage",
        amountUsd: roundUsd(memory),
        detail: `${demand.requiredMemoryGb.toFixed(2)} GB RAM equivalent usage`
      },
      {
        label: "Platform + data services",
        amountUsd: roundUsd(serviceFee + dbCost),
        detail: analysis.resourceEstimate.hasPersistentDatabase
          ? "Project fee + managed database"
          : "Project fee + lightweight persistence"
      },
      {
        label: "Bandwidth",
        amountUsd: roundUsd(bandwidth),
        detail: `${demand.outboundGb.toFixed(1)} GB outbound`
      }
    ],
    assumptions: [
      "No private network transfer charges",
      "Single production service and optional worker",
      "Metered usage averaged over the month"
    ]
  };
}

function vercelCost(
  analysis: RepoAnalysis,
  mau: number,
  demand: ReturnType<typeof estimateDemand>
): PlatformCost {
  const basePlan = 20;
  const includedInvocations = 1_000_000;
  const includedExecutionHours = 100;

  const monthlyInvocations = demand.monthlyRequests;
  const invocationCost = Math.max(0, monthlyInvocations - includedInvocations) / 1_000_000 * 0.6;

  const executionHours =
    (monthlyInvocations * analysis.trafficProfile.averageCpuMsPerRequest) / 1000 / 60 / 60;
  const executionCost = Math.max(0, executionHours - includedExecutionHours) * 0.2;

  const bandwidth = Math.max(0, demand.outboundGb - 100) * 0.15;

  const externalDataCost = analysis.resourceEstimate.hasPersistentDatabase
    ? Math.max(16, 12 + mau * 0.0014)
    : 0;

  const observability = 4 + Math.min(35, mau * 0.00015);
  const total = basePlan + invocationCost + executionCost + bandwidth + externalDataCost + observability;

  return {
    platform: "Vercel",
    confidence: "low",
    totalUsd: roundUsd(total),
    lineItems: [
      {
        label: "Pro plan baseline",
        amountUsd: roundUsd(basePlan),
        detail: "Team plan entry cost"
      },
      {
        label: "Serverless overages",
        amountUsd: roundUsd(invocationCost + executionCost),
        detail: `${(monthlyInvocations / 1_000_000).toFixed(2)}M invocations and ${executionHours.toFixed(1)} execution hours`
      },
      {
        label: "Bandwidth",
        amountUsd: roundUsd(bandwidth),
        detail: `${demand.outboundGb.toFixed(1)} GB outbound transfer`
      },
      {
        label: "External data + monitoring",
        amountUsd: roundUsd(externalDataCost + observability),
        detail: analysis.resourceEstimate.hasPersistentDatabase
          ? "Managed DB from a third-party provider plus log/analytics add-ons"
          : "Log/analytics add-ons"
      }
    ],
    assumptions: [
      "Route handlers/API traffic drives function usage",
      "Static assets served by CDN where possible",
      "Database costs are external to Vercel"
    ]
  };
}

export function calculateCostBreakdown(analysis: RepoAnalysis): ScaleCostBreakdown[] {
  return MAU_SCALES.map((mau) => {
    const demand = estimateDemand(analysis, mau);

    return {
      mau,
      monthlyRequests: Math.round(demand.monthlyRequests),
      estimatedOutboundGb: roundUsd(demand.outboundGb),
      platformCosts: [
        awsCost(analysis, mau, demand),
        flyCost(analysis, mau, demand),
        railwayCost(analysis, mau, demand),
        vercelCost(analysis, mau, demand)
      ]
    };
  });
}
