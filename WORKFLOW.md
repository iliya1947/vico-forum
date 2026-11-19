# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

Moderation visibility — **scope/fit gate** перед implementation.

## Завершённый corrective gate

- #354 merged в main без изменения reviewed implementation head.
- Reviewed head: `b67e14d81cd20f2e42264e3d25d336ee19db626b`.
- Merge commit/current main: `6fa2a43b02c55515bbd46a0d74fe6cc0d4424caf`.
- Mira whole-PR PASS + Leva independent PASS относились к одному exact head; confirmed current-scope defects = 0.
- Corrections закрыты; к #354 не возвращаться без нового факта.

## Moderation visibility scope/fit

План V1–V9 сверён с current main, PROJECT/PROJECT_STATE, authorization catalog, AP-10 restriction families, topic/post schema, closure writer и Admin History.

### Technical fit — PASS

- **V-T1**: proposed schema/catalog/History shape совместим с текущими seams. Нужна обычная forward migration после текущего ceiling 0070; новый code-backed permission, initial moderator/admin grants, включение в AP-10 `admin.forum`, visibility fields/CAS и typed Admin History events/reason. Existing Owner projection автоматически получает новый catalog permission.
- **V-T2**: отдельный глобальный lock не требуется. Existing row-lock convention подходит: topic mutation locks topic; post mutation следует существующему stable order topic → post; History append last in same transaction. Public filtering должно происходить в SQL до rank/count/LIMIT. Architecture rewrite не требуется.
- При реализации новые History actions также должны быть добавлены в schema constraint, labels и Owner/Super-admin monitoring classification; это integration requirement, не отдельный product fork.

### Product forks — owner decision required

Явного старого принятия в #342/новом workspace не найдено.

1. **V-P1 — public model. Recommendation:** hidden topic = neutral public 404 без metadata/source; hidden post in visible topic = stable tombstone retaining id/number/relations, но без body/original/translation/revision/attachments.
2. **V-P2 — authority/reason. Recommendation:** dedicated `forum.content.visibility.manage`; initial moderator+admin; AP-10 `admin.forum` suppresses it; nonblank reason required for each real Hide **and Restore** transition; no-op/stale/denied produce no History.
3. **V-P3 — retained state. Recommendation:** Hide/Restore меняет только visibility. Preserve solution/duplicate/read/notifications/Watch/Bookmarks/Mute/Block and retained translation/attachment/revision data; no auto-unsolve/unpin/reopen/backfill. While hidden, public/current projections become unavailable-safe; protected Complaints/Admin evidence remains under its existing private authority.

Implementation PR не открывать до owner решения V-P1–V-P3. После принятия Leva сверяет/финализирует full technical plan against current main, затем Lira начинает bounded implementation.

## Дальше

После moderation visibility: forum structure/topic move → затем #320. #300/Stage6/general UI/UX не активированы.
