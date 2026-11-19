# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

**Moderation visibility: Leva plan adaptation COMPLETE; STOP для checkpoint Миры.** Implementation ещё не начат.

## Проверенный baseline и решения

- Current main `6fa2a43b02c55515bbd46a0d74fe6cc0d4424caf`, #354 merged; прежние audit corrections CLOSED.
- Migration ceiling0070; external evidence0020. Deployed state этим шагом не проверялось.
- V-P1/V-P2/V-P3 **ACCEPTED ранее**, D-08; повторно на согласование не выносить.
- V-T1/V-T2 technical fit **PASS**: отдельная capability/state/CAS/History, existing local lock conventions, без architecture rewrite.
- Полный действующий V1–V9 и checkpoints B1–B9: `stages/moderation-visibility/PLAN.md`. Обязательные read/write/asset/retention границы восстановлены в current plan из полного исторического текста Git.
- Сверены actual current schema/catalog/AP-10/History/Owner classifications, readers/writers/translation planning/assets и merged Watch/Bookmarks/Mute/Block seams. Новых product forks или подтверждённых конфликтов, требующих перепроектирования, нет.

## Назначение и следующий шаг

**Мира** — проверить полноту технической адаптации V1–V9/B1–B9 и подготовить bounded handoff **Лире только на B1**. Это checkpoint плана, не повторное согласование принятых продуктовых решений.

B1: один Draft implementation PR от свежего main; schema/catalog/History foundation, forward migration после текущего ceiling, focused migration/constraint/ACL tests, без route-exposed Hide. Ровно B1, запись результата и STOP. Остальные checkpoints не выполняются автоматически; весь vertical slice должен быть закончен до final implementation review/merge.

Лёва STOP после планирования. Код/schema/runtime не менялись, visibility feature tests/CI/browser не запускались. Если Мира подтвердит полноту, следующий implementation исполнитель — Лира по stage plan; агенты друг друга не запускают.

## Дальше

После полного visibility implementation/review/owner merge — отдельный docs closeout, затем forum structure/topic move → #320. #300, Stage6 и general UI/UX текущим заданием не активированы. #342 никогда не merge.
