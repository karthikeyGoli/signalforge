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
};

export type CompiledPrompt = {
  targetClient: TargetClient;
  compiledPrompt: string;
  analysis: PromptAnalysis;
  assumptions: string[];
  followUpQuestions: string[];
  splitPlan: string[];
  costSavingNotes: string[];
};

export type PromptPattern = {
  name: string;
  useCase: string;
  targetClient: TargetClient;
  template: string;
  notes?: string;
  savedAt: string;
};
