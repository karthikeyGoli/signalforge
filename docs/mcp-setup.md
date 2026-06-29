# MCP Setup

## Codex

After building:

```bash
codex mcp add signalforge -- node C:\Users\Karthikey G\OneDrive\Documents\signalforge\dist\stdio.js
```

Then use:

```text
Use SignalForge to compile this for Codex: build me a portfolio app
```

For RAG-backed compilation, first index trusted local docs:

```text
Use SignalForge to index README.md, AGENTS.md, package.json, and docs as trusted local context.
```

Then compile with context:

```text
Use SignalForge to compile this for Codex with local context: make my app better
```

## Claude Desktop / Claude Code

Add:

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

## Inspector

```bash
npm run inspect
```

Expected tools include:

- `analyze_prompt`
- `compile_prompt`
- `index_context`
- `retrieve_context`
- `estimate_prompt_waste`
- `get_prompt_pattern`
- `save_pattern`
- `list_patterns`
