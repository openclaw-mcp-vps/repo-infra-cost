import { Octokit } from "octokit";
import type { Complexity, RepoAnalysis } from "@/types";

interface PackageJsonShape {
  name?: string;
  engines?: { node?: string };
  packageManager?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const PACKAGE_JSON_CANDIDATES = [
  "package.json",
  "apps/web/package.json",
  "app/package.json",
  "frontend/package.json"
];

const DOCKERFILE_CANDIDATES = [
  "Dockerfile",
  "docker/Dockerfile",
  "deploy/Dockerfile",
  "apps/web/Dockerfile"
];

function parseGitHubUrl(repoUrl: string): { owner: string; repo: string } {
  const normalized = repoUrl.trim().replace(/\.git$/, "");

  let match = normalized.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)/i);
  if (!match) {
    match = normalized.match(/^github\.com\/([^/]+)\/([^/]+)/i);
  }

  if (!match) {
    throw new Error("Invalid GitHub URL. Expected format: https://github.com/owner/repo");
  }

  return {
    owner: match[1],
    repo: match[2]
  };
}

async function fetchRepoMetadata(owner: string, repo: string) {
  const response = await octokit.request("GET /repos/{owner}/{repo}", {
    owner,
    repo
  });

  return {
    defaultBranch: response.data.default_branch ?? "main",
    fullUrl: response.data.html_url
  };
}

async function fetchTextFile(owner: string, repo: string, path: string, ref: string): Promise<string | null> {
  try {
    const response = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
      owner,
      repo,
      path,
      ref,
      headers: {
        accept: "application/vnd.github+json"
      }
    });

    const data = response.data as {
      type?: string;
      content?: string;
      encoding?: string;
    };

    if (Array.isArray(data) || data.type !== "file" || !data.content) {
      return null;
    }

    if (data.encoding === "base64") {
      return Buffer.from(data.content, "base64").toString("utf8");
    }

    return data.content;
  } catch (error) {
    const typedError = error as { status?: number };
    if (typedError.status === 404) {
      return null;
    }

    throw error;
  }
}

async function findFirstExistingFile(
  owner: string,
  repo: string,
  defaultBranch: string,
  candidates: string[]
): Promise<{ path: string; content: string } | null> {
  for (const candidate of candidates) {
    const content = await fetchTextFile(owner, repo, candidate, defaultBranch);
    if (content) {
      return { path: candidate, content };
    }
  }

  return null;
}

function parseDockerfile(rawDockerfile: string) {
  const fromMatches = [...rawDockerfile.matchAll(/^\s*FROM\s+([^\s]+).*/gim)];
  const exposeMatches = [...rawDockerfile.matchAll(/^\s*EXPOSE\s+([^\n\r]+)/gim)];

  const exposedPorts = exposeMatches
    .flatMap((match) => match[1].split(/\s+/g))
    .map((entry) => Number.parseInt(entry, 10))
    .filter((port) => Number.isFinite(port));

  return {
    baseImage: fromMatches.length > 0 ? fromMatches[0][1] : undefined,
    multiStage: fromMatches.length > 1,
    exposedPorts
  };
}

function inferFramework(depNames: string[]): string {
  if (depNames.includes("next")) return "Next.js";
  if (depNames.includes("nuxt")) return "Nuxt";
  if (depNames.includes("react")) return "React SPA";
  if (depNames.includes("nestjs") || depNames.includes("@nestjs/core")) return "NestJS API";
  if (depNames.includes("fastify")) return "Fastify API";
  if (depNames.includes("express")) return "Express API";
  if (depNames.includes("svelte") || depNames.includes("@sveltejs/kit")) return "SvelteKit";

  return "Node.js Service";
}

function inferDatabaseDependency(depNames: string[]): boolean {
  const dbMarkers = [
    "pg",
    "postgres",
    "mysql",
    "mysql2",
    "sqlite",
    "better-sqlite3",
    "mongodb",
    "mongoose",
    "prisma",
    "drizzle-orm",
    "redis",
    "ioredis"
  ];

  return dbMarkers.some((marker) => depNames.includes(marker));
}

function estimateHeuristics(input: {
  framework: string;
  depCount: number;
  devDepCount: number;
  hasDockerfile: boolean;
  hasDatabaseDependency: boolean;
  scripts: Record<string, string>;
}) {
  const warnings: string[] = [];

  let cpuBaseline = 0.25;
  let memoryMb = 384;
  let diskGb = 4;
  let buildMinutes = 3;
  let bandwidthGbPerMau = 0.2;

  if (input.framework === "Next.js") {
    cpuBaseline += 0.25;
    memoryMb += 256;
    buildMinutes += 3;
    bandwidthGbPerMau += 0.15;
  }

  if (input.framework.includes("API")) {
    cpuBaseline += 0.2;
    memoryMb += 128;
    bandwidthGbPerMau += 0.08;
  }

  if (input.depCount > 60) {
    cpuBaseline += 0.2;
    memoryMb += 192;
    buildMinutes += 2;
  }

  if (input.devDepCount > 80) {
    buildMinutes += 3;
  }

  if (input.hasDockerfile) {
    diskGb += 2;
  }

  if (input.hasDatabaseDependency) {
    memoryMb += 256;
    cpuBaseline += 0.1;
    warnings.push("Detected database dependencies; model includes managed DB baseline costs.");
  }

  if (!input.scripts.start && !input.scripts.dev) {
    warnings.push("No start script found in package.json. Runtime profile confidence is lower.");
  }

  const complexityScore = input.depCount + input.devDepCount * 0.5 + (input.hasDockerfile ? 12 : 0);
  const complexity: Complexity = complexityScore < 55 ? "low" : complexityScore < 125 ? "medium" : "high";

  if (complexity === "high") {
    cpuBaseline += 0.2;
    memoryMb += 256;
    bandwidthGbPerMau += 0.08;
  }

  return {
    heuristics: {
      cpuBaseline: Number(cpuBaseline.toFixed(2)),
      memoryMb,
      diskGb,
      buildMinutes,
      bandwidthGbPerMau: Number(bandwidthGbPerMau.toFixed(2)),
      complexity
    },
    warnings
  };
}

export async function analyzeGitHubRepository(repoUrl: string): Promise<RepoAnalysis> {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  const metadata = await fetchRepoMetadata(owner, repo);

  const packageFile = await findFirstExistingFile(owner, repo, metadata.defaultBranch, PACKAGE_JSON_CANDIDATES);
  const dockerFile = await findFirstExistingFile(owner, repo, metadata.defaultBranch, DOCKERFILE_CANDIDATES);

  const warnings: string[] = [];
  let packageJson: PackageJsonShape = {};

  if (packageFile) {
    try {
      packageJson = JSON.parse(packageFile.content) as PackageJsonShape;
    } catch {
      warnings.push(`Could not parse ${packageFile.path}; JSON is invalid.`);
    }
  } else {
    warnings.push("No package.json found in common locations. Estimation uses conservative Node defaults.");
  }

  const dependencies = Object.keys(packageJson.dependencies ?? {});
  const devDependencies = Object.keys(packageJson.devDependencies ?? {});
  const allDependencies = [...new Set([...dependencies, ...devDependencies])];

  const framework = inferFramework(allDependencies);
  const hasDatabaseDependency = inferDatabaseDependency(allDependencies);

  const scriptMap = packageJson.scripts ?? {};
  const { heuristics, warnings: heuristicWarnings } = estimateHeuristics({
    framework,
    depCount: dependencies.length,
    devDepCount: devDependencies.length,
    hasDockerfile: Boolean(dockerFile),
    hasDatabaseDependency,
    scripts: scriptMap
  });

  const dockerSignals = dockerFile
    ? parseDockerfile(dockerFile.content)
    : {
        baseImage: undefined,
        multiStage: false,
        exposedPorts: [] as number[]
      };

  if (!dockerFile) {
    warnings.push("No Dockerfile found. Containerization overhead is estimated from package metadata only.");
  }

  const runtimePackageManager = packageJson.packageManager
    ? packageJson.packageManager.split("@")[0]
    : dependencies.includes("next")
      ? "npm"
      : "unknown";

  return {
    parsedRepository: {
      owner,
      repo,
      defaultBranch: metadata.defaultBranch,
      repoUrl: metadata.fullUrl
    },
    packageJsonFound: Boolean(packageFile),
    packageJsonPath: packageFile?.path,
    docker: {
      found: Boolean(dockerFile),
      filePath: dockerFile?.path,
      baseImage: dockerSignals.baseImage,
      multiStage: dockerSignals.multiStage,
      exposedPorts: dockerSignals.exposedPorts
    },
    runtime: {
      framework,
      packageManager: runtimePackageManager,
      nodeVersion: packageJson.engines?.node ?? null,
      hasDatabaseDependency,
      buildCommand: scriptMap.build ?? "npm run build",
      startCommand: scriptMap.start ?? "npm run start"
    },
    dependencyCounts: {
      dependencies: dependencies.length,
      devDependencies: devDependencies.length,
      total: dependencies.length + devDependencies.length
    },
    topDependencies: allDependencies.slice(0, 12),
    scripts: Object.keys(scriptMap),
    heuristics,
    warnings: [...warnings, ...heuristicWarnings]
  };
}
