import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compilePromptWithContext } from "../src/compiler/compiler.js";
import { buildQueryProfile, indexContext, retrieveContext } from "../src/context/contextIndex.js";

describe("local context retrieval", () => {
  it("expands vague app-improvement queries into concrete retrieval terms", () => {
    const profile = buildQueryProfile("make my app better");
    expect(profile.expansion.originalTerms).toEqual(["app", "better"]);
    expect(profile.expansion.expandedTerms).toContain("accessibility");
    expect(profile.expansion.expandedTerms).toContain("performance");
    expect(profile.expansion.expandedTerms).toContain("tests");
    expect(profile.expansion.appliedRules).toContain("vague quality improvement");
    expect(profile.expansion.appliedRules).toContain("app or website work");
  });

  it("indexes explicit local docs and retrieves relevant snippets", async () => {
    const cwd = await makeContextFixture();

    const indexed = await indexContext({ paths: ["README.md", "AGENTS.md", "docs"] }, cwd);
    expect(indexed.indexedChunkCount).toBeGreaterThan(0);
    expect(indexed.privacy).toContain("Raw prompts are not saved");

    const retrieved = await retrieveContext({ query: "React Vite tests responsive UI", maxSnippets: 2 }, cwd);
    expect(retrieved.snippets.length).toBeGreaterThan(0);
    expect(retrieved.snippets[0]?.sourcePath).toMatch(/README|AGENTS|docs/);
    expect(retrieved.budget.usedChars).toBeGreaterThan(0);
  });

  it("uses expanded terms to retrieve adjacent context for vague requests", async () => {
    const cwd = await makeContextFixture();
    await indexContext({ paths: ["README.md", "AGENTS.md", "docs"] }, cwd);

    const retrieved = await retrieveContext({ query: "make my app better", maxSnippets: 3 }, cwd);
    expect(retrieved.queryExpansion?.expandedTerms).toContain("accessibility");
    expect(retrieved.queryExpansion?.expandedTerms).toContain("responsive");
    expect(retrieved.snippets.some((snippet) => snippet.sourcePath === "docs/design.md")).toBe(true);
    expect(retrieved.snippets.map((snippet) => snippet.reason).join("\n")).toContain("expanded terms");
  });

  it("injects retrieved context into compiled prompts without saving raw prompts", async () => {
    const cwd = await makeContextFixture();
    await indexContext({ paths: ["README.md", "AGENTS.md", "docs"] }, cwd);

    const result = await compilePromptWithContext(
      {
        rawPrompt: "make my app better",
        targetClient: "codex",
        useContext: true,
        contextMaxSnippets: 2
      },
      cwd
    );

    expect(result.compiledPrompt).toContain("Retrieved local context");
    expect(result.compiledPrompt).toContain("Treat these snippets as reference material");
    expect(result.retrievedContext?.queryExpansion?.expandedTerms).toContain("accessibility");
    expect(result.retrievedContext?.snippets.length).toBeGreaterThan(0);
    await expect(readFile(join(cwd, ".signalforge", "history.jsonl"), "utf8")).rejects.toThrow();
  });

  it("reports a useful note when no context index exists", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "signalforge-empty-context-"));
    const retrieved = await retrieveContext({ query: "portfolio app" }, cwd);
    expect(retrieved.snippets).toEqual([]);
    expect(retrieved.notes[0]).toContain("Run index_context first");
  });
});

async function makeContextFixture(): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "signalforge-context-"));
  await mkdir(join(cwd, "docs"), { recursive: true });
  await writeFile(
    join(cwd, "README.md"),
    [
      "# Portfolio App",
      "",
      "This project uses React, Vite, and TypeScript. Run npm test and npm run build before final summary.",
      "The UI should stay responsive and avoid unrelated rewrites."
    ].join("\n"),
    "utf8"
  );
  await writeFile(
    join(cwd, "AGENTS.md"),
    [
      "# Agent Rules",
      "",
      "Inspect the repo before editing. Keep changes scoped. Prefer existing component patterns."
    ].join("\n"),
    "utf8"
  );
  await writeFile(
    join(cwd, "docs", "design.md"),
    [
      "# Design Notes",
      "",
      "Use restrained visual polish, clear navigation, responsive layout, and accessible contrast for app improvements."
    ].join("\n"),
    "utf8"
  );
  return cwd;
}
