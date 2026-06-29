# SignalForge

SignalForge is a local-first MCP prompt intent compiler. It turns vague user requests into task-specific, cost-aware prompts for Codex first, while keeping adapters for Claude Code, Cursor, ChatGPT, Kimi, and generic LLM workflows.

It is not another prompt prettifier. SignalForge detects intent, missing context, workflow shape, context waste, and likely failure modes before you spend a full model run.

The v2 direction adds RAG before generation: SignalForge can explicitly index trusted local docs, retrieve only the small snippets relevant to a rough request, and compile those snippets into the final agent prompt with source and trust labels.

## What It Does

- Analyzes rough prompts for task type, clarity, missing context, and waste risks.
- Indexes trusted local project docs into `.signalforge/context-index.json`.
- Expands vague retrieval queries into concrete focus areas like UX, accessibility, performance, tests, and project setup.
- Retrieves budgeted, source-tagged context snippets before compilation.
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
node dist/cli.js index-context README.md AGENTS.md docs
node dist/cli.js compile "make my app better" --target codex --with-context
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
- `compile_prompt`: ready-to-use prompt with assumptions, split plan, optional retrieved context, and cost-saving notes.
- `index_context`: index explicit local trusted docs or repo guidance for RAG-backed compilation.
- `retrieve_context`: retrieve budgeted source-tagged snippets from the local context index.
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
- `signalforge://context/index`
- `signalforge://history/recent`

## RAG-Backed Compilation

SignalForge uses retrieval to improve the prompt, not to answer the user directly.

```bash
node dist/cli.js index-context README.md AGENTS.md docs
node dist/cli.js retrieve-context "make my app better"
node dist/cli.js compile "make my app better" --target codex --with-context
```

For vague requests, retrieval uses deterministic query expansion before scoring. For example, `make my app better` expands into focus terms such as `ui`, `ux`, `accessibility`, `performance`, `responsive`, `tests`, `build`, `package`, and `agents`. This keeps the system local and predictable while making it less dependent on exact keyword overlap.

The compiled prompt includes retrieved local context with source paths, trust labels, and a note that snippets are reference material rather than higher-priority instructions. This keeps the prompt grounded without letting random retrieved text override the user or client instructions.

## Development

```bash
npm run test
npm run build
npm run smoke
```

The compiler, query expansion, and local retrieval are deterministic. Optional embeddings or LLM refinement can be added later behind an environment flag, but the core should remain useful without any API key.
