import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PromptPattern, TargetClient } from "../types.js";

const STORE_DIR = ".signalforge";
const PATTERNS_FILE = "patterns.json";

export async function savePattern(pattern: Omit<PromptPattern, "savedAt">, cwd = process.cwd()): Promise<PromptPattern> {
  const patterns = await listPatterns({}, cwd);
  const saved: PromptPattern = { ...pattern, savedAt: new Date().toISOString() };
  const next = [...patterns.filter((item) => item.name !== saved.name), saved].sort((a, b) => a.name.localeCompare(b.name));
  await writePatterns(next, cwd);
  return saved;
}

export async function listPatterns(
  filters: { targetClient?: TargetClient; useCase?: string } = {},
  cwd = process.cwd()
): Promise<PromptPattern[]> {
  const patterns = await readPatterns(cwd);
  return patterns.filter((pattern) => {
    if (filters.targetClient && pattern.targetClient !== filters.targetClient) return false;
    if (filters.useCase && pattern.useCase !== filters.useCase) return false;
    return true;
  });
}

export async function readPatternsResource(cwd = process.cwd()): Promise<{ patterns: PromptPattern[]; privacy: string }> {
  return {
    patterns: await listPatterns({}, cwd),
    privacy: "SignalForge stores only user-approved prompt patterns. Raw prompts are not saved by default."
  };
}

export function recentHistoryResource(): { enabled: boolean; entries: unknown[]; privacy: string } {
  return {
    enabled: process.env.SIGNALFORGE_HISTORY === "1",
    entries: [],
    privacy: "Raw prompt history is disabled in v1. Set SIGNALFORGE_HISTORY=1 only after implementing anonymized summaries."
  };
}

async function readPatterns(cwd: string): Promise<PromptPattern[]> {
  try {
    const text = await readFile(storePath(cwd), "utf8");
    const parsed = JSON.parse(text) as unknown;
    return Array.isArray(parsed) ? (parsed as PromptPattern[]) : [];
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

async function writePatterns(patterns: PromptPattern[], cwd: string): Promise<void> {
  await mkdir(join(cwd, STORE_DIR), { recursive: true });
  await writeFile(storePath(cwd), `${JSON.stringify(patterns, null, 2)}\n`, "utf8");
}

function storePath(cwd: string): string {
  return join(cwd, STORE_DIR, PATTERNS_FILE);
}
