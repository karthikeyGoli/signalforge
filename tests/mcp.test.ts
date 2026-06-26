import { describe, expect, it } from "vitest";
import { createSignalForgeServer } from "../src/server.js";

describe("MCP server", () => {
  it("constructs and closes with all registrations", async () => {
    const server = createSignalForgeServer();
    expect(server).toBeDefined();
    await server.close();
  });
});
