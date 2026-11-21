# AGENT_ERRORS.md — подтверждённые ошибки агентов, полезные для предотвращения повторения в #342

## AE-01 — ошибочное переназначение по неоднозначной реплике

Мира ранее интерпретировала упоминание «Лёва» как переназначение Bookmarks implementation, хотя владелец имел в виду, что Лёва закончил planning.

Почему это ошибка: назначение было выведено из неоднозначной реплики вместо сопоставления с текущим workflow и целью владельца.

Как предотвращать: не менять конкретного исполнителя по одному имени/косвенному упоминанию; сначала сопоставлять реплику с активным stage и зафиксированным назначением. Прямое owner-переназначение имеет приоритет.

## 2026-11-20 — cadence conflation: removing full-CI loops was incorrectly turned into removing task stops

- **What happened:** after identifying that full repository CI after every B2 microstep was wasteful, Mira broadened the correction into "continue through internal microsteps without STOP" and carried that wording into B3.
- **Why it was wrong:** the owner's separate goal was to keep Lira's work deliberately small because long uninterrupted tasks cause stalls. CI cadence and task-size/STOP cadence are independent controls; optimizing one must not silently remove the other.
- **Prevention:** for Lira, default to 2–3 related microsteps per working batch (or fewer if one grows), targeted checks, then STOP for owner continuation. Full CI remains a bounded-stage end check, not a per-batch check. Do not paraphrase "no repeated full CI" as "no STOP".


## 2026-11-20 — automatic CI was treated as a microbatch gate

- **What happened:** after the small-batch cadence was restored, Mira still left wording telling Lira to capture the automatically triggered full PR CI result before marking an intermediate B3 batch PASS.
- **Why it was wrong:** GitHub automatically starting workflows on push is different from the workflow being required as a gate. Waiting/polling those broad runs recreated the same delay the cadence change was meant to remove.
- **Prevention:** intermediate batches close on targeted checks. Auto-triggered broad CI may run, but agents do not wait for, poll, or rerun it at the batch boundary. Full exact-head CI is an end-of-bounded-stage gate unless a concrete relevant failure/risk justifies earlier escalation.

## 2026-11-21 — unauthorized service-PR switch

- **What happened:** while #342 was already the assigned service PR, Mira created #361 and started using it as the working channel for the same current work.
- **Why it was wrong:** AGENTS.md explicitly says Mira must not change the assigned service PR without a direct developer command. Creating #361 as the replacement working channel was itself that forbidden switch; there was no genuine rule conflict to resolve.
- **Prevention:** when a service PR is already assigned, keep all workflow/handoff state there unless the developer explicitly commands a switch. The generic rule about creating a service PR for a separate task applies only when no current assignment already governs the work.

## 2026-11-21 — invented reviewer exception

- **What happened:** after initially assigning Leva as the standard independent reviewer, Mira asserted a nonexistent project rule that process/workflow tasks exclude Leva and changed the handoff to Lira.
- **Why it was wrong:** current `AGENTS.md` contains no such exception; Lira later corrected the service record. The conclusion was based on an invented condition rather than the actual source of truth.
- **Prevention:** before overriding the standard reviewer route, verify the claimed exception in current `AGENTS.md` or an explicit owner instruction. Do not turn remembered/project-adjacent context into a binding rule without verification.

