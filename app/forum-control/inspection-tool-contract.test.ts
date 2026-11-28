import { describe, expect, it } from "vitest";
import { inspectionToolNames, inspectionInputSchema, isValidInspectionInput, inspectionToolDescriptor } from "./inspection-tool-contract";
import { writeToolNames } from "./write-tool-contract";

describe("individual inspection contracts", () => {
  it("covers every write exactly once and never takes actor, confirmation or generic args", () => {
    expect(inspectionToolNames).toEqual(writeToolNames.map(name => "inspect_" + name));
    for (const op of writeToolNames) {
      expect(inspectionInputSchema(op).additionalProperties).toBe(false);
      expect(inspectionToolDescriptor(op).name).toBe("inspect_" + op);
      for (const field of ["actor", "confirmed", "operationId", "args", "expectedVersion"]) {
        expect(Object.hasOwn(inspectionInputSchema(op).properties, field)).toBe(false);
      }
    }
    expect(isValidInspectionInput("pin_topic", { topicId: "123" })).toBe(true);
    expect(isValidInspectionInput("pin_topic", { topicId: "123", confirmed: true })).toBe(false);
    expect(isValidInspectionInput("set_best_answer", { topicId: "123", postId: null })).toBe(false);
    expect(isValidInspectionInput("set_complaint_priority_override", { caseId: "case", priority: null })).toBe(true);
    expect(isValidInspectionInput("set_complaint_priority_override", { caseId: "case", priority: 4 })).toBe(false);
    expect(isValidInspectionInput("replace_role_grants", { roleId: "role", permissions: ["sql"] })).toBe(false);
  });
  it("requires the exact Help outdated reason and measure appeal remedy", () => {
    expect(isValidInspectionInput("set_help_solution_moderation", { topicId: "t", status: "outdated", outdatedReason: null })).toBe(false);
    expect(isValidInspectionInput("set_help_solution_moderation", { topicId: "t", status: "outdated", outdatedReason: "Version changed" })).toBe(true);
    const id = "e8a018dd-8428-45d0-8a39-95a2f9bbab01";
    const data = { measureId: id, appealId: id, outcome: "rejected", explanation: "Evidence", remedy: null, restrictions: null, expiresAt: null };
    expect(isValidInspectionInput("resolve_measure_appeal", data)).toBe(true);
    expect(isValidInspectionInput("resolve_measure_appeal", { ...data, remedy: "lift" })).toBe(false);
    expect(isValidInspectionInput("resolve_measure_appeal", { ...data, outcome: "accepted", remedy: "change", restrictions: ["admin.forum", "admin.forum"] })).toBe(false);
  });
});
