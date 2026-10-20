# Лира — ChatGPT-6

## Текущий статус

Старый bounded correction package PR #232 отменён. По принятому owner техническому плану Лёвы implementation STOP до согласования модели версий/conflict/attachments.

Подтверждённые current-Stage defects включают stale expiry, attachment-first hidden terminal, stale-payload/fresh-CAS chooseVersion и Simple programmatic paste DOM desync.

## Следующая задача

Implementation не менять. Следующий рабочий этап — анализ current model/invariants и state transitions по принятому плану Лёвы; конкретная реализация будет назначена только после согласования модели.


## Этап 2 — independent model review завершён (2026-10-19)

Проанализирован proposal Миры «одна authoritative draft-state version; `draftAttachmentIds` selected set; draft refs = retention pool» на unchanged implementation head `ae121565…`.

- Proposal обоснован как направление, но **до implementation отсутствует proof четырёх граничных сценариев**: (1) несколько параллельных POST файлов из одного `addFiles()`, каждый с одной CAS base; (2) оба порядка own attachment include и pending 60-second text autosave, со stale local base/dirty text; (3) text-only или subset publication при pool с удалёнными, но удерживаемыми assets — текущие `finishPublishedDraft()` checks предполагают pool==selected; (4) owner «более новый черновик» не тождественен server-version ordering для purely offline/local candidates.
- Последние 4 пункта — **недоказанные переходы proposed model, не новые confirmed current-Stage defects исходного кода**. Дополнительные persistent tables/registries не предлагаются.
- Полное техническое доказательство опубликовано комментарием PR #234 `6266330006`. Мира должна проверить контрпримеры и уточнить model transition proof до implementation.
- PR #232 не менялся. **STOP.**


## Новое owner decision

Владелец выбрал **manual fallback** для purely-local/offline copies, которые нельзя достоверно упорядочить по authoritative server history. Client `editedAt` не считается authoritative ordering.

Если порядок недоказуем — explicit conflict и ручной выбор. Если authoritative server ordering доказуем — применяется product rule для более нового snapshot. Keep-rule для same-file remove-vs-retain действует независимо.

## Следующая задача

Провести последний independent design gate target model после owner decision:
- проверить ранее найденные multi-upload, autosave↔attachment CAS, publication/access и offline-ordering transitions;
- искать скрытую необходимость нового compensation layer;
- подтвердить или отклонить готовность модели к implementation planning.

PR #232 не менять. Новые confirmed current-Stage defects исходного кода, если будут найдены, сначала вынести владельцу; correction не начинать.


## Последний independent design gate завершён — 2026-10-19

- Проверила уточнённую target model Миры и принятое owner rule `manual fallback` для несравнимых offline/local drafts; неизменный implementation PR #232 head `ae121565…`.
- **Концептуальный PASS для implementation planning, не implementation approval.** Multi-upload, manifest-CAS ↔ text autosave, pool selection/publication и offline ordering получили согласуемые state transitions без обязательной дополнительной DB table/version/registry. Новый runtime/DB/browser execution не проводился.
- Дополнительные два **обязательных transition proofs**: (A) legacy absent `draftAttachmentIds` ≠ explicit `[]`: нормализовать старые active rows с pool refs при переходе на authoritative manifest без потери вложений; (B) upload bytes/pool HTTP 201 ≠ committed selected manifest: UI `stored`/Publish блокировать до CAS include ACK/доказанной lost-ACK идемпотентности.
- Это не новые confirmed current-Stage defects текущего #232; это риски неполной реализации proposed model, проверенные на существующем source contract.
- Полное независимое заключение — комментарий PR #234 `6271010426`.
- PR #232 не изменялся; STOP до bounded implementation plan. Следующий шаг — Мира.


## Проверка candidate implementation plan

Мира подготовила bounded implementation plan в своём personal file и комментарии PR #234.

Задача: независимо проверить весь plan до признания его готовым:
- покрывает ли он четыре confirmed current-Stage defects и accepted target model;
- достаточно ли compatibility proof для legacy manifest и upload ACK != selected ACK;
- не создаёт ли proposed package sequence новую compensation chain;
- не потеряны ли publication/read/rebind/cleanup/generation invariants;
- не навязывает ли лишнюю schema/API complexity.

Implementation #232 не менять. Новый confirmed defect исходного кода — сначала владельцу. Если plan чист — явно дать PASS для pre-implementation review Лёвы.


## Independent candidate plan review — REQUEST REVISION (2026-10-19)

- Проверила candidate bounded implementation plan Миры на service head `d71d374…` против принятой target model и current implementation #232 `ae121565…`. Scope четырёх current-Stage defects, compatibility A/B, pool/read/publication/retirement/cleanup, owner offline decision и final acceptance покрыт. Это review плана, не code execution.
- **Один конкретный design blocker до PASS:** Package 1 требует recheck 30-day local expiry «перед server mutation», но в текущем runtime `reserveAttachmentGeneration()` меняет `ctx.local.editedAt` на `now` раньше server mutation; `capture()`/другие операции также могут обновлять timestamp. Если recheck выполнен после этих шагов, просроченный local draft выглядит свежим и подтверждённый expiry defect не устранён.
- В план включить explicit invariant «expiry-from-original-editedAt до любого read/refresh/capture/reserve, который может омолодить ctx.local» и regression для slept >30d runtime → first Attach/capture → old contents never resurrected. Обновлять `editedAt` допустимо только после пригодного срока/нового independent draft.
- Уточнение без blocker: keep-vs-remove/newer-attachment-set owner rules действуют в случае одинакового текста, а конфликт различного текста остаётся явным выбором.
- Комментарий PR #234 `6271766656` содержит проверенную причинную цепочку. **Это не новый defect текущего кода, а недостаточное закрытие одного уже подтверждённого дефекта candidate-планом.**
- PR #232 не менялся; implementation STOP.

## Следующая задача — узкий re-review revision

Мира внесла обе требуемые правки plan:
1. expiry-from-original-`editedAt` проверяется до capture/reserve/noteAttachmentChange/local refresh, с slept >30d → first Attach/capture regression;
2. keep/newer-set attachment rules применяются только при одинаковом тексте; различный text остаётся explicit conflict/manual choice.

Проверить только достаточность этих уточнений для закрытия комментария `6271766656` и, если иных blocker в уже проверенном плане не возникает, дать явный PASS для pre-implementation review Лёвы. Implementation #232 не менять.


## Узкий re-review revised implementation plan — PASS (2026-10-20)

- Проверила исправленные Package 1/2 Миры: срок хранения проверяется по **исходному** `ctx.local.editedAt` до `capture`, `reserveAttachmentGeneration`, `noteAttachmentChange`, local persistence/refresh и server mutation; старые payload/generation инвалидируются до обновления timestamp. Добавлен конкретный regression suspended runtime >30d → first Attach/capture → нет воскрешения.
- Owner keep/newer-attachment-set auto rules явно ограничены **одинаковым competing text**; при отличающемся тексте всегда остаётся explicit conflict/manual choice.
- Оба замечания комментария `6271766656` устранены без расширения scope или нового компенсационного механизма. Остальной план проверен предыдущим проходом и не менялся.
- **PASS для обязательного pre-implementation review Лёвы**, не разрешение реализации. Заключение опубликовано в комментарии #234 `6279272069`; полный проверенный план перенесён в общий `.github/service-channel.md` (commit `71ddb46`).
- PR #232 head `ae121565…` не менялся и остаётся STOP. Следующее действие разработчика — подключить Лёву к PR #234 для проверки плана.


## Независимый whole-PR review #232 — назначение

Implementation PR #232 находится на stable exact head `3b30d8d7b04eadd867c1b762d68bf040605b0ab0`; applicable CI exact head green.

Задача: провести **независимый whole-PR review** всей реализации #232 против исходной задачи, текущего Stage, актуального `main`, source-of-truth документации и принятого snapshot/CAS плана. Не ограничиваться тестами или отдельными изменёнными файлами; проверить существенные causal chains и current-Stage invariants, включая draft lifecycle, conflict semantics, attachment selection/pool/publication/access/cleanup, migration compatibility и Simple DOM behavior.

Результаты предыдущего whole-PR review Миры намеренно не передаются и не должны использоваться как исходная гипотеза. Сформировать собственные findings с нуля.

Во время review #232 не менять. Первый finding review не завершает. Возможные проблемы сначала диагностировать и классифицировать current-Stage vs future-only. Все findings сообщить только владельцу в текущем чате; **не записывать их в #234 до отдельной команды владельца после завершения независимых проверок**, согласно `AGENTS.md`.

Exact implementation head при начале review должен оставаться `3b30d8d7b04eadd867c1b762d68bf040605b0ab0`; если implementation head изменился — не переносить выводы со старого head и сообщить владельцу.


## Независимый whole-PR review #232 — опубликованный finding (owner authorization)

- Checked exact implementation head `3b30d8d7b04eadd867c1b762d68bf040605b0ab0`; CI `checks` + `database` PASS.
- **Current-Stage product-rule regression, source-level:** `checkRemoteNow()` может открыть conflict при одинаковом text `T`, local dirty marker и подтверждённой newer server version с unrelated new attachment. Пример: base `G@v1 {A}`; local `G@v1 {A}`, `editedAt != syncedEditedAt`, body/title/tags совпадают; server `G@v2 {A,B}`. `keptAttachmentSelection` возвращает `null` для new `B`; clean-local path не работает; payload JSON отличается; получается `updateConflict`, хотя owner rule требует newer authoritative attachment set `{A,B}`. Для clean local fast-path корректен — finding только о dirty-but-text-equivalent варианте.
- Прямая публикация по команде владельца в комментарии PR #234 `6287225975`; туда включены причинная цепочка, границы воспроизведения и targeted regression.
- Browser/PG тест именно этого сценария мной не выполнен, потеря файлов не доказана. Никакого кода #232 не меняла, correction не проектировала/не выполняла до owner agreement. Следующий workflow — Мира координирует рассмотрение findings.
