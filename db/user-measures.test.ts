import { describe, expect, it, vi } from "vitest";
import {
  InvalidUserMeasureInputError, UserMeasuresService,
  type PostgresUserMeasuresRepository,
} from "./user-measures";

const id = "10000000-0000-4000-8000-000000000001";
const op = "20000000-0000-4000-8000-000000000001";
const create = {
  id, actorId: "manager", targetUserId: "target", reason: "  Specific violation  ",
  restrictions: ["replies.create", "topics.create"], expiresAt: "2030-01-02T12:30:00+02:00",
};

function subject() {
  const repository = { create: vi.fn(async (input: unknown) => input),
    change: vi.fn(async (input: unknown) => input),
    lift: vi.fn(async (input: unknown) => input),
    submitAppeal: vi.fn(async (input: unknown) => input),
    resolveAppeal: vi.fn(async (input: unknown) => input) };
  return { repository, service: new UserMeasuresService(repository as unknown as PostgresUserMeasuresRepository) };
}

describe("AP-10 measure command normalization", () => {
  it("normalizes independent ordering and offset-qualified millisecond instants", async () => {
    const { service, repository } = subject();
    await service.create(create);
    const first = repository.create.mock.calls[0][0] as Record<string, unknown>;
    await service.create({ ...create,
      reason: "Specific violation",
      restrictions: ["topics.create", "replies.create"],
      expiresAt: "2030-01-02T10:30:00Z",
    });
    const second = repository.create.mock.calls[1][0] as Record<string, unknown>;
    expect(first).toEqual(second);
    expect(first.expiresAt).toBe("2030-01-02T10:30:00.000Z");
    expect(first.restrictions).toEqual(["replies.create", "topics.create"]);
    expect(first.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects ambiguous, impossible or malformed date/time inputs before any database write", async () => {
    const { service, repository } = subject();
    for (const expiresAt of [
      "2030-01-02", "2030-01-02T12:00:00", "2030-02-29T12:00:00Z",
      "2030-13-01T00:00:00Z", "2030-01-02T25:00:00Z",
      "2030-01-02T00:00:00+14:30", "2030-01-02T00:00:00+25:00",
      "2030-01-02T00:00:00.1234Z", new Date("2030-01-02T00:00:00Z"),
    ]) {
      await expect(service.create({ ...create, expiresAt })).rejects.toBeInstanceOf(InvalidUserMeasureInputError);
    }
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("validates opaque ids, reasons, unique child restrictions and version", async () => {
    const { service, repository } = subject();
    for (const overrides of [
      { id: "not-uuid" }, { targetUserId: " " }, { actorId: "" },
      { restrictions: ["publication"] }, { restrictions: ["topics.create", "topics.create"] },
      { restrictions: [] }, { restrictions: ["alien.capability"] },
      { reason: "\0x" }, { reason: "  " }, { reason: "x".repeat(2001) },
    ]) {
      await expect(service.create({ ...create, ...overrides })).rejects.toBeInstanceOf(InvalidUserMeasureInputError);
    }
    for (const expectedVersion of [0, -1, 2147483648, 1.5, "1", null]) {
      await expect(service.change({ measureId: id, operationId: op, actorId: "manager",
        expectedVersion, reason: "Changed", restrictions: ["topics.create"], expiresAt: null,
      })).rejects.toBeInstanceOf(InvalidUserMeasureInputError);
    }
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.change).not.toHaveBeenCalled();
  });

  it("preserves a separate operation fingerprint for change and lift", async () => {
    const { service, repository } = subject();
    await service.change({ measureId:id, operationId:op, actorId:"manager",expectedVersion:1,
      reason:"Updated",restrictions:["replies.create"],expiresAt:null });
    await service.lift({ measureId:id, operationId:op, actorId:"manager",expectedVersion:1,reason:"Updated" });
    const change = repository.change.mock.calls[0][0] as { fingerprint:string };
    const lift = repository.lift.mock.calls[0][0] as { fingerprint:string };
    expect(change.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(lift.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(change.fingerprint).not.toBe(lift.fingerprint);
  });
});


describe("AP-10 appeal input validation", () => {
  it("normalizes exact appeal IDs and bounded body without touching admin capabilities", async () => {
    const {service,repository}=subject();
    await service.submitAppeal({id:op,measureId:id,actorId:"target",body:"  Please reconsider  "});
    expect(repository.submitAppeal.mock.calls[0][0]).toEqual({
      id:op,measureId:id,actorId:"target",body:"Please reconsider",
    });
    for (const input of [
      {id:"not-uuid"}, {actorId:""}, {body:"  "}, {body:"a".repeat(2001)}, {body:"Bad\0reason"},
    ]) {
      await expect(service.submitAppeal({
        id:op,measureId:id,actorId:"target",body:"Reason",...input,
      })).rejects.toBeInstanceOf(InvalidUserMeasureInputError);
    }
    expect(repository.submitAppeal).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid review outcomes, remedies and implicit date formats before DB mutation", async () => {
    const {service,repository}=subject();
    const valid={measureId:id,appealId:op,operationId:"30000000-0000-4000-8000-000000000001",
      actorId:"manager",expectedVersion:1,outcome:"accepted",remedy:"change",
      explanation:"Review rationale",restrictions:["topics.create"],expiresAt:null};
    for (const bad of [
      {outcome:"pending"}, {outcome:"rejected",remedy:"change"},
      {outcome:"accepted",remedy:null}, {remedy:"lift",restrictions:["topics.create"]},
      {remedy:"change",restrictions:["unknown"]}, {expiresAt:"2030-10-01T09:00:00"},
      {explanation:"  "}, {expectedVersion:0}, {appealId:"not-uuid"},
    ]) {
      await expect(service.resolveAppeal({...valid,...bad}))
        .rejects.toBeInstanceOf(InvalidUserMeasureInputError);
    }
    expect(repository.resolveAppeal).not.toHaveBeenCalled();
    await service.resolveAppeal(valid);
    const submitted = repository.resolveAppeal.mock.calls[0][0] as Record<string,unknown>;
    expect(submitted.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(submitted.restrictions).toEqual(["topics.create"]);
    expect(submitted.remedy).toBe("change");
  });
});
