import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, extname, isAbsolute, join, relative, resolve } from "node:path";
import type {
  ContextChunk,
  ContextIndex,
  ContextSourceKind,
  ContextTrustLevel,
  QueryExpansion,
  RetrievedContext,
  RetrievedContextSnippet
} from "../types.js";

const STORE_DIR = ".signalforge";
const CONTEXT_FILE = "context-index.json";
const INDEX_VERSION = 1 as const;
const DEFAULT_MAX_FILE_BYTES = 40_000;
const DEFAULT_MAX_FILES = 40;
const CHUNK_CHARS = 1_200;
const CHUNK_OVERLAP_CHARS = 160;

const allowedExtensions = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".json",
  ".jsonc",
  ".yaml",
  ".yml",
  ".toml",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py"
]);

const ignoredDirectories = new Set([".git", "node_modules", "dist", "build", "coverage", ".signalforge"]);

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "make",
  "my",
  "of",
  "on",
  "or",
  "should",
  "the",
  "this",
  "to",
  "use",
  "with"
]);

const weakIntentTerms = new Set(["app", "better", "improve", "improved", "improving", "modern", "professional", "clean", "polish"]);

const expansionRules: Array<{ name: string; patterns: RegExp[]; terms: string[] }> = [
  {
    name: "vague quality improvement",
    patterns: [/\bbetter\b/i, /\bimprove\b/i, /\bpolish\b/i, /\bprofessional\b/i, /\bmodern\b/i, /\bclean(er)?\b/i, /\bupgrade\b/i],
    terms: [
      "ux",
      "ui",
      "accessibility",
      "accessible",
      "a11y",
      "performance",
      "responsive",
      "navigation",
      "layout",
      "visual",
      "contrast",
      "onboarding",
      "loading",
      "empty",
      "error",
      "state",
      "tests",
      "build",
      "lint"
    ]
  },
  {
    name: "app or website work",
    patterns: [/\bapp\b/i, /\bwebsite\b/i, /\bsite\b/i, /\bfrontend\b/i, /\bpage\b/i, /\bui\b/i],
    terms: ["component", "route", "screen", "design", "responsive", "accessibility", "package", "scripts", "readme", "agents"]
  },
  {
    name: "coding agent setup",
    patterns: [/\bcodex\b/i, /\bclaude\b/i, /\bcursor\b/i, /\bagent\b/i, /\brepo\b/i, /\bcodebase\b/i],
    terms: ["agents", "claude", "readme", "package", "scripts", "test", "build", "conventions", "verification"]
  },
  {
    name: "bug or debugging",
    patterns: [/\bfix\b/i, /\bbug\b/i, /\berror\b/i, /\bfailing\b/i, /\bbroken\b/i, /\bdebug\b/i],
    terms: ["logs", "stack", "trace", "reproduce", "test", "regression", "failure", "expected", "actual"]
  },
  {
    name: "research or comparison",
    patterns: [/\bresearch\b/i, /\bcompare\b/i, /\bcompetitor\b/i, /\bmarket\b/i, /\balternative\b/i],
    terms: ["sources", "evidence", "criteria", "comparison", "tradeoffs", "recommendation", "summary"]
  },
  {
    name: "prompt or cost optimization",
    patterns: [/\bprompt\b/i, /\btokens?\b/i, /\bcost\b/i, /\bcredits?\b/i, /\bcompile\b/i],
    terms: ["clarity", "missing", "context", "workflow", "split", "budget", "waste", "adapter"]
  }
];

type QueryTerm = {
  term: string;
  weight: number;
  origin: "direct" | "expanded";
};

type QueryProfile = {
  terms: QueryTerm[];
  expansion: QueryExpansion;
};

export type IndexContextInput = {
  paths?: string[];
  kind?: ContextSourceKind;
  trustLevel?: ContextTrustLevel;
  tags?: string[];
  maxFileBytes?: number;
  maxFiles?: number;
};

export type RetrieveContextInput = {
  query: string;
  maxSnippets?: number;
  contextBudget?: number;
  trustLevels?: ContextTrustLevel[];
};

export async function indexContext(input: IndexContextInput = {}, cwd = process.cwd()) {
  const kind = input.kind ?? "project_doc";
  const trustLevel = input.trustLevel ?? "verified";
  const maxFileBytes = input.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const maxFiles = input.maxFiles ?? DEFAULT_MAX_FILES;
  const paths = input.paths?.length ? input.paths : await defaultContextPaths(cwd);
  const skipped: string[] = [];
  const files = await collectContextFiles(paths, cwd, maxFiles, skipped);
  const indexedAt = new Date().toISOString();
  const chunks: ContextChunk[] = [];

  for (const filePath of files) {
    try {
      const text = await readFileLimited(filePath, maxFileBytes);
      const sourcePath = displayPath(filePath, cwd);
      chunks.push(
        ...chunkText(text).map((chunk, chunkIndex) => ({
          id: stableId(sourcePath, chunkIndex, chunk),
          title: inferTitle(text, sourcePath),
          sourcePath,
          kind,
          trustLevel,
          tags: input.tags ?? [],
          text: chunk,
          chunkIndex,
          indexedAt
        }))
      );
    } catch (error) {
      skipped.push(`${displayPath(filePath, cwd)}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const existing = await readContextIndex(cwd);
  const replacedSources = new Set(files.map((filePath) => displayPath(filePath, cwd)));
  const mergedChunks = [
    ...existing.chunks.filter((chunk) => !replacedSources.has(chunk.sourcePath)),
    ...chunks
  ].sort((a, b) => a.sourcePath.localeCompare(b.sourcePath) || a.chunkIndex - b.chunkIndex);
  const nextIndex: ContextIndex = {
    version: INDEX_VERSION,
    updatedAt: indexedAt,
    chunks: mergedChunks
  };

  await writeContextIndex(nextIndex, cwd);

  return {
    indexedFiles: files.map((filePath) => displayPath(filePath, cwd)),
    indexedChunkCount: chunks.length,
    totalChunkCount: nextIndex.chunks.length,
    skipped,
    storagePath: contextIndexPath(cwd),
    privacy: "Only explicitly indexed local files are stored. Raw prompts are not saved."
  };
}

export async function retrieveContext(input: RetrieveContextInput, cwd = process.cwd()): Promise<RetrievedContext> {
  const index = await readContextIndex(cwd);
  const maxSnippets = input.maxSnippets ?? 4;
  const maxChars = budgetToChars(input.contextBudget);
  const queryProfile = buildQueryProfile(input.query);
  const notes: string[] = [];

  if (!index.chunks.length) {
    return {
      enabled: true,
      query: input.query,
      queryExpansion: queryProfile.expansion,
      snippets: [],
      budget: { maxSnippets, maxChars, usedChars: 0 },
      notes: ["No context index found. Run index_context first with trusted docs or repo guidance."]
    };
  }

  if (!queryProfile.terms.length) {
    notes.push("Query had no searchable terms after stop-word filtering.");
  }
  if (queryProfile.expansion.expandedTerms.length) {
    notes.push(`Expanded query with: ${queryProfile.expansion.expandedTerms.slice(0, 12).join(", ")}.`);
  }

  const allowedTrustLevels = input.trustLevels?.length ? new Set(input.trustLevels) : undefined;
  const candidates = allowedTrustLevels
    ? index.chunks.filter((chunk) => allowedTrustLevels.has(chunk.trustLevel))
    : index.chunks;
  const scored = candidates
    .map((chunk) => scoreChunk(chunk, queryProfile, index.chunks))
    .filter((snippet) => snippet.score > 0)
    .sort((a, b) => b.score - a.score || a.sourcePath.localeCompare(b.sourcePath));

  const snippets: RetrievedContextSnippet[] = [];
  let usedChars = 0;
  const sourceCounts = new Map<string, number>();

  for (const snippet of scored) {
    if (snippets.length >= maxSnippets) break;
    if ((sourceCounts.get(snippet.sourcePath) ?? 0) >= 2) continue;
    const nextUsedChars = usedChars + snippet.text.length;
    if (snippets.length > 0 && nextUsedChars > maxChars) continue;
    snippets.push(snippet);
    usedChars = nextUsedChars;
    sourceCounts.set(snippet.sourcePath, (sourceCounts.get(snippet.sourcePath) ?? 0) + 1);
  }

  if (!snippets.length) {
    notes.push("No indexed context matched this query. Compile without context or index more specific docs.");
  }
  if (scored.length > snippets.length) {
    notes.push("Additional context matched but was excluded by snippet or context budget limits.");
  }

  return {
    enabled: true,
    query: input.query,
    queryExpansion: queryProfile.expansion,
    snippets,
    budget: { maxSnippets, maxChars, usedChars },
    notes
  };
}

export async function readContextResource(cwd = process.cwd()) {
  const index = await readContextIndex(cwd);
  return {
    version: index.version,
    updatedAt: index.updatedAt,
    chunkCount: index.chunks.length,
    sources: summarizeSources(index.chunks),
    privacy: "This resource summarizes explicitly indexed local context. Use retrieve_context for budgeted snippets."
  };
}

export async function readContextIndex(cwd = process.cwd()): Promise<ContextIndex> {
  try {
    const text = await readFile(contextIndexPath(cwd), "utf8");
    const parsed = JSON.parse(text) as Partial<ContextIndex>;
    if (parsed.version === INDEX_VERSION && Array.isArray(parsed.chunks)) {
      return {
        version: INDEX_VERSION,
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
        chunks: parsed.chunks as ContextChunk[]
      };
    }
    return emptyIndex();
  } catch (error) {
    if (isMissingFile(error)) return emptyIndex();
    throw error;
  }
}

function scoreChunk(chunk: ContextChunk, queryProfile: QueryProfile, allChunks: ContextChunk[]): RetrievedContextSnippet {
  const bodyTokens = tokenize(chunk.text);
  const titleTokens = tokenize(chunk.title);
  const sourceTokens = tokenize(chunk.sourcePath);
  const bodyCounts = countTokens(bodyTokens);
  const titleCounts = countTokens(titleTokens);
  const sourceCounts = countTokens(sourceTokens);
  const matched: Array<{ term: string; count: number; origin: "direct" | "expanded" }> = [];
  let score = 0;

  for (const queryTerm of queryProfile.terms) {
    const { term, weight, origin } = queryTerm;
    const bodyHit = bodyCounts.get(term) ?? 0;
    const titleHit = titleCounts.get(term) ?? 0;
    const sourceHit = sourceCounts.get(term) ?? 0;
    const hits = bodyHit + titleHit + sourceHit;
    if (!hits) continue;
    const idf = inverseDocumentFrequency(term, allChunks);
    score += (bodyHit * idf + titleHit * idf * 3 + sourceHit * idf * 2) * weight;
    matched.push({ term, count: hits, origin });
  }

  if (matched.length) {
    score += trustBoost(chunk.trustLevel);
    score += sourceBoost(chunk, queryProfile);
  }
  score = Number((score / Math.sqrt(Math.max(20, bodyTokens.length))).toFixed(3));

  const directTerms = matched
    .filter((item) => item.origin === "direct")
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((item) => item.term);
  const expandedTerms = matched
    .filter((item) => item.origin === "expanded")
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map((item) => item.term);
  const reasonParts = [
    directTerms.length ? `direct terms: ${directTerms.join(", ")}` : undefined,
    expandedTerms.length ? `expanded terms: ${expandedTerms.join(", ")}` : undefined
  ].filter((part): part is string => Boolean(part));

  return {
    id: chunk.id,
    title: chunk.title,
    sourcePath: chunk.sourcePath,
    kind: chunk.kind,
    trustLevel: chunk.trustLevel,
    score,
    reason: reasonParts.length ? `Matched ${reasonParts.join("; ")}` : "No direct or expanded term match.",
    text: chunk.text
  };
}

export function buildQueryProfile(query: string): QueryProfile {
  const directTerms = unique(tokenize(query));
  const termMap = new Map<string, QueryTerm>();
  const appliedRules: string[] = [];

  for (const term of directTerms) {
    termMap.set(term, {
      term,
      weight: weakIntentTerms.has(term) ? 0.45 : 1,
      origin: "direct"
    });
  }

  for (const rule of expansionRules) {
    if (!rule.patterns.some((pattern) => pattern.test(query))) continue;
    appliedRules.push(rule.name);
    for (const term of unique(tokenize(rule.terms.join(" ")))) {
      if (termMap.has(term)) continue;
      termMap.set(term, { term, weight: 0.65, origin: "expanded" });
    }
  }

  const terms = Array.from(termMap.values());
  return {
    terms,
    expansion: {
      originalTerms: directTerms,
      expandedTerms: terms.filter((term) => term.origin === "expanded").map((term) => term.term),
      appliedRules
    }
  };
}

function inverseDocumentFrequency(term: string, chunks: ContextChunk[]): number {
  const documentsWithTerm = chunks.filter((chunk) => tokenize(chunk.text).includes(term)).length;
  return Math.log((chunks.length + 1) / (documentsWithTerm + 1)) + 1;
}

function trustBoost(trustLevel: ContextTrustLevel): number {
  switch (trustLevel) {
    case "verified":
      return 0.35;
    case "user_approved":
      return 0.25;
    case "generated":
      return 0.1;
    default:
      return 0;
  }
}

function sourceBoost(chunk: ContextChunk, queryProfile: QueryProfile): number {
  const source = chunk.sourcePath.toLowerCase();
  const rules = new Set(queryProfile.expansion.appliedRules);
  let boost = 0;

  if (rules.has("app or website work") || rules.has("vague quality improvement")) {
    if (source.endsWith("agents.md") || source.endsWith("claude.md")) boost += 0.5;
    if (source.endsWith("package.json")) boost += 0.45;
    if (source.includes("design") || source.includes("ux") || source.includes("accessibility")) boost += 0.35;
    if (source.endsWith("readme.md")) boost += 0.2;
  }

  if (rules.has("bug or debugging") && (source.includes("test") || source.includes("spec") || source.includes("debug"))) {
    boost += 0.35;
  }

  return boost;
}

async function collectContextFiles(paths: string[], cwd: string, maxFiles: number, skipped: string[]): Promise<string[]> {
  const files: string[] = [];
  for (const pathInput of paths) {
    if (files.length >= maxFiles) break;
    const path = resolvePath(pathInput, cwd);
    try {
      await collectPath(path, cwd, files, maxFiles, skipped);
    } catch (error) {
      skipped.push(`${pathInput}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return Array.from(new Set(files)).slice(0, maxFiles);
}

async function collectPath(path: string, cwd: string, files: string[], maxFiles: number, skipped: string[]): Promise<void> {
  if (files.length >= maxFiles) return;
  const pathStat = await stat(path);
  if (pathStat.isDirectory()) {
    if (ignoredDirectories.has(basename(path))) return;
    const entries = await readdir(path, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (files.length >= maxFiles) return;
      const child = join(path, entry.name);
      if (entry.isDirectory()) {
        await collectPath(child, cwd, files, maxFiles, skipped);
      } else if (entry.isFile() && isAllowedFile(child)) {
        files.push(child);
      }
    }
    return;
  }
  if (pathStat.isFile() && isAllowedFile(path)) {
    files.push(path);
  } else {
    skipped.push(`${displayPath(path, cwd)}: unsupported file type`);
  }
}

async function defaultContextPaths(cwd: string): Promise<string[]> {
  const candidates = ["README.md", "AGENTS.md", "CLAUDE.md", ".claude/CLAUDE.md", "package.json", "docs"];
  const existing: string[] = [];
  for (const candidate of candidates) {
    try {
      await stat(resolvePath(candidate, cwd));
      existing.push(candidate);
    } catch (error) {
      if (!isMissingFile(error)) throw error;
    }
  }
  return existing;
}

async function readFileLimited(path: string, maxBytes: number): Promise<string> {
  const text = await readFile(path, "utf8");
  if (Buffer.byteLength(text, "utf8") <= maxBytes) return text;
  return `${text.slice(0, maxBytes)}\n\n[SignalForge truncated this file at ${maxBytes} bytes during indexing.]`;
}

function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\t/g, "  ").trim();
  if (!normalized) return [];
  const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
      continue;
    }
    if (current.length + paragraph.length + 2 <= CHUNK_CHARS) {
      current = `${current}\n\n${paragraph}`;
      continue;
    }
    chunks.push(current);
    current = paragraph;
  }
  if (current) chunks.push(current);

  return chunks.flatMap((chunk) => {
    if (chunk.length <= CHUNK_CHARS) return [chunk];
    const splitChunks: string[] = [];
    for (let index = 0; index < chunk.length; index += CHUNK_CHARS - CHUNK_OVERLAP_CHARS) {
      splitChunks.push(chunk.slice(index, index + CHUNK_CHARS).trim());
    }
    return splitChunks.filter(Boolean);
  });
}

function inferTitle(text: string, sourcePath: string): string {
  const heading = text.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || basename(sourcePath);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9_-]{1,}/g)
    ?.map((token) => token.replace(/^_+|_+$/g, ""))
    .filter((token) => token.length > 1 && !stopWords.has(token)) ?? [];
}

function countTokens(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function summarizeSources(chunks: ContextChunk[]) {
  const sourceMap = new Map<string, { sourcePath: string; title: string; kind: ContextSourceKind; trustLevel: ContextTrustLevel; chunks: number }>();
  for (const chunk of chunks) {
    const existing = sourceMap.get(chunk.sourcePath);
    if (existing) {
      existing.chunks += 1;
      continue;
    }
    sourceMap.set(chunk.sourcePath, {
      sourcePath: chunk.sourcePath,
      title: chunk.title,
      kind: chunk.kind,
      trustLevel: chunk.trustLevel,
      chunks: 1
    });
  }
  return Array.from(sourceMap.values()).sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
}

function budgetToChars(contextBudget?: number): number {
  if (!contextBudget) return 1_800;
  return Math.max(600, Math.min(6_000, contextBudget * 4));
}

function isAllowedFile(path: string): boolean {
  return allowedExtensions.has(extname(path).toLowerCase());
}

function resolvePath(pathInput: string, cwd: string): string {
  return isAbsolute(pathInput) ? resolve(pathInput) : resolve(cwd, pathInput);
}

function displayPath(path: string, cwd: string): string {
  const rel = relative(cwd, path);
  return rel && !rel.startsWith("..") && !isAbsolute(rel) ? rel.replace(/\\/g, "/") : path;
}

async function writeContextIndex(index: ContextIndex, cwd: string): Promise<void> {
  await mkdir(join(cwd, STORE_DIR), { recursive: true });
  await writeFile(contextIndexPath(cwd), `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

function contextIndexPath(cwd: string): string {
  return join(cwd, STORE_DIR, CONTEXT_FILE);
}

function emptyIndex(): ContextIndex {
  return { version: INDEX_VERSION, updatedAt: new Date(0).toISOString(), chunks: [] };
}

function stableId(sourcePath: string, chunkIndex: number, text: string): string {
  return `ctx_${createHash("sha256").update(`${sourcePath}:${chunkIndex}:${text}`).digest("hex").slice(0, 16)}`;
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
