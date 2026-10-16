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
- PR #227, #228 и последующие implementation PR — только соответствующие изменения и их проверки;
- PR #215 используется для Package 3 только потому, что RC-01…RC-03 относятся к уже существующему
  Editor 2.0 implementation;
- PR #147 не является каналом этого аудита.

## Независимый план Codex

Source: PR #226, comment #6204020042.

1. Package 1 — locale writer reliability.
2. Package 2 — test isolation / independence.
3. Package 3 — Editor current-contract regression coverage в PR #215.
4. Package 4 — RC-04…RC-09, отдельный bounded test-only пакет.
5. Package 5 — governance / evidence отдельно от code packages.
6. AC-01 — отдельный финальный real-runtime browser acceptance gate UI/UX pass.

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

### Package 3 — реализация тестового покрытия завершена, проверка не завершена

Target implementation PR: #215.

Starting head:
`e47436e7506c4c42f91a16aed2005bd07bb39ab5`.

Current Package 3 head:
`a4c16111492c348e7641db440521c7d2e9f5bb80`.

Delta Package 3 ограничен двумя test-файлами:

- `app/forum/markdown-editor.test.tsx`;
- `app/forum/markdown.test.tsx`.

Production code, schema/migrations, dependencies, workflows и public contracts не изменялись.

Добавлено regression coverage:

- RC-01 Fullscreen: enter/dialog+ARIA, Escape, edge Tab/Shift+Tab focus wrap;
- RC-02 Split synchronized scroll: обе стороны, ratio mapping, source/destination zero-scrollable
  extent и >1px write guard;
- RC-03 code preferences: restore, смена аккаунта без leakage, propagation между одновременно
  mounted blocks через same-document event и browser `storage` event path.

Sol выполнил source/diff review against исходный head; подтверждённого production defect при
добавлении покрытия не выявлено.

**Verification boundary:** для exact head `a4c1611…` GitHub Actions run не создан. Connector-created
branch commits, а также выполненные reversible PR/ref event attempts не породили новый `pull_request`
CI run. Предыдущий green CI на `e47436e…` не является evidence для новых tests. Поэтому Package 3
пока **не считается complete/PASS** до независимого выполнения focused tests и проверки результата.

Следующая проверка: независимая read-only проверка Codex exact Package 3 delta и focused test execution.

### Package 4 — не начат

RC-04…RC-09 остаются отдельным bounded test-only пакетом после Package 3.

### Package 5 — не начат

Governance/evidence work остаётся отдельным от code packages. В частности, включение
`Protect main` является owner/repository-setting action; full `push main` CI не добавляется
без отдельного policy/cost решения.

### AC-01 — остаётся открытым acceptance gate

Финальная real-runtime browser matrix остаётся обязательной до завершения UI/UX pass.
Она не заменяется jsdom-тестами и не считается частью завершённых Package 1/2.

## Следующая рабочая точка

Следующий пакет по согласованному плану — **Package 3 в PR #215**. Он начинается только
по явной команде разработчика.
