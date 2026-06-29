import type {
  Complexity,
  MissingContextKey,
  PromptAnalysis,
  TargetClient,
  TaskType,
  WasteRisk,
  Workflow
} from "../types.js";

const taskSignals: Array<[TaskType, RegExp[]]> = [
  ["debugging", [/\bfix\b/i, /\bbug\b/i, /\berror\b/i, /\bbroken\b/i, /\bfailing\b/i, /\bstack trace\b/i]],
  ["review", [/\breview\b/i, /\baudit\b/i, /\bcritique\b/i, /\binspect\b/i, /\bsecurity check\b/i]],
  ["research", [/\bresearch\b/i, /\bcompare\b/i, /\bcompetitor/i, /\blatest\b/i, /\bsources?\b/i, /\bmarket\b/i]],
  ["data_analysis", [/\bcsv\b/i, /\bdataset\b/i, /\bdataframe\b/i, /\banaly[sz]e data\b/i, /\bchart\b/i, /\bstatistics?\b/i, /\bsql\b/i]],
  ["planning", [/\bplan\b/i, /\barchitecture\b/i, /\broadmap\b/i, /\bstrategy\b/i, /\bdesign\b/i, /\bspec\b/i]],
  ["writing", [/\bwrite\b/i, /\bdraft\b/i, /\bemail\b/i, /\bpost\b/i, /\barticle\b/i, /\brewrite\b/i, /\bcopy\b/i]],
  ["coding", [/\bbuild\b/i, /\bimplement\b/i, /\bcreate\b/i, /\badd\b/i, /\brefactor\b/i, /\bapi\b/i, /\bcomponent\b/i, /\bapp\b/i, /\bwebsite\b/i, /\bfrontend\b/i, /\bui\b/i]]
];

const techSignals = [
  "typescript",
  "javascript",
  "python",
  "react",
  "next",
  "vite",
  "fastapi",
  "django",
  "node",
  "rust",
  "go",
  "java",
  "sql",
  "docker",
  "mcp",
  "codex",
  "claude"
];

export function analyzePrompt(input: {
  rawPrompt: string;
  targetClient?: TargetClient;
  taskDomain?: string;
  contextBudget?: number;
}): PromptAnalysis {
  const rawPrompt = input.rawPrompt.trim();
  const targetClient = input.targetClient ?? "codex";
  const taskType = classifyTask(rawPrompt, input.taskDomain);
  const missingContext = detectMissingContext(rawPrompt, taskType);
  const complexity = classifyComplexity(rawPrompt, missingContext);
  const wasteRisks = detectWasteRisks(rawPrompt, missingContext, complexity, input.contextBudget);
  const clarityScore = scoreClarity(rawPrompt, missingContext, wasteRisks);
  const recommendedWorkflow = chooseWorkflow(taskType, complexity, clarityScore, missingContext);

  return {
    taskType,
    targetClient,
    clarityScore,
    complexity,
    missingContext,
    wasteRisks,
    recommendedWorkflow,
    followUpQuestions: makeFollowUpQuestions(missingContext, taskType),
    costSavingNotes: makeCostSavingNotes(recommendedWorkflow, missingContext, wasteRisks)
  };
}

export function classifyTask(rawPrompt: string, taskDomain?: string): TaskType {
  const domain = taskDomain?.toLowerCase();
  if (domain) {
    if (domain.includes("debug")) return "debugging";
    if (domain.includes("research") || domain.includes("market")) return "research";
    if (domain.includes("write") || domain.includes("content")) return "writing";
    if (domain.includes("review") || domain.includes("audit")) return "review";
    if (domain.includes("data")) return "data_analysis";
    if (domain.includes("plan") || domain.includes("architecture")) return "planning";
    if (domain.includes("code") || domain.includes("build")) return "coding";
  }

  let best: { type: TaskType; score: number } = { type: "planning", score: 0 };
  for (const [type, signals] of taskSignals) {
    const score = signals.filter((pattern) => pattern.test(rawPrompt)).length;
    if (score > best.score) best = { type, score };
  }

  return best.score > 0 ? best.type : "planning";
}

export function detectMissingContext(rawPrompt: string, taskType: TaskType): MissingContextKey[] {
  const text = rawPrompt.toLowerCase();
  const missing: MissingContextKey[] = [];
  const words = text.split(/\s+/).filter(Boolean);

  if (
    words.length < 4 ||
    /\b(do this|make it better|help me|stuff|etc)\b/i.test(rawPrompt) ||
    /\bmake\s+(my|this|the)?\s*(app|site|website|project|code|ui)?\s*better\b/i.test(rawPrompt)
  ) {
    missing.push("goal");
  }

  if (["coding", "debugging", "review", "data_analysis"].includes(taskType)) {
    const hasEnvironment = techSignals.some((signal) => text.includes(signal)) || /\b(repo|codebase|project|stack|framework)\b/.test(text);
    if (!hasEnvironment) missing.push("environment");

    const hasFilesOrData =
      /[`'"]?[\w./\\-]+\.(ts|tsx|js|jsx|py|md|json|sql|csv|txt|yml|yaml)[`'"]?/i.test(rawPrompt) ||
      /\b(file|folder|directory|dataset|table|schema|endpoint|component|repo)\b/i.test(rawPrompt) ||
      /https?:\/\//i.test(rawPrompt);
    if (!hasFilesOrData) missing.push("files_or_data");
  }

  if (!/\b(must|should|only|avoid|without|do not|don't|constraint|requirement|use|keep)\b/i.test(rawPrompt)) {
    missing.push("constraints");
  }

  if (!/\b(json|markdown|table|bullet|format|schema|summary|code block|diff|report)\b/i.test(rawPrompt)) {
    missing.push("output_format");
  }

  if (!/\b(done when|acceptance|success|verify|test|passes|works when|expected|criteria)\b/i.test(rawPrompt)) {
    missing.push("success_criteria");
  }

  return missing;
}

export function classifyComplexity(rawPrompt: string, missingContext: MissingContextKey[]): Complexity {
  const words = rawPrompt.trim().split(/\s+/).filter(Boolean).length;
  const text = rawPrompt.toLowerCase();
  const multiStepSignals = [
    "full stack",
    "end-to-end",
    "entire app",
    "production",
    "deploy",
    "migrate",
    "everything",
    "complete system",
    "multi-agent",
    "automation"
  ];

  if (multiStepSignals.some((signal) => text.includes(signal)) || missingContext.length >= 5) {
    return "multi_step";
  }
  if (words > 90 || /\b(several|multiple|all pages|whole)\b/i.test(rawPrompt)) return "large";
  if (words > 25) return "medium";
  return "simple";
}

export function detectWasteRisks(
  rawPrompt: string,
  missingContext: MissingContextKey[],
  complexity: Complexity,
  contextBudget?: number
): WasteRisk[] {
  const risks: WasteRisk[] = [];
  const words = rawPrompt.trim().split(/\s+/).filter(Boolean).length;

  if (missingContext.includes("goal")) {
    risks.push({
      kind: "vague_prompt_risk",
      severity: "high",
      message: "The prompt does not express a concrete outcome.",
      mitigation: "State the objective in one sentence before asking the model to act."
    });
  }

  if (complexity === "large" || complexity === "multi_step") {
    risks.push({
      kind: "oversized_task_risk",
      severity: complexity === "multi_step" ? "high" : "medium",
      message: "The request is likely too broad for one efficient model run.",
      mitigation: "Split it into discovery, plan, implementation, and verification prompts."
    });
  }

  if (missingContext.length >= 3) {
    risks.push({
      kind: "missing_context_risk",
      severity: missingContext.length >= 5 ? "high" : "medium",
      message: `The prompt is missing ${missingContext.length} context fields.`,
      mitigation: "Add the missing fields or ask the model to clarify before spending a large run."
    });
  }

  if (/\b(explain everything|very detailed|comprehensive|full guide)\b/i.test(rawPrompt) || !rawPrompt.match(/\b(format|brief|concise|table|json)\b/i)) {
    risks.push({
      kind: "unnecessary_output_risk",
      severity: "low",
      message: "The output may become longer than useful.",
      mitigation: "Set the exact response shape and length."
    });
  }

  if (contextBudget && words > contextBudget / 3) {
    risks.push({
      kind: "oversized_task_risk",
      severity: "medium",
      message: "The raw prompt may consume too much of the requested context budget.",
      mitigation: "Compress background context and move reference material into files or resources."
    });
  }

  return risks;
}

export function scoreClarity(rawPrompt: string, missingContext: MissingContextKey[], wasteRisks: WasteRisk[]): number {
  let score = 100;
  const penalties: Record<MissingContextKey, number> = {
    goal: 20,
    environment: 12,
    files_or_data: 14,
    constraints: 10,
    output_format: 8,
    success_criteria: 12
  };

  for (const key of missingContext) score -= penalties[key];
  for (const risk of wasteRisks) {
    score -= risk.severity === "high" ? 10 : risk.severity === "medium" ? 6 : 3;
  }
  if (rawPrompt.trim().split(/\s+/).length < 8) score -= 8;

  return Math.max(5, Math.min(100, score));
}

export function chooseWorkflow(
  taskType: TaskType,
  complexity: Complexity,
  clarityScore: number,
  missingContext: MissingContextKey[]
): Workflow {
  if (missingContext.includes("goal")) return "clarify_first";
  if (complexity === "multi_step" || complexity === "large") return "split_prompts";
  if (clarityScore < 55) return "clarify_first";
  if (taskType === "coding" || taskType === "debugging" || taskType === "review") return "plan_then_execute";
  return "one_shot";
}

function makeFollowUpQuestions(missingContext: MissingContextKey[], taskType: TaskType): string[] {
  const questionMap: Record<MissingContextKey, string> = {
    goal: "What exact outcome should the model produce?",
    environment: "What environment, stack, tool, or model/client should this target?",
    files_or_data: "Which files, repo paths, URLs, logs, or data should the model use?",
    constraints: "What should the model avoid changing or assume as fixed?",
    output_format: "What response format do you want: plan, patch, table, JSON, checklist, or prose?",
    success_criteria: "How will you verify the result is correct?"
  };

  const prioritized = taskType === "coding" || taskType === "debugging"
    ? ["goal", "environment", "files_or_data", "success_criteria", "constraints", "output_format"]
    : ["goal", "output_format", "success_criteria", "constraints", "environment", "files_or_data"];

  return prioritized
    .filter((key): key is MissingContextKey => missingContext.includes(key as MissingContextKey))
    .slice(0, 3)
    .map((key) => questionMap[key]);
}

function makeCostSavingNotes(workflow: Workflow, missingContext: MissingContextKey[], wasteRisks: WasteRisk[]): string[] {
  const notes = new Set<string>();
  if (workflow === "clarify_first") notes.add("Ask the model to clarify missing inputs before starting expensive work.");
  if (workflow === "split_prompts") notes.add("Split the task into plan, execution, and verification prompts.");
  if (missingContext.includes("output_format")) notes.add("Specify the output shape to avoid long, unfocused responses.");
  if (missingContext.includes("files_or_data")) notes.add("Point the model at exact files or data instead of making it infer context.");
  if (wasteRisks.some((risk) => risk.kind === "oversized_task_risk")) notes.add("Use a smaller/cheaper model for planning, then a stronger model for implementation.");
  return Array.from(notes);
}
