# Vico Forum — общий служебный канал

Этот PR — единственный актуальный служебный канал ChatGPT и Codex. Он не merge в `main`.

## Текущая реализация

- Активный implementation PR: #232 — Editor 2.0 follow-up corrections.
- PR #215 смержен в `main`; его дальнейшая история здесь не ведётся.
- Package 3 тестового аудита относится к отдельному рабочему потоку и здесь не координируется.
- #232 синхронизирован с актуальным `main`.
- Current PR head: `ae121565ccedcb7868cba01987e2cde0392b90e9`.
- Exact current code/test head: `0c6c7c58afbdcd65d486e1462e6eca24dc653b70`; successor `ae12156…` меняет только `PROJECT_STATE.md` (запись фактического CI).
- GitHub Actions #39176074057 на code head: `checks` SUCCESS, `database` SUCCESS. GitHub Actions #39176308478 на current PR head: оба jobs SUCCESS.
- Предыдущий applicable browser/runtime prerequisite по четырём первоначальным изменениям проведён Мишаней на `36e1306…`. Для двух последующих серверных lifecycle-коррекций зафиксированы targeted PostgreSQL regressions; новый real browser/runtime прогон пока не заявлен.
- Предыдущие независимые whole-PR проверки Миры и Лиры состоялись на старом head `36e1306…`; для нового stable implementation требуется новый независимый review-cycle.

## Текущий пакет #232

Реализованы коррекции четырёх ранее подтверждённых current-Stage дефектов:

1. cleanup учитывает unresolved attachment boundary и не удаляет нужный conflict winner объект;
2. Simple table-cell paste остаётся native внутри выбранной ячейки;
3. unsaved/version-0 и terminal-based cross-tab candidates проходят authoritative server transition вместо некорректного active-draft resolve;
4. cross-leaf / cross-block Simple Enter использует полный native selection range вместо leaf-end fallback.

## Подтверждённые defects после независимых проверок

### 1. Expired draft оставляет unresolved attachment boundary

Обе независимые проверки подтверждают current-Stage defect: version-fenced attachment mutation может создать `forum_attachment_draft_boundaries`, после чего 30-day expiry переводит text draft в terminal state и retire-ит generation, но boundary не очищается. Cleanup #232 теперь считает такой boundary live blocker, поэтому объект без live draft/post refs может удерживаться бессрочно.

### 2. Terminal tombstone старше metadata window блокирует новое поколение

После отдельного согласования Лира подтвердила причинную цепочку Миры:

- terminal `published/deleted` row старше 30 дней остаётся в `forum_editor_drafts`, но скрывается `metadata()`;
- новый editor instance того же persistent context получает no-head и начинает новую generation с `expectedVersion: 0`;
- первый server `save()` сталкивается с существующей terminal row с ненулевой version и возвращает `gone`;
- client после `gone` снова читает только metadata, опять не получает hidden authoritative version и не может установить CAS base для новой generation.

Оба defects относятся к текущему Editor draft/attachment lifecycle и должны быть исправлены до clean review-cycle.

## Границы

- Не расширять #232 до общего Editor refinement, косметики или Stage 6.
- Не возвращать закрытые findings #215 без нового подтверждённого causal evidence.
- Если attachment/conflict механизм снова требует повторной переделки или нового компенсирующего слоя, остановиться и заново проверить причину.
- Owner override для PR #232 от 2026-10-19: Мишаня не участвует в промежуточном defect-discovery цикле. Сначала Мира и Лира самостоятельно доводят implementation до stable head, на котором обе не находят current-Stage defects. Только после этого Мишаня выполняет один финальный whole-PR pre-merge review. Лёва для #232 не подключается без отдельной прямой команды разработчика.
- Merge выполняет только разработчик.

## Review sequence

Для PR #232 действует прямой owner override от 2026-10-19:

1. Мира и Лира независимо проверяют один stable implementation head.
2. Их current-Stage findings согласуются; подтверждённые defects исправляются отдельно.
3. Любое implementation change возвращает PR к новому независимому проходу Миры и Лиры.
4. Цикл повторяется, пока обе не завершат проверку одного stable exact head без current-Stage findings.
5. Только после этого Мишаня выполняет один финальный whole-PR pre-merge review.
6. Если Мишаня находит current-Stage defect, после исправления снова требуется чистый проход Миры и Лиры до следующего финального review Мишани.
7. При чистом финальном review Мишани PR готов к решению разработчика о merge.
8. Лёва в review-cycle #232 не входит без отдельной прямой команды разработчика.

## Статус согласованных correction findings

Оба согласованных current-Stage defects выше исправлены в code/test head `0c6c7c5…` и покрыты PostgreSQL regressions:

1. `ForumAttachmentCleanup` получает/снимает obsolete attachment boundaries по owner/context, даже когда live refs уже отсутствуют, при этом active text generations сохраняют boundary protection.
2. Новый server CAS при `expectedVersion: 0` допускает fresh generation поверх скрытого terminal tombstone лишь когда terminal старше 30-дневного окна; ранее retired draft ID остаётся запрещён.

Изменены только относящиеся к пакету server code, regression tests, `docs/EDITOR.md` и `PROJECT_STATE.md`. Source diff и CI/evidence проверены Лирой; детали в её личном файле #234. **Исправления ещё не приняты независимым whole-PR review на новом head. Implementation STOP.**

## Следующий шаг

Мира выполняет первый новый независимый whole-PR review PR #232 на exact code/test head `0c6c7c58afbdcd65d486e1462e6eca24dc653b70` с documentation-only successor `ae121565ccedcb7868cba01987e2cde0392b90e9`. Затем Лира делает отдельную независимую whole-PR проверку того же stable implementation. Findings не публикуются до завершения предусмотренных проверок, согласно `AGENTS.md`. Мишаню не подключать до общего clean result обеих; Лёву — только по отдельному прямому указанию владельца.
