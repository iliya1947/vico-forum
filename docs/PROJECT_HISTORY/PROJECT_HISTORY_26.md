# История проекта — 2026-11-11: Super-admin SA-03 canonical unified user profile

Исторический snapshot завершённого bounded SA-03. Не является source of truth для
текущего поведения: фактический статус — [PROJECT_STATE.md](../../PROJECT_STATE.md),
постоянные контракты — [SUPER_ADMIN.md](../SUPER_ADMIN.md),
[ADMIN_PANEL.md](../ADMIN_PANEL.md) и [AUTHORIZATION.md](../auth/AUTHORIZATION.md).

## Реализованная поставка

SA-03 сделал canonical `/:locale/users/:userId` единственной актуальной user-detail page,
сохранив публичный profile baseline и добавив независимо авторизуемые protected sections.

1. **Ordinary Admin composition**
   - existing AP-10 target measures при `admin.users.blocks.manage` и текущей hierarchy;
   - existing targeted authorization state при `access.authorization.manage`;
   - assignment/override writes только exact bound Owner через прежний canonical writer;
   - legacy `/:locale/admin/users/:userId` после `admin.users.read` guard стал
     private/no-store compatibility redirect, а не вторым detail implementation.
2. **Exact-Owner private projection**
   - safe account identity: email/verification, timestamps и linked password/Google methods;
   - active/expired-retained session counts и bounded 25-item session pages с безопасными
     device/IP fields без token/hash/provider secrets;
   - target-scoped 25-item retained History из exact auth events, attributed/coalesced attempt
     patterns, attachment-security evidence и ordinary Admin History с сохранением source IDs.
3. **Storage/query support**
   - migration `0064_sa03_profile_history_indexes` добавила шесть btree indexes для
     target-scoped chronological reads;
   - новых tables, grants, writers, permission keys или domain lifecycle state не добавлено.

SA-03 не реализует deactivation, account lifecycle, управление чужими credentials/sessions,
новые Monitoring areas, полный per-user audit/backfill, Stage-6 isolation или production rollout.

## Implementation, corrections и merge

- [Implementation PR #324](https://github.com/iliya1947/vico-forum/pull/324)
  **merged 2026-11-11**. Final stable implementation head:
  `4ad17beae65da338f5efcb2a1596e7fafc3b67c5`;
  merge commit `5992885e78b1642e41c9805116fcc256002b649c`.
- Основной технический план:
  [#6796912006](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6796912006).
- Coordinator review подтвердил и закрыл **SA03-MIRA-01**: exact Owner-self measures
  должны использовать существующие own-account destinations, тогда как valid non-self
  Admin targets сохраняют Admin destinations; AP-10 authority не расширялась.
- Первый независимый review Лёвы выявил **SA03-IMPL-LEV-01**: после sign-out старый
  privileged loader snapshot мог оставаться видимым до revalidation. Исправление
  viewer-bound invalidation удаляет stale private/Admin DOM сразу при известной смене
  identity, не меняя server admission.
- Повторный независимый review выявил **SA03-IMPL-LEV-02**: свежий разрешённый DTO мог
  быть навсегда скрыт из-за one-render HeaderAuth synchronization lag после SPA actor switch.
  Исправление различает fresh not-yet-matched snapshot и уже показанный stale snapshot:
  первый появляется после синхронизации без второго GET, второй не воскресает.
- Final implementation evidence Лиры на exact head:
  [#6803763477](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6803763477).
- Финальный независимый whole-PR review Лёвы:
  [#6804234730](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6804234730)
  — **PASS, 0 open current-scope defects**; SA03-MIRA-01, SA03-IMPL-LEV-01 и
  SA03-IMPL-LEV-02 CLOSED. Coordinator PASS Миры покрывал тот же exact head.

## Финальные exact-head проверки

1. [CI #43075154722](https://github.com/iliya1947/vico-forum/actions/runs/43075154722)
   — **SUCCESS**: 2237/2237 application tests, 688/688 native PostgreSQL 17 tests,
   lint/typecheck/build, migrations/schema и Worker checks.
2. [SA-03 connected Chromium #43075154724](https://github.com/iliya1947/vico-forum/actions/runs/43075154724)
   — **SUCCESS, 26/26** scenario records на built Worker + Better Auth + disposable
   PostgreSQL 17, включая target/source isolation, pagination, EN/RU/HE, RTL/responsive,
   delayed sign-out и bidirectional SPA account switch без stale private DOM.
3. [SA-01 connected Chromium #43075154613](https://github.com/iliya1947/vico-forum/actions/runs/43075154613)
   — **SUCCESS**.
4. [AP-10 isolated Chromium #43075154611](https://github.com/iliya1947/vico-forum/actions/runs/43075154611)
   — **SUCCESS**, все четыре jobs.

Независимый final review дополнительно повторил собственные identity-boundary/account-switch
probes, selected application/native tests, build, clean migrations `0000–0064` и
69-table production-schema manifest parity.

## Граница

Результат — repository/local-CI implementation. Реальные Google OAuth/Owner binding,
отдельный Owner Worker/Cloudflare Access/isolated Owner auth-session/DB capability boundary,
production rollout, deactivation, остальные десять Monitoring areas, SA-04+ и deferred
journal occupancy/archive/clear остаются отдельной работой. Final product-wide
visual/runtime acceptance остаётся отдельным UI/UX/release gate.
