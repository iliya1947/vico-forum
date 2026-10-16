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
- PR #227, #228, #229 и последующие audit implementation PR — только соответствующие изменения и их проверки;
- PR #215 и PR #147 не используются как рабочие PR этого аудита и не изменяются им без отдельной прямой команды владельца;
- если audit finding относится к функциональности незамерженного implementation PR, исправление/тесты всё равно выносятся
  в отдельный audit implementation PR; зависимость оформляется через stacked base, а не через commits в чужой PR.

## Независимый план Codex

Source: PR #226, comment #6204020042.

Исходная нумерация пакетов сохраняется для traceability, но владелец изменил порядок выполнения:

1. Package 1 — locale writer reliability — завершён.
2. Package 2 — test isolation / independence — завершён.
3. Package 4 — RC-04…RC-09, отдельный bounded test-only пакет — следующий.
4. Package 5 — governance / evidence отдельно от code packages.
5. Package 3 — Editor current-contract regression coverage — перенесён владельцем в самый конец очереди correction packages. Audit implementation находится только в отдельном PR #229; PR #215 не используется.
6. AC-01 — отдельный финальный real-runtime browser acceptance gate UI/UX pass после correction packages.

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

### Package 3 — перенесён в отдельный audit implementation PR #229 и отложен в конец очереди

Audit implementation PR: #229 — `Test audit Package 3 — Editor regression coverage`.

- head: `a4c16111492c348e7641db440521c7d2e9f5bb80`;
- base: `chatgpt/editor-v2-implementation-20261010` at `e47436e7506c4c42f91a16aed2005bd07bb39ab5`;
- PR #229 — draft stacked PR, потому что RC-01…RC-03 существуют только в незамерженном Editor 2.0 и ещё отсутствуют на `main`;
- после merge Editor 2.0 PR #229 должен быть retarget/rebase на `main` и повторно проверен до merge;
- PR #215 восстановлен на исходный head `e47436e7506c4c42f91a16aed2005bd07bb39ab5`; audit Package 3 больше не находится в его ветке;
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

GitHub Actions CI #38918024909 завершён успешно для PR #229 exact head `a4c1611…`:
`database` — success; `checks` — success; application suite — 96 files / 1031 tests passed,
lint/typecheck/build/UI preview/metadata/schema-parity checks — success.

Package 3 перенесён корректно и автоматическая проверка нового PR зелёная. По прямому решению владельца
дальнейшая работа над ним остановлена до завершения Package 4 и Package 5. Независимый Codex review
для PR #229 не запускался; случайный review служебного PR #226 не является review Package 3.

Важно: название `Package 3` здесь означает только **test-audit Package 3 / RC-01…RC-03**.
Оно не относится к возможным одноимённым пакетам или подзадачам внутри Editor 2.0.

### Package 4 — не начат

RC-04…RC-09 составляют следующий bounded test-only пакет. По решению владельца он выполняется до отложенного Package 3.

### Package 5 — не начат

Governance/evidence work остаётся отдельным от code packages. В частности, включение
`Protect main` является owner/repository-setting action; full `push main` CI не добавляется
без отдельного policy/cost решения.

### AC-01 — остаётся открытым acceptance gate

Финальная real-runtime browser matrix остаётся обязательной до завершения UI/UX pass.
Она не заменяется jsdom-тестами и не считается частью завершённых Package 1/2.

## Следующая рабочая точка

Следующий пакет — **Package 4 / RC-04…RC-09**. Package 3 / PR #229 остаётся припаркованным до самого конца очереди correction packages.
