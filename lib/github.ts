import { Octokit } from "octokit";

import type { RepoAnalysis, TrafficProfile } from "@/types";

interface ParsedRepo {
  owner: string;
  repo: string;
}

interface PackageJsonShape {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  packageManager?: string;
  scripts?: Record<string, string>;
}

const FRAMEWORK_MATCHERS: Array<[string, string]> = [
  ["next", "Next.js"],
  ["react", "React"],
  ["express", "Express"],
  ["fastify", "Fastify"],
  ["nestjs", "NestJS"],
  ["@nestjs/core", "NestJS"],
  ["hono", "Hono"],
  ["svelte", "Svelte"],
  ["vue", "Vue"],
  ["astro", "Astro"],
  ["prisma", "Prisma"],
  ["mongodb", "MongoDB"],
  ["pg", "Postgres"],
  ["mysql", "MySQL"],
  ["redis", "Redis"]
];

const BACKGROUND_JOB_HINTS = ["bull", "bullmq", "agenda", "bree", "node-cron", "temporalio"];
const DB_HINTS = ["pg", "postgres", "mysql", "sqlite", "mongoose", "redis", "prisma", "drizzle"];

export function parseGitHubUrl(repoUrl: string): ParsedRepo {
  try {
    const normalized = repoUrl.trim();
    const url = new URL(normalized);

    if (!url.hostname.includes("github.com")) {
      throw new Error("URL must point to github.com");
    }

    const pathParts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
    if (pathParts.length < 2) {
      throw new Error("GitHub URL must include owner and repository name");
    }

    const owner = pathParts[0];
    const repo = pathParts[1].replace(/\.git$/, "");

    if (!owner || !repo) {
      throw new Error("Invalid GitHub repository URL");
    }

    return { owner, repo };
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Could not parse GitHub URL: ${error.message}`
        : "Could not parse GitHub URL"
    );
  }
}

async function fetchRepoTextFile(params: {
  octokit: Octokit;
  owner: string;
  repo: string;
  path: string;
  ref: string;
}): Promise<string | null> {
  try {
    const response = await params.octokit.rest.repos.getContent({
      owner: params.owner,
      repo: params.repo,
      path: params.path,
      ref: params.ref
    });

    if (Array.isArray(response.data) || response.data.type !== "file") {
      return null;
    }

    const content = response.data.content;
    if (!content) {
      return null;
    }

    return Buffer.from(content, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function detectPackageManager(packageManagerField?: string): RepoAnalysis["packageManager"] {
  if (!packageManagerField) {
    return "unknown";
  }

  if (packageManagerField.startsWith("pnpm")) {
    return "pnpm";
  }
  if (packageManagerField.startsWith("yarn")) {
    return "yarn";
  }
  if (packageManagerField.startsWith("npm")) {
    return "npm";
  }
  return "unknown";
}

function inferResourceEstimate(params: {
  dependencyNames: string[];
  dockerfile: string | null;
}): RepoAnalysis["resourceEstimate"] {
  const dependencyNames = params.dependencyNames;
  const hasBackgroundWorkers = BACKGROUND_JOB_HINTS.some((hint) =>
    dependencyNames.some((dependency) => dependency.includes(hint))
  );
  const hasPersistentDatabase = DB_HINTS.some((hint) =>
    dependencyNames.some((dependency) => dependency.includes(hint))
  );

  let baselineCpuCores = 0.25;
  let baselineMemoryMb = 512;
  let storageGb = 5;
  let runtime: RepoAnalysis["resourceEstimate"]["runtime"] = "unknown";

  if (dependencyNames.includes("next")) {
    baselineCpuCores += 0.25;
    baselineMemoryMb += 256;
    runtime = "node";
  }

  if (dependencyNames.includes("@nestjs/core") || dependencyNames.includes("nestjs")) {
    baselineCpuCores += 0.35;
    baselineMemoryMb += 384;
    runtime = "node";
  }

  if (dependencyNames.includes("express") || dependencyNames.includes("fastify")) {
    baselineCpuCores += 0.15;
    baselineMemoryMb += 128;
    runtime = "node";
  }

  if (hasPersistentDatabase) {
    baselineCpuCores += 0.2;
    baselineMemoryMb += 256;
    storageGb += 10;
  }

  if (hasBackgroundWorkers) {
    baselineCpuCores += 0.2;
    baselineMemoryMb += 192;
  }

  const docker = params.dockerfile?.toLowerCase() ?? "";
  if (docker.includes("python") || docker.includes("uvicorn") || docker.includes("gunicorn")) {
    runtime = "python";
    baselineMemoryMb += 128;
  }

  if (docker.includes("node")) {
    runtime = "node";
  }

  return {
    baselineCpuCores: Number(baselineCpuCores.toFixed(2)),
    baselineMemoryMb: Math.ceil(baselineMemoryMb / 64) * 64,
    storageGb,
    hasBackgroundWorkers,
    hasPersistentDatabase,
    runtime
  };
}

function detectFrameworks(dependencyNames: string[]) {
  const frameworks = new Set<string>();
  for (const [matcher, label] of FRAMEWORK_MATCHERS) {
    if (dependencyNames.includes(matcher)) {
      frameworks.add(label);
    }
  }

  return Array.from(frameworks);
}

function normalizeTrafficProfile(overrides?: Partial<TrafficProfile>): TrafficProfile {
  return {
    requestsPerUserPerMonth: Math.max(10, Math.min(1000, overrides?.requestsPerUserPerMonth ?? 120)),
    averageResponseKb: Math.max(5, Math.min(800, overrides?.averageResponseKb ?? 140)),
    averageCpuMsPerRequest: Math.max(5, Math.min(2000, overrides?.averageCpuMsPerRequest ?? 45))
  };
}

export async function analyzeRepository(
  repoUrl: string,
  trafficOverrides?: Partial<TrafficProfile>
): Promise<RepoAnalysis> {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const repoMeta = await octokit.rest.repos.get({ owner, repo });
  const defaultBranch = repoMeta.data.default_branch;

  const packageJsonRaw = await fetchRepoTextFile({
    octokit,
    owner,
    repo,
    path: "package.json",
    ref: defaultBranch
  });

  const dockerfileRaw =
    (await fetchRepoTextFile({
      octokit,
      owner,
      repo,
      path: "Dockerfile",
      ref: defaultBranch
    })) ||
    (await fetchRepoTextFile({
      octokit,
      owner,
      repo,
      path: "dockerfile",
      ref: defaultBranch
    }));

  let packageJson: PackageJsonShape = {};
  if (packageJsonRaw) {
    try {
      packageJson = JSON.parse(packageJsonRaw) as PackageJsonShape;
    } catch {
      packageJson = {};
    }
  }

  const dependencyNames = [
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {})
  ];

  const frameworks = detectFrameworks(dependencyNames);
  const resourceEstimate = inferResourceEstimate({ dependencyNames, dockerfile: dockerfileRaw });
  const trafficProfile = normalizeTrafficProfile(trafficOverrides);

  const notes: string[] = [];
  if (!packageJsonRaw) {
    notes.push("No package.json found at repository root; assumptions rely on Dockerfile and defaults.");
  }
  if (!dockerfileRaw) {
    notes.push("No Dockerfile found at repository root; container overhead is estimated conservatively.");
  }
  if (resourceEstimate.hasPersistentDatabase) {
    notes.push("Database dependencies detected, so each platform includes managed DB baseline costs.");
  } else {
    notes.push("No DB dependency detected; costs assume stateless workloads unless traffic scale demands persistence.");
  }

  return {
    repoUrl,
    owner,
    repo,
    defaultBranch,
    stars: repoMeta.data.stargazers_count,
    packageJsonFound: Boolean(packageJsonRaw),
    dockerfileFound: Boolean(dockerfileRaw),
    frameworks,
    packageManager: detectPackageManager(packageJson.packageManager),
    dependencies: dependencyNames,
    trafficProfile,
    resourceEstimate,
    notes
  };
}
