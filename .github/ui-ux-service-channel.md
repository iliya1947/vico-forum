# Vico Forum — общий служебный канал

Этот файл содержит только актуальное утверждённое состояние команды по правилам текущего `AGENTS.md`. История прежнего рабочего журнала сохранена в Git history служебного PR и не дублируется здесь.

## Активная реализация

- Implementation PR: #215 — Editor 2.0.
- Stable exact head: `b0930544218f4dba1c25d98820a7c12478c4ef57` (documentation-only successor; Editor runtime remains unchanged from the verified implementation).
- Runtime/code head коррекции compact toolbar и security-only navigation: `1fed72195536bc3e51967a68a4248c2acb7d21a5`.
- `1fed721… → e47436e…` меняет только `PROJECT_STATE.md`; runtime не меняется.
- Exact implementation-head CI #38949642183: `checks` SUCCESS, `database` SUCCESS.

## Принятое техническое состояние

- Independent `forum.attachmentSecurity.read` сохраняется как отдельная code-backed capability.
- Security-only navigation на bare `/:locale/attention` исправлена: default route ведёт в разрешённый Security → Attachments, explicit forbidden Signals остаётся запрещённым.
- Compact in-page mobile toolbar correction прошла real Chromium technical re-test на EN/LTR и HE/RTL, 320px/390px, Simple/Advanced: overlap/interception не воспроизведены, обязательные controls доступны; fenced-code pointer Indent/Outdent работает, prose не изменяется.
- Предыдущая работа отдельного аудита тестовой системы не входит в PR #215; случайный test-only Package 3 был удалён, current head снова `e47436e…`.

## Pre-review readiness

Pre-review gates закрыты. Первый проверяющий ChatGPT-5.6 Sol завершил свой этап; второй проверяющий ChatGPT-6 завершил функциональную source-level проверку назначенного Editor scope с findings и явно описанными границами evidence в своём личном файле. Это не означает прохождения всего четырёхагентного цикла и не является approval для merge.

Следующие pre-review gates были закрыты до старта цикла:

1. Owner visual acceptance финального Editor 2.0 состояния подтверждён 2026-10-16 как достаточный для pre-release MVP; дальнейшая визуальная полировка явно отложена владельцем и не блокирует завершение Editor 2.0.
2. `PROJECT_STATE.md` синхронизирован documentation-only commit `34d93f1e…`: зафиксированы положительный Chromium re-test и owner visual acceptance; runtime не изменён.
3. Runtime Editor заморожен: никаких новых функциональных или косметических изменений до merge, кроме подтверждённых current-Stage дефектов.

## Последовательность проверки после readiness

Прямое решение владельца от 2026-10-17 уточняет порядок относительно общего `AGENTS.md`:

1. ChatGPT-5.6 Sol — whole-PR проверка.
2. ChatGPT-6 — whole-PR/source-level проверка.
3. Codex-5.6 Sol — whole-PR проверка.
4. После этих трёх проверок findings согласуются, подтверждённые current-Stage defects исправляются одним bounded пакетом.
5. Любое implementation-исправление создаёт новый stable exact head; ChatGPT-5.6 Sol, ChatGPT-6 и Codex-5.6 Sol повторно проверяют исправленный head до состояния, когда подтверждённых current-Stage defects больше не найдено.
6. **Codex-6.1 Sol подключается только после этого, в самом конце перед merge, как финальный технический reviewer.** Не подключать Codex-6.1 Sol к промежуточному defect-discovery циклу до завершения исправлений и чистого прохода остальных проверяющих.

Во время проверки одного stable exact head implementation не исправляется. Первый finding не останавливает проверку. По умолчанию findings сохраняются только у разработчика до завершения соответствующего review-прохода; прямые owner-разрешения на передачу через служебный PR сохраняют силу только в явно разрешённом объёме.

## Owner decisions / ограничения

- Не запускать отдельный GitHub `Codex Code Review` для PR #215. Codex-5.6 Sol выполняет whole-PR проверку в основном defect-discovery цикле; Codex-6.1 Sol подключается только как финальная техническая проверка после исправлений и чистого повторного прохода остальных reviewers.
- Merge выполняет только разработчик.
- Stage 6 external infrastructure/deployment не возобновляется без отдельного указания владельца.
- Во время review-цикла проверка и исправление разделены: изменения implementation допускаются только после завершения проверки и подтверждения current-Stage defect.

## Review cycle

- ChatGPT-5.6 Sol completed its independent whole-PR review of PR #215 on exact implementation head `b0930544218f4dba1c25d98820a7c12478c4ef57`.
- ChatGPT-6 completed its source-level whole-PR review of the same exact head on 2026-10-17. It did not claim its own Chromium/test execution and explicitly bounded that evidence.
- Two GPT-6 findings are independently confirmed by ChatGPT-5.6 Sol as current-Stage defects: Simple-mode Enter ignores the actual caret inside a visual text leaf; non-TSV plain-text paste containing a Tab can discard the pasted content instead of using a safe fallback.
- GPT6-03 (cross-leaf paste selection) and GPT6-04 (paste event with no plain/html flavor) remain unconfirmed candidates. Source shows a plausible failure path, but the decisive native browser event behavior was not reproduced in the available Sol environment. They are not part of the confirmed-defect set.
- Implementation PR #215 remains unchanged on `b0930544218f4dba1c25d98820a7c12478c4ef57`. No correction is performed during the review cycle.
- The second required reviewer stage is complete. The next required reviewer is Codex-5.6 Sol, which must perform an independent whole-PR review of the same exact implementation head against the current task, Stage and source-of-truth documentation. Existing findings in the service PR must not be treated as a substitute for its own review.

## Следующий шаг

Передать Codex-5.6 Sol служебный PR #147 для whole-PR проверки PR #215 на exact head `b0930544218f4dba1c25d98820a7c12478c4ef57`.
