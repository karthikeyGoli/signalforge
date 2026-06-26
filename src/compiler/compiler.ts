import type { CompilePromptInput, CompiledPrompt, TargetClient } from "../types.js";
import { renderCompiledPrompt } from "./adapters.js";
import { analyzePrompt } from "./analyzer.js";

export function compilePrompt(input: CompilePromptInput): CompiledPrompt {
  const targetClient: TargetClient = input.targetClient ?? "codex";
  const analysis = analyzePrompt({
    rawPrompt: input.rawPrompt,
    targetClient,
    taskDomain: input.taskDomain,
    contextBudget: input.contextBudget
  });
  const assumptions = makeAssumptions(input, analysis.missingContext);
  const splitPlan = makeSplitPlan(analysis.recommendedWorkflow);
  const compiledPrompt = renderCompiledPrompt({
    rawPrompt: input.rawPrompt,
    input: { ...input, targetClient },
    analysis,
    assumptions,
    splitPlan
  });

  return {
    targetClient,
    compiledPrompt,
    analysis,
    assumptions,
    followUpQuestions: analysis.followUpQuestions,
    splitPlan,
    costSavingNotes: analysis.costSavingNotes
  };
}

function makeAssumptions(input: CompilePromptInput, missingContext: string[]): string[] {
  const assumptions: string[] = [];
  if (!input.targetClient) assumptions.push("Target client defaults to Codex.");
  if (missingContext.includes("environment")) assumptions.push("The implementation should discover stack and conventions from the local environment.");
  if (missingContext.includes("output_format") && !input.outputFormat) assumptions.push("Output should be concise Markdown.");
  if (missingContext.includes("constraints") && !input.constraints?.length) assumptions.push("No hard constraints were supplied; preserve existing behavior and keep scope narrow.");
  return assumptions;
}

function makeSplitPlan(workflow: string): string[] {
  if (workflow === "split_prompts") {
    return [
      "Prompt 1: Inspect context and produce a short implementation plan.",
      "Prompt 2: Implement the smallest coherent slice.",
      "Prompt 3: Verify, fix regressions, and summarize residual risk."
    ];
  }
  if (workflow === "clarify_first") {
    return [
      "Prompt 1: Ask only the blocking clarification questions.",
      "Prompt 2: Compile the clarified task into an executable prompt."
    ];
  }
  if (workflow === "plan_then_execute") {
    return ["Plan briefly before editing, then implement and verify in the same session."];
  }
  return [];
}
