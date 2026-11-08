# История проекта — 2026-11-08: Settings SET-04

Исторический snapshot завершённого SET-04 implementation-пакета. **Не является
source of truth для текущего поведения.** Постоянный контракт находится
в [`SETTINGS.md`](../SETTINGS.md), текущий статус — в
[`PROJECT_STATE.md`](../../PROJECT_STATE.md).

## Поставка

- **SET-04 Administrator preferences** реализовал независимый защищённый
  `/:locale/settings/administrator` для authenticated пользователей с
  текущим Admin либо Attention доступом; без глобального permission/role gate.
- Версионированный allowlisted local record изолирован на
  authenticated account/device: default/last Admin destination,
  default/last Attention mode/group, comfortable/compact density и
  secondary technical-detail expansion с manual override.
- Entry preferences пересекаются с актуальными разрешёнными workspace
  destinations; explicit Admin/Attention URL/query и приватные deep links
  не заменяются. Last-recording сохраняет только допустимые IDs индекса
  или Attention mode/group, без raw URL, поиска и приватных object IDs.
- Плотность подключена к настоящим AdminShell и Attention, включая
  административные страницы мер; техническое раскрытие ограничено
  второстепенными IDs/metadata, не причинами, решениями и controls.
- Не добавлены DB/schema/migrations/new RBAC, mutation/domain permissions,
  global Settings writer, personal-choice Admin History или Stage 6 rollout.

## Implementation, corrections и final review

- [Implementation PR #307](https://github.com/iliya1947/vico-forum/pull/307)
  merged в `main` 2026-11-08: final exact head
  `27a2169ab013597d63fc318c7a255cdc4149b7cc`;
  merge commit `365b75405fbcc2ac2f274f5a83ce8a737b60e700`.
- **SET04-MIRA-01:** на initial head `1a858825836e76801bb63025a28312b4d0bdd082`
  координатор обнаружила отсутствие authenticated actor ID в приватном
  measure-detail route access. Исправление привязало AdminShell density
  к фактическому actor и сохранило `adminLast` без private measure URL/ID.
  Лира добавила unit и реальный AP-10 Chromium регрессионный сценарий;
  subsequent head `5cc5c820b0445ddb57cf3663e7cfb33c059ab108`.
- После coordinator PASS Лёва установил **SET04-LEV-01**: valid
  `forum.topic.close`-only actor допускался server-side в Admin/Administrator,
  но новая Settings nav/entry projection не показывала Administrator preferences.
  Исправлена только серверная header/Admin projection, с parity regression
  всех текущих Admin admission permissions и реальным Chromium close-only/
  pin/revoke test. Итоговый head `27a2169ab013597d63fc318c7a255cdc4149b7cc`.
  Legacy admission/RBAC и private route guards не переделывались.
- [Мира: финальный coordinator whole-PR PASS](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6719135304)
  — 0 confirmed current-scope defects, оба исправления сохранены.
- [Лёва: повторный independent technical whole-PR PASS](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6719208159)
  — 0 confirmed current-scope defects, обе corrective-цепочки закрыты.
  [Owner merge readiness](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6719230217)
  зафиксирована отдельно.

## Exact-head verification

- [CI #42461288512](https://github.com/iliya1947/vico-forum/actions/runs/42461288512)
  — **SUCCESS**: `checks` и `database`; 164/164 application test
  files, 2066/2066 tests; 50/50 database test files, 589/589 tests;
  lint/typecheck/build, disposable PostgreSQL 17 и Worker smoke.
- [Chromium #42461288533](https://github.com/iliya1947/vico-forum/actions/runs/42461288533)
  — **SUCCESS**: `browser`, `history_browser`, `settings_browser`,
  `settings_administrator_browser`. Реальный built Worker + Better Auth
  + disposable PostgreSQL 17 + Chromium прошёл оба corrective cases
  `set04-actor-bound-admin-measure-detail-density-no-private-last-entry`
  и `close-only-admin-settings-links-valid-choices-and-fresh-revoke`.
- Все эти проверки относятся к финальному implementation exact head в
  **repository/local-CI**, не к production/deployed runtime.
  Live Google OAuth, настоящий Owner binding и owner visual acceptance
  отдельно не подтверждались.

После implementation merge #307 следующий пакет по рабочей последовательности
SET-05 Account & security оставался не назначен до отдельного
фактического SET-04 documentation closeout. SET-06 и Stage 6 оставались
неактивными.
