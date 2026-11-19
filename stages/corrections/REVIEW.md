# stages/corrections/REVIEW.md — final whole-PR reviews consolidated corrections #354

## Final reviewed head

- PR: #354
- Base: `a645fbe21110e77429025c428e498194b9a92ca2`
- Exact head: `b67e14d81cd20f2e42264e3d25d336ee19db626b`
- Coordinator: Мира / ChatGPT-5.6 Sol — **PASS**
- Independent technical reviewer: Лёва / Codex-6.1 Sol — **PASS**, 2026-11-20
- Confirmed current-scope defects: **0**

## Whole-PR result

1. WATCH-AUDIT-1: loader-authoritative Watch state; old success ACK cannot overwrite fresher loader snapshot; uncertain refresh/no replay and topic isolation preserved.
2. BOOKMARKS-AUDIT-1: loader-authoritative Bookmark control; transient/error/refresh and late-response isolation preserved.
3. BOOKMARKS-AUDIT-2: list presence derives from loader; stale Remove ACK cannot hide a re-added row after fresh loader state; pagination/account-switch semantics retained.
4. TITLE-AUDIT-1: normal Save/Cancel focus restoration occurs after DOM commit; title mutation/revision/CAS/rebase semantics unchanged.
5. TITLE-AUDIT-1-R1: pending focus request expires on the close transition even if permission loss means no opener exists; later permission restoration does not replay stale focus.
6. Scope remains exactly 9 changed files; no backend, DB, schema, RBAC, dependency or product-contract expansion.
7. Current main differs from PR base only by merged service-workspace regulation docs.
8. Exact-head 7/7 GitHub workflows completed SUCCESS, including CI and dedicated Watch/Bookmarks/Title connected acceptance.
9. PR review threads/comments contain no additional findings.

## Review-cycle note

The previous reviewed head `01cecb91090a2f29f90b7c6ae4a83db77a0f4910` was HOLD only for TITLE-AUDIT-1-R1. The new delta to final head changes only title editor + its component test and closes that lifecycle defect. Unchanged corrections were revalidated against the same final PR scope and remain sound.

## Handoff

Оба whole-PR review завершены на одном SHA. Owner переводит Draft #354 в Ready и merge при неизменном head. Implementation head change требует нового Mira→Leva review cycle. #342 service-only/no merge; Лёва STOP.

## Independent technical review — Лёва

Проверен весь base→head diff девяти файлов против four original audit findings и TITLE-AUDIT-1-R1. PR implementation не менялся; current main `bb3d44f940f44a4f08c4a501d9d0b3deaa50eb02` отличается от base только `AGENTS.md` и двумя service-regulation Markdown-файлами. Scope drift продукта отсутствует. Latest service comment `7023486909` и fresh PR metadata подтверждают назначение/stable SHA; discussion #354 пуст, дополнительных findings нет.

### Причины и обоснованность исправлений

- Watch/Bookmark: удалены local confirmed mirror, sync effect и ACK setters. `displayState` вычисляется из loader и transient unavailable mask. Matching ACK очищает только outcome; pending, expected actor/topic, unknown/explicit refresh и отсутствие POST replay сохранены.
- Bookmarks list: удалены только permanent removed state/setter/return-null. Наличие строки следует из list loader; timestamp/keyset/account-switch marker и mutation protocol не изменены. Normal-success fixtures отражают реальный committed server state.
- Title: restoration привязан к явному close intent и выполняется после DOM commit. Initial render не autofocus. Intent погашается до проверки наличия opener, поэтому permission-return не воспроизводит старый запрос. Scope actor/topic и frozen revision/draft/conflict/rebase не менялись.
- Не добавлены cache, versions, timers, глобальный store, recovery subsystem, server/schema/RBAC/dependency изменения. One-shot focus ref представляет незавершённый UI intent; без него focus effect мог бы срабатывать при initial mount/возврате права. Необоснованных компенсирующих механизмов в исправлениях не выявлено.

### Независимо выполненные проверки

1. Четыре affected component suites — **25/25 PASS**: обычный success, pending, uncertainty/GET-only refresh, late-target isolation, оба направления freshness, Remove→re-add list, cursor/account switch, draft/rebase и focus/R1.
2. Первоначальные audit harness, перенаправленные на final production source/repo, — **8/8 PASS** с настоящим PG17: Watch3 (normal + оба delayed-ACK order), Bookmark5 (normal + оба order + normal list remove + actual Remove→Add before old ACK). После старого ACK выполняется ещё одна revalidation; БД/loader/DOM совпадают. Только response после COMMIT задерживается; SQL/writes не mocked.
3. System Chromium + production title component/React Router — **5/5 PASS**,0pageErrors: no initial autofocus; normal Save и Cancel возвращают focus; Cancel без permission и successful Save с потерей permission перед loader не оставляют deferred focus request. После permission-return другой элемент сохраняет focus, последующее обычное закрытие снова корректно возвращает его opener.

Диагностика — `/workspace/work/corrections-diagnostics` вне implementation worktree. Browser probe использует контролируемые action/permission snapshots и не выдаётся за новый full Worker/Better Auth run. Disposable loopback DB `vico_corrections_review_test`, полный clean migration chain, удаляется после проверки. Pinned Node24.21/UTC toolchain; source worktree clean после удаления временного dependency symlink.

### Exact-head CI, проверенный непосредственно

- **7/7 workflows,8/8 jobs SUCCESS** по GitHub API.
- CI `44622509204`: checks `135907603170` — **2752/2752 tests,218/218files**, lint/typecheck/Worker+preview builds; database `135907604219` — **1476/1476,109/109files**,74-table manifest/runtime privilege/provisioning probes PASS.
- Watch `44622509269`/`135907603253`: **11/11 connected markers**.
- Bookmarks `44622509224`/`135907602120`: **11/11 connected markers**.
- Title `44622509311`/`135907603136`: **9/9 connected markers**, actual Save/Cancel focused opener assertions included. Это existing real Worker/Better Auth/PG17/Chromium exact-head acceptance; review прочитал логи и assertions, не запускал его повторно локально.
- Остальные triggered regression jobs также SUCCESS. Full CI не повторялся без новых изменений; local focused probes проверили исходную causal chain и дополнительный Save lifecycle edge.

**Результат independent whole-PR review: PASS; подтверждённых current-scope defects = 0.** Все исходные четыре finding и R1 CLOSED на указанном SHA. Новые product stages и optional Mute/Block cleanup этим review не активируются.
