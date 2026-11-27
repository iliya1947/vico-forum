import { describe, expect, it } from "vitest";
import {
  forumControlScopes, isWriteToolName, parseWriteStepInput,
  writeStepInputSchema, writeToolDescriptor, writeToolNames,
} from "./write-tool-contract";

const input = {
  taskId: "e8a018dd-8428-45d0-8a39-95a2f9bbab01",
  targetIndex: 0,
  stepIndex: 1,
};

describe("forum control write-tool contract", () => {
  it("accepts only the coordinates of an immutable prepared step", () => {
    expect(parseWriteStepInput(input)).toEqual(input);
    expect(parseWriteStepInput({ ...input, targetIndex: Number.MAX_SAFE_INTEGER })).not.toBeNull();
    for (const extra of ["actor", "userId", "confirmed", "target", "args", "operation", "scope"]) {
      expect(parseWriteStepInput({ ...input, [extra]: true })).toBeNull();
    }
    expect(parseWriteStepInput({ taskId: input.taskId, targetIndex: 0 })).toBeNull();
    expect(parseWriteStepInput(null)).toBeNull();
    expect(parseWriteStepInput([input])).toBeNull();
    for (const targetIndex of [-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, "0"]) {
      expect(parseWriteStepInput({ ...input, targetIndex })).toBeNull();
      expect(parseWriteStepInput({ ...input, stepIndex: targetIndex })).toBeNull();
    }
    for (const taskId of ["", "not-a-uuid", input.taskId.toUpperCase(), input.taskId + "\n"]) {
      expect(parseWriteStepInput({ ...input, taskId })).toBeNull();
    }
  });

  it("declares individual OAuth-protected writes with no generic executor", () => {
    expect(new Set(writeToolNames).size).toBe(writeToolNames.length);
    for (const name of writeToolNames) {
      expect(isWriteToolName(name)).toBe(true);
      const tool = writeToolDescriptor(name);
      expect(tool.name).toBe(name);
      expect(tool.inputSchema).toBe(writeStepInputSchema);
      expect(tool.inputSchema.additionalProperties).toBe(false);
      expect(tool.outputSchema.additionalProperties).toBe(false);
      expect(tool.outputSchema.properties.op.const).toBe(name);
      expect(tool.outputSchema.allOf[0].then.required).toEqual(["commandId", "target", "changed"]);
      expect(tool.annotations.readOnlyHint).toBe(false);
      expect(tool.annotations.openWorldHint).toBe(false);
      expect(tool._meta.securitySchemes).toEqual([
        { type: "oauth2", scopes: [forumControlScopes.write] },
      ]);
    }
    for (const name of ["execute", "sql", "shell", "fetch", "delete_topic", "reactivate_account", "constructor", "__proto__"]) {
      expect(isWriteToolName(name)).toBe(false);
    }
    expect(writeToolDescriptor("deactivate_account").annotations.destructiveHint).toBe(true);
    expect(writeToolDescriptor("create_category").annotations.destructiveHint).toBe(true);
  });
});
