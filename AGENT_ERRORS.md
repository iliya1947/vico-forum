# AGENT_ERRORS.md — подтверждённые ошибки агентов, полезные для предотвращения повторения в #342

## AE-01 — ошибочное переназначение по неоднозначной реплике

Мира ранее интерпретировала упоминание «Лёва» как переназначение Bookmarks implementation, хотя владелец имел в виду, что Лёва закончил planning.

Почему это ошибка: назначение было выведено из неоднозначной реплики вместо сопоставления с текущим workflow и целью владельца.

Как предотвращать: не менять конкретного исполнителя по одному имени/косвенному упоминанию; сначала сопоставлять реплику с активным stage и зафиксированным назначением. Прямое owner-переназначение имеет приоритет.

## 2026-11-20 — cadence conflation: removing full-CI loops was incorrectly turned into removing task stops

- **What happened:** after identifying that full repository CI after every B2 microstep was wasteful, Mira broadened the correction into "continue through internal microsteps without STOP" and carried that wording into B3.
- **Why it was wrong:** the owner's separate goal was to keep Lira's work deliberately small because long uninterrupted tasks cause stalls. CI cadence and task-size/STOP cadence are independent controls; optimizing one must not silently remove the other.
- **Prevention:** for Lira, default to 2–3 related microsteps per working batch (or fewer if one grows), targeted checks, then STOP for owner continuation. Full CI remains a bounded-stage end check, not a per-batch check. Do not paraphrase "no repeated full CI" as "no STOP".
