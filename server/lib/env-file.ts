import fs from "fs/promises";
import { resolveSafePath } from "./paths.js";

export interface EnvVariable {
  key: string;
  value: string;
  isSecret: boolean;
}

const SECRET_PATTERNS = /password|secret|token|key|api_key|apikey|auth|credential/i;

export function parseEnvContent(content: string): EnvVariable[] {
  const vars: EnvVariable[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars.push({ key, value, isSecret: SECRET_PATTERNS.test(key) });
  }
  return vars;
}

export function serializeEnv(vars: EnvVariable[]): string {
  return vars.map((v) => `${v.key}=${v.value}`).join("\n") + "\n";
}

export async function readEnvFile(filePath: string): Promise<EnvVariable[]> {
  const resolved = resolveSafePath(filePath);
  if (!resolved) throw new Error("Invalid path");
  const content = await fs.readFile(resolved, "utf-8");
  return parseEnvContent(content);
}

export async function writeEnvFile(filePath: string, vars: EnvVariable[]): Promise<void> {
  const resolved = resolveSafePath(filePath);
  if (!resolved) throw new Error("Invalid path");
  await fs.writeFile(resolved, serializeEnv(vars), "utf-8");
}

export async function findEnvFiles(): Promise<string[]> {
  const { getFileRoot } = await import("./paths.js");
  const { readdir } = await import("fs/promises");
  const path = await import("path");
  const root = getFileRoot();
  const found: string[] = [];

  async function walk(dir: string, depth: number) {
    if (depth > 3) return;
    const entries = await readdir(path.join(root, dir), { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      const rel = dir ? `${dir}/${e.name}` : e.name;
      if (e.isFile() && (e.name === ".env" || e.name.endsWith(".env"))) {
        found.push(rel);
      } else if (e.isDirectory() && e.name !== "node_modules") {
        await walk(rel, depth + 1);
      }
    }
  }

  await walk("", 0);
  return found;
}
