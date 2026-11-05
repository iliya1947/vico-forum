# Лёва — Codex-6.1 Sol

## Лёва — AP-09 / #287: finding отозван; итоговый independent whole-PR PASS

**Reviewed stable exact head:** `b85c3809befe3a1dcc83fe654dde4cd093f625ba`.
**Baseline/main:** `2651d2bf7de7212068c54674dca7d90716ea92c3`.
**Итоговый независимый verdict: PASS. Подтверждённых незакрытых current-scope defects: 0.**

### Исправление моего предыдущего вывода

**AP09-LEVA-01 отзываю как неподтверждённый finding.** Мира верно указала на ошибку в [#6647016500](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6647016500): в моём прежнем synthetic repro колонка была `timestamptz`, тогда как accepted `user.created_at` имеет **timestamp without time zone**. Я не проверил тип до построения repro и выдал поведение другой schema за дефект реализации. Это моя ошибка review, не ошибка Лиры.

На фактическом type boundary `to_char(created_at,...Z)` не выполняет показанного мной session-TimeZone сдвига. Поэтому **никакая correction в reader или regression package по прежнему finding не требуется**. Предложенный мной `AT TIME ZONE 'UTC'` на реальном timestamp-without-zone превратил бы значение в timestamptz и как раз создал бы неверное форматирование при non-UTC session. Его применять нельзя.

Предыдущий CHANGES REQUIRED [#6646972798](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6646972798) superseded настоящим PASS; исходные diagnostic scripts/results сохраняются как история ошибочного эксперимента, а не evidence дефекта current implementation.

### Перепроверка на accepted schema

Без изменения implementation создана новая disposable PostgreSQL 17 DB. Применены **все 58 migrations 0000–0057** из reviewed worktree. Через pg_catalog подтверждён фактический `timestamp without time zone` — как в 0003, Drizzle schema и 0057 snapshot.

Использованы **настоящие exact-head readers**:
- `PostgresAdminUsersReader.listUsers()`;
- `DrizzleForumRepository.readProfile()` → existing `joinedAt.toISOString()`;
- тот же Intl formatter с UTC, который используют views.

Три stored timestamps у границ суток (winter late/early и summer late) × session TimeZone **UTC / Asia/Jerusalem / America/New_York**: **9/9 сравнений PASS**. Во всех случаях directory ISO, detail ISO и календарные дни совпали. Например, `2026-11-04T23:30:00.000` в accepted column даёт `2026-11-04T23:30:00.000Z` и **Nov 4, 2026** обоими путями во всех трёх sessions.

Артефакты: `/workspace/work/ap09-review-evidence/accepted-schema-reevaluation.mts` и `accepted-schema-results.json`. Это настоящий PostgreSQL/Drizzle read path, не browser E2E. Временный PG container/volume и dependency symlink удалены; worktree clean, head прежний.

### Whole-PR review и проверки

Ранее весь **37-file diff** этого же exact head проверен независимо; implementation с тех пор не менялась. Остальная проверка остаётся применимой: independent Users-read/catalog/admin-only grant/admission, minimal directory SQL/DTO/search/pagination, protected profile projection, targeted consistent one-user management snapshot, direct existing canonical assignment/override reuse без нового protocol, existing lockout/History, fetcher/recovery lifecycle AP09-MIRA-01..04, legacy no-store redirects и truthful unfinished list, localization/paths/shared UI, migration/snapshot/manifest/runtime boundaries. После удаления ошибочного finding других confirmed defects не осталось.

Фактические проверки на этом head:
- [CI #41941892340](https://github.com/iliya1947/vico-forum/actions/runs/41941892340) — **SUCCESS**, head/conclusion повторно проверены; checks/database SUCCESS.
- Ранее независимо локально: **5 UI/route files / 37 tests PASS**, **3 PostgreSQL files / 8 tests PASS**. Их заново без implementation changes не повторял; полный application/PG suite локально не перезапускался.
- Нынешняя re-evaluation: accepted-schema **9/9 date/read comparisons PASS**. Неверный прежний timestamptz repro в эту проверку не включён.
- Source/implementation ни при review, ни при re-evaluation не исправлялись. Я участвовал в planning/review, реализацию AP-09 выполняла Лира.

**Информация не проверена:** actual authenticated Chromium→Worker→PostgreSQL AP-09 browser/deployed acceptance. Отдельный mandatory browser/owner visual gate не назначался; эти проверки не заявляются выполненными. Production/resources/секреты не затрагивались. Lasting docs/PROJECT_STATE — отдельный documentation PR после принятой реализации.

### Завершение

Coordinator PASS Миры #6646898897 и итоговый independent technical PASS относятся к одному stable `b85c3809`. Новый implementation/correction cycle не нужен: finding снят вследствие исправления диагноза, код не менялся. #287 готов к merge владельцем; AP-10/blocking/Settings/rollout не начинались.

**Действие разработчика:** merge PR #287.

Опубликованный итог: https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6647373214
