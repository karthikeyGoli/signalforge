import * as z from "zod/v4";

export const targetClientSchema = z
  .enum(["codex", "claude-code", "cursor", "chatgpt", "kimi", "generic"])
  .default("codex");

export const analyzePromptSchema = z.object({
  rawPrompt: z.string().min(1).describe("The rough prompt or user request to analyze."),
  targetClient: targetClientSchema.optional().describe("Client to optimize for."),
  taskDomain: z.string().optional().describe("Optional domain hint, such as coding, research, or writing."),
  contextBudget: z.number().int().positive().optional().describe("Approximate context/token budget.")
});

export const compilePromptSchema = z.object({
  rawPrompt: z.string().min(1).describe("The rough prompt or user request to compile."),
  targetClient: targetClientSchema.optional().describe("Client to optimize for."),
  taskDomain: z.string().optional().describe("Optional domain hint, such as coding, research, or writing."),
  contextBudget: z.number().int().positive().optional().describe("Approximate context/token budget."),
  constraints: z.array(z.string()).optional().describe("User-supplied hard constraints."),
  outputFormat: z.string().optional().describe("Desired final response format.")
});

export const getPromptPatternSchema = z.object({
  useCase: z
    .enum(["bug_fix", "feature_build", "refactor", "research", "debugging", "review", "writing", "data_analysis", "planning"])
    .describe("Prompt pattern use case."),
  targetClient: targetClientSchema.optional().describe("Client to optimize for.")
});

export const estimatePromptWasteSchema = z.object({
  rawPrompt: z.string().min(1).describe("The rough prompt to evaluate for waste risks."),
  targetClient: targetClientSchema.optional().describe("Client to optimize for.")
});

export const savePatternSchema = z.object({
  name: z.string().min(1).describe("Pattern name."),
  useCase: z.string().min(1).describe("Pattern use case."),
  targetClient: targetClientSchema.optional().describe("Client the pattern is designed for."),
  template: z.string().min(1).describe("Reusable prompt template."),
  notes: z.string().optional().describe("Optional notes about when to use this pattern.")
});

export const listPatternsSchema = z.object({
  targetClient: targetClientSchema.optional().describe("Optional client filter."),
  useCase: z.string().optional().describe("Optional use-case filter.")
});

export type AnalyzePromptArgs = z.infer<typeof analyzePromptSchema>;
export type CompilePromptArgs = z.infer<typeof compilePromptSchema>;
export type GetPromptPatternArgs = z.infer<typeof getPromptPatternSchema>;
export type EstimatePromptWasteArgs = z.infer<typeof estimatePromptWasteSchema>;
export type SavePatternArgs = z.infer<typeof savePatternSchema>;
export type ListPatternsArgs = z.infer<typeof listPatternsSchema>;
