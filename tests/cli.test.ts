import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("CLI", () => {
  it("preserves the prompt when optional flags are absent", async () => {
    const { stdout } = await execFileAsync("node", ["--import", "tsx", "src/cli.ts", "analyze", "build me a portfolio app"], {
      cwd: process.cwd()
    });
    expect(stdout).toContain('"taskType": "coding"');
  });
});
