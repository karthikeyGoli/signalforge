#!/usr/bin/env node
import { analyzePrompt } from "./compiler/analyzer.js";
import { compilePrompt } from "./compiler/compiler.js";
import { getPromptPattern, builtInUseCases } from "./compiler/patterns.js";
import type { TargetClient } from "./types.js";

type ParsedArgs = {
  command: string;
  prompt: string;
  targetClient: TargetClient;
  outputFormat?: string;
};

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === "analyze") {
    print(analyzePrompt({ rawPrompt: args.prompt, targetClient: args.targetClient }));
    return;
  }

  if (args.command === "compile") {
    const result = compilePrompt({
      rawPrompt: args.prompt,
      targetClient: args.targetClient,
      outputFormat: args.outputFormat
    });
    console.log(result.compiledPrompt);
    console.log("\n---\nAnalysis:");
    print(result.analysis);
    return;
  }

  if (args.command === "pattern") {
    if (!builtInUseCases.includes(args.prompt as (typeof builtInUseCases)[number])) {
      throw new Error(`Unknown pattern use case. Choose one of: ${builtInUseCases.join(", ")}`);
    }
    console.log(getPromptPattern(args.prompt as (typeof builtInUseCases)[number], args.targetClient));
    return;
  }

  throw new Error("Usage: signalforge <analyze|compile|pattern> <prompt-or-use-case> [--target codex]");
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command = "", ...rest] = argv;
  const targetIndex = rest.indexOf("--target");
  const formatIndex = rest.indexOf("--format");
  const targetClient = targetIndex >= 0 ? (rest[targetIndex + 1] as TargetClient) : "codex";
  const outputFormat = formatIndex >= 0 ? rest[formatIndex + 1] : undefined;
  const promptParts = rest.filter((_, index) => {
    if (targetIndex >= 0 && (index === targetIndex || index === targetIndex + 1)) return false;
    if (formatIndex >= 0 && (index === formatIndex || index === formatIndex + 1)) return false;
    return true;
  });

  return {
    command,
    prompt: promptParts.join(" ").trim(),
    targetClient,
    outputFormat
  };
}

function print(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
