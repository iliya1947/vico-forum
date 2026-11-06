import { describe, expect, it, vi } from "vitest";
import { RouterContextProvider } from "react-router";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { complaintReviewContext } from "../complaints/review-context";
import { complaintAppealContext } from "../complaints/appeal-context";
import { loader as reviewContext } from "./complaint-review-context";
import { loader as reviewEvidence } from "./complaint-review-evidence";
import { loader as appealContext } from "./complaint-appeal-context";
import { loader as appealEvidence } from "./complaint-appeal-evidence";

/** Restricted administrative permissions must deny even guessed child URLs. */
describe("Complaint admin restriction HTTP child boundaries", () => {
  it("denies Case and Appeal context/evidence before reading private objects or R2", async () => {
    const context = new RouterContextProvider();
    context.set(authSessionContext, { user: { id: "restricted-reviewer" } } as never);
    const has = vi.fn(async () => false);
    context.set(authorizationContext, { forUser: () => ({ has }) } as never);
    const privateCase = vi.fn(async () => { throw new Error("unauthorized Case read"); });
    const privateAppeal = vi.fn(async () => { throw new Error("unauthorized Appeal read"); });
    context.set(complaintReviewContext, { context: privateCase, evidence: privateCase } as never);
    context.set(complaintAppealContext, { context: privateAppeal, evidence: privateAppeal } as never);

    const urls = [
      [reviewContext, { caseId: "secret-case", postId: "secret-post" }],
      [reviewEvidence, { caseId: "secret-case", attachmentId: "secret-file" }],
      [appealContext, { caseId: "secret-case", appealId: "secret-appeal", postId: "secret-post" }],
      [appealEvidence, { caseId: "secret-case", appealId: "secret-appeal", attachmentId: "secret-file" }],
    ] as const;
    for (const [loader, params] of urls) {
      try {
        await loader({ params, context } as never);
        throw new Error("private route was not denied");
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
        const response = error as Response;
        expect(response.status).toBe(403);
        expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      }
    }
    expect(has).toHaveBeenCalledTimes(4);
    expect(privateCase).not.toHaveBeenCalled();
    expect(privateAppeal).not.toHaveBeenCalled();
  });
});
