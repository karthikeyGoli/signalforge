import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compilePrompt } from "../src/compiler/compiler.js";
import { listPatterns, recentHistoryResource, savePattern } from "../src/memory/patternStore.js";

describe("privacy defaults", () => {
  it("does not save raw prompts during compilation", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "signalforge-"));
    const secretPrompt = "use my private token sk-secret to do something";
    compilePrompt({ rawPrompt: secretPrompt, targetClient: "codex" });
    await expect(readFile(join(cwd, ".signalforge", "history.jsonl"), "utf8")).rejects.toThrow();
  });

  it("saves only user-approved patterns", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "signalforge-"));
    await savePattern({ name: "debugger", useCase: "debugging", targetClient: "codex", template: "Debug [issue]" }, cwd);
    const patterns = await listPatterns({}, cwd);
    expect(patterns).toHaveLength(1);
    expect(patterns[0]?.template).toBe("Debug [issue]");
  });

  it("keeps recent history empty by default", () => {
    expect(recentHistoryResource().entries).toEqual([]);
  });
});
