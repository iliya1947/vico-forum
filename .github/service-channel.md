# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-06 merged в main; AP-07 в draft PR #282. Main/base `d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea`.
- Лёва выполнил actual Worker/Chromium/Better Auth/disposable PostgreSQL acceptance исходного AP-07 `b0d5e746`: 22 functional scenarios, 9 EN/RU/HE layout cases; два current-scope P2 finding подтверждены Мирой, browser verdict исходного head **FAIL**. [Подробности](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6620081742).
- Лира реализовала **единый bounded correction** в PR #282 commit `985160867001fd42b3ad2614262927aab3edfb3e` (без правки domain/permission/schema/глобального public layout):
  - **AP07-ACC-01/P2:** React Router `headers()` в canonical `app/routes/topic.tsx` переносит `Cache-Control`/`Retry-After` из action/error headers в итоговый document/single-fetch response согласно официальной route-module header semantics; публичный GET сохраняет parent/cache, cookies обрабатывает Framework. Добавлены targeted route-header tests для success/errors/GET/parent/cookie.
  - **AP07-ACC-02/P2:** `.admin-topic` scoped `overflow-wrap:anywhere`, `.admin-topic .topic-message` scoped `min-inline-size:0` — ровно минимальная комбинация, ранее подтверждённая browser diagnostic. Добавлен mounted test валидного 96-символьного имени автора.
- [Corrected exact-head CI #41755521661](https://github.com/iliya1947/vico-forum/actions/runs/41755521661): SUCCESS, оба jobs `checks` и `database` SUCCESS. GitHub PR mergeable=true.
- **Browser PASS на исправленном head не проверен.** CI/unit route-header test не заменяют actual Worker document/.data/fetcher HTTP transport и EN/RU/HE 320/768 layout. Не заявлять coordinator PASS до targeted browser evidence.
- Правки `PROJECT_STATE.md` не нужны: package status/functions не изменены, только устранены подтверждённые дефекты.
- Owner visual acceptance не инициировался; AP-08+, unrelated Complaints/Signals, migration/production rollout не начинать.

## Назначения

- Лира — завершила bounded correction, передала exact head.
- Лёва — следующий агент: targeted actual browser re-test на `985160867001fd42b3ad2614262927aab3edfb3e` с разрешённой isolated environment, затем результаты в #251. Это acceptance re-test, не независимый whole-PR verdict.
- Мира — после browser evidence проводит coordinator-first whole-PR review и принимает verdict на том же head.
- Лёва — independent technical review только после coordinator PASS. Марк не назначен.

Оперативное состояние: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).
