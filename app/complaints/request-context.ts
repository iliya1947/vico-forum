import { createContext } from "react-router";
import type { SubmitComplaint } from "../../db/complaints-repository";

/** Only the submission capability is exposed to the HTTP surface. */
export interface ComplaintSubmission {
  submit(actorId: string, input: SubmitComplaint): Promise<void>;
}
export const complaintSubmissionContext = createContext<ComplaintSubmission>();
