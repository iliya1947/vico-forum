# Vico Forum — аудит тестовой системы GPT-5.6 Sol (2026-10-15)

> **Архивный служебный отчёт. НЕ MERGE.**
>
> Этот файл фиксирует независимый аудит GPT-5.6 Sol, выполненный в отдельном чате по прямому запросу владельца проверить **все тесты проекта**. Он не заменяет аудит GPT-6 в этом PR, не является implementation-задачей и не даёт разрешения менять код, tests, workflows, repository settings или Stage 6 infrastructure.

## 1. Метод и проверенные срезы

Аудит был разбит на 10 последовательных частей:

1. карта всей тестовой системы;
2. обычные Vitest tests;
3. PostgreSQL tests;
4. Node/infra tests;
5. integration/E2E/smoke;
6. UI/browser fidelity;
7. архитектура и изоляция тестов;
8. сопоставление тестов с реальными требованиями проекта;
9. CI как управляющая система;
10. итоговая дедупликация findings и current-scope классификация.

Основной глубокий срез PR #215, на котором проверялись части 6–9:
`fdf81607536758f308305fceaa1c98ca8650ee3b`.

На этом срезе фактический CI #38725094807 дал:

- `database` — **success**;
- PostgreSQL — **297 passed**;
- `checks` — **failure**;
- application Vitest — **993 passed / 2 failed**, 94/95 files passed;
- оба падения были в новых tests авторских цитат.

За время аудита PR #215 продолжал меняться. Перед итогом был проверен более новый head
`4122e089bcb387ac4b3bcf976801e9e37ba32359`: три промежуточных commit после `fdf8160`
касались quote/translation correction и не меняли найденные системные test/CI findings.
Нельзя автоматически переносить конкретный runtime failure одного head на другой без свежего CI.

Аудит выполнялся чтением repository source, tests, GitHub Actions workflows/logs, current ruleset и project source-of-truth. Mutation testing и полный локальный browser E2E в рамках этого аудита не выполнялись.

---

## 2. Карта тестовой системы

На проверенном PR #215 существовало **139 test-файлов**:

- 95 обычных Vitest files;
- 27 PostgreSQL files;
- 17 Node `.github/scripts/*.test.mjs` files.

Все 139 имели CI-маршрут. Orphan test-файлов, которые существуют в repository, но никогда не запускаются штатным CI, не обнаружено.

`pnpm test` намеренно не включает PostgreSQL и `.github/scripts`; эти группы запускаются отдельными путями CI.

На срезе аудита:

- `vitest.config.ts` задавал глобальный `environment: "jsdom"`;
- database config использовал `node`;
- CI имел два независимых jobs: `checks` и `database`.

### Вывод

Проблема проекта **не** в том, что значительная часть test suite вообще забыта CI. Основные проблемы — fidelity, isolation, cross-layer gaps и governance самого CI.

---

## 3. Обычные Vitest tests

Проверены все 95 файлов обычного suite.

Подтверждено:

- массовых `.skip`, `.todo`, `.only` нет;
- snapshots не используются как замена semantic assertions;
- assertions присутствуют во всех test-файлах;
- массового self-mocking или fake-only покрытия не обнаружено;
- mocks в основном находятся на разумных external boundaries.

### V-01 — глобальный jsdom для server-oriented tests

`vitest.config.ts` запускает **весь обычный suite** в `jsdom`.

При консервативной классификации около 32 файлов имеют преимущественно server/domain характер и не требуют browser environment. Они получают browser globals, которых в реальной server/Workers execution среде нет.

**Классификация:** текущий test-fidelity defect.

Это не означает, что конкретный production bug уже найден. Риск состоит в false-green: server-oriented code может незаметно начать зависеть от DOM/browser globals и тест этого не выявит.

### V-02 — test harness warnings

Наблюдались warnings React/i18next/route test harness уровня:

- react-i18next;
- отсутствие `HydrateFallback`;
- route without Component.

**Классификация:** текущий низкоприоритетный test-harness noise. Сам по себе не подтверждает функциональный дефект.

---

## 4. PostgreSQL suite

Проверены 27 PostgreSQL test-файлов и полный migration chain на PostgreSQL 17.

На основном срезе:

- **297 tests passed**;
- `.skip/.todo/.only` не обнаружены;
- migrations `0000`–`0041` были представлены полным SQL chain;
- critical concurrency tests обычно используют отдельные PostgreSQL clients/pools;
- fake concurrency как системный паттерн не обнаружена;
- negative constraint ERROR output в CI является ожидаемым результатом соответствующих tests.

### DB-01 — подтверждённый flaky concurrency symptom

GitHub Actions run #38641237040 на SHA
`0774325cd2cc5080752d614654a57aab0369cff9`:

- attempt 1: `database` failed;
- attempt 2: тот же run / тот же SHA — `database` success;
- изменения кода между попытками отсутствовали.

Падал test:

`PostgreSQL 17 locale migrations > serializes concurrent desired-state writes and preserves a valid graph`

с PostgreSQL `40001`:

`could not serialize access due to read/write dependencies among transactions`.

Failure проходил через `ControlledLocaleWriter.applyOnce`; test использовал два concurrent clients и ограниченное число retry.

**Классификация:** подтверждённый текущий **test reliability symptom**.

Причина того, почему retry budget иногда исчерпывается, в этом аудите окончательно не доказана. Нельзя автоматически объявлять production concurrency implementation неправильной или считать увеличение retries достаточным исправлением.

### DB-02 — pg warnings

Наблюдались deprecation warnings о `client.query` while another query executes on the same client.

**Классификация:** не current defect; потенциальный future compatibility concern для будущего `pg@9`.

---

## 5. Node / infrastructure tests

Все 17 Node test-файлов присутствовали в `.github/workflows/ci.yml`; missing Node tests не обнаружено.

Основные infrastructure tests в целом содержательные, но несколько test names обещают более сильную гарантию, чем реально проверяют.

### INF-01 — “GitHub expressions executable”

Некоторые workflow tests проверяют отсутствие escaped `\${{ ... }}`, но не выполняют semantic parse GitHub expression syntax.

Пример malformed expression вроде:

`${{ github.ref && }}`

может пройти такую текстовую проверку.

**Классификация:** current false-guarantee gap infrastructure tests.

### INF-02 — “guard before secrets”

Проверка guard-before-secrets анализирует ограниченный диапазон между известными named jobs. Добавление нового job до guard, использующего secrets/env, не гарантированно будет поймано этим тестом.

**Классификация:** current infrastructure-test weakness.

### INF-03 — diagnostic no-COMMIT guard

Text guard использует case-sensitive проверку `/\bCOMMIT\b/`. Lowercase `commit` способен обойти именно этот assertion.

**Классификация:** low-severity current guarantee weakness.

### INF-04 — smoke GET wording

Один infrastructure assertion создаёт более сильное впечатление “GET-only smoke”, чем реально обеспечивает transitive smoke chain; actual local smoke намеренно содержит также POST `/IW/` → 404.

**Классификация:** test-description/guarantee mismatch, не application defect.

---

## 6. Integration / E2E / Workers smoke

Cloudflare Vite plugin + `vite preview` действительно запускает Workers/workerd runtime, поэтому smoke нельзя считать просто Node mock.

При этом обнаружены существенные разрывы между слоями.

### INT-01 — `stage4-core-e2e.test.ts` не является full HTTP E2E

Этот test использует реальный PostgreSQL/repository/service/action stack, но вручную создаёт Router context и инжектит auth/session/permissions, затем вызывает actions напрямую.

Он обходит:

- настоящий Worker HTTP boundary;
- cookie lifecycle Better Auth;
- реальный sign-in request;
- последующий authenticated request через cookie;
- полный route/session reconstruction.

**Классификация:** current test-fidelity/semantics problem. Test полезен как integration test, но название/роль “E2E” сильнее фактического покрытия.

### INT-02 — email registration integration не закрывает Worker/auth cookie chain

`forum-email-registration.test.ts` использует Better Auth + PostgreSQL, но вызывает runtime handler непосредственно и не доказывает полный browser/Worker/cookie/protected-forum flow.

**Классификация:** current cross-layer coverage gap.

### INT-03 — split Hyperdrive smoke использует одинаковый superuser URL

В database CI:

- `HYPERDRIVE`;
- `WEB_HYPERDRIVE`

оба local override указывают на один PostgreSQL superuser connection.

Поэтому smoke проверяет split wiring names, но **не может поймать ошибку реальных runtime-role privileges**.

**Классификация:** current false-green gap CI integration.

### INT-04 — smoke почти read-only

Workers smoke проверяет locale pages/redirects/404 и ограниченные HTTP probes, но нет связной user mutation chain:

`sign-in → session cookie → authenticated topic/reply → protected write → read result`.

**Классификация:** current cross-layer coverage gap.

### INT-05 — live R2 integration

Полный Worker → R2 → DB attachment flow отсутствует.

**Классификация:** **future**, не current defect, потому что Stage 6 infrastructure/external rollout поставлен на паузу.

---

## 7. UI / browser fidelity

Проверено 19 UI `.test.tsx` files и current editor/browser-sensitive implementation.

Editor 2.0 использует:

- `localStorage`;
- focus / `setSelectionRange`;
- `navigator.clipboard`;
- `contentEditable`;
- `document.createRange`;
- `window.getSelection`;
- `Range`;
- paste/drop;
- File/DataTransfer;
- XHR progress;
- `window.confirm`;
- layout/scroll geometry.

### UI-01 — отсутствует automated real-browser layer

В repository не обнаружено:

- Playwright;
- WebDriver;
- Cypress;
- Vitest Browser Mode;
- отдельного CI browser job.

GitHub Pages preview строится/deployится, но сам по себе не выполняет assertions в настоящем браузере.

`PROJECT_STATE.md` для Editor 2.0 прямо оставляет browser/mobile/RTL/owner acceptance незавершёнными.

**Классификация:** current acceptance gap.

### UI-02 — responsive/mobile CSS практически не тестируется

`styles.css` содержит много `@media` branches; jsdom не выполняет layout как браузер.

**Классификация:** current UI-fidelity gap.

### UI-03 — RTL проверяется семантически, но не визуально

Tests проверяют `dir`, DOM/attributes и source preservation, но не реальную bidi geometry/caret/overflow mixed-language UI.

**Классификация:** current browser acceptance gap.

### UI-04 — browser spellcheck

Tests могут проверить `spellcheck` attributes/defaults/preferences, но не работу словаря самого браузера.

**Классификация:** ожидаемое ограничение unit tests; реальная browser acceptance остаётся отдельной проверкой.

---

## 8. Test architecture и isolation

### ARCH-01 — реальный DOM cleanup defect в двух React files

Vitest настроен с `globals: false`; общего `setupFiles` с automatic RTL cleanup нет.

Два файла не имеют собственного `afterEach(cleanup)`:

- `app/forum/profile-view.test.tsx`;
- `app/ui-preview/preview-app.test.tsx`.

В `profile-view.test.tsx` часть tests выполняет render без последующего unmount.
В `preview-app.test.tsx` предыдущий rendered DOM также может остаться перед следующим test.

**Классификация:** подтверждённый current order/shared-DOM test defect, даже если fixed-order suite сейчас проходит.

### ARCH-02 — state/timers в остальных проверенных UI tests

Проверенные editor/draft tests в основном корректно очищают:

- localStorage;
- stubs;
- timers;
- React DOM.

Системного browser-state leakage за пределами ARCH-01 не обнаружено.

### ARCH-03 — arbitrary sleeps

Важные concurrency tests в основном используют реальные state/lock conditions либо watchdog timeout. Массового fragile “sleep N ms and hope” паттерна не обнаружено.

### ARCH-04 — монолитный Stage 4 integration test

`tests/database/stage4-core-e2e.test.ts` — примерно 436 lines, один `it()` и около 40 assertions.

Раннее падение не даёт выполнить последующие проверки, ухудшая fault localization.

**Классификация:** lower-severity current diagnostic-quality issue. Разделять его автоматически нельзя: project rule запрещает дробить операции, которые должны проверяться как единое целое.

---

## 9. Сопоставление с реальными требованиями

Большинство критичных server/data contracts защищено хотя бы на одном подходящем уровне:

- auth/authz;
- origin boundary;
- rate limiting;
- drafts/CAS;
- 30-day draft expiry;
- attachments;
- publication;
- edit/history;
- mentions;
- durable mention notifications;
- direction;
- spellcheck;
- Help moderation states;
- translation generation boundaries.

Quote/attribution/collapse **не относится к непокрытым требованиям**: новые quote tests как раз обнаружили реальную regression на `fdf8160`.

Подтверждены локальные пробелы Editor 2.0:

### REQ-01 — Fullscreen

Код имеет:

- `.is-fullscreen`;
- `aria-pressed`;
- toggle;
- Escape-to-close.

В `markdown-editor.test.tsx` dedicated regression на fullscreen не обнаружен.

**Классификация:** current missing regression.

### REQ-02 — Split synchronized scroll

`markdown-editor.tsx` содержит ratio-based `syncSplitScroll()` и handlers textarea ↔ preview.

Tests не проверяют `scrollTop / scrollHeight / clientHeight` contract.

**Классификация:** current missing regression.

### REQ-03 — code wrap / line-number preferences

Tests проверяют текущий block toggle, gutter и copied source, но не подтверждают весь заявленный contract:

- account-scoped persistence;
- restoration;
- propagation между одновременно смонтированными code blocks;
- `storage` event / cross-tab behavior.

**Классификация:** current partial coverage gap.

### REQ-04 — assembled user system

Низкие и средние слои проекта покрыты заметно лучше, чем собранная user journey.

**Классификация:** current systemic coverage imbalance, а не доказательство конкретной production regression.

---

## 10. CI audit

### CI-01 — ruleset `Protect main` disabled

Repository ruleset `Protect main` содержит:

- required `checks`;
- required `database`;
- strict required-status-check policy;
- squash-only PR rule.

Но API возвращал:

`enforcement: disabled`.

Classic branch-protection endpoint для connector вернул `403`, поэтому наличие иной независимой classic protection не удалось подтвердить или исключить.

**Классификация:** high-priority repository governance gap. Не утверждать шире проверенного факта, что вообще никакой другой protection не существует.

### CI-02 — CI запускается только на `pull_request`

`.github/workflows/ci.yml` не имеет `push: main`.

После попадания commit в `main` полный `checks + database` suite автоматически повторно не запускается этим workflow.

**Классификация:** current CI coverage/governance gap.

### CI-03 — “exact head CI” не соответствует фактическому checkout

Для обычного `pull_request` run `actions/checkout` checkout'ил:

`refs/remotes/pull/215/merge`.

Например run #38725094807 фактически проверял synthetic merge:

`60ca1806a788207473bc2d1fc8020f4ce2df2793`

= PR head `fdf8160...` merged with then-current `main@99e69c0...`.

Следовательно формулировка в project journal вида:

“exact head `fdf8160` passed CI”

не является строгой фактической формулировкой для такого workflow. Проверен merge result, а не standalone head SHA.

Само тестирование merge result разумно и полезно. Проблема — **evidence attribution**.

**Классификация:** current CI evidence/traceability defect.

### CI-04 — fail-fast внутри `checks` скрывает последующие failures

В run #38725094807 после failure шага `Test` были skipped:

- Build;
- Build UI preview;
- Validate migration metadata;
- Verify Drizzle schema parity.

CI остаётся красным, поэтому false green здесь нет. Но первый defect скрывает потенциальные следующие failures и ухудшает диагностику одного head.

**Классификация:** current diagnostic limitation, не correctness bypass.

### CI-05 — independent jobs

`checks` и `database` запускаются независимо. Failure `checks` не отменил database suite.

**Положительный результат:** основной cross-job failure propagation работает.

### CI-06 — swallowed failures

В основном PR CI не обнаружено:

- `continue-on-error`;
- `set +e`;
- path filters, которые пропускают часть PR;
- условного bypass application/database suites.

`|| true` в CI использовался только для cleanup kill preview process внутри trap и не скрывает smoke failure.

---

## 11. Дедуплицированный список current findings

Ниже — именно независимый итог GPT-5.6 Sol после удаления повторов между частями.

### High priority

1. **Real browser layer отсутствует для Editor 2.0**, хотя current acceptance требует browser/mobile/RTL.
2. **Нет полного HTTP/auth/session/write E2E**, связывающего Worker, Better Auth cookie lifecycle, PostgreSQL и protected forum mutation.
3. **Split Hyperdrive smoke использует одинаковый PostgreSQL superuser**, поэтому не тестирует реальную least-privilege роль.
4. **Подтверждён intermittent PostgreSQL `40001` test failure** на неизменённом SHA.
5. **Глобальный jsdom применяется к server-oriented tests**, что снижает fidelity.
6. **Repository ruleset с required checks отключён**; наличие иной classic protection connector не смог проверить.

### Medium priority

7. Нет полного CI на `push main`.
8. “Exact-head CI” evidence фактически относится к synthetic PR merge SHA.
9. Два React test-файла не очищают DOM между cases.
10. Infrastructure tests местами обещают более сильную semantic guarantee, чем реально проверяют.
11. Fullscreen и Split-scroll не имеют dedicated regressions; code preference propagation покрыт частично.

### Lower priority

12. `stage4-core-e2e` монолитен и плохо локализует ранние failures.
13. Failure раннего step внутри `checks` скрывает результаты Build/UI-preview/db-check/schema-parity для того же run.
14. Test harness warnings создают диагностический шум.
15. Diagnostic no-COMMIT guard case-sensitive.

---

## 12. Что аудит НЕ считает current defect

Не использовать следующие пункты как основание для текущего исправления без нового Stage/фактического симптома:

- отсутствие live R2 integration при остановленном Stage 6;
- real Google OAuth/provider/Queue/deployed production smoke — это Stage 6 gates;
- будущая несовместимость concurrent `client.query()` с `pg@9`;
- complex multi-device editor conflict resolution, если он явно не входит в текущий product contract;
- любой hypothetical defect, не подтверждённый текущим Stage.

---

## 13. Общий вывод

Тестовая система Vico Forum **не является фиктивной или бесполезной**.

Сильные стороны:

- все test-файлы маршрутизированы в CI;
- database suite использует настоящий PostgreSQL 17;
- security/data/authz/draft/editor domain boundaries покрыты подробно;
- concurrency часто моделируется реальными отдельными connections;
- CI действительно ловит application regressions — quote tests на `fdf8160` это продемонстрировали;
- mass skip/self-mocking/empty assertions не обнаружены.

Главный перекос другой:

> **низкие и средние слои покрыты существенно плотнее, чем реальный browser + HTTP + auth + Worker + DB пользовательский путь.**

Поэтому высокий общий счётчик tests и green CI сами по себе не должны использоваться как доказательство полной корректности Editor 2.0 или assembled forum flow.

Минимальный технический приоритет при будущем исправлении должен определяться Codex по действующему процессу проекта. Этот архив **не назначает реализацию** и не разрешает изменения.

---

## 14. Границы архива

Этот документ фиксирует аудит и evidence, а не новую разработку.

В рамках его создания:

- application code не меняется;
- test code не меняется;
- workflows/config не меняются;
- migrations/schema не меняются;
- repository protection settings не меняются;
- PR #147 не используется как канал этой записи;
- Codex review не запускается;
- Stage 6 не возобновляется.

PR #226 остаётся архивным **DO NOT MERGE** хранилищем независимых результатов аудита.
