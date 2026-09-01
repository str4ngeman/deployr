import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { getFileRoot } from "./paths.js";

const execFileAsync = promisify(execFile);

export interface ComposeProject {
  name: string;
  path: string;
  composeFile: string;
  services: string[];
}

const COMPOSE_NAMES = ["docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"];

async function findComposeFiles(dir: string, maxDepth = 4, depth = 0): Promise<string[]> {
  if (depth > maxDepth) return [];
  const found: string[] = [];

  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isFile() && COMPOSE_NAMES.includes(entry.name)) {
      found.push(full);
    } else if (entry.isDirectory()) {
      found.push(...(await findComposeFiles(full, maxDepth, depth + 1)));
    }
  }
  return found;
}

function parseServices(composeContent: string): string[] {
  const services: string[] = [];
  const match = composeContent.match(/^services:\s*$/m);
  if (!match) return services;

  const lines = composeContent.split("\n");
  let inServices = false;
  for (const line of lines) {
    if (/^services:\s*$/.test(line)) {
      inServices = true;
      continue;
    }
    if (inServices) {
      if (/^[a-zA-Z]/.test(line) && !line.startsWith(" ")) break;
      const svc = line.match(/^  ([\w-]+):/);
      if (svc) services.push(svc[1]);
    }
  }
  return services;
}

export async function discoverComposeProjects(): Promise<ComposeProject[]> {
  const root = getFileRoot();
  const files = await findComposeFiles(root);
  const projects: ComposeProject[] = [];

  for (const composeFile of files) {
    const dir = path.dirname(composeFile);
    const content = await fs.readFile(composeFile, "utf-8");
    const rel = path.relative(root, dir);
    projects.push({
      name: rel || path.basename(dir),
      path: rel,
      composeFile: path.relative(root, composeFile),
      services: parseServices(content),
    });
  }

  return projects.sort((a, b) => a.name.localeCompare(b.name));
}

async function runCompose(
  projectPath: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  const root = getFileRoot();
  const cwd = path.join(root, projectPath);
  const { stdout, stderr } = await execFileAsync("docker", ["compose", ...args], {
    cwd,
    timeout: 300000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return { stdout, stderr };
}

export async function composePull(projectPath: string): Promise<string> {
  const { stdout } = await runCompose(projectPath, ["pull"]);
  return stdout || "Pull complete";
}

export async function composeUp(projectPath: string): Promise<string> {
  const { stdout } = await runCompose(projectPath, ["up", "-d"]);
  return stdout || "Started";
}

export async function composeDown(projectPath: string): Promise<string> {
  const { stdout } = await runCompose(projectPath, ["down"]);
  return stdout || "Stopped";
}

export async function composePs(projectPath: string): Promise<string> {
  const { stdout } = await runCompose(projectPath, ["ps"]);
  return stdout;
}

export async function composeRestart(projectPath: string): Promise<string> {
  const { stdout } = await runCompose(projectPath, ["restart"]);
  return stdout || "Restarted";
}

export async function composeDeploy(projectPath: string): Promise<string> {
  await runCompose(projectPath, ["pull"]);
  const { stdout } = await runCompose(projectPath, ["up", "-d", "--force-recreate"]);
  return stdout || "Deployed";
}
