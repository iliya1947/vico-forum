# Vico Forum — общий служебный канал

Этот PR — единственный актуальный служебный канал ChatGPT и Codex. Он не merge в `main`.

## Текущая реализация

- Активный implementation PR: #232 — Editor 2.0 follow-up corrections.
- PR #215 смержен в `main`; его дальнейшая история здесь не ведётся.
- Package 3 тестового аудита относится к отдельному рабочему потоку и здесь не координируется.
- #232 синхронизирован с актуальным `main`.
- Current PR head: `ee267d908c089e8781368a3b6a563f0f1c54eff6`.
- Exact code/test head: `36e1306832e1910a5ed9e0bf9e5400d39abf45b6`.
- Последующий `ee267d9…` меняет только запись exact-head CI в `PROJECT_STATE.md`; implementation не меняется.
- GitHub Actions #39136086360 на current head: SUCCESS.
- Applicable browser/runtime prerequisite закрыт Мишаней на неизменном code/test head `36e1306…`.
- Независимые whole-PR проверки Миры и Лиры этого stable head завершены; owner разрешил перенести findings в служебный PR и начать согласование.

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

## Следующий шаг

Лира выполняет один bounded correction package в implementation PR #232 только для двух подтверждённых current-Stage defects выше.

Критерии готовности package:

1. после 30-day expiry ненужная attachment boundary больше не удерживает orphan object от обычного cleanup;
2. новый draft в повторно используемом persistent context сохраняется корректно даже когда прежний terminal tombstone уже вышел из metadata window;
3. добавлены targeted regressions, воспроизводящие обе исходные причинные цепочки и подтверждающие штатный путь после correction;
4. применимые tests/checks проходят; фактическое состояние отражено в `PROJECT_STATE.md`;
5. unrelated Editor/refinement/Stage 6 scope не изменяется.

После завершения Лира фиксирует exact implementation head и evidence в служебном PR и STOP. Затем новый stable head снова независимо проверяют Мира и Лира. Мишаню не подключать до общего clean result обеих.
