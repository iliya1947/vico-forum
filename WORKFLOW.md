# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

Consolidated corrective implementation [PR #354](https://github.com/iliya1947/vico-forum/pull/354): все четыре audit findings закрыты bounded-срезами. **Лира завершила авторскую self-check — PASS; следующий исполнитель Мира.**

## Текущее состояние

- Draft #354 открыт, не merged. Base `a645fbe21110e77429025c428e498194b9a92ca2`; **stable exact head `01cecb91090a2f29f90b7c6ae4a83db77a0f4910`**.
- Current GitHub `main` `bb3d44f940f44a4f08c4a501d9d0b3deaa50eb02`. Отличие от PR base: только `AGENTS.md`, `SERVICE_PR_RULES.md`, `SERVICE_PR_STRUCTURE.md`; нового продуктового кода в main нет. Current AGENTS прочитан.
- **WATCH-AUDIT-1 [P2]**: TopicWatchControl loader-authoritative; задержанный ACK не перезаписывает свежий Watch/Unwatch snapshot; обе регрессии.
- **BOOKMARKS-AUDIT-1 [P2]**: TopicBookmarkControl loader-authoritative; обе регрессии и normal success.
- **BOOKMARKS-AUDIT-2 [P2]**: удалён stale `removed` latch в Bookmarks list; Remove→re-add→fresh-loader→late-ACK и повторная revalidation; cursor/account-switch сохранены.
- **TITLE-AUDIT-1 [P3]**: post-DOM-commit focus на видимую Edit-title кнопку после Save/Cancel; component + real Chromium; title write/CAS/conflict/rebase без изменений.
- GitHub compare с base: **ровно девять файлов** (четыре компонента и четыре набора component-tests, плюс Title connected browser test). Нет DB/backend/schema/RBAC/dependencies/doc/product контрактов.
- Author exact-head CI: [run 44614815069](https://github.com/iliya1947/vico-forum/actions/runs/44614815069) checks **2751/2751 unit tests, 218 files**; database **1476/1476 PostgreSQL17 tests, 109 files**. Dedicated Watch [44614815299](https://github.com/iliya1947/vico-forum/actions/runs/44614815299) **11/11 markers**; Bookmarks [44614815043](https://github.com/iliya1947/vico-forum/actions/runs/44614815043) **11/11**; Title [44614815034](https://github.com/iliya1947/vico-forum/actions/runs/44614815034) **9/9**, включая Save/Cancel focus. **7/7 associated GitHub workflows SUCCESS**, без pending/fail. Дополнительные запуски не нужны.
- **Лира author self-check PASS**, подтверждённых current-scope blockers не выявлено. Это НЕ новый coordinator/independent whole-PR PASS. Промежуточный Mira PASS только Watch-среза на прежнем head не покрывает полный #354.

## Назначение и следующий шаг

**Мира / ChatGPT-5.6 Sol** — сейчас провести свежий независимый coordinator **whole-PR review всех четырёх corrections PR #354 на exact `01cecb91090a2f29f90b7c6ae4a83db77a0f4910`**, против `TASK.md`, `stages/corrections/PLAN.md`, `PROJECT.md` и current `main`. Результат и подтверждённые findings — в #342. При real current-scope blocker вернуть Лире; при PASS передать Лёве на один independent whole-PR review того же SHA. Только владелец переводит в Ready и выполняет merge.

**Лира STOP**, Лёва до whole-PR PASS Миры не подключается. #342 service-only, никогда не merge. Moderation visibility следует после #354; structure/topic move за ним. #300/Stage 6/общий UI/UX не активированы.
