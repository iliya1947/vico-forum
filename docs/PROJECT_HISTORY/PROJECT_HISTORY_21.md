# История проекта — 2026-11-08: Settings SET-05

Исторический snapshot реализации **SET-05 Account & security**. Не является
source of truth для текущего поведения. Постоянный контракт —
[`SETTINGS.md`](../SETTINGS.md); текущее фактическое состояние —
[`PROJECT_STATE.md`](../../PROJECT_STATE.md).

## Поставка

- Защищённый authenticated `/:locale/settings/account` внутри существующего
  SettingsShell: безопасные labels связанных способов входа, реальный
  credential-password-only change с проверкой текущего пароля, прежний
  явный Google linking и ссылка из Profile на Account.
- Собственные Better Auth sessions отображаются без токенов, с current marker,
  созданием/истечением и безопасным device label. Сервер сопоставляет
  session ID с собственными активными sessions для one-other revoke;
  all-other revoke сохраняет текущую сессию, чужой аккаунт не затрагивается.
- Origin, текущая session/identity, строгие form-intent/field allowlists,
  stale-user/session expectations, `private, no-store` и library session
  freshness применяются на сервере. EN/RU/HE, RTL/mobile и существующий
  sign-out → sign-in return path проверены в реальном Chromium.
- Не добавлены новая DB/schema/migration, auth provider, permission/RBAC,
  password reset/recovery, Google-only set-password, account deletion,
  email change, provider unlink, 2FA/passkeys, SET-06 или Stage 6 rollout.

## Implementation и correction cycles

- [Implementation PR #309](https://github.com/iliya1947/vico-forum/pull/309)
  **merged** 2026-11-08. Финальный implementation exact head:
  `236a15c5f3309a5466c70c7a934edf5b56ade433`;
  merge commit `2f2969d5b3a7ca7844d674b85448838fc671eaca`.
  Служебный канал решений и независимых проверок —
  [PR #251](https://github.com/iliya1947/vico-forum/pull/251).
- **SET05-MIRA-01:** на первом review head
  `dd6a5037aec81f4889005eb38fcfa25b573fd186` обнаружен обход
  freshness gate через прямой all-other revoke, тогда как чтение и
  single revoke опирались на `listSessions`. Лира добавила тот же
  library-freshness preflight к all-other write и native PG/browser
  regression на запрет без удаления остальных sessions.
- **SET05-MIRA-02:** первоначально отдельный SET-05 GitHub Actions
  workflow нарушал утверждённую границу reuse. Он удалён; весь
  реальный SET-05 Worker/Better Auth/PG17/Chromium сценарий встроен
  в существующий `settings_browser` job, не заменяя SET-02/03.
  Оба замечания Миры закрыты на head
  `a4af2014eb28a39d54d10c33cc515cbf3d5f258e`.
- На этом head Мира дала coordinator PASS, после которого Лёва
  независимо выявил **SET05-LEV-01/P2**: direct
  `auth.api.changePassword` в Settings BFF обходил Better Auth 1.7.7
  HTTP `onRequestRateLimit` для canonical `/change-password`.
  [Отчёт Лёвы #6721524340](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6721524340).
  Мира независимо подтвердила дефект текущего SET-05.
- Лира переключила смену пароля на тот же request-local Better Auth
  **HTTP handler**, вернув существующий **database-backed 3/10s**
  canonical per-trusted-IP bucket. BFF/route сохраняют приватный
  HTTP 429 и retry-заголовки, включая SSR document path, с безопасным
  localized error feedback. Никакого второго limiter/storage не создано.
  Начальный correction head `871513b38b3f3a1ee9e3227f17d5eac2fd334f55`
  прошёл native tests, но real Chromium обнаружил отсутствие
  `X-Retry-After` на document response; финальный
  `236a15c5f3309a5466c70c7a934edf5b56ade433` явно прокидывает
  action headers через React Router route `headers` и покрывает это
  регрессией. Неуспешный промежуточный Chromium не объявлен PASS.
- На финальном **неизменённом exact head** Мира выполнила повторный
  coordinator whole-PR **PASS**, Лёва — repeat independent technical
  whole-PR **PASS**, оба с **0 confirmed current-scope defects**.
  [Повторный отчёт Лёвы #6722125480](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6722125480).
  SET05-MIRA-01/02 и SET05-LEV-01 закрыты.

## Финальные exact-head проверки

- [CI #42483839708](https://github.com/iliya1947/vico-forum/actions/runs/42483839708)
  — **SUCCESS**: lint, typecheck, build, application 165/165 файлов,
  **2084/2084 теста**, native PostgreSQL 17 51/51 файл,
  **597/597 тестов**. Native regression подтверждает общий
  canonical↔Settings rate-limit bucket, denied password unchanged и
  независимый trusted client IP.
- [Chromium #42483839769](https://github.com/iliya1947/vico-forum/actions/runs/42483839769)
  — **SUCCESS**, все 4 job: `browser`, `history_browser`,
  `settings_browser`, `settings_administrator_browser`.
  Реальный built Worker, Better Auth 1.7.7, disposable PostgreSQL17
  и Chromium прошли **13 SET-05 checkpoints** вместе с прежними
  SET-02/03 сценариями. Проверены direct rate-limit 429,
  `Retry-After`/`X-Retry-After`, session freshness, safe DTO,
  revoke-one/all, credential/Google-only, locale/RTL/mobile.
  [Synthetic screenshots и JSON evidence](https://github.com/iliya1947/vico-forum/actions/runs/42483839769/artifacts/13618153570).
- Эти доказательства относятся к **repository/local-CI**, не к
  production/deployed runtime. Live Google OAuth, реальный bound Owner,
  owner visual acceptance и external Stage 6 smoke не подтверждались.

После implementation merge #309 текущим ещё не завершённым Settings
пакетом остаётся **SET-06 Privacy**, его реализация не назначена
до отдельного factual SET-05 документационного closeout.
