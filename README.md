# SignalForge

SignalForge is a local-first MCP prompt intent compiler. It turns vague user requests into task-specific, cost-aware prompts for Codex first, while keeping adapters for Claude Code, Cursor, ChatGPT, Kimi, and generic LLM workflows.

It is not another prompt prettifier. SignalForge detects intent, missing context, workflow shape, context waste, and likely failure modes before you spend a full model run.

## What It Does

- Analyzes rough prompts for task type, clarity, missing context, and waste risks.
- Compiles prompts for Codex, Claude Code, Cursor, ChatGPT, Kimi, or generic clients.
- Suggests split plans for large tasks instead of one expensive mega-prompt.
- Provides reusable prompt patterns for common workflows.
- Saves only user-approved patterns locally in `.signalforge/patterns.json`.
- Does not save raw prompts by default.

## Install

```bash
npm install
npm run build
```

## Run As An MCP Server

Codex:

```bash
codex mcp add signalforge -- node C:\Users\Karthikey G\OneDrive\Documents\signalforge\dist\stdio.js
```

Claude Desktop / Claude Code style config:

```json
{
  "mcpServers": {
    "signalforge": {
      "command": "node",
      "args": ["C:\\Users\\Karthikey G\\OneDrive\\Documents\\signalforge\\dist\\stdio.js"]
    }
  }
}
```

MCP Inspector:

```bash
npm run inspect
```

## CLI Smoke Test

```bash
npm run smoke
```

Or run directly:

```bash
node dist/cli.js analyze "build me a portfolio app" --target codex
node dist/cli.js compile "build me a portfolio app" --target codex
node dist/cli.js compile "compare these two startup ideas" --target kimi
node dist/cli.js pattern feature_build --target codex
```

## Use With Kimi

Kimi does not need MCP support for this flow. Compile the prompt locally, then paste the output into Kimi:

```bash
node dist/cli.js compile "help me design an AI automation product" --target kimi
```

## MCP Tools

- `analyze_prompt`: intent, clarity, missing context, waste risks, workflow.
- `compile_prompt`: ready-to-use prompt with assumptions, split plan, and cost-saving notes.
- `get_prompt_pattern`: reusable template for a use case.
- `estimate_prompt_waste`: likely failure mode and cheaper prompting route.
- `save_pattern`: store a user-approved pattern locally.
- `list_patterns`: list saved local patterns.

## MCP Resources

- `signalforge://patterns`
- `signalforge://adapters/codex`
- `signalforge://adapters/claude-code`
- `signalforge://adapters/cursor`
- `signalforge://adapters/chatgpt`
- `signalforge://adapters/kimi`
- `signalforge://adapters/generic`
- `signalforge://history/recent`

## Development

```bash
npm run test
npm run build
npm run smoke
```

The compiler is deterministic in v1. Optional LLM refinement can be added later behind an environment flag, but the core should remain useful without any API key.
