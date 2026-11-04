# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-06 merged в main. AP-07 завершил review cycle в PR #282; Draft снят, PR Ready/mergeable, merge ещё не выполнен.
- Main/base: `d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea`. Corrected stable exact head: `985160867001fd42b3ad2614262927aab3edfb3e`.
- Лира завершила implementation и bounded correction. Мира дала coordinator whole-PR **PASS** (#6620633977). Лёва завершил независимую whole-PR technical review того же head: **PASS**, confirmed open current-scope defects: **0**. [Итоговый отчёт](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6620960494).
- **AP07-ACC-01 закрыт:** фактические built-Worker document/.data ответы 200/401/403/404/409 и реальный Chromium history fetcher имеют `private, no-store`; обычный public GET не получил принудительную private policy.
- **AP07-ACC-02 закрыт:** EN/RU/HE × 320/768 с валидным 96-символьным именем автора, promoted best answer и открытой/закрытой history имеют document scrollWidth, равный viewport. CSS в браузер не внедрялся.
- Текущий corrected-head retest: **19 сгруппированных проверок PASS**, page errors 0. Использованы настоящий Worker, Better Auth и disposable PostgreSQL 17, synthetic data и изолированный Chromium; временные runtime/config/container/volume удалены.
- Прежние 22 unaffected functional browser cases относятся к `b0d5e74663cd57851225447e792ab4a9bf98322c`; без необходимости не повторялись и не выдаются за новый полный прогон. Исходный FAIL/repro сохранён в #6620081742; оба его defects теперь закрыты.
- [Exact-head CI #41755521661](https://github.com/iliya1947/vico-forum/actions/runs/41755521661): SUCCESS, jobs `checks` и `database` SUCCESS. Локально повторены build и targeted runtime, полный application/PG suite не повторялся.
- Whole-PR review охватил весь AP-07 diff: discovery/SQL, admission/private DTO, shared actions, identity/CAS/permission/History boundaries, public regressions, исправления, tests и документацию. Implementation не менялся.
- Owner visual acceptance не запрашивался. Real R2 bytes/uploads, provider/OAuth calls, полная product/release matrix и production rollout не заявляются проверенными. Существующий public long-name overflow не отнесён к новому AP-07 widget; широкая public-layout correction не входит в этот этап.

## Назначения и следующий шаг

- Лира — implementation/correction завершены.
- Мира — coordinator whole-PR review завершён: PASS.
- Лёва — независимая whole-PR technical review и необходимые corrected runtime re-tests завершены: PASS.
- Марк не назначен. Дополнительный круг Миры не требуется.
- **Владелец выполняет merge #282.** AP-08+ до merge не начинается; production rollout отдельно не разрешён.

Оперативное состояние: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).
