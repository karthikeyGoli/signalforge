import * as z from "zod/v4";

export const targetClientSchema = z
  .enum(["codex", "claude-code", "cursor", "chatgpt", "kimi", "generic"])
  .default("codex");

export const contextTrustLevelSchema = z.enum(["verified", "user_approved", "generated", "unknown"]);

export const contextSourceKindSchema = z.enum(["project_doc", "repo_file", "prompt_pattern", "adapter_doc", "user_note"]);

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
  outputFormat: z.string().optional().describe("Desired final response format."),
  useContext: z.boolean().optional().describe("Retrieve trusted local context before compiling the prompt."),
  contextQuery: z.string().optional().describe("Optional retrieval query. Defaults to the raw prompt."),
  contextMaxSnippets: z.number().int().positive().max(10).optional().describe("Maximum retrieved context snippets."),
  contextTrustLevels: z.array(contextTrustLevelSchema).optional().describe("Restrict retrieval to these trust levels.")
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

export const indexContextSchema = z.object({
  paths: z
    .array(z.string().min(1))
    .optional()
    .describe("Files or directories to index. Defaults to README, AGENTS/CLAUDE files, package.json, and docs/."),
  kind: contextSourceKindSchema.optional().default("project_doc").describe("Type of context being indexed."),
  trustLevel: contextTrustLevelSchema.optional().default("verified").describe("Trust label for the indexed context."),
  tags: z.array(z.string().min(1)).optional().describe("Optional tags to attach to every indexed chunk."),
  maxFileBytes: z.number().int().positive().max(200_000).optional().describe("Maximum bytes read from each file."),
  maxFiles: z.number().int().positive().max(200).optional().describe("Maximum files to index in one call.")
});

export const retrieveContextSchema = z.object({
  query: z.string().min(1).describe("Search query or raw prompt to retrieve context for."),
  maxSnippets: z.number().int().positive().max(10).optional().describe("Maximum context snippets to return."),
  contextBudget: z.number().int().positive().optional().describe("Approximate context/token budget for retrieved text."),
  trustLevels: z.array(contextTrustLevelSchema).optional().describe("Restrict retrieval to these trust levels.")
});

export type AnalyzePromptArgs = z.infer<typeof analyzePromptSchema>;
export type CompilePromptArgs = z.infer<typeof compilePromptSchema>;
export type GetPromptPatternArgs = z.infer<typeof getPromptPatternSchema>;
export type EstimatePromptWasteArgs = z.infer<typeof estimatePromptWasteSchema>;
export type SavePatternArgs = z.infer<typeof savePatternSchema>;
export type ListPatternsArgs = z.infer<typeof listPatternsSchema>;
export type IndexContextArgs = z.infer<typeof indexContextSchema>;
export type RetrieveContextArgs = z.infer<typeof retrieveContextSchema>;
