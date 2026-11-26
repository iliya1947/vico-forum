# AUTH-03 — реализация и проверяемые результаты

## Реализация и запуск проверок

Draft PR #392 поверх принятого AUTH-02b #391 (`a668fd6d3b0df99056d517a3b2d2a4fe7cef0180`). Current head `cb40e15b6ede72a23b40807cd6de2942d661c893`. AUTHOR PASS ожидает exact-head CI и applicable acceptance.

- Canonical HTTP/direct credential recovery использует neutral forgot, lifecycle mail и terminal budgets, proof с неизменяемым subject и generation, атомарные consume, password update, invalidation и отзыв сессий. Reset не выдаёт сессию.
- Google-only password creation подключён из Settings Account. Fresh session, expected user/session, current email и mail proof перепроверяются перед записью. Исходная сессия сохраняется, остальные собственные сессии отзываются. Google остаётся связанным. Native direct setPassword без proof закрыт.
- Canonical sign-in и ранее существовавшая change-password защищены от interleaving со сбросом. Native credentials, правила сессии и лимиты Better Auth сохранены. PostgreSQL race fixtures проверяют обе операции, когда reset первым получает lock.
- Forgot/reset и Settings используют POST для чувствительных полей. Proof в fragment не уходит в HTTP-запрос и удаляется после in-memory capture. EN/RU/HE локализованы. Синтетическая почта использует существующую fake transport boundary.
- Migration 0076 расширяет закрытый CHECK attempt operations. После proven commit публикуются password reset/method link facts и фактические session deletion receipts. Manifest parity на PG17 прошла для 76 таблиц.

Локально пройдены focused typecheck/lint, native PostgreSQL reset/create/replay/rollback/race tests, существующие Account Security и password-change tests. Connected Worker / системный Chromium подтвердили два полных потока на интеграционном diff до финального scrub ineligible Settings view. Новые exact-head запуски проверяют опубликованный head. AUTH-04 и внешние провайдеры остаются на паузе.


## Author self-check и итог exact-head проверок

**AUTHOR PASS** на `ce75ff3629a4adae9941703a33f6d0366bd7f570` в draft #392. Base #391 остаётся `a668fd6d3b0df99056d517a3b2d2a4fe7cef0180`. Финальные коммиты после `cb40e15` только обновляют unit/PostgreSQL/Chromium ожидания для Settings Google-only proof flow и новых закрытых attempt values, сохраняя проверки запрета неподтверждённой смены и неизвестных операций.

- [CI #45726094032](https://github.com/iliya1947/vico-forum/actions/runs/45726094032) PASS: checks и database, включая PostgreSQL 17, manifest/privilege probes, build и Worker smoke.
- 15/15 применимых connected workflows PASS, включая [Worker Chromium AUTH-02b/03 #45726100332](https://github.com/iliya1947/vico-forum/actions/runs/45726100332) с реальными reset/create через fake mail и [AP-10 #45726100472](https://github.com/iliya1947/vico-forum/actions/runs/45726100472) со всеми Settings jobs.
- Локальный focused прогон дал 94 unit/component и 109 PostgreSQL PASS. Исправленные Settings и attempt telemetry проверки прошли отдельно, SET-05 Chromium прошёл на финальном SHA. В более раннем полном локальном прогоне падали два набора; отдельно с `TZ=UTC` прошли все 49 тестов этих наборов. Полный exact-head PostgreSQL suite в GitHub Actions PASS.
- Сверен bounded contract: guest neutral acknowledgement, неподтверждённые и Google-only не восстанавливают credential через guest flow, доказательство привязано к purpose/subject/generation, own creation также к текущей fresh session. Native 1.7.7 hash и limiter сохранены. Жизненный цикл пароля, proof и удаление сессий используют один owner и атомарный commit; проверены rollback и concurrent reset против sign-in/change-password. Отсутствие новых сессий при reset, сохранение текущей own-сессии при создании и отсутствие Google unlink подтверждены. Наблюдения и migration входят в bounded scope. Реальные внешние ресурсы не использовались.

Stable head передан Мире для coordinator checkpoint. AUTH-04 ждёт coordinator PASS.
