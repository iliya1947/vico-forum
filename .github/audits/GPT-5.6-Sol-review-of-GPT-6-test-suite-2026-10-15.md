# Review GPT-5.6 Sol — аудит GPT-6 test suite (2026-10-15)

> **Архивный review. НЕ MERGE.**
>
> Независимая проверка файла `.github/audits/GPT-6-test-suite-2026-10-15.md`.
> Исходный аудит GPT-6 не изменяется. Этот документ фиксирует только результат проверки его
> фактов, классификации и полноты.

## 1. Итог review

Аудит GPT-6 **в целом полезный и преимущественно фактически корректный**, но как единственный
итог «проверки всей тестовой системы» **неполон**.

Результат:

- A-01 — подтверждён;
- A-02 — подтверждён с уже указанной GPT-6 границей о неизвестной classic branch protection;
- A-03 — подтверждён как test-isolation/hygiene defect, но false-pass не воспроизведён;
- A-04 — подтверждён;
- A-05 — сам intermittent `40001` подтверждён, но одна причинная формулировка внутри finding
  неверна/не доказана;
- G-01…G-09 — в основном подтверждаются как gaps конкретных assertions;
- G-10 — технически справедлив как критика формулировки test assertion, но низкой практической
  ценности и не должен автоматически превращаться в задачу на проверку внутренних crypto-details
  Better Auth.

Главный недостаток отчёта — несколько системных проблем test fidelity / assembled-flow coverage /
CI evidence либо пропущены, либо упомянуты только как фон без current-scope классификации.

---

## 2. Проверка A-findings

### A-01 — PASS

На `fdf81607536758f308305fceaa1c98ca8650ee3b` действительно падали два quote tests в
`app/forum/markdown.test.tsx`: attribution element отсутствовал.

На этом head renderer передавал:

`isAttributedQuoteHeader(node?.children?.[0])`.

Более поздняя correction изменила boundary на передачу blockquote node целиком:

`isAttributedQuoteHeader(node)`.

Это согласуется с диагнозом GPT-6: tests поймали реальную implementation regression, а не
ложно-красный test.

**Классификация:** корректно.

### A-02 — PASS с сохранением ограничения

Ruleset `Protect main` действительно содержит required `checks` / `database`, но API на
момент проверки возвращал `enforcement: disabled`.

GPT-6 правильно указала существенную границу: classic branch-protection endpoint вернул `403`,
поэтому аудит не может доказать отсутствие любой другой защиты repository.

Также верно наблюдение, что основной `ci.yml` запускается только на `pull_request`, а не на
`push` в `main`.

**Классификация:** корректно. Нельзя расширять до утверждения «merge ничем не защищён» без
дополнительного evidence.

### A-03 — PASS, но severity ограничена

В `app/forum/public-read.test.tsx`:

- `afterEach` вызывает `cleanup()` и `vi.unstubAllGlobals()`;
- `vi.restoreAllMocks()` отсутствует;
- `restoreMocks` глобально не включён;
- test quote/reply дважды использует `vi.spyOn(window, "getSelection")`.

Оба `spyOn` находятся **в одном test case**, а не в разных tests, однако после завершения case
spy всё равно не восстанавливается этим `afterEach`.

Последующие tests в файле не показали фактического false-pass от этого состояния.

**Классификация:** реальный test-isolation/hygiene defect; production defect и реальный
ложноположительный test не доказаны.

### A-04 — PASS

`tests/database/forum-email-registration.test.ts`:

1. первый `it` создаёт `new-forum-member@example.org`;
2. следующий `it` выполняет invalid/valid sign-in этого же account;
3. второй test самостоятельно fixture не создаёт;
4. setup schema выполняется через `beforeAll`, а не независимый per-test fixture.

Следовательно test зависит от порядка выполнения / side effect предыдущего test.

**Классификация:** подтверждённый test-independence defect.

### A-05 — PARTIAL: symptom подтверждён, объяснение warning требуется исправить

Сам intermittent failure подтверждён.

Кроме run #38276771715, указанного GPT-6, найден второй более свежий случай:

- run #38641237040;
- SHA `0774325cd2cc5080752d614654a57aab0369cff9`;
- attempt 1: `database` failure, `checks` success;
- attempt 2: тот же SHA — success;
- failure:
  `tests/database/migrations.test.ts > serializes concurrent desired-state writes and preserves a valid graph`;
- PostgreSQL `40001`: `could not serialize access due to read/write dependencies among transactions`.

Это усиливает вывод, что проблема не единичная.

Однако предложение GPT-6:

> `there is no transaction in progress` имеет отдельно наблюдаемый источник:
> `ROLLBACK` в `finally` тестов конкурентной публикации

не подтверждает наблюдаемый locale-concurrency flake.

В логе run #38641237040 warning появляется сразу после serialization failure во время commit,
а `ControlledLocaleWriter.applyOnce()` на error вызывает собственный
`rollbackIgnoringFailure()`. Поэтому как минимум для этого observed flake источник warning
находится в writer rollback path после PostgreSQL-aborted/failed transaction, а не доказанном
`finally` другого publication test.

**Коррекция:** удалить/переформулировать причинную фразу. Сам A-05 сохраняется как
confirmed intermittent test reliability symptom с ещё не установленной полной первопричиной.

---

## 3. Проверка G-findings

### G-01 — PASS

`buildContentGenerationView()` явно имеет:

- cardinality guard;
- `assertSameIdentity()`.

В dedicated test отсутствуют negative cases на mismatch/cardinality.

### G-02 — PASS

Test называется:

`treats persisted exact-current presentation as current regardless of task state`

но фактически передаёт только `completed`.

В implementation ветка `presentation.selected === "translation"` действительно должна
перекрывать task state, поэтому название обещает матрицу шире assertion.

### G-03 — PASS

`db/hyperdrive-content-translations.test.ts` действительно читает source через
`readFileSync` и проверяет строку:

`const defaultClientFactory: PostgreSqlClientFactory = createWebClient;`

Это structural/static assertion, а не behavioral execution default path.

### G-04 — PASS с ограничением

Unit observability test получает уже подготовленный `TranslationTaskObservabilitySnapshot`
из fake store и проверяет passthrough/bounded representation.

Сам persistence/DB слой имеет отдельные integration tests, поэтому это ограничение конкретного
unit test, а не доказательство отсутствия DB redaction contract вообще.

### G-05 — PASS

Test называется:

`stops heartbeat requests and revalidates session after a 401`.

Он проверяет только отсутствие следующего `fetch` после 401.

Implementation действительно вызывает `revalidator.revalidate()`, но dedicated test не
assert'ит этот вызов.

### G-06 — PASS

Global forum search implementation имеет rank:

`title = 3 > tag = 2 > body = 1`,

затем activity и stable topic-id ordering.

Stage4 connected test проверяет отдельный title search и отдельный tag search, но не один
multi-candidate result set, где ordering между title/tag/body реально должен проявиться.

### G-07 — PASS

Profile test получает `400` на invalid input, но не проверяет returned draft payload для этого
branch. Для `503` draft проверяется явно.

Название test обещает сохранение draft в обоих случаях.

### G-08 — PASS

`app/routes/notifications.test.ts`:

- loader имеет guest 401 test;
- action test проверяет success redirect;
- action-specific guest, cross-origin и missing/invalid notification ID negative cases в этом
  файле отсутствуют.

Shared guards / repository ownership в других слоях не отменяют этот route-unit gap.

### G-09 — PASS

Quote collapse geometry в jsdom моделируется подменой `Range.getClientRects()`.

Такой test полезен для component logic, но не доказывает настоящую browser layout geometry,
responsive behavior и line fragmentation.

### G-10 — PASS как critique, низкий приоритет

Password assertion проверяет только:

- значение существует;
- значение не равно plaintext.

Это действительно не доказывает конкретную структуру/параметры password hash.

Но Better Auth является внешней authentication dependency, а успешный credential sign-in
проверяется отдельно. Без отдельного product/security contract на конкретный hash format не
следует автоматически превращать G-10 в задачу на тестирование внутренних деталей library.

---

## 4. Существенные проблемы, пропущенные или недоклассифицированные GPT-6

### M-01 — глобальный jsdom для server-oriented ordinary tests

`vitest.config.ts` задаёт:

`environment: "jsdom"`

для всего обычного suite, кроме отдельного database config.

В этот suite входят server/domain-oriented tests, которым browser globals не нужны и в реальной
server/Workers среде не гарантированы.

**Почему важно:** server-oriented code может случайно начать зависеть от browser-only globals,
а test environment это скроет.

**Классификация:** current test-fidelity gap.

### M-02 — `stage4-core-e2e` не является full HTTP/Worker/auth-cookie E2E

Test использует реальные PostgreSQL repository/services/actions, но:

- вручную создаёт `RouterContextProvider`;
- вручную inject'ит session/authorization dependencies;
- вызывает route actions напрямую.

Он не проходит полный путь:

`HTTP → Worker → Better Auth cookie/session → router → protected write → DB → subsequent HTTP read`.

**Классификация:** current assembled-flow coverage gap.

### M-03 — split Hyperdrive smoke не проверяет split privileges

В local database CI оба binding override используют один PostgreSQL superuser connection для
`HYPERDRIVE` и `WEB_HYPERDRIVE`.

Smoke проверяет wiring/runtime path, но не способен обнаружить ошибку, которая проявится только
при разных least-privilege runtime roles.

**Классификация:** current false-green integration gap.

### M-04 — два React test-файла не имеют корректного DOM cleanup

При `globals: false` и отсутствии общего setup auto-cleanup dedicated `cleanup()` нужен явно.

Проблемные files:

- `app/forum/profile-view.test.tsx`;
- `app/ui-preview/preview-app.test.tsx`.

В них есть render paths, которые не unmount'ятся перед следующим case.

**Классификация:** confirmed current test isolation defect.

### M-05 — real-browser layer не классифицирован как current Editor 2.0 gap

GPT-6 верно пишет в разделе CI, что automated browser E2E не обнаружен и Pages не заменяет
browser acceptance, но не выводит это в findings.

Для Editor 2.0 это не просто абстрактное пожелание. Implementation зависит от browser-sensitive
mechanics:

- Selection / Range;
- contentEditable;
- paste/drop;
- clipboard;
- localStorage;
- layout/scroll geometry;
- focus/caret;
- XHR progress;
- responsive/RTL behavior.

Project state одновременно оставляет browser/mobile/RTL acceptance незавершённым.

**Классификация:** current acceptance/fidelity gap; это не требование обязательно внедрить
конкретно Playwright/Cypress.

### M-06 — Fullscreen и Split-scroll без dedicated regressions

Editor implementation содержит:

- fullscreen toggle / `.is-fullscreen` / Escape behavior;
- ratio-based synchronized Split scroll textarea ↔ preview.

Dedicated regressions этих contracts в `markdown-editor.test.tsx` не обнаружены.

**Классификация:** current coverage gap.

### M-07 — code preference contract покрыт частично

Current tests проверяют local toggle wrap/line numbers и source preservation.

Не закрыты dedicated regressions на:

- account-scoped persistence;
- restore from storage;
- propagation между mounted blocks;
- `storage` event/cross-tab path.

**Классификация:** current partial coverage gap.

### M-08 — infrastructure workflow tests имеют semantic blind spots

Подтверждены как минимум:

- “workflow expressions executable” фактически не выполняет semantic GitHub-expression parse;
- guard-before-secrets test ограничен структурой известных jobs;
- diagnostic no-COMMIT check case-sensitive.

**Классификация:** current infra-test guarantee gaps, преимущественно P2/diagnostic quality.

### M-09 — CI evidence attribution: PR run тестирует merge ref, не standalone PR head

Обычный `pull_request` run с default checkout проверял synthetic:

`refs/pull/215/merge`.

Для #38725094807 это был merge result, собранный из PR head `fdf8160...` и then-current main,
а не standalone `fdf8160...`.

Поэтому project evidence формата “exact implementation head X passed CI” требует либо другой
checkout/отдельный head check, либо честной фиксации tested merge SHA + head SHA + base SHA.

**Классификация:** current evidence/traceability defect. Само тестирование merge result полезно.

### M-10 — отсутствие полного `push main` CI недоклассифицировано

GPT-6 наблюдает этот факт в A-02, но не выделяет его следствие.

Основной full CI запускается только на `pull_request`; после попадания commit в `main` тот же
полный `checks + database` workflow автоматически не повторяется.

**Классификация:** current CI governance/coverage gap; отдельная важность зависит от фактической
merge protection и принятого workflow проекта.

---

## 5. Что НЕ считать дефектом текущего Stage

Review не поддерживает превращение в current fixes следующих вещей без нового evidence:

- live R2 integration;
- production Google OAuth smoke;
- Cloudflare Queues/provider live calls;
- production role/binding rollout acceptance;
- future `pg@9` compatibility warning;
- mutation-score/coverage percentage сам по себе.

Это Stage 6/future tooling либо метрика без конкретного current failure.

---

## 6. Сводный вывод

Аудит GPT-6 **оставить как независимый источник**, а не заменять.

Он полезно добавляет к общему аудиту:

- A-03 spy cleanup;
- A-04 email-registration order dependency;
- ряд точечных G-01…G-10 assertion gaps.

Но перед использованием его выводов как технической основы необходимо учитывать:

1. A-05 содержит неверную/не доказанную причинную атрибуцию warning;
2. несколько наиболее системных current gaps в нём отсутствуют;
3. automated browser gap упомянут, но недоклассифицирован для Editor 2.0;
4. PR CI merge-ref semantics не учтены при evidence wording.

Итог двух независимых аудитов сильнее каждого по отдельности: они частично пересекаются и
частично находят разные реальные проблемы.

Этот review **не является планом исправления**. Технический план и очередность current-scope
исправлений должны определяться отдельно по действующему проектному процессу.
