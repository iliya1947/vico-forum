# Bounded implementation handoffs

## Goal

Prevent a reviewed multi-step technical plan from being handed to the implementer as one oversized task.

## Required workflow

1. After a technical plan is accepted, Mira evaluates implementation granularity before assigning Lira.
2. If the plan contains multiple independently completable implementation steps, Mira splits it into bounded sequential subtasks.
3. Only one bounded implementation subtask is assigned at a time.
4. Lira stops after completing the assigned subtask and records its result in the task service PR.
5. The next subtask is assigned only after the developer explicitly continues the task.
6. Coordinator whole-PR review starts only when the complete implementation package has reached its planned final stable head.

This changes workflow only. It does not change product scope, implementation architecture, reviewer roles or merge authority.
