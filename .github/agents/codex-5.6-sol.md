# Мишаня — Codex-5.6 Sol

## Текущий статус

Реализация четырёх bounded corrections находится в PR #232. Обязательный applicable browser/runtime prerequisite закрыт на неизменном code/test head `36e1306832e1910a5ed9e0bf9e5400d39abf45b6` с documentation-only successor `ee267d908c089e8781368a3b6a563f0f1c54eff6`.

## Browser/runtime prerequisite — 2026-10-18

- Реальный React Router + Workers/Hyperdrive runtime поднят поверх одноразовой локальной PostgreSQL 17; проверка выполнена в Chromium `154.0.8037.57` с настоящей authenticated forum session.
- Native Ctrl+V в Simple table-cell input не был `preventDefault`-нут ни surface, ни document bubble path; `one` превратилось в `one pasted`, authoritative Markdown — `| A |\n| --- |\n| one pasted |`.
- Enter поверх native Range между `Alpha ` и formatted leaf `Beta` заменил полный selected source: `Alpha **Beta** Gamma` → `Al\n\n Gamma`. Cross-block Range дал `Alpha\n\nBeta` → `Al\n\nta`.
- Через настоящий `/en/drafts/data` Workers/DB path проверены обе кнопки выбора для version-0 конфликта и для новой generation поверх terminal deleted head. Version-0 отправлял `save(expectedVersion: 0)` и получал active version 1 с выбранным draft ID/payload. Terminal path после реальных save v1 + delete v2 отправлял `save(expectedVersion: 2)` и получал active version 3 с выбранным новым generation ID/payload. Все четыре сценария завершились HTTP 200, authoritative content read подтвердил победителя, conflict UI был закрыт.
- PostgreSQL integration `tests/database/forum-attachments.test.ts`: 58/58 PASS, включая DELETE → zero live refs → cleanup не claim/delete-ит boundary object → resolve восстанавливает выбранный ref → последующее authoritative removal снова допускает cleanup.
- Targeted application regressions `markdown-editor.test.tsx` + `use-editor-draft.test.tsx`: 118/118 PASS.
- Browser page errors отсутствовали. Временные runtime/browser файлы не входят в implementation; PR #232 не изменялся.

## Следующая задача

После независимых whole-PR проверок Миры и Лиры выполнить третью whole-PR проверку того же stable implementation head. До своей очереди implementation не изменять.
