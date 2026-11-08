# Лёва — SET-05 / PR #309 independent review: CHANGES REQUIRED

[Current independent report #6721524340](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6721524340). SET05-LEV-01/P2; Mira routing next. Implementation unchanged; Lev stopped.

Лёва — SET-05 / PR #309: independent technical whole-PR review — **CHANGES REQUIRED**.

Exact head: `a4af2014eb28a39d54d10c33cc515cbf3d5f258e`.
Base/current main: `76fc5b16be4f2425a0ad1fdcb7b38974db355c56`.
Проверены все 20 изменённых файлов против approved SET-05 plan [#6711736883](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6711736883). Реализацию не менял; других агентов не запускал. Авторские и coordinator выводы не заменяли собственные проверки.

### SET05-LEV-01 — P2: новый BFF смены пароля обходит действующий Better Auth rate limit

Место: [app/auth/auth.server.ts:264–266](https://github.com/iliya1947/vico-forum/blob/a4af2014eb28a39d54d10c33cc515cbf3d5f258e/app/auth/auth.server.ts#L264-L266); вызывающий authenticated action — `app/routes/settings-account.tsx`.

`security.changePassword` вызывает `auth.api.changePassword` напрямую. В установленном Better Auth 1.7.7 rate-limit admission находится в HTTP router `onRequest`, а прямой API dispatch его не выполняет. Существующий проектный `betterAuthRateLimitOptions` включает database storage; штатный special rule для `/change-password` — 3 попытки за 10 секунд. Новый публично достижимый Settings POST обходит эту уже действующую защиту.

**Самостоятельное воспроизведение:** real Chromium APIRequestContext → собранный Worker exact head → Better Auth 1.7.7 → полная disposable PG17 schema0000–0060. Один authenticated synthetic account, одна cookie jar, один trusted `cf-connecting-ip`, один current session:
1. Четыре неверных `currentPassword` на существующем `POST /api/auth/change-password`: **400,400,400,429**.
2. Сразу после этого пять неверных паролей на новом `POST /en/settings/account`, intent `change-password`, корректные expected user/session, same-origin: **400,400,400,400,400 за 1,231 секунды**.
3. До/после этих пяти попыток строки `rate_limit` для change-password **полностью одинаковы**.

Это current-scope регрессия нового пути; штатный HTTP endpoint и его лимит продолжают работать. Нужна действующая сессия: unauthenticated смена пароля не обнаружена. Same-origin, stale-identity и проверка текущего пароля сохранены, но они не ограничивают число попыток угадать текущий пароль при наличии сессии.

**Ограниченное исправление:** сохранить существующий Better Auth database-backed admission для смены пароля через BFF, включая общий canonical bucket с обычным auth endpoint и между locale paths, trusted IP, 429/retry information и private/no-store response. Не вводить второй несвязанный limiter, новые таблицы или более широкую auth-переделку. Можно провести эту операцию через существующий request-local HTTP handler с server-created canonical JSON request и безопасным разбором response; сохранить текущие self-service guards, classified errors, safe DTO, Set-Cookie ordering и `revokeOtherSessions:false`. Конкретный код выполняет Лира. Нужен реальный regression: исчерпание лимита одним путём блокирует и второй, отказ не меняет пароль, отдельный IP не блокируется ошибочно. Mock вызова `auth.api` этого не проверяет.

Evidence: `/workspace/work/set05-review-evidence/independent-probe.py`, `independent-probe.json`, `independent-probe.log`.

### Проверка остального scope завершена

- `SET05-MIRA-01` независимо закрыт: перед all-others есть fresh-gated `listSessions`; реальные nativePG/browser stale single/all дают отказ и сохраняют другие сессии.
- `SET05-MIRA-02` независимо закрыт: standalone workflow удалён; 12 групп SET-05 включены в существующий `settings_browser` без отдельного job/server/DB/harness framework.
- Все self-service операции повторно сверяют authoritative current user/session. Session IDs разрешаются только среди собственных активных сессий; current/foreign IDs не отзываются, отозванная сессия на следующем запросе неаутентифицирована; current и посторонний аккаунт сохранены.
- Реальная credential-password проверка, wrong/correct current password, old/new login и отдельная семантика password change / sign-out others работают. Google-only не получает set-password. Existing explicit Google link переиспользован на Account; Profile оставляет ссылку.
- HTML и React Router data не содержат session bearer/provider tokens/password hashes; только allowlisted DTO и plain-text device label. Guest/Origin/stale/duplicate/unknown-field guards и private/no-store проверены.
- Собственный same-mounted account-switch probe: same-account SPA locale navigation сохраняет draft; после реального logout/login другим аккаунтом парольные поля **очищаются**, header и hidden identity соответствуют новому аккаунту.
- Собственный cookie probe: реальное aging/renewal сессии даёт `Set-Cookie` в итоговом document response; data response private/no-store, без bearer token. Existing native expired-cookie/new-login ordering regression также PASS.
- Реальная PostgreSQL account-table lock + statement_timeout для read/password lookup классифицирована unavailable; missing schema остаётся unexpected error; после отказа исходный пароль работает.
- EN/RU/HE, RTL/mobile проверены в настоящем браузере; 3 screenshots просмотрены. Нет расширения в SET-06, recovery/email change/unlink/delete, RBAC/schema/migrations/providers/dependencies/production.

### Собственное exact-head verification

- **104 application tests / 16 файлов PASS**: Account/Profile/User/Settings/auth.
- **31 native PostgreSQL tests / 5 файлов PASS**: account-security7 + auth-runtime/link-identity/rate-limit-concurrency/registration-auth-admission24.
- Worker build PASS; full schema0000–0060 мигрирована в disposable PostgreSQL17.
- **12 SET-05 real Chromium case groups PASS**, 0 page errors/external requests. External adapter меняет только путь checkout и Chromium executable; assertions и implementation не редактировались.
- **4 собственные browser/runtime группы + 4 storage/error группы** выполнены; одна browser/runtime группа подтверждает SET05-LEV-01, остальные подтверждают описанные границы.
- GitHub exact-head [CI #42477527039](https://github.com/iliya1947/vico-forum/actions/runs/42477527039) и [Chromium #42477527033](https://github.com/iliya1947/vico-forum/actions/runs/42477527033) самостоятельно прочитаны: SUCCESS/attempt1 на том же SHA, checks+database и 4 browser jobs. В `settings_browser` log самостоятельно проверены все 12 SET05_ACCEPTANCE записей. Full CI/AP-10/History local rerun не заявляется.

Полное evidence: `/workspace/work/set05-review-evidence/` — исходные probes, logs/JSON/screenshots, GitHub readback, manifest/hashes. Проверяемый checkout clean; implementation unchanged, exact head/base перед публикацией unchanged/open. Task-owned preview/container/DB/dummy vars/dependency symlink удалены. Live Google, real Owner binding, production и owner visual acceptance не выполнялись/не заявляются; owner visual acceptance не добавлен как gate.

### Handoff — Мира

Независимый whole-PR review завершён: **1 confirmed current-scope finding, SET05-LEV-01/P2**; других подтверждённых дефектов не найдено. Принять результат и вернуть Лире одним ограниченным corrective package. Owner merge #309 пока не готов. После исправления нужен новый stable exact head, exact-head checks/browser, fresh coordinator review, затем повторная независимая проверка. Permanent docs — отдельный post-merge closeout. SET-06/Stage6 не активировать.

Лёва остановился после review; Лира до coordinator routing не редактирует frozen head; Марк не назначен. Разработчик только подключает Миру: технический контекст уже здесь.

## Previous closed context

SET01–04 fully closed. Prior SET04 independent repeat PASS [#6719208159](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6719208159); evidence /workspace/work/set04-repeat-evidence/. Approved Settings plan [#6711736883](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6711736883). No last-manager/count/recovery rule applies.
