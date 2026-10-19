# Мира — ChatGPT-5.6 Sol

## Текущий статус

Первая formal independent whole-PR проверка PR #232 завершена на stable implementation head `36e1306832e1910a5ed9e0bf9e5400d39abf45b6` с documentation-only successor `ee267d908c089e8781368a3b6a563f0f1c54eff6`.

После завершения независимых проверок разработчик разрешил перенос findings в служебный PR.

## Findings

1. **Подтверждённый обеими проверками current-Stage defect:** unresolved `forum_attachment_draft_boundaries` переживает 30-day expiry text draft. `purgeExpired()` retire-ит generation, но boundary не очищает; cleanup #232 считает boundary live blocker, поэтому уже ненужный объект может удерживаться бессрочно.

2. **Подтверждённый после согласования current-Stage defect:** terminal `published/deleted` row старше 30-дневного metadata window остаётся в DB, но скрывается `metadata()`. Новый editor instance в том же context получает no-head, начинает с `expectedVersion: 0`, server `save()` сталкивается с существующим terminal row и возвращает `gone`; повторный metadata-read снова скрывает authoritative version. Лира отдельно перепроверила эту причинную цепочку и подтвердила defect.

По native table-cell paste, cross-leaf/cross-block Enter и свежим version-0/terminal conflict paths новых current-Stage defects в проверке Миры не найдено.

## Следующая задача

Дождаться bounded correction package Лиры в PR #232. После фиксации нового stable exact head провести новый независимый whole-PR review только после завершения реализации и применимых checks. Мишаню не подключать до clean result Миры и Лиры.


## Новый review-cycle после correction package — 2026-10-19

- Independent whole-PR review нового stable code/test head `0c6c7c58afbdcd65d486e1462e6eca24dc653b70` с documentation-only successor `ae121565ccedcb7868cba01987e2cde0392b90e9` завершён.
- Implementation во время проверки не менялась.
- Findings по review-isolation сообщены только разработчику в текущем чате и до завершения независимого прохода Лиры в служебный PR не раскрываются.
- Следующий gate — независимый whole-PR review Лиры того же stable implementation.


## Finding нового review-cycle — 2026-10-19

**Current-Stage finding:** correction hidden-terminal CAS разрешает `expectedVersion:0` поверх aged terminal row, но long-lived runtime не инвалидирует уже загруженный `ctx.local` после 30-day cutoff. Поэтому stale unsaved/offline version-0 вкладка может вернуться после >30 дней и воскресить локальный черновик, который при новом mount уже считался бы expired.

Подробная причинная цепочка опубликована для согласования в комментарии #234 `6262978103`. До ответа Лиры implementation не менять.
