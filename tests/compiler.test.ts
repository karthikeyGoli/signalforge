import { describe, expect, it } from "vitest";
import { analyzePrompt, classifyTask } from "../src/compiler/analyzer.js";
import { compilePrompt } from "../src/compiler/compiler.js";

describe("prompt analysis", () => {
  it("classifies coding prompts", () => {
    expect(classifyTask("build a React dashboard")).toBe("coding");
  });

  it("detects missing context for vague coding prompts", () => {
    const analysis = analyzePrompt({ rawPrompt: "build me a portfolio app", targetClient: "codex" });
    expect(analysis.taskType).toBe("coding");
    expect(analysis.missingContext).toContain("environment");
    expect(analysis.missingContext).toContain("success_criteria");
    expect(analysis.clarityScore).toBeLessThan(70);
  });

  it("recommends split prompts for oversized tasks", () => {
    const analysis = analyzePrompt({
      rawPrompt: "Build an end-to-end full stack production app with auth, payments, dashboard, deployment, tests, and automation",
      targetClient: "codex"
    });
    expect(analysis.complexity).toBe("multi_step");
    expect(analysis.recommendedWorkflow).toBe("split_prompts");
  });
});

describe("prompt compilation", () => {
  it("creates a Codex-ready prompt with verification", () => {
    const result = compilePrompt({ rawPrompt: "build me a portfolio app", targetClient: "codex" });
    expect(result.compiledPrompt).toContain("You are Codex");
    expect(result.compiledPrompt).toContain("Before changing files");
    expect(result.compiledPrompt).toContain("Verification");
    expect(result.costSavingNotes.length).toBeGreaterThan(0);
  });
});
