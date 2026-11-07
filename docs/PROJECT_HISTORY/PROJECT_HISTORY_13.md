# История проекта — 2026-11-07: Admin Panel AP-11 integration closeout

Датированный implementation/review/merge snapshot. Не является текущим source of truth и
не свидетельствует о production rollout или owner visual acceptance.

- AP-11 был утверждён как bounded integration/factual closeout уже delivered AP-01–AP-10,
  без новой domain functionality, schema, permissions или grants. Settings владельцем
  отдельно вынесен из AP-11 в последовательность: owner/authorization redesign → Settings.
- Технический план Лёвы зафиксировал один verification gap: не было repository-owned
  connected actual-browser сценария, объединяющего Users inline authorization/History,
  Forum hierarchy/topic closure и AP-10 restriction/revalidation boundaries на одном runtime.
- Draft implementation PR #292 расширил существующий AP-10 isolated browser harness и по ходу
  integration verification подтвердил два локальных current-scope runtime issue:
  stale denied reply требовал явной revalidation без потери mounted editor, а Admin Users
  detail требовал reuse существующего responsive identity wrapping.
- Первый coordinator whole-PR review Миры на head
  `079b98e29646db2024546fb52be4076186567ece` завершился CHANGES REQUIRED по четырём findings:
  `AP11-MIRA-01` — окно повторного Publish/new Attach во время explicit 403 revalidation;
  `AP11-MIRA-02` — отсутствовала фактическая closure × active reply-measure matrix;
  `AP11-MIRA-03` — grant/revoke lifecycle тестируемого authorization permission выполнялся
  fixture SQL вместо canonical writer; `AP11-MIRA-04` — browser privacy evidence проверял
  `no-store`, но не требовал `private`.
- Bounded correction закрыл все четыре finding без schema/migration/grant/dependency/public-contract
  изменений. Final implementation exact head:
  `3f608ce9a042fd7c78401d330f5865af4f3dee5c`.
- На final head denied stale reply блокирует Publish и новые uploads уже на render отказа и
  до завершения fresh loader; mounted text/operation/Cancel и существующее attachment state
  сохраняются, automatic POST replay отсутствует. Connected browser scenario использует
  canonical authorization UI/writer для grant/revoke и History, а closure и AP-10 measure
  проверяются как независимые admission constraints в обоих порядках снятия.
- Exact-head GitHub CI #42245766359 — SUCCESS. Exact-head isolated Chromium
  #42245766263 — SUCCESS: 34 case groups, EN/RU/HE responsive checks, zero layout failures,
  zero page errors и zero external requests; artifact #13517504953 содержит exact
  `implementationHead`.
- Финальный coordinator whole-PR review Миры — PASS на
  `3f608ce9a042fd7c78401d330f5865af4f3dee5c`.
- Independent technical review Лёвы того же exact head — PASS, report #6689555134.
  Собственное evidence Лёвы включало 128/128 selected DOM/route/UI tests, build PASS и
  отдельный Chromium→built Worker→Better Auth→PostgreSQL 17 rerun всех 34 case groups.
- PR #292 merged в `main` 2026-11-07; merge commit
  `57f0b5a1675053b556bc68b24c4a0b9a8177a8f2`.
- Documentation closeout после implementation merge оформлен отдельным PR #293: factual current state,
  permanent AP-11 boundary, roadmap и данный historical snapshot.
- AP-11 merge не выполнял production/deployed acceptance, owner visual acceptance, Stage 6,
  owner/authorization redesign или Settings. Эти границы остаются отдельными следующими задачами.
