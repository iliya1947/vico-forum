# Статус исправлений по аудиту тестовой системы — 2026-10-16

> **Служебный PR #226. НЕ MERGE.**
>
> Этот файл хранит актуальный статус выполнения технического плана, полученного после
> независимой проверки Codex в PR #226. Исходные аудиты, взаимные review и финальная
> согласованная карта остаются отдельными неизменяемыми evidence-документами.

## Граница канала

Вся координация именно **аудита тестовой системы** и пакетов исправлений по его findings
ведётся в PR #226.

- PR #226 — служебный архив/координация аудита тестов;
- PR #227, #228, #229, #231 и последующие audit implementation PR — только соответствующие изменения и их проверки;
- PR #215 и PR #147 не используются как рабочие PR этого аудита и не изменяются им без отдельной прямой команды владельца;
- если audit finding относится к функциональности незамерженного implementation PR, исправление/тесты всё равно выносятся
  в отдельный audit implementation PR; зависимость оформляется через stacked base, а не через commits в чужой PR.

## Независимый план Codex

Source: PR #226, comment #6204020042.

Исходная нумерация Package сохраняется для traceability. Владелец изменил фактический порядок выполнения:

1. Package 1 — locale writer reliability — завершён.
2. Package 2 — test isolation / independence — завершён.
3. Package 4 — RC-04…RC-09, bounded test-only package — завершён.
4. Package 5 — governance / evidence — завершён без изменений product code/CI/repository settings.
5. Package 3 — Editor current-contract regression coverage — завершён и merged.
6. AC-01 — финальный real-runtime browser acceptance gate UI/UX pass после стабилизации product head. Он не запускается, пока остаются подтверждённые current-Stage corrections вне audit queue.

## Текущий статус

### Package 1 — завершён и merged

Implementation PR #227: `Fix locale writer concurrency reliability`.

- final head: `b9c5d535a8908a19a6e04e28aa2eea8d00922182`;
- merged: 2026-10-16;
- merge commit: `0fc92f97abd9962828b86b547795159f1bd6450c`;
- исправлен TQ-04: graph-wide controlled locale writes сериализуются transaction-scoped
  `LOCK TABLE locales IN SHARE ROW EXCLUSIVE MODE` до registry read;
- deterministic two-client PostgreSQL 17 regression заменил probabilistic concurrency coverage;
- Codex не обнаружил implementation/test defects; подтверждённая docs/source-of-truth correction
  была выполнена до merge.

### Package 2 — завершён и merged

Implementation PR #228: `Fix test isolation and independence`.

- final head: `8ebaac1d057284641814ee580e5df9badb674c49`;
- merged: 2026-10-16;
- merge commit: `73a542df5db69e781f3b5f85c57f9cf071962e31`;
- закрыты TQ-01…TQ-03:
  - explicit React cleanup в двух test files;
  - restore mocks после `getSelection` spy;
  - email sign-in case получил собственный независимый account fixture;
- Codex independent review не оставил confirmed current-scope findings.

### Package 3 — завершён и merged

Implementation PR #229: `Test audit Package 3 — Editor regression coverage`.

- final head: `0b5959657d2410ba34594ca61a79842dbf903e36`;
- merged: 2026-10-18;
- merge commit: `ac4cab4b29a2a4510df3be903389551c0b9acc1f`;
- diff ограничен двумя test-файлами:
  - `app/forum/markdown-editor.test.tsx`;
  - `app/forum/markdown.test.tsx`;
- RC-01: Fullscreen regression coverage;
- RC-02: Split synchronized-scroll regression coverage;
- RC-03: account-scoped code-preference regression coverage;
- production code, schema/migrations, dependencies, workflows и public contracts не менялись;
- GitHub Actions CI #39125576520 для final exact head завершён успешно: `checks` и `database` — success;
- ChatGPT-5.6 Sol, ChatGPT-6 и Codex-5.6 Sol проверили final exact head без confirmed current-scope findings;
- по прямому решению владельца эта test-audit work выполняется без Codex-6.1 Sol.

Package 3 больше не является открытым gate audit correction queue.

### Package 4 — завершён и merged

Implementation PR #231: `Add Package 4 regression coverage`.

- final head: `5a09c9314fb0273698cf95e7a91e7ed954ea927d`;
- merged: 2026-10-17;
- merge commit: `acd1089d224f7dfc069c6b92197e4b1e0817efe4`;
- закрыты RC-04…RC-09:
  - cardinality/identity integrity в `buildContentGenerationView()`;
  - exact-current persisted translation для всех шести task states;
  - явная session revalidation после heartbeat 401;
  - единый PostgreSQL competing result set для глобального `DrizzleForumRepository.search()`
    с порядком `matchRank → activityAt → topicId`;
  - сохранение exact draft в profile invalid-400 branch;
  - notifications action negatives для guest, cross-origin, missing и nonexistent ID;
- scope ограничен пятью test files; production code, schema/migrations, dependencies,
  workflows и public contracts не менялись;
- GitHub Actions PR run #38956621032 связан с implementation head `5a09c931…`;
  обычный `pull_request` checkout проверял synthetic merge ref. Jobs `checks` и `database` — success;
- ChatGPT-5.6 Sol, ChatGPT-6 и Codex-5.6 Sol не оставили confirmed findings на финальном implementation head;
- по прямому решению владельца эта audit work выполняется без Codex-6.1 Sol; дополнительная
  проверка Codex-6.1 Sol для Package 4 не требовалась.

### Package 5 — завершён без implementation changes

Governance/evidence findings перепроверены отдельно от code packages.

- **CI-01 / Protect main:** repository ruleset `Protect main` существует и остаётся
  `enforcement: disabled`. Он содержит strict required `checks` + `database`, squash-only,
  deletion/non-fast-forward protection и no bypass actors. Последние audit implementation PR
  #227, #228 и #231 стабильно публиковали и успешно завершали `checks` и `database`.
  Владелец прямо решил не включать ruleset и не усложнять текущий pre-release workflow.
  Для текущей audit correction queue это **owner-accepted no-fix**, а не обязательное изменение.
- **CI-02 / push main CI:** основной `.github/workflows/ci.yml` остаётся
  `pull_request`-only. Независимая проверка Codex классифицировала дополнительный full
  `push main` run как defense-in-depth/policy choice, а не установленный обязательный defect.
  Владелец не запрашивал эту дополнительную сложность; workflow не меняется.
- **CI-03 / evidence precision:** для обычного PR run корректная формулировка —
  workflow run связан/triggered с конкретным implementation head SHA, а default
  `pull_request` checkout проверяет synthetic merge ref. Такой run нельзя называть
  самостоятельной проверкой standalone exact head без отдельного evidence. Это правило применяется
  к текущим и будущим active-state записям; исторические audit/review документы и комментарии
  массово не переписываются.
- **LW-01…LW-04:** подтверждённые low-priority test-strength observations не показали current
  failure и не входят в correction queue. Отдельного исправления сейчас нет; LW-03 допустим
  opportunistically при следующем изменении соответствующего guard.

Package 5 не требует implementation PR, изменений product code, CI workflow или repository settings.

### AC-01 — подготовлен как финальный real-runtime acceptance gate

AC-01 не является implementation package и сейчас **не выполняется**. Он запускается только после
стабилизации product head.

#### Preconditions

Перед стартом AC-01 должны одновременно выполняться:

- Editor 2.0 PR #215 merged в `main`;
- Package 3 / PR #229 актуализирован против смерженного Editor, повторно проверен и merged;
- отсутствуют открытые подтверждённые current-Stage corrections, способные изменить candidate revision. На 2026-10-18 этот precondition **ещё не выполнен**: draft PR #232 содержит bounded correction package для четырёх подтверждённых current-Stage дефектов Editor 2.0; его real-browser readiness gate уже пройден, но formal review-cycle и owner merge ещё не завершены;
- выбран один стабильный final candidate revision `main`, который больше не меняется во время
  acceptance;
- применимые repository checks для входящих implementation PR завершены успешно;
- доступен actual Worker/runtime именно для выбранной candidate revision. GitHub Pages может
  использоваться только для дополнительного visual progress viewing и не засчитывается как
  functional/final acceptance;
- любое внешнее deployment/runtime действие, требующее production/pre-release ресурсов,
  выполняется только после отдельного явного разрешения владельца.

#### Обязательная browser matrix

На actual Worker/runtime проверить минимум:

- viewports: Desktop, narrow mobile и intermediate/tablet;
- direction: полный LTR, полный RTL и mixed-direction topic content;
- identity: Guest, authenticated regular User и authorization Manager;
- discovery: populated Home/Category/Section, empty Category и empty Section;
- topics: unsolved/solved, selected best answer, multiple messages, Markdown/code, long title/body;
- participation: create-topic/reply, validation, pending, success, forbidden и rate-limited
  feedback там, где состояние воспроизводимо;
- translation: original, translated, provenance, original disclosure, generation status и explicit
  long-message control;
- administration: roles, grants, user assignment, overrides, success/error feedback и narrow-screen
  behavior;
- system states: route 404, controlled unavailable/error, auth failure и safe recovery;
- interaction: keyboard traversal, focus visibility, target sizing, overflow, zoom/reflow и
  reduced motion.

Конкретный Playwright/Cypress/WebDriver/Vitest Browser Mode не требуется: contract требует
реальную browser acceptance, а не отдельный automation framework.

#### Evidence для каждого acceptance run

Зафиксировать:

- exact candidate revision;
- actual runtime/environment;
- browser и viewport;
- locale/direction;
- identity/data fixture;
- проверенные routes/states;
- screenshots для проверяемых visual states;
- найденные defects;
- результат повторной проверки после каждого confirmed fix.

Green CI без этой browser evidence AC-01 не закрывает.

#### Критерий закрытия

AC-01 закрывается только когда полная матрица пройдена на стабильной candidate revision,
не осталось подтверждённых current-scope defects из этой acceptance, а фактически полученный
результат отражён в `PROJECT_STATE.md`. Если acceptance выявляет defect, исправление выполняется
отдельно; после изменения implementation повторно проверяются затронутые части матрицы и, если
изменение способно повлиять шире, вся применимая матрица.

Текущая последовательность после закрытия audit queue:
**завершить confirmed current-Stage corrections PR #232 → зафиксировать stable final candidate → обеспечить actual Worker/runtime для этой revision → AC-01**.

Production Worker из текущего `PROJECT_STATE.md` не является evidence для current `main`: он остаётся на старом baseline deployment. Любое внешнее deployment/runtime действие выполняется только после отдельного явного разрешения владельца.

## Следующая рабочая точка

Test-audit correction queue завершена: Package 3 / PR #229 merged в `main` как `ac4cab4b…`.

AC-01 **не запускается** на текущем `main`, потому что final candidate ещё не стабилен.
Внешний блокер — draft PR #232 `Editor 2.0 follow-up: remaining current-stage corrections`.
Его current exact head: `ee267d908c089e8781368a3b6a563f0f1c54eff6`.
Bounded correction package для четырёх подтверждённых current-Stage дефектов реализован; code/test
head `36e13068…` прошёл CI #39135879866, а текущий docs-only successor после повторного run
прошёл CI #39136086360 (`checks` + `database` SUCCESS).

Bounded real-browser readiness gate PR #232 на exact head `ee267d908c089e8781368a3b6a563f0f1c54eff6` **завершён** Codex-5.6 Sol без confirmed findings.

Проверено в Chromium 154 на локальном Cloudflare Workers runtime с disposable PostgreSQL 17 и реальным Better Auth user:

1. Simple table native paste меняет только выбранную ячейку/source и не перехватывается body paste path.
2. Native cross-leaf и cross-block selection + Enter заменяет точный выбранный source range.
3. Две unsaved/version-0 вкладки авторитативно завершают оба варианта выбора через реальный route/storage.
4. Новая local generation поверх terminal deleted head авторитативно устанавливается как active next version.

Implementation #232 во время browser gate не менялась; exact head остаётся `ee267d90…`.

ChatGPT-5.6 Sol завершила первый prescribed independent whole-PR review PR #232 на exact head `ee267d908c089e8781368a3b6a563f0f1c54eff6`. Implementation во время проверки не менялась; detailed review result остаётся у разработчика до завершения prescribed independent checks по правилам `AGENTS.md`.

Следующий gate: ChatGPT-6 независимо проверяет весь scope PR #232 на том же exact head против исходной задачи, текущего Stage и source-of-truth документации, не используя выводы предыдущего reviewer как evidence. Во время review implementation не менять. После завершения — STOP; следующий handoff определяет ChatGPT-5.6 Sol.

После закрытия #232 нужно повторно определить stable candidate revision и только затем перейти
к actual Worker/runtime acceptance. External deployment/runtime mutation без отдельного явного
разрешения владельца не выполнять.
