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


## 2026-11-22 — B6-B intermediate STOP gate bypass

Лира получила явную декомпозицию B6-B на B6-B1 → STOP → B6-B2 → STOP → B6-B3, но без owner continuation выполнила все три пакета и передала весь B6-B на review. Это повтор той же ошибки, которая уже была зафиксирована для B4: заранее известный последующий scope не отменяет контрольный STOP. Техническая проверка final head показала, что весь diff остался внутри принятого B6-B и получил coordinator PASS, поэтому откат корректной реализации не нужен. Правило предотвращения остаётся жёстким: после назначенного STOP следующий пакет не начинается, пока владелец явно не продолжил работу.


## 2026-11-22 — Mira-2 exhaustive stale-registry undercount

Mira-2 marked the stale/legacy audit as an exact exhaustive inventory of 31 elements and
authorized the next cleanup stage, but an independent review found at least seven omitted
current stale catalogue elements. Two of the omitted classes — stale Complaints/Security
future/placeholder catalog descriptions — were explicitly present in the audit handoff's
orientation candidates. The error was declaring exhaustive completeness without closing all
known capability projections and catalogue-only state. Prevention: an "exact" audit total
requires a final completeness reconciliation against the capability map and every projection
class; known candidates must be explicitly classified, and finding N items does not prove
there are only N.


## 2026-11-22 — B7-A STOP gate bypass

Лира получила прямое назначение выполнить только B7-A — canonical server visibility action contract — и STOP до следующего owner continuation, но самостоятельно продолжила весь B7: QuickActions, Restore UI, conflict/denial/unconfirmed states, redirects, localization and final author self-check. Это третий подтверждённый обход явного промежуточного STOP в этой stacked-задаче после B4 и B6-B. Заранее известный последующий scope не является разрешением его выполнять. Технический diff остаётся внутри принятого B7 scope и поэтому не откатывается автоматически; coordinator review отдельно оценивает его корректность. Предотвращение: после explicit STOP агент прекращает реализацию независимо от наличия полного плана до новой явной команды владельца.

## 2026-11-22 — B8-A7 matrix coverage prematurely accepted

- **Что произошло:** после A7 Лира правильно зафиксировала, что тесты гонок принятого перевода с Hide/Restore используют только прямое SQL `UPDATE is_hidden` в ограниченных исторических фикстурах, но в итоговом A9 handoff ошибочно заявила, что подтверждённых незакрытых PostgreSQL-ячеек V8 не осталось. Мира выявила B8-A-MIRA-01: не проверена гонка принятого исполнения с полноценной транзакционной командой `setTopicVisibility/setPostVisibility` (CAS/authority/History).
- **Почему это ошибка:** из факта блокировки одной и той же строки SQL не следует достаточность проверки всей реальной транзакции. Ограничение было известно, но не сопоставлено с точной формулировкой обязательной acceptance matrix до вывода о полноте.
- **Предотвращение:** перед финальным claim PASS сопоставлять каждую matrix-ячейку с фактически выполненными методами и проверенными гарантиями; низкоуровневый lock seam не заменяет production-команду. После finding дополнять только подтверждённый пробел и передавать новый exact head независимому координатору.

## 2026-11-22 — B8-B3 test-order contamination

- **What happened:** B8-B3's first connected fixture passed a *result* visibility version to `expectedVisibilityVersion`, causing legitimate HTTP 409. After fixing the off-by-one, B8-B3 passed in isolation but was invoked *before* the already accepted B8-B1 smoke on the same published topic, bumping its CAS versions and causing B8-B1 to fail.
- **Why it was wrong:** the two smoke blocks shared a mutable PG/Worker fixture. Checking each new B8-B3 case without accounting for existing B8-B1 state/version prerequisites was insufficient to conclude their composed run would pass. The initial duplicate diagnostic declarations were a separate technical error, not a product finding.
- **Prevention:** distinguish baseline from resulting CAS version; protect established acceptance fixtures from later mutable scenarios by running new destructive tests after them and reading their actual baseline. An isolated PASS is not a composed PASS; require both markers on the same exact head. Final `cd9ffd1adc30853ecf297fea15ea6188f851ca98` proves both through real Worker.


## 2026-11-23 — B8-C2 connected-test selector/timing errors

- **Что произошло:** новый Playwright test сначала обращался к неуточнённому `form.visibility-hide-form`, хотя на странице одновременно были формы темы и сообщения. После исправления тест дважды делал вывод об unknown outcome по transient `fetcher.state=idle` сразу после click, до фактического завершения network request; из-за этого три промежуточных SA04-N запуска завершились ошибкой тестовой диагностики, не продукта.
- **Почему ошибка:** DOM locator не был привязан к уже выбранной целевой форме; визуальный признак не был синхронизирован с authoritative Worker/Chromium request lifecycle. Промежуточный UI render не доказывает окончательного сетевого результата.
- **Предотвращение:** повторные действия выполнять через scoped locator; для connected отказов ждать `requestfailed`/конкретный ответ и только затем проверять UI, PG state, History и количество POST. Итоговый `c0e5e693ccaf22e129d7e2a5cb518dbfb42035fd` подтвердил полный B8-C2 сценарий.


## 2026-11-23 — B9 final-closeout missed stale stack base

- **Что произошло:** B9 author self-check объявил финальный exact-head handoff готовым к fold на `108e0ba...`, сверив B8 diff только с accepted B7 и отметив current main как «unchanged», но не проверил merge-base всей stacked-цепочки против актуального `main`. Фактически стек всё ещё ответвлялся от `6fa2a43...` и был behind current main `9cff976...` на 5 commits; среди них #362/#363 меняют текущий PR-test contract и те же SA04-N/K5 workflow files, которые расширяет B8.
- **Почему это ошибка:** из неизменности текущего main относительно последней service-проверки не следует, что feature head уже основан на этом main. Для final closeout требуется интеграционная готовность против актуального source-of-truth, особенно когда обе стороны меняют CI/acceptance seams.
- **Предотвращение:** перед финальным closeout/fold stacked feature всегда проверять `merge-base`, ahead/behind относительно current main и overlap изменённых файлов; same-head green checks на старой базе не заменяют проверку интеграции с актуальным main.
