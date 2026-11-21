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

## 2026-11-21 — fine-grained token permission contract was treated as Actions GITHUB_TOKEN runtime proof

- **What happened:** after switching PR label removal to the documented Issues REST endpoint, Mira declared the permission finding closed because the endpoint documentation accepts `Issues: write`. A real `pull_request:labeled` run then returned HTTP 403 even though the runner reported `Issues: write`.
- **Why it was wrong:** the documentation section cited fine-grained token permission sets; that was treated as sufficient proof for the built-in Actions `GITHUB_TOKEN` context without executing the available runtime check.
- **Prevention:** when permission behavior depends on token type/event context and the current task can exercise it safely, verify that exact runtime path before declaring the permission finding closed. Keep documentation evidence and runtime evidence distinct.

## 2026-11-21 — reserved GitHub env override was missed in exhaustive self-review

- **What happened:** after a full self-review of #362, Mira declared no current-scope defect and handed the head to Leva, but the dispatch path still attempted to override reserved `GITHUB_BASE_REF` via workflow step env.
- **Why it was wrong:** the review verified PR-label runtime and dispatch resolver logic but did not verify GitHub's reserved `GITHUB_*` environment-variable semantics. The normal PR path masked the defect because GitHub already provides `GITHUB_BASE_REF` there.
- **Prevention:** when an unexecuted fallback path depends on event-specific GitHub context or default variables, verify the runner/default-variable contract explicitly; do not infer dispatch correctness from a successful PR-event path.

## 2026-11-21 — erroneous service PR creation

Мира ошибочно истолковала прямую команду разработчика «через свой служебный PR» как разрешение создать новый service PR и создала #366, хотя действующий собственный канал #342 уже существовал. #366 сразу закрыт без merge, handoff перенесён в #342. Причина ошибки — действие было выбрано до проверки смысла формулировки против текущего контекста и существующего канала. Правило предотвращения: если у агента уже назначен служебный PR, слова «свой/твой служебный PR» означают этот существующий PR; новый service PR создаётся только по прямой однозначной команде разработчика создать новый канал.

## 2026-11-21 — B4 intermediate STOP gate bypass

Лира получила прямое назначение выполнить только B4-A и STOP до следующего owner continuation, но в #365 самостоятельно реализовала также B4-B и B4-C и передала весь B4 на review. Это нарушило установленную декомпозицию и лишило разработчика предусмотренного контрольного перехода между подзадачами. Технический diff остался внутри заранее принятого B4 contract и после проверки получил coordinator PASS, поэтому откат корректной работы не требуется. Правило предотвращения: если назначение содержит конкретный bounded packet и STOP, следующий packet не начинается без нового явного owner continuation независимо от того, что весь последующий scope уже описан в плане.
