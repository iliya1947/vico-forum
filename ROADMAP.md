# ROADMAP.md

## Назначение

Этот roadmap описывает путь от подготовленного репозитория без кода до первого production-релиза Vico Forum.

Source of truth:
- продуктовый и технический baseline — `PROJECT.md`;
- мультиязычность и переводы — `TRANSLATION_ARCHITECTURE.md` и `docs/translation/*`;
- точные решения scaffold — `SCAFFOLD_PLAN.md`.

Каждый этап выполняется отдельным компактным Pull Request или серией независимых Pull Request.
При изменении фактического состояния проекта обновляется `PROJECT_STATE.md`.

## Общие правила выполнения

1. Перед использованием библиотек/API проверять официальную документацию именно выбранных версий.
2. Не менять без отдельного решения baseline: модульный монолит, React Router v8 Framework Mode + SSR + TypeScript, Cloudflare Workers, PostgreSQL + Drizzle ORM, Better Auth + Google OAuth.
3. Мультиязычность не имеет hard-coded списка locale. Все translation component IDs из `TRANSLATION_ARCHITECTURE.md` должны быть привязаны к этапам этого roadmap.
4. Stage 1A создаёт только технический scaffold/quality gates; generic `/:locale/*` и runtime `LocaleRegistry` обязательны в PR 1B, а canonical English UI и request-scoped i18next — в PR 1C. Эти компоненты нельзя откладывать за пределы Stage 1.
5. Тестовую инфраструктуру создать вместе со scaffold. На последующих этапах добавлять тесты на новое критичное поведение.
6. В CI постоянно выполнять `lint`, `typecheck`, `test`, `build`.
7. Все внешние/пользовательские данные валидировать runtime на соответствующей системной границе; authz для защищённых операций проверяется на сервере.
8. Все state-changing browser actions должны иметь применимую CSRF/origin protection; публичные write/generation boundaries должны иметь базовый rate limiting/anti-spam без ограничения публичного чтения. Конкретные thresholds выбираются на этапе реализации и не являются архитектурной константой.
9. Не добавлять поиск, жалобы, блокировки, audit log и другие незафиксированные функции без отдельного продуктового решения.
10. Не переходить к следующему этапу, пока не выполнены критерии завершения текущего.

## Этап 0. Подготовить реализацию scaffold

Этап 0 уже подготовил toolchain и воспроизводимые команды. После исправления translation architecture `SCAFFOLD_PLAN.md` синхронизирован с новым i18n-контрактом; фиксированные `/en`/`/ru`/`/he`, `remix-i18next` и browser redetection больше не являются архитектурой Stage 1.

### Критерий завершения

- Зафиксированы runtime/package-manager/toolchain версии и команды.
- Scaffold создаётся официальным Cloudflare/React Router путем.
- Stage 1 не требует решений о форумной схеме, OAuth, translation providers или production deploy.

## Этап 1. Создать scaffold и locale/i18n foundation

**Translation components:** `LOC-01`–`LOC-10`, `UI-01`, `UI-02`, `UI-03`, `UI-04`, `UI-05`, `UI-08`, `UI-09`, `UI-10`, `UI-12`, `STO-02` (contract), `SEC-01`, `SEC-03`.

Stage 1 реализуется не одним крупным PR, а последовательной серией компактных PR `1A → 1B → 1C`, описанной в `SCAFFOLD_PLAN.md`. Отдельный PR внутри Stage 1 не означает завершение всего этапа; переход к Stage 2 разрешён только после прохождения всех Stage 1 acceptance checks.

### Работы

1. Создать минимальное React Router v8 Framework Mode SSR-приложение с TypeScript для Cloudflare Workers по `SCAFFOLD_PLAN.md`.
2. Реализовать generic `/:locale/*` locale boundary с server `loader`; технические routes держать вне locale namespace.
3. Реализовать `LocaleRegistry` abstraction и config/in-memory adapter: bootstrap active `en`, без compile-time locale union/list.
4. Реализовать `LocaleResolver`: explicit URL authoritative; без locale segment — cookie → `Accept-Language` → `en`, с зарезервированным authenticated `user.locale` source для Stage 4.
5. Реализовать BCP-47 canonicalization, aliases/canonical redirects, explicit fallback chain, unknown/inactive-locale protection, direction metadata и formatting context boundary.
6. Для request-dependent root negotiation `/` использовать безопасную cache policy; Stage 1 baseline — `Cache-Control: no-store`, согласно `LOC-08`/`SCAFFOLD_PLAN.md`.
7. Создать canonical English UI catalog, typed keys/message descriptors и `CanonicalEnglishSource`.
8. Добавить partial `LocalTranslationSource` с `sourceFingerprint` freshness и structural validation; local packs не определяют список locale.
9. Реализовать `TranslationResourceLoader`: source priority внутри locale, отдельные locale bundles, explicit fallback chain, без cross-locale flattening.
10. Настроить request-scoped `i18next` + `react-i18next` с `load: "currentOnly"` и explicit Vico `fallbackLng`; browser получает тот же locale/fallback/resources snapshot без повторного language detection.
11. Устанавливать `<html lang>`/`dir` из locale context; использовать direction-neutral CSS и Unicode-safe validation.
12. Настроить Vitest/testing infrastructure, ESLint, typecheck, build и CI.

### Критерий завершения

- Добавление нового locale через registry data не требует изменения routes, locale TypeScript union или resource bundle map.
- `/` выполняет negotiation с безопасной cache policy; request-specific negotiation result не может быть закэширован как универсальный redirect.
- Explicit unknown/inactive `/:locale` не подменяется cookie/header locale.
- Canonical/alias URL behavior, `lang`, `dir`, LTR/RTL и explicit fallback работают через SSR.
- Partial local pack может override отдельные current keys; stale override исключается и fallback продолжается.
- Server и hydration используют один locale/resource/formatting context.
- CI выполняет `lint`, `typecheck`, `test`, `build`.

### Проверки

- Проверить generic locale fixture, включая locale, которого нет в исходном app code.
- Проверить LTR и RTL locale, canonical redirects, unknown locale, cookie/header negotiation и `q=0`.
- Проверить `Cache-Control: no-store` для Stage 1 root negotiation redirect либо документированную эквивалентную policy, если baseline был отдельно пересмотрен.
- Проверить source priority, stale local translation и English fallback.
- Проверить SSR/hydration snapshot.
- Выполнить `lint`, `typecheck`, `test`, `build` и Workers-compatible preview.

## Этап 2. Подключить PostgreSQL, Drizzle и persistent LocaleRegistry

**Translation components:** `LOC-02` (persistent adapter), `LOC-09` (persistent lifecycle), `STO-07`.

Обязательные detail contracts Stage 2 находятся в `docs/translation/LOCALES.md` и
`docs/translation/STORAGE_AND_VERSIONING.md`; exact-version evidence и внешние ограничения —
в `docs/translation/RESEARCH.md`.

Stage 2 выполняется серией `2A → 2B → 2C`. Переход к Stage 3 разрешён только после
завершения всей серии и реального Hyperdrive acceptance.

### PR 2A — DB foundation

1. Добавить exact PostgreSQL/Drizzle dependencies и Drizzle configuration.
2. Создать PostgreSQL 17 schema `locales` с row-local constraints из locale contract.
3. Добавить reproducible reviewed SQL migrations; production `drizzle-kit push` не использовать.
4. Отдельной data migration перенести текущие persistent `ru`, `he`, `ka` semantics; code-owned `en` в БД не создавать.
5. Добавить disposable PostgreSQL 17 integration database в CI и безопасный migration test.
6. Зафиксировать forward-only production migration/recovery baseline: migrations before deploy, application rollback, forward repair/restore вместо автоматического destructive down rollback.

### PR 2B — persistent LocaleRegistry

1. Реализовать server-only PostgreSQL row parser, persistent repository и graph assembly `BOOTSTRAP_ENGLISH + persistent rows`.
2. Сохранить существующие synchronous `LocaleRegistry`/`LocaleResolver` consumers; async DB I/O выполняется до передачи immutable snapshot.
3. Добавить request-scoped lazy/memoized registry loading через React Router request context без module-global `pg.Client`/`Pool` и без DB access для technical routes, которым registry не нужен.
4. Реализовать deterministic semantic SHA-256 identity validated effective registry и отдельный load-health state.
5. Реализовать degraded bootstrap-only behavior для classified DB/schema/integrity failures без восстановления stale non-English process state.
6. Добавить controlled test/admin writer boundary и integration/concurrency tests для desired-state `SERIALIZABLE` writes; production Worker Stage 2 остаётся read-only.
7. Сохранить Stage 1 locale/routing behavior regression tests.

### PR 2C — Neon + Hyperdrive integration

1. Создать/подключить Neon PostgreSQL 17 и cache-disabled `HYPERDRIVE` configuration с direct/unpooled Neon origin.
2. Разделить migration/admin credentials и production Worker read-only DB capability; `DATABASE_URL` не передавать Worker runtime.
3. Подтвердить local Workers integration с disposable PostgreSQL 17 через documented local Hyperdrive connection override.
4. Выполнить реальный deployed Worker smoke через настоящий Hyperdrive; local `vite preview` не считается проверкой remote Hyperdrive service.
5. Зафиксировать operational/deployment procedure и безопасное различие healthy/degraded registry state.

### Критерий завершения

- Чистая PostgreSQL 17 DB воспроизводимо получает schema и exact initial `ru`/`he`/`ka` data без DB row `en`.
- Persistent `LocaleRegistry` заменяет config adapter без изменения synchronous consumers и сохраняет Stage 1 routing/fallback behavior.
- Invalid DB row/fallback/alias graph не публикуется как working registry; whole-graph validation применяется на load и controlled write boundary.
- Один locale-sensitive request использует один immutable registry snapshot; `/api/*` без registry consumer не выполняет registry DB query.
- Validated registry имеет deterministic semantic identity, а operational load health хранится отдельно.
- DB outage/schema mismatch/integrity failure сохраняет только безопасный public English fallback; release/deployment acceptance при этом не считается успешным.
- Production Worker Stage 2 имеет только необходимые read privileges; migration/runtime/test credentials разделены, DB secrets не попадают в Git/client bundle/logs.
- Real deployed `workers.dev` request подтверждает работу Neon → Hyperdrive → `pg` → Drizzle path.

### Проверки

- Clean migrations и exact initial-data verification на disposable PostgreSQL 17.
- DB constraint, row-parser, whole-graph, semantic-hash, degraded-mode и controlled writer/concurrency integration tests.
- Regression: `/ru/`, `/he/`, alias `iw`, inactive `ka`, unknown/canonical locale, non-`GET`/`HEAD` fail-closed и technical `/api/*` semantics.
- Workers-compatible local preview с local PostgreSQL binding.
- Real deployed Hyperdrive smoke после migration и до завершения Stage 2.
- Forward-only application/DB recovery procedure проверена на принятом migration workflow.
- `lint`, `typecheck`, `test`, `build`.

## Этап 3. Реализовать persistent UI translation resources

**Translation components:** `UI-06`, `UI-07`, `UI-14`, `STO-01`, `STO-02` (persistence), `STO-04`, `STO-05`.

### Работы

1. Спроектировать фактическую PostgreSQL schema UI translations по logical contracts и создать миграцию.
2. Реализовать `UiTranslationStore`, persistent manual/machine sources и current/stale lifecycle.
3. Сохранять `sourceFingerprint`; manual/local fingerprint нельзя автоматически обновлять после изменения canonical source.
4. Компилировать versioned locale/namespace bundles без N-query-per-key runtime path.
5. Реализовать bundle-version/cache/ETag boundary без привязки domain к конкретному cache backend.
6. Подключить persistent sources к существующему `TranslationResourceLoader` без изменения его публичного контракта.

### Критерий завершения

- Local manual → persistent manual → machine priority работает внутри locale.
- Target → registry fallback → `en` работает между locale без flattening.
- Source change делает старые values stale и исключает их из current bundle.
- Loader продолжает работать при отсутствии persistent translation данных через local/English resources.

### Проверки

- Миграции к чистой БД.
- Интеграционные тесты current/stale, priority, bundle version и cache identity.
- `lint`, `typecheck`, `test`, `build`.

## Этап 4. Подключить Better Auth и Google OAuth

### Работы

1. Проверить exact-version интеграцию Better Auth с React Router SSR, Cloudflare Workers и Drizzle.
2. Добавить auth schema миграциями.
3. Реализовать Google sign-in, server session и logout.
4. Интегрировать validated `user.locale` в существующий LocaleResolver: URL остаётся authoritative.
5. Добавить минимальную защищённую страницу для проверки сессии.
6. Проверить security defaults/requirements выбранной версии Better Auth для cookies, trusted origins и CSRF/origin boundary; не считать auth-библиотеку автоматической защитой будущих forum actions без отдельной проверки этих actions.

### Критерий завершения

- Публичные страницы доступны гостю.
- Google OAuth, SSR session и logout работают.
- Защищённый route недоступен без валидной сессии.
- `user.locale` участвует только в negotiation без explicit locale URL.
- Auth cookies/origins настроены согласно exact-version contract без ослабления server-side authz.

### Проверки

- Auth migrations.
- Автоматические auth/session negative tests.
- Проверить invalid/untrusted origin behavior на auth boundary согласно официальному API выбранной версии.
- Preview smoke-test Google OAuth.
- `lint`, `typecheck`, `test`, `build`.

## Этап 5. Реализовать automatic UI translation providers и background jobs

**Translation components:** `UI-11`, `UI-12` (provider validation), `UI-13`, `PRV-01`, `PRV-02`, `JOB-01`–`JOB-06`, `STO-03`, `STO-06`, `SEC-02`, `SEC-04`.

### Работы

1. Реализовать `UiTranslationService`, machine `TranslationProviderRouter` и provider adapters за capability/policy boundary.
2. Интегрировать Cloudflare Workers AI M2M100 и Google Cloud Translation как adapters без hard-coded universal primary/fallback chain.
3. Реализовать structured/plural translation через `LocaleRulesProvider` и validation; plain provider не объявлять capable там, где не гарантирует structured result.
4. Реализовать `TranslationJobDispatcher` на Cloudflare Queues: durable task commit до enqueue, маленький task-id message.
5. Реализовать idempotent consumer, stale-task preflight, conditional current publish, lease recovery, retry classification, DLQ и reconciliation.
6. Сохранять `generationPolicyVersion`, provider/model provenance и attribution/presentation metadata.
7. Реализовать controlled bulk generation, source-change regeneration и deduplicated/rate-or-budget self-healing.
8. Не вызывать external translation provider в SSR request path; provider secrets остаются server-side.

### Критерий завершения

- Новый registered locale может получить machine UI resources без изменения app routes/i18n core.
- Provider capability/unsupported pair переключается policy/router, а не изменением locale model.
- Duplicate/stale Queue task не создаёт некорректный current state.
- Provider failure не ломает UI: current stored/local/English fallback остаётся доступен.
- Structured messages публикуются current только после полной validation.

### Проверки

- Contract tests provider adapters без обязательного real external call в общем CI.
- Queue/idempotency/stale-task/reconciliation tests.
- Integration tests UI generation → storage → compiled bundle → SSR.
- Preview smoke-test реальных providers.
- `lint`, `typecheck`, `test`, `build`.

## Этап 6. Зафиксировать минимальную форумную модель и revision boundaries

**Translation components prepared for later implementation:** `CNT-02`, `CNT-03`, `CNT-05`.

### Работы

1. Описать и мигрировать только базовые сущности: категория, раздел, тема, сообщение и связи.
2. Учесть авторство, solved state, best answer и immutable content revisions.
3. Revision model должен хранить original content и source-locale metadata (`sourceLocale | und`) без зависимости от UI locale.
4. Topic title моделировать как отдельную versioned/translatable unit, чтобы Stage 10 не потребовал переделки forum schema.
5. Зафиксировать минимальные права текущих ролей.

### Критерий завершения

- Схема поддерживает `категория → раздел → тема → сообщения`.
- Revision identity достаточна для будущего revision-bound translation.
- Source-locale correction может создавать новую revision без изменения translation identity model.
- Нет незаявленных функций.

### Проверки

- Чистые миграции и integration tests constraints.
- Проверить revision invariants.
- `lint`, `typecheck`, `test`, `build`.

## Этап 7. Реализовать публичное чтение форума

### Работы

1. Реализовать SSR-страницы категорий, разделов, списков тем и темы с сообщениями.
2. Сохранять canonical locale во внутренних ссылках.
3. Использовать существующий UI translation resource path для всех UI strings.
4. Добавить минимальные empty/error states и навигацию классического форума.

### Критерий завершения

- Гость проходит `категория → раздел → тема → сообщения`.
- Публичный UI работает через generic active locales, а не фиксированный набор языков.
- LTR/RTL и locale-aware formatting работают из общей foundation.

### Проверки

- Integration tests queries и критичных N+1 случаев.
- E2E guest path минимум на LTR и RTL locale и на дополнительном registry locale fixture.
- `lint`, `typecheck`, `test`, `build`.

## Этап 8. Реализовать участие в обсуждениях

### Работы

1. Разрешить авторизованному пользователю создавать тему и отвечать.
2. Реализовать безопасный Markdown/text/code input/output.
3. Выполнять server-side runtime validation и authz для всех write operations.
4. Реализовать применимую CSRF/origin protection для state-changing browser requests; защита должна соответствовать фактической session/auth architecture, а не предполагаться по наличию OAuth.
5. Добавить базовый rate limiting/anti-spam на создание тем и сообщений. Точные thresholds/configuration выбираются на этом этапе; публичное чтение не должно требовать этих write limits.
6. Создавать immutable revisions при поддерживаемом редактировании.
7. Сохранять/уточнять source-locale metadata revision без подмены UI locale.

### Критерий завершения

- Пользователь может создать тему/ответ, гость — нет.
- Markdown/code безопасны от XSS.
- Cross-origin/forged state-changing request не проходит защитную границу.
- Очевидный burst/spam на write endpoints ограничивается без нарушения обычного публичного чтения.
- Revision history и source-locale metadata сохраняют invariants Stage 6.

### Проверки

- Integration/E2E create-topic/reply/authz.
- XSS/Markdown safety tests.
- Negative tests для CSRF/origin boundary в соответствии с выбранной реализацией.
- Rate-limit/anti-spam tests для create-topic/reply boundary, включая нормальный разрешённый сценарий.
- `lint`, `typecheck`, `test`, `build`.

## Этап 9. Реализовать solved topic и базовые роли

### Работы

1. Разрешить автору темы отметить её решённой и выбрать лучший ответ.
2. Проверять author/topic consistency на сервере.
3. Реализовать минимальное разграничение guest/user/moderator/admin для текущих сценариев.
4. Применить общую state-changing request protection к изменению solved/best-answer state.
5. Не добавлять расширенную модерацию без отдельного решения.

### Критерий завершения

- Только уполномоченный автор выбирает best answer.
- Best answer принадлежит той же теме.
- Role/authz checks покрыты negative tests.
- State-changing security boundary не обходится через прямой browser request.

### Проверки

- Integration/E2E `создать тему → получить ответ → решить`.
- Negative authz/consistency и origin/CSRF tests для solved/best-answer mutation.
- `lint`, `typecheck`, `test`, `build`.

## Этап 10. Реализовать перевод пользовательского контента

**Translation components:** `CNT-01`–`CNT-06` (full implementation); reuse `PRV-*`, `JOB-*`, `STO-06`, `SEC-02`.

### Работы

1. Реализовать отдельный `ContentTranslationService`; оригинал никогда не заменяется переводом.
2. Translation identity: `contentType + contentId + revisionId + targetLocale`; новая revision не использует старый перевод как current.
3. Реализовать language detection boundary; `und` не подменяется UI locale. Manual source-locale correction создаёт новую revision.
4. Переводить topic title отдельно от body.
5. Разбирать Markdown в AST/structured representation; не переводить fenced/inline code, URLs, technical identifiers и markup structure.
6. Использовать shared machine provider router/job infrastructure с content-specific policy, rate limits, validation и provenance.
7. Реализовать revision-bound persistence/cache; при miss/failure показывать original current revision.
8. Если target locale эквивалентен source locale, не создавать бессмысленную translation job.

### Критерий завершения

- Original content всегда доступен и не заменяется machine result.
- Повторный запрос current revision/target использует сохранённый translation.
- Old revision translation не выдаётся как current после edit/source-locale correction.
- Technical fragments сохраняются без отправки provider.
- Provider failure безопасно возвращает original content.
- UI translation storage и content translation storage/lifecycle не смешаны.

### Проверки

- Unit tests AST protect/restore и source-locale logic.
- Integration tests revision identity, persistence/cache и separate title translation.
- Provider contract tests + preview smoke-test.
- Rate-limit/dedup/authz tests.
- `lint`, `typecheck`, `test`, `build`.

## Этап 11. Подготовить первый production-релиз

### Работы

1. Зафиксировать production-конфигурацию Workers, PostgreSQL, OAuth, Queues и translation providers без секретов в Git.
2. Проверить миграции и безопасный deploy порядок.
3. Добавить минимальную диагностику ошибок/translation task failures.
4. Настроить и проверить backup/restore PostgreSQL.
5. Проверить Markdown/XSS, auth routes/cookies, CSRF/origin protections, rate limiting/anti-spam, secrets, permissions и translation generation abuse boundaries.
6. Провести accessibility, LTR/RTL, locale/formatting, translation fallback и original-content smoke tests.
7. Выполнить preview, затем production deploy без merge со стороны Codex.
8. Обновить `PROJECT_STATE.md` фактическими результатами.

### Критерий завершения

- Production deploy воспроизводим из зафиксированной ревизии.
- DB migrations, OAuth, LocaleRegistry, UI resources, Queue/provider jobs работают в production configuration.
- Guest/user/solved-topic core flow работает.
- Generic active locales, LTR/RTL, automatic UI translation и on-demand content translation проходят smoke-test.
- Публичные write boundaries имеют проверенные authz, CSRF/origin и basic anti-abuse controls.
- Backup restore проверен.
- Release revision имеет зелёный обязательный CI.

### Проверки

- Полный `lint`, `typecheck`, `test`, `build`.
- Preview/staging migrations и smoke tests.
- OAuth/cookies/logout production-like smoke.
- E2E core forum flow на LTR/RTL locale.
- UI translation generation/fallback, content translation/original fallback, Queue failure path.
- Security smoke/negative tests для write boundaries.
- Backup/restore и post-deploy diagnostics.

## Translation Component Traceability

Эта таблица не дублирует detail contracts. Она гарантирует, что ни один component ID из
`TRANSLATION_ARCHITECTURE.md` не потерян между архитектурой и реализацией.

| Component IDs | Этап |
| --- | --- |
| `LOC-01`, `LOC-03`, `LOC-04`, `LOC-05`, `LOC-06`, `LOC-07`, `LOC-08`, `LOC-10` | Stage 1 |
| `LOC-02`, `LOC-09` | Stage 1 abstraction → Stage 2 persistence |
| `UI-01`, `UI-02`, `UI-03`, `UI-04`, `UI-05`, `UI-08`, `UI-09`, `UI-10` | Stage 1 |
| `UI-12` | Stage 1 local/input validation → Stage 5 provider validation |
| `UI-06`, `UI-07`, `UI-14` | Stage 3 |
| `UI-11`, `UI-13` | Stage 5 |
| `CNT-02`, `CNT-03`, `CNT-05` | Stage 6 boundaries → Stage 10 full implementation |
| `CNT-01`, `CNT-04`, `CNT-06` | Stage 10 |
| `PRV-01`, `PRV-02` | Stage 5; reused Stage 10 |
| `JOB-01`, `JOB-02`, `JOB-03`, `JOB-04`, `JOB-05`, `JOB-06` | Stage 5; reused Stage 10 |
| `STO-01`, `STO-04`, `STO-05` | Stage 3 |
| `STO-02` | Stage 1 contract → Stage 3 persistence |
| `STO-03`, `STO-06` | Stage 5 |
| `STO-07` | Stage 2 |
| `SEC-01`, `SEC-03` | Stage 1 (`SEC-03` extended Stage 5) |
| `SEC-02`, `SEC-04` | Stage 5 (`SEC-02` reused Stage 10) |

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
- server-side validation/authz, применимая CSRF/origin protection и basic anti-spam/rate limiting для public write boundaries;
- обязательный CI и production-safe persistence/background boundaries.

Поиск, жалобы, блокировки, audit log и другие дополнительные возможности не входят в
обязательный объём до отдельного продуктового решения.