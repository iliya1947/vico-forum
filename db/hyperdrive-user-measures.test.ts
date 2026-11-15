import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AccountInactiveError, AccountMissingError, AccountStateUnavailableError,
  AccountStateUnexpectedError,
} from "./account-state";
import { createHyperdriveUserMeasures, UserMeasuresUnavailableError } from "./hyperdrive-user-measures";
import { PostgresUserMeasuresRepository } from "./user-measures";
import { PostgresUserMeasureReader } from "./user-measure-read";

const id = "3418b918-925d-4567-a520-5809b6899339";
const appealId = "4475cf88-c46d-4d1b-9057-7a9414f63d0c";
const operationId = "6960a366-ac71-4f7c-bb5f-42c26c091a3b";

const writers = [
  { method: "create", run: (c: ReturnType<typeof createHyperdriveUserMeasures>) => c.create({
    id, actorId: "owner", targetUserId: "target", reason: "Measure reason",
    restrictions: ["topics.create"], expiresAt: null,
  }) },
  { method: "change", run: (c: ReturnType<typeof createHyperdriveUserMeasures>) => c.change({
    measureId: id, operationId, actorId: "owner", expectedVersion: 1,
    reason: "Changed reason", restrictions: ["replies.create"], expiresAt: null,
  }) },
  { method: "lift", run: (c: ReturnType<typeof createHyperdriveUserMeasures>) => c.lift({
    measureId: id, operationId, actorId: "owner", expectedVersion: 1,
    reason: "Lift reason",
  }) },
  { method: "submitAppeal", run: (c: ReturnType<typeof createHyperdriveUserMeasures>) => c.submitAppeal({
    id: appealId, measureId: id, actorId: "target", body: "Please review",
  }) },
  { method: "resolveAppeal", run: (c: ReturnType<typeof createHyperdriveUserMeasures>) => c.resolveAppeal({
    measureId: id, appealId, operationId, actorId: "owner", expectedVersion: 1,
    outcome: "rejected", explanation: "Review reason",
    remedy: null, restrictions: null, expiresAt: null,
  }) },
] as const;

const capability = () => createHyperdriveUserMeasures("postgresql://example.invalid/db", "owner");

afterEach(() => vi.restoreAllMocks());

describe("Hyperdrive AP10 AccountState availability classification", () => {
  it.each(writers)("classifies bare and cause-wrapped typed outage for $method", async ({ method, run }) => {
    const failures = [
      new AccountStateUnavailableError(),
      new Error("outer failure", { cause: new AccountStateUnavailableError() }),
      new AccountStateUnavailableError({ cause: new Error("underlying storage fault") }),
    ];
    const mocked = vi.spyOn(PostgresUserMeasuresRepository.prototype, method);
    for (const failure of failures) {
      mocked.mockRejectedValueOnce(failure);
      await expect(run(capability())).rejects.toMatchObject({
        message: "User measures unavailable",
        cause: failure,
      });
    }
    expect(mocked).toHaveBeenCalledTimes(failures.length);
  });

  it("preserves unexpected storage errors and known lifecycle denials for all writer entrypoints", async () => {
    const unexpectedSql = Object.assign(new Error("unknown schema fault"), { code: "42P01" });
    const faults = [
      new AccountStateUnexpectedError({ cause: unexpectedSql }),
      new Error("wrapper", { cause: new AccountStateUnexpectedError() }),
      new TypeError("unexpected programmer fault"),
      unexpectedSql,
      new AccountInactiveError(),
      new AccountMissingError(),
    ];
    for (const { method, run } of writers) {
      const mocked = vi.spyOn(PostgresUserMeasuresRepository.prototype, method);
      for (const fault of faults) {
        mocked.mockRejectedValueOnce(fault);
        await expect(run(capability())).rejects.toBe(fault);
      }
      mocked.mockRestore();
    }
  });

  it("retains prior PostgreSQL timeout classification and rejects non-availability cyclic cause objects", async () => {
    const mocked = vi.spyOn(PostgresUserMeasuresRepository.prototype, "create");
    const command = writers[0]!.run;
    const timeout = Object.assign(new Error("canceling statement due to statement timeout"), { code: "57014" });
    mocked.mockRejectedValueOnce(new Error("outer", { cause: timeout }));
    await expect(command(capability())).rejects.toBeInstanceOf(UserMeasuresUnavailableError);

    const cyclic = new Error("cyclic");
    Object.assign(cyclic, { cause: cyclic });
    mocked.mockRejectedValueOnce(cyclic);
    await expect(command(capability())).rejects.toBe(cyclic);
  });

  it("applies the shared classification to read operations while preserving successful reads", async () => {
    const read = vi.spyOn(PostgresUserMeasureReader.prototype, "ownList");
    const fault = new AccountStateUnavailableError();
    read.mockRejectedValueOnce(new Error("wrapped", { cause: fault }));
    await expect(capability().ownList("target")).rejects.toMatchObject({
      message: "User measures unavailable",
    });
    read.mockResolvedValueOnce([]);
    await expect(capability().ownList("target")).resolves.toEqual([]);
    read.mockRejectedValueOnce(new AccountInactiveError());
    await expect(capability().ownList("target")).rejects.toBeInstanceOf(AccountInactiveError);
  });
});
