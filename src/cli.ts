#!/usr/bin/env node
import { analyzePrompt } from "./compiler/analyzer.js";
import { compilePromptWithContext } from "./compiler/compiler.js";
import { getPromptPattern, builtInUseCases } from "./compiler/patterns.js";
import { indexContext, retrieveContext } from "./context/contextIndex.js";
import type { TargetClient } from "./types.js";

type ParsedArgs = {
  command: string;
  prompt: string;
  promptParts: string[];
  targetClient: TargetClient;
  outputFormat?: string;
  withContext: boolean;
  contextQuery?: string;
  contextMaxSnippets?: number;
};

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === "analyze") {
    print(analyzePrompt({ rawPrompt: args.prompt, targetClient: args.targetClient }));
    return;
  }

  if (args.command === "compile") {
    const result = await compilePromptWithContext({
      rawPrompt: args.prompt,
      targetClient: args.targetClient,
      outputFormat: args.outputFormat,
      useContext: args.withContext,
      contextQuery: args.contextQuery,
      contextMaxSnippets: args.contextMaxSnippets
    });
    console.log(result.compiledPrompt);
    console.log("\n---\nAnalysis:");
    print(result.analysis);
    if (result.retrievedContext) {
      console.log("\n---\nRetrieved context:");
      print(result.retrievedContext);
    }
    return;
  }

  if (args.command === "index-context") {
    print(await indexContext({ paths: args.promptParts.length ? args.promptParts : undefined }));
    return;
  }

  if (args.command === "retrieve-context") {
    print(
      await retrieveContext({
        query: args.prompt,
        maxSnippets: args.contextMaxSnippets
      })
    );
    return;
  }

  if (args.command === "pattern") {
    if (!builtInUseCases.includes(args.prompt as (typeof builtInUseCases)[number])) {
      throw new Error(`Unknown pattern use case. Choose one of: ${builtInUseCases.join(", ")}`);
    }
    console.log(getPromptPattern(args.prompt as (typeof builtInUseCases)[number], args.targetClient));
    return;
  }

  throw new Error("Usage: signalforge <analyze|compile|pattern|index-context|retrieve-context> <prompt-or-paths> [--target codex] [--with-context]");
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command = "", ...rest] = argv;
  const targetClient = readFlag(rest, "--target") as TargetClient | undefined;
  const outputFormat = readFlag(rest, "--format");
  const contextQuery = readFlag(rest, "--context-query");
  const maxSnippetsRaw = readFlag(rest, "--max-snippets");
  const promptParts = stripFlags(rest, new Set(["--target", "--format", "--context-query", "--max-snippets"]), new Set(["--with-context"]));

  return {
    command,
    prompt: promptParts.join(" ").trim(),
    promptParts,
    targetClient: targetClient ?? "codex",
    outputFormat,
    withContext: rest.includes("--with-context"),
    contextQuery,
    contextMaxSnippets: maxSnippetsRaw ? Number.parseInt(maxSnippetsRaw, 10) : undefined
  };
}

function print(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

function readFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index < 0) return undefined;
  return args[index + 1];
}

function stripFlags(args: string[], valueFlags: Set<string>, booleanFlags: Set<string>): string[] {
  const stripped: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (valueFlags.has(arg)) {
      index += 1;
      continue;
    }
    if (booleanFlags.has(arg)) continue;
    stripped.push(arg);
  }
  return stripped;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
