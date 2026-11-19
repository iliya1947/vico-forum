# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

Consolidated audit corrections в [Draft PR #354](https://github.com/iliya1947/vico-forum/pull/354). **TITLE-AUDIT-1-R1 исправлен Лирой; author self-check PASS. Следующий исполнитель — Мира / ChatGPT-5.6 Sol, новый coordinator whole-PR review.**

## Текущее состояние

- Stable exact implementation head: `b67e14d81cd20f2e42264e3d25d336ee19db626b` (Draft/open, без merge); base `a645fbe21110e77429025c428e498194b9a92ca2`. Current main `bb3d44f940f44a4f08c4a501d9d0b3deaa50eb02` продвинулся только сервисным регламентом, без продуктового кода.
- Diff относительно base: **ровно 9 файлов**: Watch control + test, Bookmark control + test, Bookmarks list + test, Title editor + test, dedicated Title Chromium test. Ни backend, ни schema/DB, ни RBAC, ни зависимости/продуктовые контракты не изменены.
- WATCH-AUDIT-1, BOOKMARKS-AUDIT-1, BOOKMARKS-AUDIT-2 реализованы и имеют deterministic regressions. Fresh loader/list остаётся единственным confirmed source.
- TITLE-AUDIT-1: Save/Cancel возвращают focus видимой кнопке Edit title после DOM commit.
- **Mira coordinator HOLD предыдущего SHA `01cecb91090a2f29f90b7c6ae4a83db77a0f4910`: TITLE-AUDIT-1-R1 [P3]** — старый focus request переживал Cancel без opener при потере `canEdit` и крал фокус, когда право возвращалось. **Лира исправила**: при закрытии draft фокусный request одноразово погашается **до** проверки opener; если кнопка недоступна, позднее повторное появление уже не инициирует focus. Регрессия: same mounted actor/topic, permission lost while draft open → Cancel without opener → focus to other button → permission restored/revalidation → opener returns, other button retains focus. Normal Save/Cancel tests/real browser остаются.
- На `b67e14d81cd20f2e42264e3d25d336ee19db626b`: **7/7 GitHub Actions workflows SUCCESS**; [CI 44622509204](https://github.com/iliya1947/vico-forum/actions/runs/44622509204) checks **2752/2752** unit/route tests в 218 files, Title editor **6/6**, database **1476/1476** PostgreSQL17 tests в 109 files; [dedicated Title Chromium 44622509311](https://github.com/iliya1947/vico-forum/actions/runs/44622509311) **9/9 connected markers**. Watch/Bookmarks/Mute/Block и прочие associated workflows также SUCCESS. Не запускать дублирующий CI без основания.
- **Авторская самопроверка Лиры PASS**, новых current-scope blockers по исправленному R1 не выявлено. **Это не Mira independent whole-PR PASS**; после изменения implementation head reviewer cycle повторяется.

## Назначение и следующий шаг

**Мира / ChatGPT-5.6 Sol** сейчас выполняет новый coordinator **whole-PR review всех четырёх original findings + TITLE-AUDIT-1-R1** на exact `b67e14d81cd20f2e42264e3d25d336ee19db626b` против `TASK.md`, `stages/corrections/PLAN.md`, current `main` и source-of-truth. Подтверждённые текущие blockers передать Лире в #342; при PASS — **Лёва / Codex-6.1 Sol** independent whole-PR review того же exact head. Merge — исключительно владелец. **Лира STOP**.

#342 service-only, никогда не merge. После #354 по owner order: moderation visibility → forum structure/topic move → затем #320. #300/Stage6/general UI/UX не активированы.
