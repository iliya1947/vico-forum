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
5. AC-01 — real-runtime browser acceptance gate UI/UX pass — следующая рабочая точка.
6. Package 3 — Editor current-contract regression coverage — по прямому решению владельца перенесён в самый конец всей очереди аудита. Audit implementation находится только в отдельном PR #229; PR #215 не используется.

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

### Package 3 — реализован в отдельном audit implementation PR #229 и оставлен на самый конец

Audit implementation PR: #229 — `Test audit Package 3 — Editor regression coverage`.

- head: `a4c16111492c348e7641db440521c7d2e9f5bb80`;
- base: `chatgpt/editor-v2-implementation-20261010` at `e47436e7506c4c42f91a16aed2005bd07bb39ab5`;
- PR #229 — draft stacked PR, потому что RC-01…RC-03 существуют только в незамерженном Editor 2.0 и ещё отсутствуют на `main`;
- после merge Editor 2.0 PR #229 должен быть retarget/rebase на `main` и повторно проверен до merge;
- PR #215 восстановлен на исходный head `e47436e…`; audit Package 3 больше не находится в его ветке;
- перенос включает только пять audit commits, которые линейно шли поверх `e47436e…` и меняли только два test-файла:
  - `app/forum/markdown-editor.test.tsx`;
  - `app/forum/markdown.test.tsx`.

Добавлено regression coverage:

- RC-01 Fullscreen: enter/dialog+ARIA, Escape, edge Tab/Shift+Tab focus wrap;
- RC-02 Split synchronized scroll: обе стороны, ratio mapping, source/destination zero-scrollable
  extent и >1px write guard;
- RC-03 code preferences: restore, смена аккаунта без leakage, propagation между одновременно
  mounted blocks через same-document event и browser `storage` event path.

Production code, schema/migrations, dependencies, workflows и public contracts не изменялись.

GitHub Actions PR run #38918024909 связан с implementation head `a4c1611…`;
обычный `pull_request` checkout проверял synthetic merge ref, а не standalone head.
`database` и `checks` завершились успешно; application suite — 96 files / 1031 tests passed,
lint/typecheck/build/UI preview/metadata/schema-parity checks — success.

По прямому решению владельца дальнейшая работа над Package 3 остановлена до завершения **всей**
остальной очереди аудита, включая AC-01. Независимый Codex review для PR #229 не запускался;
случайный review служебного PR #226 не является review Package 3.

Важно: название `Package 3` здесь означает только **test-audit Package 3 / RC-01…RC-03**.
Оно не относится к возможным одноимённым пакетам или подзадачам внутри Editor 2.0.

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

### AC-01 — следующая рабочая точка

Финальная real-runtime browser acceptance matrix остаётся обязательным gate UI/UX pass:

- actual Worker/runtime для functional/final acceptance;
- Desktop + narrow mobile + intermediate/tablet;
- LTR + RTL + mixed-direction content;
- Guest + authenticated User + authorization Manager;
- discovery/topic/participation/translation/admin/system states;
- keyboard/focus/target sizing/overflow/zoom/reflow/reduced motion.

GitHub Pages остаётся progress preview и не заменяет real-runtime acceptance.
Конкретный browser automation framework не требуется.

После AC-01 Package 3 / PR #229 остаётся **последней** задачей test-audit очереди по прямому
решению владельца.

## Следующая рабочая точка

**AC-01 — final real-runtime browser acceptance matrix UI/UX pass.**
Package 3 / PR #229 не трогать до завершения AC-01.
