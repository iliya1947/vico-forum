import { describe, expect, it, vi } from "vitest";
import { RouterContextProvider } from "react-router";
import { AccountInactiveError, AccountMissingError, AccountStateUnavailableError, AccountStateUnexpectedError } from "../../db/account-state";
import { ComplaintStorageUnavailableError, isComplaintStorageUnavailable } from "../../db/hyperdrive-complaints";
import { complaintCommandFailure, complaintHttpError } from "./queue.server";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { complaintAppealContext } from "./appeal-context";
import { action as participantAction } from "../routes/complaint-result";
import { action as reviewerAction } from "../routes/complaint-appeal-review";
import { action as submissionAction } from "../routes/complaint-submit";
import { complaintSubmissionContext } from "./request-context";

const base = "https://forum.example";
const request = (path: string, values: Record<string, string>) => new Request(base + path, {
  method: "POST",
  headers: { Origin: base, "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(values),
});
const participantFields = { intent: "appeal", decisionId: "decision-1", operationId: "operation-1", argument: "Appeal" };
const reviewerFields = { intent: "resolve", operationId: "operation-2", outcome: "overturned", reasoning: "Reviewed" };
const submissionFields = { kind: "post", postId: "post-1", revisionId: "revision-1", operationId: "operation-3", reason: "spam" };
function fixture() {
  const context = new RouterContextProvider();
  context.set(authSessionContext, { user: { id: "real-actor" } } as never);
  context.set(authorizationContext, { forUser: () => ({ has: async () => true }) } as never);
  const submitAppeal = vi.fn(async () => "appeal-1");
  const resolveAppeal = vi.fn(async () => "appeal-1");
  const submitComplaint = vi.fn(async () => {});
  context.set(complaintAppealContext, { submit: submitAppeal, resolve: resolveAppeal } as never);
  context.set(complaintSubmissionContext, { submit: submitComplaint });
  return { context, submitAppeal, resolveAppeal, submitComplaint };
}
describe("SA04-N3 canonical Complaint lifecycle HTTP mapping", () => {
  it.each([new AccountInactiveError(), new AccountMissingError()])(
    "all three canonical command types deny late actor %s as private unauthenticated 401", async error => {
      const s = fixture();
      s.submitAppeal.mockRejectedValueOnce(error);
      await expect(participantAction({ context: s.context, params: { caseId: "case-1" },
        request: request("/en/complaints/case-1/result", participantFields) }))
        .rejects.toMatchObject({ status: 401 });
      s.resolveAppeal.mockRejectedValueOnce(error);
      await expect(reviewerAction({ context: s.context,
        params: { caseId: "case-1", appealId: "appeal-1" },
        request: request("/en/attention/complaints/case-1/appeals/appeal-1", reviewerFields) }))
        .rejects.toMatchObject({ status: 401 });
      s.submitComplaint.mockRejectedValueOnce(error);
      const response = await submissionAction({ context: s.context,
        params: { topicId: "topic-1" },
        request: request("/en/topics/topic-1/complaints", submissionFields) });
      expect(response).toMatchObject({ data: { error: "unauthenticated" }, init: { status: 401 } });
      if (response instanceof Response) throw new Error("expected typed submission failure");
      expect(new Headers(response.init?.headers).get("Cache-Control")).toBe("private, no-store");
      expect(s.submitAppeal).toHaveBeenCalledExactlyOnceWith("real-actor", expect.any(Object));
      expect(s.resolveAppeal).toHaveBeenCalledExactlyOnceWith("real-actor", expect.any(Object));
    },
  );
  it("late 401 is private at shared read and command error boundaries", () => {
    for (const error of [new AccountInactiveError(), new AccountMissingError()]) {
      try { complaintCommandFailure(error); throw new Error("expected rejection"); }
      catch (caught) {
        expect(caught).toBeInstanceOf(Response);
        expect((caught as Response).status).toBe(401);
        expect((caught as Response).headers.get("Cache-Control")).toBe("private, no-store");
        expect((caught as Response).statusText).not.toContain("Account");
      }
      try { complaintHttpError(error); throw new Error("expected rejection"); }
      catch (caught) {
        expect(caught).toBeInstanceOf(Response);
        expect((caught as Response).status).toBe(401);
        expect((caught as Response).headers.get("Cache-Control")).toBe("private, no-store");
      }
    }
  });
  it("classifies bare/wrapped account-state availability but not unexpected failures", () => {
    const outage = new AccountStateUnavailableError();
    expect(isComplaintStorageUnavailable(outage)).toBe(true);
    expect(isComplaintStorageUnavailable(new Error("wrapper", { cause: outage }))).toBe(true);
    expect(isComplaintStorageUnavailable(new AccountStateUnexpectedError())).toBe(false);
    const cycle = new Error("cyclic") as Error & { cause?: unknown };
    cycle.cause = cycle;
    expect(isComplaintStorageUnavailable(cycle)).toBe(false);
    expect(isComplaintStorageUnavailable(new ComplaintStorageUnavailableError())).toBe(false);
  });
  it("preserves classified 503 and unexpected 500 path for participant and reviewer", async () => {
    const s = fixture();
    for (const error of [new ComplaintStorageUnavailableError()]) {
      s.submitAppeal.mockRejectedValueOnce(error);
      expect(await participantAction({ context: s.context, params: { caseId: "case-1" },
        request: request("/en/complaints/case-1/result", participantFields) }))
        .toMatchObject({ init: { status: 503 }, data: { error: "unavailable" } });
      s.resolveAppeal.mockRejectedValueOnce(error);
      expect(await reviewerAction({ context: s.context,
        params: { caseId: "case-1", appealId: "appeal-1" },
        request: request("/en/attention/complaints/case-1/appeals/appeal-1", reviewerFields) }))
        .toMatchObject({ init: { status: 503 }, data: { error: "unavailable" } });
    }
    const unexpected = new AccountStateUnexpectedError();
    s.submitAppeal.mockRejectedValueOnce(unexpected);
    await expect(participantAction({ context: s.context, params: { caseId: "case-1" },
      request: request("/en/complaints/case-1/result", participantFields) })).rejects.toBe(unexpected);
    s.resolveAppeal.mockRejectedValueOnce(unexpected);
    await expect(reviewerAction({ context: s.context,
      params: { caseId: "case-1", appealId: "appeal-1" },
      request: request("/en/attention/complaints/case-1/appeals/appeal-1", reviewerFields) }))
      .rejects.toBe(unexpected);
  });
});
