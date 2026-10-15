# Vico Forum — аудит всей системы тестирования (2026-10-15)

> **Архивный служебный отчёт. НЕ MERGE.** Отдельный канал для результатов общего аудита тестов, созданный по прямому разрешению владельца. Не является implementation PR, заданием на исправление или заменой рабочих каналов #147 (UI/UX/Editor 2.0) и #122 (Stage 6). Никакие выводы не означают разрешения изменять код, CI или защищённые настройки.

## 1. Область и воспроизводимые срезы

Выполнен восьмичастный аналитический аудит: (1) инвентаризация тестов/CI; (2) инфраструктура тестирования и изоляция; (3) локализация/переводы; (4) форум/маршруты/профили/авторизация; (5) UI/Editor 2.0/черновики/вложения; (6) PostgreSQL/миграции/конкурентность/безопасность; (7) workflows/сборки/Workers smoke; (8) результативность и итоговая классификация.

- Базовый `main`: `99e69c0d651d7283d90141a0badc54fa1f6dd143`; 118 тестовых файлов: 77 app/unit/route, 24 database, 17 Node CI scripts.
- Аудируемый PR #215: `fdf81607536758f308305fceaa1c98ca8650ee3b`; 139 тестовых файлов: 95 app/unit/route, 27 database, 17 Node CI scripts.
- Фактический [CI #38725094807](https://github.com/iliya1947/vico-forum/actions/runs/38725094807) указанного head PR #215: Node 149 passed, PostgreSQL 297 passed, Vitest 993 passed / 2 failed (95 файлов Vitest: 94 passed / 1 failed). Итого **1439 passed, 2 failed** на этом срезе. Job `database` successful; job `checks` failed.
- После аналитического среза PR #215 изменился. На момент архивирования также наблюдался head `2020e1f504e746902731fba160f41a9bfbed91c2`: [CI #38741392810](https://github.com/iliya1947/vico-forum/actions/runs/38741392810), `database` successful, `checks` failed на шаге `Test`. **Точный характер отказа нового head не исследован**. Не переносить диагноз `fdf8160` на более новый head без повторной проверки.

Метод: просмотр GitHub `main` и PR, исходников, тестов, workflow/scripts и логов Actions; сопоставление утверждений тестов с реальным кодом. Не выполнялись локальный полный прогон, mutation testing, browser E2E или production smoke. «Возможна незамеченная регрессия» — статическая оценка, а не результат искусственного изменения кода.

## 2. Подтверждённые находки

### A-01 — PR #215: два падающих теста авторских цитат (блокер для проверенного head)

**Наблюдение:** в CI #38725094807 `app/forum/markdown.test.tsx` падают два теста: сохранение permalink/атрибуции цитаты и сворачивание длинной цитаты. В обоих `.forum-quote-attribution` отсутствует в DOM (`null`).

**Прослеженная причина для `fdf8160`:** `app/forum/markdown.tsx`, renderer `blockquote`, передаёт `node?.children?.[0]` в `isAttributedQuoteHeader`. Преобразование mdast → hast для `blockquote` добавляет первый текстовый узел `"\n"`; функция не получает первый содержательный paragraph и не распознаёт заголовок атрибуции. Ожидаемый блок не создаётся. Тесты обнаруживают проблему, а не ложно падают.

**Доказательства:** [markdown.tsx на exact head](https://github.com/iliya1947/vico-forum/blob/fdf81607536758f308305fceaa1c98ca8650ee3b/app/forum/markdown.tsx#L314-L316), [markdown.test.tsx](https://github.com/iliya1947/vico-forum/blob/fdf81607536758f308305fceaa1c98ca8650ee3b/app/forum/markdown.test.tsx#L56-L115), [CI run](https://github.com/iliya1947/vico-forum/actions/runs/38725094807).

**Статус:** подтверждённый дефект реализации **конкретного проверенного head**, не дефект качества этих двух тестов. Вопрос об исправлении решается в текущем Editor 2.0 workflow, не в этом архивном PR.

### A-02 — ruleset `Protect main` отключён (конфигурационный пробел)

**Наблюдение:** [ruleset 22721160](https://github.com/iliya1947/vico-forum/rules/22721160) содержит обязательные `checks`/`database`, но API сообщает `enforcement: disabled`. [`.github/workflows/ci.yml`](https://github.com/iliya1947/vico-forum/blob/99e69c0d651d7283d90141a0badc54fa1f6dd143/.github/workflows/ci.yml) имеет триггер только `pull_request`, без `push` на `main`.

**Граница:** endpoint branch protection вернул `403`, другие защиты не удалось подтвердить или исключить. Нельзя утверждать, что любой пользователь фактически может обойти все проверки. Аудит **не** меняет ruleset; включать защиту можно лишь после отдельного решения владельца.

### A-03 — Vitest spy без очистки между тестами (тестовая изоляция)

**Наблюдение:** `app/forum/public-read.test.tsx` использует `vi.spyOn(window, "getSelection")` более одного раза. `afterEach` выполняет `cleanup()` и `vi.unstubAllGlobals()`, но **не** `vi.restoreAllMocks()`; `restoreMocks` не задан в `vitest.config.ts`. Spy потенциально сохраняется между case внутри файла.

**Доказательства:** [public-read.test.tsx](https://github.com/iliya1947/vico-forum/blob/fdf81607536758f308305fceaa1c98ca8650ee3b/app/forum/public-read.test.tsx), [vitest.config.ts](https://github.com/iliya1947/vico-forum/blob/99e69c0d651d7283d90141a0badc54fa1f6dd143/vitest.config.ts).

**Статус:** подтверждённая проблема тестовой гигиены; фактическое ложное прохождение от неё не воспроизведено.

### A-04 — `forum-email-registration.test.ts`: зависимость теста входа от теста регистрации

**Наблюдение:** тест `rejects an incorrect password and accepts the registered email/password` входит под адресом `new-forum-member@example.org`, который создаётся предыдущим `it`. Сам тест не готовит эту зависимость: изолированный запуск или перестановка тестов изменяют предпосылки.

**Доказательство:** [forum-email-registration.test.ts](https://github.com/iliya1947/vico-forum/blob/99e69c0d651d7283d90141a0badc54fa1f6dd143/tests/database/forum-email-registration.test.ts).

**Статус:** подтверждённая зависимость fixture/test order, не заявленный production auth defect.

### A-05 — нестабильность PostgreSQL concurrency-теста (исторический подтверждённый симптом)

**Наблюдение:** GitHub Actions [run #38276771715](https://github.com/iliya1947/vico-forum/actions/runs/38276771715) ранее падал с PostgreSQL `SQLSTATE 40001` в `tests/database/migrations.test.ts` / `serializes concurrent desired-state writes and preserves a valid graph`; повтор того же head прошёл.

**Статус:** подтверждённый intermittent failure; первопричина **не установлена**. Нельзя автоматически считать дефектом транзакционной логики либо рекомендовать retries как исправление. Шум `there is no transaction in progress` имеет отдельно наблюдаемый источник: `ROLLBACK` в `finally` тестов конкурентной публикации иногда выполняется после `COMMIT`; это не подтверждение потери атомарности приложения.

## 3. Пробелы результативности тестов (не объявлять багами приложения)

| ID | Поверхность и тест | Непроверенное свойство | Статус |
|---|---|---|---|
| G-01 | `app/localization/content-generation-view.test.ts` | Реальные mismatch `revision / presentation / status` и cardinality; код содержит `assertSameIdentity` и throw, но тесты передают согласованные данные | Подтверждённый пробел негативных кейсов |
| G-02 | Тот же тест, «regardless of task state» | Проверяется только `completed`, не `pending / processing / failed` при существующем переводе | Подтверждённый пробел матрицы |
| G-03 | `db/hyperdrive-content-translations.test.ts` | Assert для `defaultClientFactory` читает исходный файл через `readFileSync` и сравнивает строку, а не выполняет default reader path | Статическая проверка вместо поведенческой |
| G-04 | `app/localization/translation-task-reconciliation.test.ts` | Observability-тест сравнивает заранее подготовленный mock snapshot и не доказывает redaction в реальном persistence-источнике | Ограничение конкретного теста; DB integration существует |
| G-05 | `app/forum/online-presence-heartbeat.test.tsx` | `401`-case проверяет остановку heartbeat, но не вызов session revalidation, хотя название обещает оба | Подтверждённый пробел assertion |
| G-06 | `tests/database/stage4-core-e2e.test.ts` | Поиск проверяется на отдельных совпадениях; нет набора нескольких кандидатов, где важен rank title > tag > body и deterministic order | Подтверждённый пробел ранжирования |
| G-07 | `app/routes/profile.test.ts` | Тест «preserves draft on invalid input and transient storage failures» проверяет сохранение draft при `503`, но не при `400` validation path | Подтверждённый пробел assertion |
| G-08 | `app/routes/notifications.test.ts` | Action проверяет успешный redirect, не проверяет отрицательные гостевой, cross-origin и отсутствующий ID сценарии | Пробел route-unit suite; shared guards / DB ownership проверяются отдельно |
| G-09 | `app/forum/markdown.test.tsx` | `Range.getClientRects()` подменён синтетическими rect, поэтому не доказывает реальную responsive-геометрию и сворачивание цитат в браузере | Требуется принятая по контракту browser acceptance, не обязательно новый E2E framework |
| G-10 | `tests/database/forum-email-registration.test.ts` | Утверждение «hashed password» проверяет `password` как truthy и `not.toBe(plaintext)`, не криптографическую структуру/параметры | Слабая проверка; успешный sign-in отдельно проверяется, уязвимость не подтверждена |

Формулировка `G-xx` означает **слепую зону теста**, не то, что удаление проверки было реально смоделировано mutation testing. Исправления допустимы только после проверки актуальности для текущего Stage и согласования очередности.

## 4. Сильные стороны покрытия

- `pnpm test` и `pnpm db:test` с отдельными конфигурациями Vitest; 17 Node-тестовых скриптов запущены явно внутри CI.
- PostgreSQL 17 integration suite проверяет реальные ограничения/transactions, отдельные DB-connections, authorization snapshot, lockout, CAS/conflicts/rollback, создание/редактирование сообщений, drafts и attachment lifecycle.
- Все destructive PostgreSQL suites сначала проверяют local `localhost/127.0.0.1` и суффикс БД `_test`; тест `hyperdrive-registry` использует фиксированный недоступный локальный endpoint без destructive setup.
- Интеграционные проверки миграций/ACL подтверждают конечную схему и положительные/отрицательные DB permissions; на `fdf8160` manifest matched 44 public tables.
- `checks` и `database` запускаются как отдельные jobs, и CI реально выявил регрессию quote rendering. Даже полный зелёный CI не равнозначен реальному browser acceptance.

## 5. CI, Workers и внешние границы

- `checks`: migration history, Node security/script tests, lint, typecheck, Vitest, build, UI preview build, `db:check`, Drizzle schema parity. Последовательные steps после упавшего `Test` **skip**: для `fdf8160` build и финальные Drizzle-steps в `checks` не подтверждены. Не называть их успешными по отдельному `database` job.
- `database`: disposable PG17, migration tests, structural manifest, runtime ACL positive/negative probes, relation provisioning, credential-recovery probes, Workers build и HTTP smoke. На `fdf8160` весь job прошёл.
- `scripts/smoke-workers.sh` проверяет HTTP status/locale redirects/RTL markers; он **не** проверяет реальный sign-in/topic/post/attachments/translation Worker runtime E2E.
- UI preview — статический Pages с fixtures; реальный браузер desktop/mobile, LTR/RTL, auth, error/empty, interaction — отдельный blocking acceptance по [docs/UI_UX_PASS.md](https://github.com/iliya1947/vico-forum/blob/99e69c0d651d7283d90141a0badc54fa1f6dd143/docs/UI_UX_PASS.md#L660-L699).
- Stage 6 реальный OAuth, Cloudflare Queues, providers, production database roles и deployed smoke сейчас вне активного scope. Не трактовать deferred external acceptance как регрессию текущего local/CI MVP.
- Automated browser E2E, coverage enforcement и mutation-score gate в текущем репозитории не обнаружены. Из отсутствия метрики нельзя выводить конкретный % непокрытого кода.

## 6. Вывод и границы применения

**Вывод:** набор тестов реальный и полезный, однако есть дефекты изоляции/independence и точечные проверяемые слепые зоны. Нельзя утверждать ни «все тесты неработоспособны», ни «все механизмы верны» на основании одного green CI.

**Разделение:** A-01 относится к implementation PR #215 на проверенном SHA; A-02 — к настройкам репозитория, изменение которых требует решения владельца; A-03/A-04 — confirmed test-quality defects; A-05 — observed flake с неустановленной причиной; G-01…G-10 — пробелы/границы утверждений, не подтверждённые функциональные инциденты. Не распространять findings одного PR на другой Stage без свежей проверки.

**Предлагаемая последовательность для рассмотрения, не задача на выполнение:** сначала blocking CI на актуальном SHA, затем природа PG flake и test isolation, далее только те G-xx, которые относятся к текущему Scope; перед final UI acceptance обязательно реальный браузер. Не раздувать framework и не начинать Stage 6 из-за гипотетических рисков.

Этот документ — **архив аудита**. Никакого кода/конфигурации не изменено; ни одной новой реализации, автоматического Code Review, reviewer assignment или разрешения на merge этим архивом не запускается.
