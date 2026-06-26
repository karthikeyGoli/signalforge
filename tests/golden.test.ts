import { describe, expect, it } from "vitest";
import { compilePrompt } from "../src/compiler/compiler.js";

describe("adapter golden outputs", () => {
  it("renders Claude Code XML-style sections", () => {
    const result = compilePrompt({ rawPrompt: "fix the login bug in React", targetClient: "claude-code" });
    expect(result.compiledPrompt).toContain("<task>");
    expect(result.compiledPrompt).toContain("<acceptance_criteria>");
  });

  it("renders generic context gaps", () => {
    const result = compilePrompt({ rawPrompt: "research competitors for prompt tools", targetClient: "generic" });
    expect(result.compiledPrompt).toContain("Context gaps to resolve");
  });

  it("renders ChatGPT role and output format", () => {
    const result = compilePrompt({
      rawPrompt: "write a short launch post for SignalForge",
      targetClient: "chatgpt",
      outputFormat: "three concise bullets"
    });
    expect(result.compiledPrompt).toContain("Role:");
    expect(result.compiledPrompt).toContain("three concise bullets");
  });

  it("renders a Kimi direct-paste prompt", () => {
    const result = compilePrompt({
      rawPrompt: "compare these two startup ideas and tell me which one to build",
      targetClient: "kimi"
    });
    expect(result.compiledPrompt).toContain("Task intent:");
    expect(result.compiledPrompt).toContain("Use this operating mode:");
    expect(result.compiledPrompt).toContain("Output contract:");
  });
});
