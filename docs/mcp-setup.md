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
