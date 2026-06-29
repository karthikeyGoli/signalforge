# SignalForge Demo

## Bad Prompt

```text
build me a portfolio app
```

## Analysis Shape

SignalForge should identify:

- task type: coding
- missing environment
- missing files/data
- missing constraints
- missing output format
- missing success criteria
- recommended workflow: clarify first or plan then execute depending on score

## Compiled Codex Prompt

SignalForge should produce a prompt that asks Codex to:

- inspect the repo first
- identify stack and existing patterns
- ask only blocking questions
- keep changes scoped
- add verification
- summarize results

## Why This Saves Credits

The rough prompt invites the model to guess the app type, stack, scope, and success criteria. The compiled prompt forces discovery and verification before implementation.

## RAG-Backed Prompt Compilation

SignalForge can also retrieve trusted local context before compiling the prompt.

```bash
node dist/cli.js index-context README.md AGENTS.md docs
node dist/cli.js compile "make my app better" --target codex --with-context
```

Example retrieved context that may be injected:

```text
Retrieved local context:
[1] Portfolio App (README.md; trust=verified)
  This project uses React, Vite, and TypeScript. Run npm test and npm run build.

[2] Agent Rules (AGENTS.md; trust=verified)
  Inspect the repo before editing. Keep changes scoped.
```

This is the main difference from a generic prompt optimizer: SignalForge retrieves the context needed to compile the task, then produces the final agent prompt.

## Query Expansion

The retrieval layer does not rely only on literal keyword overlap. Before scoring snippets, SignalForge expands vague requests into concrete focus areas.

```text
make my app better
```

becomes a retrieval profile with terms like:

```text
app, better, ui, ux, accessibility, performance, responsive, navigation, layout, tests, build, package, agents
```

This helps deterministic retrieval find design notes, package scripts, agent rules, and project setup docs even when the user only wrote a vague phrase.

## Kimi Paste Flow

```bash
node dist/cli.js compile "compare these two startup ideas and tell me which one to build" --target kimi
```

Paste the compiled output into Kimi. The Kimi adapter emphasizes intent, missing context, assumptions, and a compact output contract instead of MCP tool use.
