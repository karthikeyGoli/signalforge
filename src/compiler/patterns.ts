import type { TargetClient } from "../types.js";
import { adapterDescription } from "./adapters.js";

export const builtInUseCases = [
  "bug_fix",
  "feature_build",
  "refactor",
  "research",
  "debugging",
  "review",
  "writing",
  "data_analysis",
  "planning"
] as const;

export type BuiltInUseCase = (typeof builtInUseCases)[number];

const baseTemplates: Record<BuiltInUseCase, string> = {
  bug_fix: "Fix [bug]. First reproduce or inspect the failure, identify the likely cause, make the smallest fix, add/update a regression test, then verify.",
  feature_build: "Build [feature]. Inspect existing patterns, propose the minimal design, implement scoped changes, add relevant tests, and verify.",
  refactor: "Refactor [scope] without changing behavior. Identify current behavior, preserve public interfaces, make incremental edits, and verify no regressions.",
  research: "Research [topic]. Use current primary sources, compare alternatives, separate facts from recommendations, and cite sources.",
  debugging: "Debug [symptom]. Inspect logs/errors, form hypotheses, test them in order, fix the root cause, and document verification.",
  review: "Review [artifact]. Prioritize bugs, risks, regressions, security issues, and missing tests. Give file/line references when available.",
  writing: "Write [artifact] for [audience]. Clarify goal, tone, constraints, and output shape before drafting.",
  data_analysis: "Analyze [data]. Confirm schema, clean/validate inputs, compute relevant metrics, visualize if useful, and state caveats.",
  planning: "Plan [objective]. Clarify success criteria, constraints, milestones, risks, and verification before implementation."
};

export function getPromptPattern(useCase: BuiltInUseCase, targetClient: TargetClient = "codex"): string {
  const adapter = adapterDescription(targetClient);
  return [
    baseTemplates[useCase],
    "",
    `Target adapter: ${adapter}`,
    "",
    "Fill these fields before running:",
    "- Goal:",
    "- Context:",
    "- Constraints:",
    "- Acceptance criteria:",
    "- Verification:"
  ].join("\n");
}
