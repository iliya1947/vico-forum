# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-06 merged в `main`, AP-07 реализован в [PR #282](https://github.com/iliya1947/vico-forum/pull/282), но не merged. Main/base: `d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea`. Пауза после Complaints repository/local-CI cycle снята.
- AP-07 technical plan Лёвы проверен и принят Мирой. Лира завершила три bounded implementation подзадачи на stable head `b0d5e74663cd57851225447e792ab4a9bf98322c`: protected section→topics discovery; protected dedicated admin topic page; shared per-message source correction/history actions в admin/public topic.
- Реиспользованы canonical Forum actions и текущие RBAC/History/attachment/translation contracts без новой schema, permissions, dependencies, runtime grants или AP-08+ функциональности. Защищены Help relationship/appeal IDs, source-revision/history response, controlled errors, stale actor, post membership, CAS, client-side stale/permission feedback.
- `docs/ADMIN_PANEL.md` и `PROJECT_STATE.md` обновлены в implementation PR. UI Preview получил отдельный визуальный AP-07 scenario в существующем Pages flow (не является реальным Worker browser acceptance).
- [Exact-head CI #41746716082](https://github.com/iliya1947/vico-forum/actions/runs/41746716082): SUCCESS, `checks` и `database` SUCCESS; включает штатные tests/typecheck/build, PostgreSQL 17, Worker/BetterAuth/Complaints HTTP smoke. GitHub mergeable=true; test-merge tree совпадает с implementation tree.
- **Не проводились** actual Chromium→Worker→Better Auth→PostgreSQL для AP-07, owner visual acceptance, coordinator whole-PR review или независимая проверка Лёвы. Нельзя выдавать CI/UI Preview за эти доказательства. PR #282 остаётся draft до согласования gates; merge/release не выполнялись.
- AP-08 topic closure, AP-09 Users, AP-10 blocking и AP-11 closeout ещё не реализованы.

## Назначения и продолжение

- Координатор: Мира — следующий агент; проверка AP-07 exact head, согласование недостающей Pages/browser/owner acceptance и coordinator-first whole-PR verdict.
- Исполнитель AP-07: Лира — авторская реализация и handoff завершены; не independent reviewer своего PR.
- Технический reviewer после coordinator PASS: Лёва (если не участвовал в реализации).
- Марк не назначен; владелец самостоятельно решает merge после выполненных gates.

## Границы

- Нет новых schema/migrations/authorization keys, отдельного admin mutation backend, AP-08+ функциональности или production rollout.
- История правок сообщения остаётся отдельным привилегированным запросом; source-correction остается канонической транзакционной операцией/AP-05 History, не Complaints Decision.
- Продолжать только по проверенному exact head; при изменении implementation части повторить требуемые checks/review.

Оперативный маршрут: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md), [technical plan](agents/codex-6.1-sol.md).
