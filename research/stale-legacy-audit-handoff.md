# Systematic stale/legacy audit — method, handoff and transfer context

## Goal

Провести отдельный системный аудит текущего Vico Forum на устаревшие хвосты после уже реализованных функций.

Первый этап — **только аудит**. Никаких исправлений, implementation PR или cleanup до единого реестра и отдельного решения Ильи.

## Why this task exists

Обнаружен конкретный пример:

- реальные Settings уже существуют на `/:locale/settings`, `/settings/forum`, `/settings/user`, `/settings/account`, `/settings/privacy`, `/settings/administrator`;
- одновременно остался `/:locale/under-development?feature=admin-settings`;
- `app/routes/admin-forum-legacy.test.ts` требует сохранять старую Settings-заглушку.

Это вызвало подозрение, что после последовательной реализации функций в репозитории остались и другие старые routes/tests/fixtures/preview/localization/docs/helper/scaffold состояния.

## Critical correction to previous audit method

Предыдущая Мира начала неправильно: искала по словам `legacy`, `placeholder`, `future`, `under-development`, TODO/FIXME и по типам файлов.

Такой подход **не является системным аудитом**: он находит только заранее узнаваемые формы мусора и легко пропускает противоречия без этих маркеров.

Мира-2 должна начать заново **от текущего продукта**, а не от grep.

## Required method

1. Получить актуальный GitHub `main` и полностью прочитать актуальный `AGENTS.md`.
2. Построить **каноническую карту реально реализованных capabilities текущего main**:
   - пользовательские;
   - административные;
   - Owner/Super-admin;
   - discovery/navigation;
   - auth/settings;
   - moderation;
   - editor/content;
   - notifications/personal state;
   - прочие существующие product surfaces.
3. Для каждой capability найти **все её проекции**:
   - canonical routes / redirects;
   - navigation / links;
   - feature/status registries;
   - tests;
   - browser acceptance;
   - UI progress preview / fixtures;
   - localization catalog/manual values/fingerprints;
   - активные docs/status docs;
   - compatibility aliases;
   - helper/API seams;
   - scaffold branches.
4. Искать не слова, а **противоречия состояния**, например:
   - capability реализована, но где-то всё ещё unfinished;
   - canonical route есть, а старый entry point показывает placeholder;
   - тест фиксирует исчезнувшее состояние;
   - preview показывает старую версию продукта;
   - localization metadata описывает implemented capability как future/unfinished;
   - active docs утверждают, что функция отсутствует;
   - compatibility path больше не ведёт к текущему canonical contract;
   - ветка кода существует только для состояния, которое уже невозможно;
   - fixture/helper/API seam живёт только ради исчезнувшей модели.
5. Каждый кандидат проверять по всей связанной цепочке и классифицировать:
   - **A — confirmed stale tail**;
   - **B — intentional compatibility boundary**;
   - **C — genuinely unfinished current-stage item**;
   - **D — historical text only**;
   - **E — not established**.
6. Первый finding аудит не завершает.
7. Ничего не исправлять в процессе аудита.
8. Итог первого этапа — **один системный реестр**, не серия grep-находок.

## Registry result format

Для каждого подтверждённого элемента:

- capability;
- stale artifact;
- фактический текущий contract;
- в чём противоречие;
- реальный эффект;
- классификация;
- дальнейший тип действия: удалить / redirect / обновить / оставить.

Отдельно перечислить:
- намеренные compatibility boundaries;
- действительно unfinished функции;
- исторические тексты, которые не являются текущим статусом.

## Previous candidates — orientation only, not findings

Ниже только кандидаты, которые предыдущая Мира успела заметить. **Независимо перепроверить; не принимать как истину.**

- `admin-settings` в unfinished registry и legacy Settings test;
- preview `under-development-search`;
- preview `Complaints placeholder`;
- preview `Security placeholder`;
- старые `underDevelopmentFeature*` localization entries для уже реализованных функций;
- `onlinePresencePending`;
- `viewDevelopmentStatus`;
- обычный Admin `pending` scaffold;
- устаревшие catalog descriptions о future registration/complaints/security;
- возможные stale-status claims в `docs/UI_UX_PASS.md`.

Предыдущая проверка также встречала `admin-forum`, `admin-users` и `/admin/users/:userId` compatibility paths. Не считать их мусором автоматически — самостоятельно установить текущий contract.

## Boundaries

- Изначально работа была отдельным audit side-task внутри #342.
- 2026-11-25 владелец прямо распорядился перенести **весь аудит** в отдельный service PR; прежний запрет создавать отдельный service PR этим решением superseded.
- #342 завершён и больше не является рабочим каналом этого аудита.
- #384 full-forum audit — отдельная задача и сюда не переносится.
- First-stage audit завершён на baseline `9cff976a9621d9fe5dfef28ea5367e390ff435b1`; последующий cleanup разрешён владельцем отдельной командой.


## Fresh review — 2026-11-23

Review выполнен на том же `main` exact `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

1. Из corrected registry на 84 кандидата подтверждены **80 A-элементов**.
2. С A сняты прежний `A-007` и `A-012…A-014`: это допустимые representative/static-preview boundaries, а не stale tails.
3. Прежние `A-069…A-077` перепроверены отдельно от intentional negative assertions; проверки, которые доказывают отсутствие старых draft-запросов, не классифицируются как stale.
4. Дублей среди оставшихся 80 не установлено.
5. Новых подтверждённых A-пропусков не установлено.
6. Реестр перенумерован в текущие `A-001…A-080`.

**Итог first-stage audit: 80 exact A.**

Audit-only boundary сохраняется: runtime/tests не исправлять и cleanup не начинать без отдельного owner decision.


## Transfer to dedicated service workspace — 2026-11-25

1. Current main: `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
2. Original 80-exact fresh review remains valid evidence only for baseline `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.
3. Main advanced by four commits and changed several audited surfaces, including localization catalog/manual files, runtime privileges, Admin/forum routes/tests and styles.
4. Existing cleanup C1 Draft #377 exact `d4f820166bc905e28e2ae818854e6f8038c96ea1` is now ahead 3 / behind 4 relative to current main; its previous exact-head CI/author PASS is historical evidence, not a current-main review gate.
5. Before any further cleanup, revalidate the affected A-items against current main; for C1 specifically revalidate A-011…A-026, synchronize #377 to current main, rerun applicable checks, then restart review on the new exact head.
