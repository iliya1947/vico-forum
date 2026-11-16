import type { Pool } from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountInactiveError, AccountMissingError, AccountStateUnavailableError, AccountStateUnexpectedError } from "./account-state";
import { PostgresOwnerAccountLifecycleCommand, OwnerAccountLifecycleCommitUncertainError,
  OwnerAccountLifecycleConflictError, OwnerAccountLifecycleForbiddenError,
  OwnerAccountLifecycleInvariantError, OwnerAccountLifecycleTargetMissingError, OwnerAccountLifecycleValidationError } from "./owner-account-lifecycle";
import { createHyperdriveOwnerAccountLifecycle, OwnerAccountLifecycleUnavailableError } from "./hyperdrive-owner-account-lifecycle";

afterEach(() => vi.restoreAllMocks());
const input = { actorId: "owner", targetId: "subject", operationId: "67d3fe88-3893-479e-bf50-60f4339760a0" };
function invocation(error: unknown, cleanupThrows = false) {
  vi.spyOn(PostgresOwnerAccountLifecycleCommand.prototype, "deactivate").mockRejectedValue(error);
  const end = vi.fn(async () => { if (cleanupThrows) throw new Error("cleanup failure"); });
  const factory = vi.fn(() => ({ end } as unknown as Pool));
  return { run: () => createHyperdriveOwnerAccountLifecycle("synthetic-loopback-test", "owner", factory).deactivate(input), end, factory };
}
describe("SA05 command facade error/cleanup contract", () => {
  it.each([
    new AccountStateUnavailableError(), new Error("wrapped", { cause: new AccountStateUnavailableError() }),
    Object.assign(new Error("transport"), { code: "ECONNRESET" }),
    Object.assign(new Error("canceling statement due to statement timeout"), { code: "57014" }),
    Object.assign(new Error("canceling statement due to lock timeout"), { code: "55P03" }),
  ])("classifies only known storage failure: %s", async error => {
    const { run, end } = invocation(error);
    await expect(run()).rejects.toMatchObject({ name: "OwnerAccountLifecycleUnavailableError", cause: error });
    expect(end).toHaveBeenCalledTimes(1);
  });
  it.each([
    new AccountInactiveError(), new AccountMissingError(), new AccountStateUnexpectedError(),
    new OwnerAccountLifecycleForbiddenError(), new OwnerAccountLifecycleValidationError(), new OwnerAccountLifecycleTargetMissingError(),
    new OwnerAccountLifecycleConflictError(), new OwnerAccountLifecycleInvariantError(),
    new OwnerAccountLifecycleCommitUncertainError({ cause: Object.assign(new Error("lost ack"), { code: "ECONNRESET" }) }),
    Object.assign(new Error("private schema failure"), { code: "42P01" }), new TypeError("private programming failure"),
  ])("preserves semantic/invariant/uncertain failures even when cleanup fails: %s", async error => {
    const { run, end } = invocation(error, true); await expect(run()).rejects.toBe(error); expect(end).toHaveBeenCalledTimes(1);
  });
  it("bounded cause traversal terminates on cycles and retains original unexpected failure", async () => {
    const error = new Error("cyclic"); Object.assign(error, { cause: error });
    await expect(invocation(error).run()).rejects.toBe(error);
  });
  it("connection refusal from the real command path is classified and pool cleanup still runs", async () => {
    const error = Object.assign(new Error("connect failed"), { code: "ECONNREFUSED" }), end = vi.fn(async () => undefined);
    const pool = { connect: async () => { throw error; }, end } as unknown as Pool;
    await expect(createHyperdriveOwnerAccountLifecycle("synthetic-loopback-test", "owner", () => pool).deactivate(input))
      .rejects.toBeInstanceOf(OwnerAccountLifecycleUnavailableError);
    expect(end).toHaveBeenCalledTimes(1);
  });
});
