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

## Kimi Paste Flow

```bash
node dist/cli.js compile "compare these two startup ideas and tell me which one to build" --target kimi
```

Paste the compiled output into Kimi. The Kimi adapter emphasizes intent, missing context, assumptions, and a compact output contract instead of MCP tool use.
