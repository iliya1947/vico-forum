import { describe, expect, it } from "vitest";
import { parseStructureCounter, StructureValidationError, validateStructureName } from "./forum-structure";

describe("structure command transport validation", () => {
  it("retains exact signed bigint counters across the Number precision boundary", () => {
    for (const value of ["0", "9007199254740993", "9223372036854775807"]) {
      expect(parseStructureCounter(value).toString()).toBe(value);
    }
  });
  it.each([null, undefined, 0, 9007199254740992n, [], {}, "", "00", "01", "-1", "+1", " 1", "1 ", "1.0", "1e3", "١", "9223372036854775808", "9".repeat(500)])("rejects noncanonical counter %s", value => {
    expect(() => parseStructureCounter(value)).toThrow(StructureValidationError);
  });
  it("trims plain Unicode without normalizing identities, markup or duplicate names", () => {
    expect(validateStructureName("  Раздел עברית 🦁  ")).toBe("Раздел עברית 🦁");
    expect(validateStructureName("e\u0301")).toBe("e\u0301");
    expect(validateStructureName("<b>literal</b>")).toBe("<b>literal</b>");
    expect(validateStructureName("🦁".repeat(200))).toHaveLength(400);
  });
  it.each([null, 123, [], "", "   ", "a".repeat(201), "🦁".repeat(201), "\nName", "Name\r", "a\tb", "a\0b", "a\u007fb", "a\u0085b", "a\u2028b", "a\u2029b", "\ud800", "\udc00"])("rejects invalid name %s", value => {
    expect(() => validateStructureName(value)).toThrow(StructureValidationError);
  });
});
