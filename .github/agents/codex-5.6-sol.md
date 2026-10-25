# Мишаня — Codex-5.6 Sol

## Статус

**Старый repository-аудит остановлен разработчиком 23 октября 2026. Отдельное назначенное whole-PR review PR #239 завершено 25 октября 2026 с verdict `FINDING`; реализацию не менять.**

Эта запись сделана по прямой команде разработчика после завершения прохода. Она фиксирует действия, результаты и процессный инцидент. Материал нельзя использовать как независимое заключение: во время работы я публиковал аудиторский контекст в общих комментариях PR #236, затем прочитал материалы чужого аудита и тем самым нарушил изоляцию проверяющих.

## Идентификация работы

- Личный файл: `.github/agents/codex-5.6-sol.md` — Мишаня, Codex-5.6 Sol.
- Проверявшийся локальный exact head: `21386887cec954618807a1bb1d08f186676e22ce`, ветка `work`.
- Согласованный scope: repository/local audit.
- По прямому указанию разработчика из аудита были исключены Cloudflare, Neon, Hyperdrive, R2, OAuth, backup/restore и external/production acceptance. Исключённые области не классифицировались ни как findings, ни как непроверенные пробелы.
- Реализация проекта во время аудита не изменялась.

## Все выполненные действия по аудиту

### Организация и baseline

1. Разбил аудит на последовательные этапы и продолжал каждый этап после команды разработчика.
2. Зафиксировал HEAD, ветку, состояние рабочего дерева, состав репозитория и границы проверки.
3. Использовал служебный PR #236, но ошибочно вёл прогресс в общем issue-комментарии `6326496500` вместо этого личного файла.
4. Не создавал implementation PR и не изменял исходники, документацию, зависимости, миграции или конфигурацию проекта.

### Этап 1 — документация

- Прочитал все 31 Markdown-документ заявленного repository scope.
- Исключённые external/production разделы только инвентаризировал.
- Сопоставил документацию с текущим кодом, тестами и состоянием проекта.
- Зафиксировал несоответствия state/history, противоречие permission model редактора, устаревшие UI/future claims и старые acceptance/archive references.

### Этап 2 — архитектура

- Построил dependency graph для 174 production TypeScript-модулей.
- Проверил composition root, request contexts, route tree, server/client imports, циклы, границу `app ↔ db`, entry points и production exports.
- Зафиксировал размывание границы приложения и БД, чрезмерно крупные repository/views, type-only cycle и неиспользуемые exports.

### Этап 3A — основные forum routes и доменная логика

- Проверил публичные чтения, создание тем и ответов, read-state, уведомления, закрепление, Help & solutions, историю и редактирование сообщений.
- Проследил цепочки route → permission guard → service → repository.
- Установил, что `runForumMutation()` превращает любые неизвестные исключения в контролируемый `503 unavailable`.

### Этап 3B — редактор, черновики и вложения

- Проверил Markdown/WYSIWYG state machines, Simple/Advanced режимы, draft reconciliation, CAS/tombstone/TTL, conflict resolution, публикационную идемпотентность, post-edit attachment lifecycle и локальную orchestration.
- Запустил 13 применимых test files / 275 tests прямым установленным Vitest binary.
- Внешний R2 runtime не проверял.
- Зафиксировал отсутствие согласованных серверных лимитов для части authoring/draft строк.

### Этап 4 — repository/local безопасность

- Проверил authentication/authorization boundaries, same-origin/CSRF, ownership, data projection, redirects/URL handling, UGC Markdown/XSS, профили/аватары, route actions, upload/download validation, tracked secrets и HTML response headers.
- Запустил 17 security-relevant test files / 201 tests.
- Зафиксировал отсутствие общей cache policy для персонализированных SSR responses и общей anti-framing/security-header policy.
- Email/password immediate activation без verification/recovery оставил как ранее принятый продуктовый риск, а не новый defect.

### Этап 5 — данные, схема, миграции и транзакции

- Проверил `db/schema.ts`, 45 миграций `0000–0044`, Drizzle journal/snapshots, ограничения, индексы, transaction/CAS/locking paths.
- `drizzle-kit check` прошёл.
- На временном PostgreSQL 17 проверил 27 database test files / 312 tests.
- Пять первоначальных ложных harness failures из-за системного pnpm 11 вместо project pnpm 12 перепроверил прямым project binary.
- Удалил временную БД.
- Зафиксировал app-only constraints, отсутствие FK у `forum_publication_receipts.topic_id/post_id` и три теста с concurrent `client.query()` на одном клиенте.

### Этап 6 — локализация и переводы

- Проверил locale routing/negotiation, registry/degraded bootstrap, canonical UI catalog, RU/HE packs, source priority/fallback, compiled bundles, UI/content translation planning/execution/publication, source-locale detection, Markdown/token protection, budgets, task leases/stale guards/reconciliation и SSR/hydration snapshot.
- Запустил 39 localization-related test files / 419 tests и повторно 8 рискованных pipeline files / 114 tests; эти числа являются срезами и не суммируются с общим test count.
- Зафиксировал зависимость convergence устаревших compiled UI bundles от ручной localhost-команды.

### Этап 7 — тестовая стратегия и статический анализ

- Проверил Vitest, TypeScript, ESLint, test inventory и GitHub Actions CI.
- ESLint прошёл без errors с одним warning.
- TypeScript project references и generated-type freshness прошли.
- Запустил 96 non-database test files / 1056 tests и 17 tests служебных GitHub-скриптов.
- Зафиксировал: CI только на `pull_request`, отсутствие coverage threshold/report, отдельного post-edit loader test, строгих runtime lint boundaries и CI job timeouts.

### Этап 8 — сборка, runtime и UI smoke

- Production build и UI Preview build прошли.
- Запустил disposable PostgreSQL 17 и проверил локальный PostgreSQL → Worker/React Router → SSR flow.
- Проверил smoke routes для HE/RU, locale redirects и 404.
- Headless Chromium загрузил 71 UI Preview state на desktop и mobile: 142 загрузки, плюс representative Hebrew RTL.
- Проверил hydration, runtime/page errors, empty renders, duplicate IDs и базовые accessible names.
- Остановил серверы, удалил временный PostgreSQL и созданный неигнорируемый `dist/`.
- Зафиксировал manager-header overflow на 320 px, отсутствие homepage `h1`, неигнорируемый `dist/`, отсутствующий favicon и крупный UI Preview bundle.

### Этап 9 — accessibility/SEO, зависимости, performance и hygiene

- Проверил semantic structure, focus/reduced-motion, heading hierarchy, contrast, route metadata и crawler assets.
- Измерил light accent contrast: `#fd6d29` даёт 2.84:1 на белом и 2.70:1 на фоне страницы.
- Проверил SSR/hydration payload и production bundles: HE homepage 75.9 KB HTML / 23.1 KB gzip; hydration stream 66 KB; initial referenced assets 947 KB / 267.7 KB gzip; shared views chunk 293.6 KB / 78.3 KB gzip.
- Проверил основные read paths и установил отсутствие пагинации у section topics и topic posts/attachments, а также forum-wide unread query для read-state одного section.
- Через разрешённый read-only network выполнил `pnpm audit`: 8 high, 13 moderate, 4 low, 0 critical. Большинство путей относятся к dev tooling или optional peer graph; production exploitability не заявлялась.
- Проверил exact dependency pins, lockfile integrity, lifecycle scripts, tracked/generated artifacts и repository hygiene.
- Рабочее дерево после проверок оставалось чистым.

### Финальная сверка

- Дедуплицировал результаты этапов 0–9.
- Выдал разработчику итоговую классификацию: 0 Critical, 1 High, 11 Medium, 18 Low.
- Предложил порядок исправления, но никаких исправлений не выполнял.

## Итоговый реестр результатов

### High — 1

1. `runForumMutation()` в `app/forum/mutations.server.ts` маскирует любые неизвестные writer/repository/programming/schema ошибки как `503 unavailable`. Это скрывает defect class и искажает диагностику; регрессионного теста на проброс неизвестной ошибки нет.

### Medium — 11

1. Документация противоречиво описывает permission model редактора и редактирования сообщений.
2. Граница `app ↔ db` размыта repository-specific типами и ошибками.
3. Часть authoring/draft строк не имеет согласованных серверных ограничений размера.
4. Персонализированные SSR pages не имеют явной общей `Cache-Control`/`Vary` policy.
5. Для HTML нет общей anti-framing/security-header policy.
6. Основной CI запускается только на `pull_request`, без независимой проверки итогового `main`.
7. Manager-header переполняется на 320 px: около 75 px в English и 32 px в Hebrew.
8. Section загружает все topics, а topic — все posts и attachments без pagination.
9. Section read-state получает forum-wide unread list и фильтрует его в приложении.
10. Light accent palette не соответствует WCAG AA для ряда текстов и controls.
11. Dependency governance не закрыт: advisory registry показал 8 high / 13 moderate / 4 low; audit/update gate в CI отсутствует.

### Low — 18

1. Документация недостаточно отделяет текущее состояние от истории.
2. Есть устаревшие UI/future claims и acceptance/archive references.
3. `db/forum-repository.ts`, `app/forum/views.tsx` и `app/styles.css` чрезмерно крупные.
4. Существует type-only dependency cycle.
5. Есть неиспользуемые production exports.
6. Несколько domain constraints обеспечиваются только приложением.
7. Publication receipts не имеют topic/post foreign keys.
8. Три database tests параллельно используют один PostgreSQL client.
9. Compiled UI bundle convergence зависит от ручной localhost reconciliation.
10. Нет coverage report и threshold.
11. Protected post-edit loader не имеет отдельного route test.
12. ESLint/TypeScript не обеспечивают строгие browser/node/worker boundaries.
13. У основных CI jobs нет timeouts.
14. На homepage нет `h1`; UGC Markdown может добавлять дополнительные `h1` в topic.
15. `ui-preview:build` создаёт неигнорируемый `dist/`.
16. Нет favicon, `robots.txt`, sitemap и manifest.
17. Category/section/topic не формируют dynamic title, description и canonical metadata.
18. Initial production/UI Preview payload крупный, performance/bundle budget gate отсутствует.

### Принятый риск

- Email/password registration сразу активирует account без email verification и recovery flow. Это не классифицировано новым defect.

## Выполненные внешние действия и процессный инцидент

1. Создал/обновлял общий issue-comment PR #236 с ID `6326496500` как журнал прогресса. Это было ошибкой: общий комментарий виден другим проверяющим и не заменяет личный файл.
2. В комментарии публиковались scope, coverage, test outcomes, технические выводы и направления следующих проверок. Даже без полного итогового реестра это загрязняло независимый audit context.
3. После вопроса разработчика прочитал общие комментарии PR и список файлов PR. В результате также получил контекст чужого аудита.
4. Ошибочно назвал себя Лёвой и указал `.github/agents/codex-6.1-sol.md`, затем исправил идентификацию на Мишаню и `.github/agents/codex-5.6-sol.md`.
5. По команде удалить audit comments инвентаризировал PR: найдено 55 top-level audit comments, review/inline comments нет. GitHub connector не поддерживал delete, локальный `gh` не был авторизован, browser control отсутствовал. Удалено 0 из 55; содержимое не заменялось.
6. До текущей команды не изменял ни один `.github/agents/*` файл или `.github/service-channel.md`.
7. По текущей прямой команде изменён только этот личный файл.

## Статус достоверности

- Механические результаты команд, test counts, build outcomes, измерения и указанные code locations остаются наблюдаемыми evidence.
- Итог нельзя считать независимым аудитом или формальным этапом четырёхагентного review.
- Findings требуют независимого воспроизведения проверяющим, не использующим этот материал до завершения собственного прохода.
- Я отстранён разработчиком и не должен продолжать аудит, исправлять findings или координировать следующий audit cycle.

## Отдельное whole-PR review PR #239 — 2026-10-25

Эта проверка не является продолжением старого repository-аудита. Она выполнена по отдельному
прямому назначению владельца на whole-PR review пакета 3 после публикации stable exact head.

### Идентификация и scope

- Reviewer: Мишаня, Codex-5.6 Sol; личный файл: `.github/agents/codex-5.6-sol.md`.
- Implementation PR: [#239](https://github.com/iliya1947/vico-forum/pull/239).
- Base: `main` `f59785c50e91fc1615b568b74a0a56909a92c871`.
- Reviewed exact head: `18c849c92eb597ccd39871914290cf6164fc209b`.
- Scope: `ARCH-01`, `ARCH-03`, `POST-EDIT-AVAIL-01`, `FORUM-READ-AVAIL-01`,
  `SEC-01`, `XR-THROWN-ACTION-BUFFER`, `EDITOR-PUB-01`, `EDITOR-PUB-02`.
- Проверялся весь diff и причинные цепочки, а не только заявленные happy paths или ранее
  опубликованные результаты других reviewers. Implementation PR не изменялся.
- Visual acceptance, production и внешние Cloudflare/Neon/Hyperdrive/R2/OAuth/backup-restore
  действия не выполнялись.

### Итог

**Verdict: `FINDING` — два current-scope дефекта уровня P2.**

#### PR239-MISHANYA-01 — reused publication operation зацикливает recovery после ambiguous success

Если published edit успешно зафиксирован сервером, но browser не получает ответ, новый
`clientAction` сохраняет mounted editor с прежним `editorOperationId`. Неизменённый повтор
идемпотентно проходит по receipt, но если пользователь после transport failure продолжит
редактировать сохранённый buffer, fingerprint запроса меняется. Тогда:

1. `db/forum-repository.ts:783-802` находит receipt того же operation ID и бросает
   `ForumStateConflictError` из-за несовпавшего fingerprint.
2. `app/forum/actions.server.ts:507-514` не различает receipt-reuse conflict и stale revision,
   повторно читает public post и возвращает общий `PostEditConflictData`.
3. Явный rebase в `app/forum/views.tsx:2871-2878` меняет только expected revision.
4. `app/forum/editor-attachments.tsx:179-184` сохраняет прежний operation ID; hidden field в
   `app/forum/markdown-editor.tsx:933-939` снова отправляет уже использованную generation.
5. Каждый следующий Save с изменённым buffer неизбежно получает тот же 409. Закрытие и
   повторное открытие формы создаёт новую operation, но теряет обещанное in-memory состояние.

Если неоднозначно сохранённая правка содержала новый attachment, refreshed public baseline уже
содержит его как published, а rebase без дедупликации добавляет рядом прежнюю private entry с тем
же ID (`[...baseline, ...current.filter(publishedUrl === null)]`). В результате один attachment
одновременно попадает в retained и selected lists, а React получает duplicate key. Existing
regression проверяет обычный stale-revision rebase и unchanged transport retry, но не цепочку
`server success → lost response → local modification → rebase → retry`.

#### PR239-MISHANYA-02 — открытый editor ошибочно меняет copy любого topic-level 409

`app/forum/views.tsx:2581-2582` выбирает `postEditConflict`, когда error равен `conflict` и
`editingPostId` просто non-null. Проверки `actionData.operation === "postEdit"` в условии copy нет.

Детерминированная цепочка: пользователь держит собственный post editor открытым; другая вкладка
решает тему; первая вкладка отправляет stale `markSolved`; `db/forum-repository.ts:3498` бросает
`ForumStateConflictError`; `runForumMutation()` возвращает обычный `{error:"conflict"}` без
`operation:"postEdit"`; editor остаётся открытым, и UI ложно сообщает о конфликте редактирования
сообщения. Та же ошибка применима к другим topic actions, возвращающим обычный 409. Finding
установлен независимо по source chain; наличие отдельно опубликованного совпадающего результата
другого reviewer не использовалось как доказательство.

### Выполненная проверка

- Полностью просмотрены 37 изменённых файлов: 563 additions / 44 deletions.
- `git diff --check` — PASS.
- Targeted package tests: 8 файлов / 120 тестов — PASS.
- Полный application suite: 101 файл / 1051 тестов — PASS.
- TypeScript project build — PASS с уже сгенерированными Worker types exact baseline.
- ESLint — 0 errors, одно прежнее warning в `app/forum/ui.test.tsx`.
- Application build и UI Preview build — PASS.
- Exact-head CI run `40219758202`: jobs `checks` и `database` — SUCCESS.
- Локальный PostgreSQL suite повторно не запускался: managed environment запретила доступ к
  Docker socket. Успех exact-head database CI учтён как подтверждение test execution, но не как
  замена source review.
- Исходная worktree осталась неизменной; временная detached review-worktree и generated artifacts
  удалены после проверки.

### Статус после публикации

- Результаты опубликованы только в личном файле Мишани по прямой команде владельца.
- Issue/review comments PR #236 и PR #239 не создавались и не изменялись.
- Исправления не выполнялись.
- Следующий шаг владельца/разработчика: исправить оба finding в PR #239 и назначить повторный
  whole-PR review нового stable exact head.
