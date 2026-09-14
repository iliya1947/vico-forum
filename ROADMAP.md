# ROADMAP.md

## Назначение

Этот roadmap описывает путь Vico Forum от уже созданного technical foundation до первого
production-релиза.

Source of truth:

- продуктовый и технический baseline — `PROJECT.md`;
- текущее фактическое состояние — `PROJECT_STATE.md`;
- мультиязычность и переводы — `TRANSLATION_ARCHITECTURE.md` и `docs/translation/*`;
- database rollout/operations — `docs/database/*`;
- завершённый Stage 1 scaffold plan — `SCAFFOLD_PLAN.md`.

Ключевой принцип текущего roadmap: **до pre-release разработка идёт product-first через
local/CI path; external deployment и production acceptance не являются gate для каждого
feature PR**.

## Общие правила выполнения

1. Не менять без отдельного решения baseline: модульный монолит, React Router v8 Framework
   Mode + SSR + TypeScript, Cloudflare Workers, PostgreSQL + Drizzle ORM, Better Auth +
   Google OAuth.
2. Перед использованием внешних API/библиотек проверять официальную документацию именно
   используемой версии.
3. Все внешние/пользовательские данные валидировать runtime на соответствующей границе;
   authz для защищённых операций проверяется на сервере.
4. В CI постоянно выполнять `lint`, `typecheck`, `test`, `build`; schema changes дополнительно
   проходят migration metadata и disposable PostgreSQL integration checks.
5. До pre-release обычная feature-разработка не обязана применять новые migrations в Neon,
   выполнять deployed Hyperdrive smoke или настраивать production OAuth/provider resources,
   если задача полноценно проверяется локально и в CI.
6. Merge feature-кода сам по себе не должен означать production rollout. До первого
   forum-code PR active development `main` должен быть отделён от автоматического production
   deploy.
7. Когда изменение действительно выкатывается во внешний pre-release/production runtime,
   schema-dependent rollout выполняется по `docs/database/MIGRATIONS.md`: schema становится
   безопасной в target DB до runtime dependency.
8. State-changing browser actions должны иметь применимую CSRF/origin protection; публичные
   write boundaries — базовый rate limiting/anti-spam без ограничения публичного чтения.
9. Не добавлять функции вне текущего этапа без отдельного продуктового решения.
10. Translation architecture сохраняется как обязательный contract, но наличие будущего
    component ID не делает его текущим development priority.

---

# Завершённый foundation

## Stage 0 — toolchain и scaffold preparation — завершён

Зафиксированы runtime/package-manager/toolchain версии и воспроизводимый путь создания
React Router/Cloudflare Workers приложения.

## Stage 1 — locale/i18n foundation — завершён

Реализованы:

- React Router v8 SSR Workers scaffold;
- generic `/:locale/*` и technical routes вне locale namespace;
- `LocaleRegistry`, `LocaleResolver`, BCP-47 canonicalization, aliases/fallbacks;
- method-aware locale routing policy;
- `lang`/`dir`, LTR/RTL и formatting context;
- canonical English UI catalog, local translation packs и `sourceFingerprint`;
- `TranslationResourceLoader`;
- request-scoped `i18next` + SSR/hydration resource snapshot;
- quality gates и Workers-compatible local smoke.

**Translation components:** `LOC-01`–`LOC-10`, `UI-01`–`UI-05`, `UI-08`–`UI-10`,
`UI-12` (initial validation), `STO-02` (contract), `SEC-01`, `SEC-03` (initial boundary).

## Stage 2 — PostgreSQL, Drizzle и persistent LocaleRegistry — завершён

Реализованы:

- PostgreSQL 17/Drizzle migration foundation;
- persistent `locales` storage без DB-owned bootstrap `en`;
- request-scoped persistent registry load/validation/degraded behavior;
- semantic registry identity;
- Neon + cache-disabled Hyperdrive localization read path;
- disposable PostgreSQL CI, production migration workflow и infrastructure acceptance.

**Translation components:** `LOC-02` persistence, `LOC-09` lifecycle boundary, `STO-07`.

## Stage 3 — persistent UI translation resources — завершён

Реализованы:

- `ui_translations` и `ui_translation_bundles` schema;
- persistent manual/machine read sources;
- freshness/validation boundaries;
- deterministic compiled locale/namespace bundle identity;
- persistence/cache/ETag primitives.

Production SSR пока продолжает читать raw local/persistent translation sources и собирать
bundle в request path. Active generation/publish/persisted-bundle runtime path остаётся
Stage 5.

**Translation components:** `UI-06`, `UI-07`, `UI-14` primitives, `STO-01`, `STO-02`
persistence, `STO-04`, `STO-05` primitives.

## Stage 4A — Better Auth schema foundation — завершён как подготовительный migration-only шаг

Stage 4A был выполнен до reprioritization roadmap и сохраняется как готовый foundation:

- Better Auth `1.7.4` core PostgreSQL/Drizzle tables;
- database-backed `rate_limit`;
- nullable server-owned `user.locale`;
- без Better Auth runtime, routes, Google OAuth, auth Hyperdrive/role/grants или Worker
  auth write-capability.

Stage 4A **не задаёт следующий infrastructure шаг**. Active Stage 4 продолжается через
forum-core работу 4B–4E.

---

# Active product-first roadmap

## Stage 4 — сделать рабочее ядро форума

Stage 4 — текущий продуктовый приоритет. Он выполняется серией компактных PR `4B → 4C → 4D → 4E`.

Критерий завершения всего Stage 4: в local/CI environment существует реально используемый
forum MVP с публичным чтением, authenticated participation, solved/best-answer flow и
минимальными ролями. External production rollout не является критерием завершения Stage 4.

### Stage 4B — forum domain foundation

**Translation boundaries prepared for later implementation:** `CNT-02`, `CNT-03`, `CNT-05`.

#### Работы

1. Спроектировать минимальную forum model для `категория → раздел → тема → сообщение`.
2. Добавить Drizzle schema и forward migration для forum entities.
3. Связать authored content с существующим `user` identity без подключения production auth.
4. Заложить immutable revision boundary для изменяемого topic/post content, чтобы будущий
   revision-bound translation не требовал переделывать identity model.
5. Topic title хранить как отдельную versioned/translatable unit или эквивалентную модель,
   сохраняющую `CNT-05` invariant.
6. Source-locale metadata revision хранить независимо от UI locale; `und` допустим.
7. Добавить repositories/services только для текущих forum use cases.
8. Добавить clean-migration, constraint и repository integration tests на disposable
   PostgreSQL 17.
9. Не добавлять production DB grants, new Hyperdrive, external OAuth/provider resources или
   deployed smoke только ради этой schema.

#### Критерий завершения

- schema поддерживает category → section → topic → post;
- content/revision identity пригодна для будущего `CNT-*` без скрытой зависимости от UI locale;
- migrations воспроизводимо проходят local/CI PostgreSQL 17;
- forum domain не зависит от Neon/production rollout для разработки и tests;
- нет незаявленных функций.

### Stage 4C — публичное чтение и классический forum UI

#### Работы

1. Реализовать SSR-страницы категорий, разделов, списка тем и темы с сообщениями.
2. Сформировать классическую forum navigation/layout, а не социальную ленту.
3. Сохранять canonical locale во внутренних ссылках.
4. Все UI strings добавлять через существующий canonical English/i18n path.
5. Добавить empty/not-found/error states.
6. Проверить query shape и очевидные N+1 cases.

#### Критерий завершения

- гость проходит `категория → раздел → тема → сообщения`;
- forum UI существует как реальный продукт, а не landing/scaffold page;
- LTR/RTL и locale-aware rendering продолжают работать через существующий foundation;
- public read path покрыт integration/E2E tests минимум для LTR и RTL fixtures.

### Stage 4D — auth/session и участие в обсуждениях

#### Работы

1. Перед реализацией повторно проверить exact pinned Better Auth integration с текущими
   React Router/Workers/Drizzle versions.
2. Подключить Better Auth runtime/session boundary к уже существующей Stage 4A schema.
3. Реализовать auth routes/configuration за server-only boundary и env placeholders; real
   production Google credentials не являются условием local/CI implementation.
4. Интегрировать validated `user.locale` в существующий negotiation path; explicit URL locale
   остаётся authoritative.
5. Разрешить authenticated user создавать topic и reply.
6. Реализовать safe Markdown/text/code input/output.
7. Добавить runtime validation, server-side authz, применимую CSRF/origin protection и
   базовый anti-spam/rate limiting для write boundaries.
8. Добавить automated session/authz/create-topic/reply tests без зависимости общего CI от
   реального Google OAuth call.

#### Критерий завершения

- guest read остаётся публичным;
- authenticated application session boundary существует и защищает write operations;
- user может создать topic/reply в development/test environment;
- guest не может выполнить protected writes;
- Markdown/code output безопасен от XSS;
- real Google OAuth deployment smoke ещё не требуется для завершения 4D.

### Stage 4E — solved topic, best answer и минимальные роли

#### Работы

1. Реализовать solved state и best answer.
2. Проверять author/topic/post consistency на сервере.
3. Реализовать только необходимое разграничение `guest/user/moderator/admin`.
4. Покрыть state-changing solved/best-answer actions той же security boundary.
5. Провести core E2E: guest read → authenticated topic → reply → solved/best answer.
6. Не добавлять расширенную модерацию, репутацию, поиск, жалобы и т. п. без отдельного решения.

#### Критерий завершения Stage 4

- local/CI forum MVP работает end-to-end;
- public read, participation и solved flow реализованы;
- базовые authz/security invariants покрыты negative tests;
- translation foundation не сломан;
- external production infrastructure всё ещё может оставаться выключенной/необновлённой.

---

## Stage 5 — завершить automatic translations и background jobs

Stage 5 выполняется **после рабочего forum core**. Архитектура уже зафиксирована; здесь
добавляется недостающая реализация.

**Translation components:** `UI-11`, `UI-12` provider validation, `UI-13`, `UI-14`
publish/runtime consumption, `CNT-01`–`CNT-06`, `PRV-01`, `PRV-02`, `JOB-01`–`JOB-06`,
`STO-03`, `STO-05` active path, `STO-06`, `SEC-02`, `SEC-03` extension, `SEC-04`.

### Stage 5A — UI translation generation/runtime completion

1. Реализовать `UiTranslationService`, `TranslationProviderRouter` и provider adapter
   boundaries.
2. Реализовать structured/plural validation через `LocaleRulesProvider`.
3. Реализовать durable translation task model, dispatcher, idempotent consumer,
   stale-task guards, retry/DLQ/reconciliation semantics.
4. Завершить generation → validation → publish → persisted compiled bundle → runtime read path.
5. Provider calls не выполнять в SSR request path.
6. Общий CI использует contract/fake adapters; реальные external provider calls не являются
   обязательными для каждого PR.

### Stage 5B — user-content translation

1. Реализовать `ContentTranslationService` поверх Stage 4 revisions.
2. Identity: `contentType + contentId + revisionId + targetLocale`.
3. Реализовать source-locale detection/correction boundary без подмены UI locale.
4. Переводить topic title отдельно от body.
5. Защищать Markdown/code/URL/technical fragments через structured/AST path.
6. При miss/failure показывать original current revision.
7. Использовать shared provider/job infrastructure с content-specific policy, validation,
   dedup/rate limits и provenance.

### Критерий завершения Stage 5

- machine UI translation может публиковать current validated bundle;
- persisted compiled bundle может использоваться runtime без N-query-per-key path;
- user-content translation revision-bound и original-safe;
- Queue/provider failures не ломают public read/forum content;
- contract/integration tests не требуют production secrets.

---

## Stage 6 — pre-release external integration

Stage 6 впервые собирает локально готовый продукт с реальной внешней инфраструктурой как
единый production candidate.

### Preconditions

- Stage 4 forum MVP завершён;
- Stage 5 translation implementation завершён в local/CI path;
- active development branch больше не auto-promotes каждую feature merge в production;
- current exact versions/platform UI повторно проверены перед provisioning.

### Работы

1. Восстановить/проверить dedicated least-privilege migration connection и убрать временный
   database-owner no-op exception до первой новой external schema migration.
2. Применить все pending reviewed migrations в pre-release Neon через защищённый production
   migration workflow и зафиксировать migration → runtime evidence.
3. Спроектировать и создать реальные runtime roles/grants по фактическим forum/auth/translation
   queries; localization role не расширять механически.
4. Подключить необходимые cache-disabled Hyperdrive bindings для runtime capabilities.
5. Настроить real Google OAuth credentials/redirect URIs/secrets и выполнить OAuth/session/logout smoke.
6. Настроить Cloudflare Queues и реальные translation provider credentials/adapters, выполнить
   provider/job smoke без превращения CI в зависимость от внешних API.
7. Изолировать preview/non-production от production private data/write capabilities или
   отключить соответствующий preview path.
8. Проверить deployment ordering, Worker bindings, logs/observability и external failure paths.
9. Выполнить real deployed smoke core forum flow + LTR/RTL + auth + translations.
10. Настроить и проверить PostgreSQL backup/restore до release.

### Критерий завершения

- pre-release candidate воспроизводимо развёрнут из зафиксированной revision;
- real Google OAuth работает;
- forum/auth/translation runtime capabilities используют least privilege;
- pending schema доказанно применена до schema-dependent runtime rollout;
- Queues/providers работают в реальной конфигурации;
- preview isolation/private-data boundary проверены;
- backup/restore проверен;
- core forum + translations проходят deployed smoke.

---

## Stage 7 — первый production-релиз

### Работы

1. Зафиксировать release revision и production configuration без секретов в Git.
2. Выполнить полный security review write/auth/provider boundaries.
3. Выполнить accessibility, LTR/RTL, locale/formatting и original-content fallback checks.
4. Выполнить полный CI и финальные E2E.
5. Выполнить управляемый production deploy из release revision.
6. Проверить post-deploy diagnostics и core flows.
7. Обновить `PROJECT_STATE.md` фактическими результатами.

### Критерий завершения

- production deploy воспроизводим;
- guest/user/solved-topic core flow работает;
- Google OAuth/session/logout работает;
- automatic UI translation и on-demand content translation работают с безопасными fallback;
- write boundaries имеют проверенные authz, CSRF/origin и basic anti-abuse controls;
- backup/restore и operational diagnostics готовы;
- release revision имеет зелёный обязательный CI.

После появления реальных пользователей/private data fault injection и destructive
infrastructure diagnostics в production прекращаются; рискованные DB/Hyperdrive/auth/runtime
изменения проходят отдельный staging gate.

---

## Translation Component Traceability

| Component IDs | Реализация / текущая фаза |
| --- | --- |
| `LOC-01`, `LOC-03`, `LOC-04`, `LOC-05`, `LOC-06`, `LOC-07`, `LOC-08`, `LOC-10` | Stage 1 — реализовано |
| `LOC-02` | Stage 1 abstraction → Stage 2 persistence — реализовано |
| `LOC-09` | Stage 2 lifecycle boundary — реализовано; protected lifecycle UI/admin flow только при реальном use case |
| `UI-01`, `UI-02`, `UI-03`, `UI-04`, `UI-05`, `UI-08`, `UI-09`, `UI-10` | Stage 1 — реализовано |
| `UI-06`, `UI-07` | Stage 3 — реализовано |
| `UI-11`, `UI-13` | Stage 5 |
| `UI-12` | Stage 1 local/input validation → Stage 5 provider validation |
| `UI-14` | Stage 3 compiler/persistence primitives → Stage 5 active publish/runtime consumption |
| `CNT-02`, `CNT-03`, `CNT-05` | Stage 4B forum revision/schema boundary → Stage 5 full implementation |
| `CNT-01`, `CNT-04`, `CNT-06` | Stage 5 |
| `PRV-01`, `PRV-02` | Stage 5 implementation → Stage 6 real provider acceptance |
| `JOB-01`, `JOB-02`, `JOB-03`, `JOB-04`, `JOB-05`, `JOB-06` | Stage 5 implementation → Stage 6 real Queue acceptance |
| `STO-01`, `STO-04` | Stage 3 — реализовано |
| `STO-02` | Stage 1 contract → Stage 3 persistence — реализовано |
| `STO-03`, `STO-06` | Stage 5 |
| `STO-05` | Stage 3 primitives → Stage 5 active publish/read/cache path |
| `STO-07` | Stage 2 — реализовано |
| `SEC-01` | Stage 1 — реализовано |
| `SEC-03` | Stage 1 initial validation → Stage 5 provider/content extension |
| `SEC-02`, `SEC-04` | Stage 5 implementation → Stage 6 external-secret/abuse acceptance |

## Первый production-релиз: обязательный объём

- классическая структура `категория → раздел → тема → сообщения`;
- публичное чтение;
- участие зарегистрированного пользователя;
- Google OAuth;
- Markdown/text/code;
- solved topic + best answer;
- guest/user/moderator/admin в минимально необходимом объёме;
- generic BCP-47 locale routing, SSR, LTR/RTL, canonical English + local/manual/machine UI translation;
- revision-bound on-demand translation пользовательского контента с original fallback;
- server-side validation/authz, применимая CSRF/origin protection и basic anti-spam/rate limiting;
- воспроизводимые migrations, CI и production-safe external/runtime boundaries.

Поиск, жалобы, блокировки, reputation/audit log и другие дополнительные возможности не
входят в обязательный объём без отдельного продуктового решения.
