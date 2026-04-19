export type Complexity = "low" | "medium" | "high";
export type ScaleKey = "1k" | "10k" | "100k";

export interface ParsedRepository {
  owner: string;
  repo: string;
  defaultBranch: string;
  repoUrl: string;
}

export interface DockerAnalysis {
  found: boolean;
  filePath?: string;
  baseImage?: string;
  multiStage: boolean;
  exposedPorts: number[];
}

export interface RuntimeSignals {
  framework: string;
  packageManager: string;
  nodeVersion: string | null;
  hasDatabaseDependency: boolean;
  buildCommand: string;
  startCommand: string;
}

export interface ResourceHeuristics {
  cpuBaseline: number;
  memoryMb: number;
  diskGb: number;
  buildMinutes: number;
  bandwidthGbPerMau: number;
  complexity: Complexity;
}

export interface RepoAnalysis {
  parsedRepository: ParsedRepository;
  packageJsonFound: boolean;
  packageJsonPath?: string;
  docker: DockerAnalysis;
  runtime: RuntimeSignals;
  dependencyCounts: {
    dependencies: number;
    devDependencies: number;
    total: number;
  };
  topDependencies: string[];
  scripts: string[];
  heuristics: ResourceHeuristics;
  warnings: string[];
}

export interface TrafficScale {
  key: ScaleKey;
  mau: number;
  monthlyRequests: number;
  averageResponseKb: number;
  peakRps: number;
}

export interface ResourcePlan {
  appInstances: number;
  vcpuPerInstance: number;
  memoryGbPerInstance: number;
  totalVcpu: number;
  totalMemoryGb: number;
  bandwidthGb: number;
  buildMinutes: number;
}

export interface PlatformLineItem {
  name: string;
  monthlyCost: number;
  notes?: string;
}

export interface PlatformEstimate {
  platform: "AWS" | "Fly.io" | "Railway" | "Vercel";
  monthlyCost: number;
  lineItems: PlatformLineItem[];
  assumptions: string[];
}

export interface ScaleCostBreakdown {
  scale: TrafficScale;
  resourcePlan: ResourcePlan;
  estimates: PlatformEstimate[];
}

export interface CostEstimationReport {
  generatedAt: string;
  analysisSummary: {
    framework: string;
    complexity: Complexity;
    packageJsonFound: boolean;
    dockerfileFound: boolean;
  };
  scales: ScaleCostBreakdown[];
  caveats: string[];
}
