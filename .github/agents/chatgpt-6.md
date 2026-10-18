# Лира — ChatGPT-6

## Текущий статус

Applicable browser/runtime prerequisite PR #232 закрыт Мишаней на неизменном stable implementation head. Первая formal independent whole-PR проверка Миры завершена; её findings Лире не передаются до окончания независимого цикла.

## Следующая задача

Выполнить в PR #232 один bounded correction package для двух согласованных current-Stage defects: attachment boundary после 30-day expiry и hidden terminal tombstone, блокирующий новое поколение после metadata cutoff.

Не расширять scope. Добавить targeted regressions для обеих причинных цепочек, выполнить применимые checks и обновить фактический project state. После завершения записать exact head/evidence в #234 и STOP.


## Вторая независимая whole-PR проверка #232 — статус

- Завершена на стабильном code/test head `36e1306832e1910a5ed9e0bf9e5400d39abf45b6` (current documentation-only successor `ee267d908c089e8781368a3b6a563f0f1c54eff6`).
- Проверены все восемь changed-file paths PR #232, их исходные функции и соседние переходы: границы cleanup/retirement/rebind, визуальные Enter/paste, client conflict choices, publication/terminal expiration, регрессии и контракт `docs/EDITOR.md`. Сверена запись Chromium/Workers/PostgreSQL prerequisite Мишани в служебном PR и успешный exact-head GitHub Actions CI.
- Выводы и возможные findings оставлены **только разработчику в текущем чате**, в соответствии с правилом независимости AGENTS.md. До завершения предусмотренных проверок findings в PR #234 не раскрыты.
- Собственные PostgreSQL/Chromium прогоны Лира не выполняла; анализ основан на source trace и независимом рассмотрении существующих проверок. Отсутствие собственного повторного runtime run не выдаётся за положительный runtime evidence.
- После согласования findings оба current-Stage defect подтверждены. По owner override от 2026-10-19 Мишаня не подключается; Лира выполняет bounded correction package, после чего Мира и Лира заново независимо проверяют новый stable head.


## Согласование terminal-tombstone finding

- По запросу Миры в #234 после owner permission проверена source-level цепочка `metadata() filter updatedAt >= 30-day cutoff` → no-head in `checkRemote` → client new `baseVersion:0` → server `save()` sees persisted terminal row, CAS version mismatch → `gone` → client ignores returned `version` and re-fetches the same filtered `metadata()`, so normal sync retry cannot recover.
- **Подтверждено как current-Stage defect по исходникам**, не browser/DB repro. Existing tests cover hidden aged tombstones and visible terminal transitions separately, not their conjunction on same persistent context.
- Полный технический ответ опубликован комментарием #234 `6256229186`. Теперь за согласование bounded package и дальнейшую координацию отвечает Мира; никаких изменений implementation PR #232 здесь не выполнялось.

## Bounded correction package #232 — диагностика до изменения кода (2026-10-19)

1. Expiry/boundary. `DrizzleForumEditorDrafts.purgeExpired()` переводит expired active row в `deleted` и вызывает `retireAttachmentDraftGeneration()`, но не снимает `forum_attachment_draft_boundaries`. `retireAttachmentDraftGeneration()` пока лишь вставляет terminal generation marker. `ForumAttachmentCleanup.claimOne()` и финальное удаление проверяют **любую** boundary с этим attachment ID без ограничения её жизненным циклом.
2. Дополнительное важное звено: `ForumAttachmentCleanup.pruneStaleRefs()` вызывает `purgeExpired(ownerId)` только по владельцам найденных stale **live draft refs**. После финального version-fenced DELETE этих refs может быть ноль; регулярный cleanup вообще не вызывает terminalization у такого expired draft и boundary не освобождается. Поэтому одних изменений в `purgeExpired()` недостаточно для гарантии unattended cleanup. Другие terminal paths (publication) и redirected/rebound source тоже требуют проверки снятия устаревших boundaries.
3. Hidden terminal. `metadata()` умышленно скрывает terminal старше 30 дней; `get()` оставляет строку и серверный `save()` отвечает `gone` с **истинным `version`**. `useEditorDraft.sync()` после пустого повторного `metadata()` игнорирует `result.version` и не восстанавливает новую CAS base. Минимальный путь обязан сохранить metadata cutoff, terminal anti-resurrection и 60-second save cadence; дополнительные server endpoints не являются обязательным первым выбором.
4. Область будущего единого correction package: terminal/redirected boundary lifecycle в рамках owner/context lock, самостоятельная ограниченная cleanup-проверка даже без живых refs, корректное восстановление новой generation против hidden terminal CAS; targeted PostgreSQL/application regressions (особенно DELETE → zero refs → 30d expiry → cleanup и fresh text draft → aged terminal hidden → save). После реализации нужны applicable checks + factual `PROJECT_STATE.md`. Никаких изменений schema/migrations или Stage 6 без подтверждённой необходимости.
5. Уточнение: диагностика завершена без изменения implementation #232. Следующий логический этап — **единый** пакет реализация + регрессии + проверки + state. Нельзя объявлять пакет завершённым по одному лишь source trace.

