# Systematic stale/legacy audit — handoff for Mira-2

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

- Эта работа — отдельный **audit side-task**, переданный через #342 по прямой команде Ильи.
- Не менять текущий moderation visibility B4 и не вмешиваться в работу Лиры.
- Не менять #322/#315.
- Не создавать новый service PR.
- Не создавать implementation PR до отдельного решения Ильи.
- По завершении first-stage registry — STOP и вернуть результат Илье.


## Coordinator review — 2026-11-22 HOLD

Mira independently reviewed the completed registry against the same current main
`9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

The existing 31 listed A-elements remain supported; no false positive was confirmed in
that original set. However the claim **"31 exact stale elements" is not accepted** because
the completeness pass missed at least these seven current stale catalogue elements:

1. `attentionModeComplaints` — active Complaints mode, but its catalog description still says
   "Placeholder mode for future complaint handling."
2. `attentionModeSecurity` — active Security/Attachments surface, but its catalog description
   still says "Placeholder mode for future security notices."
3. `attentionPlaceholderGroup1` — localization-only dead key for the old temporary Complaints
   Group 1; current Complaints group1 uses `complaintQueueHeading`.
4. `attentionPlaceholderGroup2` — key remains valid for Security group2, but its catalog
   description still incorrectly says it is also a temporary Complaints group.
5. `attentionPlaceholderGroup3` — same stale Complaints claim in the description; current
   Complaints group3 uses its real History label.
6. `complaintResultAppealUnavailable` — localization-only dead key still saying Appeals are
   unavailable / future, while Complaints Package 6 Appeal routes and flow are implemented.
7. `superAdminAreasLater` — localization-only dead key still saying other Monitoring areas are
   unavailable, while SA-08 has all 12 measured Monitoring areas; only Infrastructure remains
   the separate Stage-6 placeholder.

Important: this proves a **minimum of 38**, not an exact revised total. Mira-2 must not merely
append these seven and declare 38 exact. Repeat the completeness pass from the capability map,
including active localization descriptions and localization-only dead keys, then produce one
corrected exact A-registry and STOP. No cleanup/implementation before a fresh review accepts the
corrected registry.
