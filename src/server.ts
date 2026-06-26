import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { adapterDescription } from "./compiler/adapters.js";
import { analyzePrompt } from "./compiler/analyzer.js";
import { compilePrompt } from "./compiler/compiler.js";
import { builtInUseCases, getPromptPattern } from "./compiler/patterns.js";
import {
  analyzePromptSchema,
  compilePromptSchema,
  estimatePromptWasteSchema,
  getPromptPatternSchema,
  listPatternsSchema,
  savePatternSchema
} from "./schemas.js";
import { listPatterns, readPatternsResource, recentHistoryResource, savePattern } from "./memory/patternStore.js";

export function createSignalForgeServer(): McpServer {
  const server = new McpServer(
    { name: "signalforge", version: "0.1.0" },
    {
      instructions:
        "SignalForge compiles vague user intent into task-specific prompts. Use analyze_prompt before expensive work, compile_prompt when the user needs a ready-to-run prompt, and estimate_prompt_waste to reduce ambiguity, context bloat, and wasted model runs."
    }
  );

  server.registerTool(
    "analyze_prompt",
    {
      title: "Analyze Prompt",
      description: "Analyze a rough prompt for intent, missing context, waste risks, and recommended workflow.",
      inputSchema: analyzePromptSchema,
      annotations: { readOnlyHint: true, idempotentHint: true }
    },
    async (args) => jsonToolResult(analyzePrompt(args))
  );

  server.registerTool(
    "compile_prompt",
    {
      title: "Compile Prompt",
      description: "Compile rough intent into a target-client prompt with assumptions, split plan, and cost-saving notes.",
      inputSchema: compilePromptSchema,
      annotations: { readOnlyHint: true, idempotentHint: true }
    },
    async (args) => jsonToolResult(compilePrompt(args))
  );

  server.registerTool(
    "get_prompt_pattern",
    {
      title: "Get Prompt Pattern",
      description: "Return a reusable prompt template for a use case and target client.",
      inputSchema: getPromptPatternSchema,
      annotations: { readOnlyHint: true, idempotentHint: true }
    },
    async ({ useCase, targetClient }) =>
      jsonToolResult({
        useCase,
        targetClient: targetClient ?? "codex",
        template: getPromptPattern(useCase, targetClient ?? "codex")
      })
  );

  server.registerTool(
    "estimate_prompt_waste",
    {
      title: "Estimate Prompt Waste",
      description: "Estimate token/context waste risks and recommend cheaper prompting routes.",
      inputSchema: estimatePromptWasteSchema,
      annotations: { readOnlyHint: true, idempotentHint: true }
    },
    async ({ rawPrompt, targetClient }) => {
      const analysis = analyzePrompt({ rawPrompt, targetClient: targetClient ?? "codex" });
      return jsonToolResult({
        targetClient: targetClient ?? "codex",
        clarityScore: analysis.clarityScore,
        complexity: analysis.complexity,
        wasteRisks: analysis.wasteRisks,
        likelyFailureMode: likelyFailureMode(analysis.wasteRisks),
        cheaperPromptingRoute: analysis.costSavingNotes
      });
    }
  );

  server.registerTool(
    "save_pattern",
    {
      title: "Save Pattern",
      description: "Save a user-approved reusable prompt pattern locally. Raw prompts are never saved automatically.",
      inputSchema: savePatternSchema,
      annotations: { idempotentHint: true }
    },
    async ({ targetClient, ...args }) => jsonToolResult(await savePattern({ ...args, targetClient: targetClient ?? "codex" }))
  );

  server.registerTool(
    "list_patterns",
    {
      title: "List Patterns",
      description: "List local user-approved reusable prompt patterns.",
      inputSchema: listPatternsSchema,
      annotations: { readOnlyHint: true, idempotentHint: true }
    },
    async (args) => jsonToolResult({ patterns: await listPatterns(args) })
  );

  registerResources(server);
  registerPrompts(server);

  return server;
}

function registerResources(server: McpServer): void {
  server.registerResource(
    "patterns",
    "signalforge://patterns",
    {
      title: "SignalForge Patterns",
      description: "Local user-approved prompt patterns.",
      mimeType: "application/json"
    },
    async (uri) => resourceJson(uri.href, await readPatternsResource())
  );

  for (const client of ["codex", "claude-code", "cursor", "chatgpt", "kimi", "generic"] as const) {
    server.registerResource(
      `adapter-${client}`,
      `signalforge://adapters/${client}`,
      {
        title: `${client} adapter`,
        description: `Prompt adapter guidance for ${client}.`,
        mimeType: "text/plain"
      },
      async (uri) => ({
        contents: [{ uri: uri.href, text: adapterDescription(client) }]
      })
    );
  }

  server.registerResource(
    "recent-history",
    "signalforge://history/recent",
    {
      title: "SignalForge Recent History",
      description: "Recent anonymized summaries when history is enabled. Empty by default for privacy.",
      mimeType: "application/json"
    },
    async (uri) => resourceJson(uri.href, recentHistoryResource())
  );
}

function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "compile-for-codex",
    {
      title: "Compile For Codex",
      description: "Turn a rough request into a Codex-ready implementation prompt.",
      argsSchema: {
        rawPrompt: z.string().describe("Rough user request")
      }
    },
    ({ rawPrompt }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: compilePrompt({ rawPrompt, targetClient: "codex" }).compiledPrompt
          }
        }
      ]
    })
  );
}

function jsonToolResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data as Record<string, unknown>
  };
}

function resourceJson(uri: string, data: unknown) {
  return {
    contents: [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }]
  };
}

function likelyFailureMode(wasteRisks: Array<{ kind: string; severity: string }>): string {
  if (wasteRisks.some((risk) => risk.kind === "vague_prompt_risk")) return "The model may solve the wrong problem.";
  if (wasteRisks.some((risk) => risk.kind === "oversized_task_risk")) return "The model may produce a shallow plan or half-finished implementation.";
  if (wasteRisks.some((risk) => risk.kind === "missing_context_risk")) return "The model may invent context or ask follow-up questions after spending a run.";
  return "No major failure mode detected; keep output constraints explicit.";
}
