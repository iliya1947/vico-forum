// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createLocalForumControlMcpFixture } from "./forum-control-mcp";
import { forumControlScopes } from "../../app/forum-control/write-tool-contract";
import {
  isValidReadToolInput, readToolNames, isReadToolName, isValidPrepareTaskInput,
} from "../../app/forum-control/read-tool-contract";

const endpoint = new URL("http://127.0.0.1:8765/mcp");
const step = { taskId: "e8a018dd-8428-45d0-8a39-95a2f9bbab01", targetIndex: 0, stepIndex: 0 };
const request = (method: string, params: object = {}, origin?: string) => new Request(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream",
    ...(origin ? { Origin: origin } : {}) },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
});

describe("local forum-control fixture", () => {
  it("rejects unknown fields and actor/confirmation injection on read and preparation", () => {
    expect(new Set(readToolNames).size).toBe(readToolNames.length);
    expect(isReadToolName("constructor")).toBe(false);
    for (const name of readToolNames) {
      expect(isValidReadToolInput(name, { actor: "owner" })).toBe(false);
    }
    expect(isValidReadToolInput("read_topic", { topicId: "123" })).toBe(true);
    expect(isValidReadToolInput("read_topic", { topicId: "123", confirmed: true })).toBe(false);
    expect(isValidReadToolInput("read_topic", {})).toBe(false);
    expect(isValidReadToolInput("list_complaint_cases", { page: 0 })).toBe(false);
    const target = { steps: [step.taskId] };
    expect(isValidPrepareTaskInput({ mode: "single", targets: [target] })).toBe(true);
    expect(isValidPrepareTaskInput({ mode: "single", targets: [target, target] })).toBe(false);
    expect(isValidPrepareTaskInput({ mode: "bulk", targets: [target, target] })).toBe(false);
    expect(isValidPrepareTaskInput({ mode: "single", targets: [target], confirmed: true })).toBe(false);
  });

  it("enforces admission and read/write scope independently for every invocation", async () => {
    const read = createLocalForumControlMcpFixture(endpoint, async () => new Set([forumControlScopes.read]));
    const write = createLocalForumControlMcpFixture(endpoint, async () => new Set([forumControlScopes.write]));
    const denied = createLocalForumControlMcpFixture(endpoint, async () => null);
    expect((await denied(request("tools/list"))).status).toBe(401);
    expect((await read(request("tools/list", {}, "https://invalid.example"))).status).toBe(403);
    const list = await (await read(request("tools/list"))).json();
    expect(list.result.tools.map((tool: { name: string }) => tool.name)).toEqual(["read_admin_overview"]);
    const result = await (await read(request("tools/call", { name: "read_admin_overview", arguments: {} }))).json();
    expect(result.result.structuredContent).toEqual({ fixture: true, status: "read-ok", topics: 3, users: 2 });
    const blocked = await (await read(request("tools/call", { name: "pin_topic", arguments: step }))).json();
    expect(blocked.result.isError).toBe(true);
    const noRead = await (await write(request("tools/call", { name: "read_admin_overview" }))).json();
    expect(noRead.result.isError).toBe(true);
    for (const name of ["pin_topic", "create_custom_role", "deactivate_account"]) {
      const response = await (await write(request("tools/call", { name, arguments: step }))).json();
      expect(response.result.structuredContent).toMatchObject({
        op: name, status: "unavailable", code: "local-fixture-no-domain-effect",
      });
    }
    const generic = await (await write(request("tools/call", { name: "execute", arguments: step }))).json();
    expect(generic.error.code).toBe(-32602);
  });
});
