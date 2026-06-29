export type TargetClient = "codex" | "claude-code" | "cursor" | "chatgpt" | "kimi" | "generic";

export type TaskType =
  | "coding"
  | "debugging"
  | "research"
  | "writing"
  | "planning"
  | "review"
  | "data_analysis";

export type Complexity = "simple" | "medium" | "large" | "multi_step";

export type Workflow = "one_shot" | "clarify_first" | "plan_then_execute" | "split_prompts";

export type MissingContextKey =
  | "goal"
  | "environment"
  | "files_or_data"
  | "constraints"
  | "output_format"
  | "success_criteria";

export type WasteRiskKind =
  | "vague_prompt_risk"
  | "oversized_task_risk"
  | "missing_context_risk"
  | "unnecessary_output_risk";

export type WasteRisk = {
  kind: WasteRiskKind;
  severity: "low" | "medium" | "high";
  message: string;
  mitigation: string;
};

export type PromptAnalysis = {
  taskType: TaskType;
  targetClient: TargetClient;
  clarityScore: number;
  complexity: Complexity;
  missingContext: MissingContextKey[];
  wasteRisks: WasteRisk[];
  recommendedWorkflow: Workflow;
  followUpQuestions: string[];
  costSavingNotes: string[];
};

export type CompilePromptInput = {
  rawPrompt: string;
  targetClient?: TargetClient;
  taskDomain?: string;
  contextBudget?: number;
  constraints?: string[];
  outputFormat?: string;
  useContext?: boolean;
  contextQuery?: string;
  contextMaxSnippets?: number;
  contextTrustLevels?: ContextTrustLevel[];
  retrievedContext?: RetrievedContext;
};

export type CompiledPrompt = {
  targetClient: TargetClient;
  compiledPrompt: string;
  analysis: PromptAnalysis;
  assumptions: string[];
  followUpQuestions: string[];
  splitPlan: string[];
  costSavingNotes: string[];
  retrievedContext?: RetrievedContext;
};

export type PromptPattern = {
  name: string;
  useCase: string;
  targetClient: TargetClient;
  template: string;
  notes?: string;
  savedAt: string;
};

export type ContextTrustLevel = "verified" | "user_approved" | "generated" | "unknown";

export type ContextSourceKind = "project_doc" | "repo_file" | "prompt_pattern" | "adapter_doc" | "user_note";

export type ContextChunk = {
  id: string;
  title: string;
  sourcePath: string;
  kind: ContextSourceKind;
  trustLevel: ContextTrustLevel;
  tags: string[];
  text: string;
  chunkIndex: number;
  indexedAt: string;
};

export type ContextIndex = {
  version: 1;
  updatedAt: string;
  chunks: ContextChunk[];
};

export type RetrievedContextSnippet = {
  id: string;
  title: string;
  sourcePath: string;
  kind: ContextSourceKind;
  trustLevel: ContextTrustLevel;
  score: number;
  reason: string;
  text: string;
};

export type RetrievedContext = {
  enabled: boolean;
  query: string;
  queryExpansion?: QueryExpansion;
  snippets: RetrievedContextSnippet[];
  budget: {
    maxSnippets: number;
    maxChars: number;
    usedChars: number;
  };
  notes: string[];
};

export type QueryExpansion = {
  originalTerms: string[];
  expandedTerms: string[];
  appliedRules: string[];
};
