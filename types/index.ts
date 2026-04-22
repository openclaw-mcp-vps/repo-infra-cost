export type HostingPlatform = "AWS" | "Fly.io" | "Railway" | "Vercel";

export interface TrafficProfile {
  requestsPerUserPerMonth: number;
  averageResponseKb: number;
  averageCpuMsPerRequest: number;
}

export interface ResourceEstimate {
  baselineCpuCores: number;
  baselineMemoryMb: number;
  storageGb: number;
  hasBackgroundWorkers: boolean;
  hasPersistentDatabase: boolean;
  runtime: "node" | "python" | "unknown";
}

export interface RepoAnalysis {
  repoUrl: string;
  owner: string;
  repo: string;
  defaultBranch: string;
  stars: number;
  packageJsonFound: boolean;
  dockerfileFound: boolean;
  frameworks: string[];
  packageManager: "npm" | "pnpm" | "yarn" | "unknown";
  dependencies: string[];
  trafficProfile: TrafficProfile;
  resourceEstimate: ResourceEstimate;
  notes: string[];
}

export interface CostLineItem {
  label: string;
  amountUsd: number;
  detail: string;
}

export interface PlatformCost {
  platform: HostingPlatform;
  totalUsd: number;
  confidence: "low" | "medium" | "high";
  lineItems: CostLineItem[];
  assumptions: string[];
}

export interface ScaleCostBreakdown {
  mau: 1000 | 10000 | 100000;
  monthlyRequests: number;
  estimatedOutboundGb: number;
  platformCosts: PlatformCost[];
}

export interface EstimateResult {
  id: string;
  createdAt: string;
  analysis: RepoAnalysis;
  scales: ScaleCostBreakdown[];
}

export interface AnalyzeRequest {
  repoUrl: string;
  requestsPerUserPerMonth?: number;
  averageResponseKb?: number;
  averageCpuMsPerRequest?: number;
}

export interface PurchaseRecord {
  email: string;
  sessionId: string;
  purchasedAt: string;
  source: "stripe_webhook" | "manual";
}

export interface StoredEstimate {
  id: string;
  createdAt: string;
  analysis: RepoAnalysis;
  scales: ScaleCostBreakdown[];
}

export interface DatabaseSchema {
  purchases: PurchaseRecord[];
  estimates: StoredEstimate[];
}
