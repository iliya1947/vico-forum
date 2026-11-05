# Лёва — Codex-6.1 Sol

## Лёва — AP-09 / #287: независимая whole-PR technical review — CHANGES REQUIRED

**Reviewed stable exact head:** `b85c3809befe3a1dcc83fe654dde4cd093f625ba`.
**Baseline/main:** `2651d2bf7de7212068c54674dca7d90716ea92c3`.
После [coordinator PASS #6646898897](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6646898897) проверен весь AP-09 changed-file scope. Implementation выполняла Лира; я готовил план и проверял результат, реализацию во время review не менял.

**Вердикт: CHANGES REQUIRED — один подтверждённый current-scope P2 дефект.** Первый finding не остановил whole-PR review; других подтверждённых current-scope findings не найдено.

### AP09-LEVA-01 / P2 — Users index меняет момент регистрации и иногда календарный день

Место: [db/admin-users.ts:30](https://github.com/iliya1947/vico-forum/blob/b85c3809befe3a1dcc83fe654dde4cd093f625ba/db/admin-users.ts#L30).

Новый SQL делает:
`to_char(u.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "joinedAt"`.

`created_at` — timestamptz. `to_char` форматирует его в TimeZone текущей PostgreSQL session, но литерал `Z` объявляет результат UTC. В `createWebPool` нет установки UTC; schema/runtime contracts не требуют UTC session. Затем `Joined` в Users index парсит строку как UTC и форматирует в UTC. Detail берёт тот же stored момент через существующий pg Date → toISOString и отображает правильный UTC день.

**Фактический repro на PostgreSQL 17 и exact-head PostgresAdminUsersReader**, synthetic временная `user` table, один stored instant `2026-11-04T23:30:00.000Z`:

| Session TimeZone | Reader joinedAt | Date в index | Date в detail |
| --- | --- | --- | --- |
| UTC | 2026-11-04T23:30:00.000Z | Nov 4, 2026 | Nov 4, 2026 |
| Asia/Jerusalem | 2026-11-05T01:30:00.000Z | **Nov 5, 2026** | **Nov 4, 2026** |
| America/New_York | 2026-11-04T18:30:00.000Z | Nov 4, 2026 | Nov 4, 2026 |

Для третьей строки календарный день совпал, но момент в DTO всё равно неверен. Во всех sessions обычный pg `select created_at` → `toISOString()` возвращает исходный instant. Это не UI-locale/SSR clock issue и не просьба менять инфраструктуру: ошибка создаётся конкретной новой SQL serialization.

**Минимальная correction:** в этом reader явно сериализовать UTC, например `to_char(u.created_at AT TIME ZONE 'UTC', ...)`, либо сохранить timestamptz и ISO-normalize корректно в adapter. Не менять глобальную DB/session configuration, schema, permissions, authz protocol или остальные readers. Диагностическая UTC expression проверена на всех трёх sessions и возвращает исходный instant; implementation пока не менялась.

Добавить targeted native regression в existing `tests/database/admin-users.test.ts`: non-UTC session + timestamp у границы суток, exact ISO instant и совпадение с исходным `created_at.toISOString()`; reset TimeZone/fixture в cleanup. Нынешний тест проверяет только форму строки/наличие Z, поэтому зелёный CI не обнаруживает сдвиг.

### Остальной whole-PR scope

Проверены все **37 changed files**: source/route/UI/tests, schema/catalog/forward migration/manifest; новый snapshot сравнен структурно с accepted 0056 — только catalog CHECK + snapshot identity/prevId.

- Independent `admin.users.read`, admin-only initial grant, global/header/Users admission и отсутствие новых management powers. Custom roles/overrides сохраняются. Новые routes gate до target/query reads.
- Minimal name/ID directory SQL: literal escape, filter до LIMIT, C-collation ID paging 25+lookahead, независимый matching total, empty states; email не выбирается и не участвует в search.
- Detail explicit public profile projection; read-only actor не получает management snapshot/hidden controls; targeted manager read одного user через existing REPEATABLE READ snapshot, без email/других users/всех role grants.
- Shared existing assignment/override controls используют прежний canonical authorization action, без `inlineUserAuthorization`/actor-expectation protocol. Existing session/fresh authorization/origin, authz mutation lock, last-manager guard и atomic History не менялись.
- Fetcher pending/result/revalidation и актуальные default values; управленческие данные исчезают после fresh revocation. AP09-MIRA-01..04 corrections проверены: useRef ограничивает recovery GET mounted error subtree, успешный read-only recovery позволяет следующий независимый denial cycle; both-rights-revoked остаётся fail-closed без GET loop или mutation replay. No history.state marker.
- Permission-dependent legacy redirects имеют private/no-store; Users убран из unfinished list; management-only сохраняет прежний authz subset без Users-read gate.
- EN/RU/HE strings/fingerprints, encoded targets, public-profile URLs/safe text, общая shell composition и существующие CSS boundaries. Нет block/lift, user delete/edit-any, Settings, нового writer/RBAC, runtime grants, dependency или lasting documentation changes.

### Проверки и границы

- [Exact-head CI #41941892340](https://github.com/iliya1947/vico-forum/actions/runs/41941892340): SUCCESS на reviewed head. Повторно подтверждены head/conclusion, jobs `checks`/`database` и отсутствие failed steps. CI не выдаётся за доказательство отсутствия finding выше.
- Независимо локально: **5 UI/route files / 37 tests PASS** (`users`, `users-authorization`, `routes/admin-users`, `routes/authorization-admin`, `authorization/admin-view`).
- Локально PostgreSQL 17: **3 files / 8 tests PASS** (`admin-users`, `admin-users-authorization`, `authorization-snapshot`); отдельно выполнен timezone repro с exact reader. Полный application/PG suite локально повторно не запускался.
- Evidence: `/workspace/work/ap09-review-evidence/`: targeted-tests.log, native-tests.log, timezone-probe.mts, timezone-results.json, timezone-ui-dates.jsonl. Actual SQL/pg reader и тот же Intl date formatter; **не** browser E2E.
- **Информация не проверена:** authenticated Chromium→Worker→PostgreSQL AP-09 browser flow/deployed acceptance; отдельный mandatory browser/owner visual gate не назначен. Production/секреты/внешние ресурсы не использовались.
- Task-owned PostgreSQL container/volume и dependency symlink удалены. Worktree clean; head неизменен. Никаких implementation fixes/commits.

### Следующий шаг

**Мира:** проверить AP09-LEVA-01 по repro и передать Лире один bounded correction package: UTC serialization + targeted native regression. После нового stable exact head/checks — coordinator whole-PR cycle заново, затем независимый technical review по workflow. План/RBAC/protocol/остальной scope не расширять. #287 остаётся Draft, merge до устранения finding не готов. Lasting docs — отдельным PR после принятой реализации.

**Действие разработчика:** подключить Миру; finding и весь технический контекст переданы в #251.

Опубликованный review: https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6646972798
