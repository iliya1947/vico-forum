import { createContext } from "react-router";
import type { ComplaintPriorityCommand, ComplaintQueueCase, ComplaintQueuePage } from "./queue-contract";
/** Triage only: no notes, decisions, identity projection or administrative actions. */
export interface ComplaintQueue {
  readQueue(actor: string, page: number): Promise<ComplaintQueuePage>;
  readTriage(actor: string, caseId: string): Promise<ComplaintQueueCase>;
  changePriority(actor: string, input: ComplaintPriorityCommand): Promise<void>;
  activity(actor: string, caseId: string, active: boolean): Promise<void>;
}
export const complaintQueueContext = createContext<ComplaintQueue>();
