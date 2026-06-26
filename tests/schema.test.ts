import { describe, expect, it } from "vitest";
import {
  analyzePromptSchema,
  compilePromptSchema,
  estimatePromptWasteSchema,
  getPromptPatternSchema,
  listPatternsSchema,
  savePatternSchema
} from "../src/schemas.js";

describe("tool schemas", () => {
  it("validates analyze_prompt input", () => {
    expect(analyzePromptSchema.parse({ rawPrompt: "fix bug", targetClient: "codex" }).rawPrompt).toBe("fix bug");
  });

  it("validates compile_prompt input", () => {
    expect(compilePromptSchema.parse({ rawPrompt: "build app", constraints: ["no auth"] }).constraints).toEqual(["no auth"]);
  });

  it("validates get_prompt_pattern input", () => {
    expect(getPromptPatternSchema.parse({ useCase: "feature_build" }).useCase).toBe("feature_build");
  });

  it("validates estimate_prompt_waste input", () => {
    expect(estimatePromptWasteSchema.parse({ rawPrompt: "do stuff" }).rawPrompt).toBe("do stuff");
  });

  it("validates memory tool inputs", () => {
    expect(savePatternSchema.parse({ name: "x", useCase: "debugging", template: "fix [x]" }).name).toBe("x");
    expect(listPatternsSchema.parse({ targetClient: "codex" }).targetClient).toBe("codex");
  });
});
