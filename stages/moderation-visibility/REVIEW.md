# Moderation visibility — результаты проверок

## Финальный независимый whole-feature review Лёвы — HOLD

Дата: 2026-11-23. Проверен собранный #355 на **exact head `fdad1930fc68a854d52bee31922f923be5c1c751`**, base/current main **`9cff976a9621d9fe5dfef28ea5367e390ff435b1`**. Перед окончанием проверки head/base повторно подтверждены; PR open/Draft, не merged.

Основание: принятое V1–V9 в [PLAN.md](PLAN.md), owner decisions D-08/D-09, назначение independent whole-feature review после Mira PASS. Предыдущие bounded/coordinator PASS не заменяют эту проверку. Implementation diff: 132 files, +24351/−492.

**Вердикт: HOLD, два подтверждённых current-feature finding P2. Исправления не выполнялись.**

### VIS-FINAL-LEVA-01 [P2] — Hide блокирует защищённый отзыв собственного Help-сигнала

**Место:** [db/forum-repository.ts:4064](https://github.com/iliya1947/vico-forum/blob/fdad1930fc68a854d52bee31922f923be5c1c751/db/forum-repository.ts#L4064).

`withdrawHelpSignal` теперь вызывает `lockVisibleHelpSignalDependencies` до проверки автора и pending status. Helper отвергает скрытую тему, скрытый proposed original и скрытый target answer. Поэтому автор уже отправленного pending сигнала получает not-found вместо отзыва после Hide любого из этих объектов.

Цепочка проверена: canonical `withdrawHelpSignal` branch в `app/forum/actions.server.ts` → writer/service → repository → новый visibility helper → `ForumEntityNotFoundError` → route 404. Владелец сигнала и pending status после этой ошибки даже не проверяются; сигнал остаётся pending до Restore. Это касается чистого отказа автора от своего сигнала, а не редактирования скрытого контента.

**Почему это дефект scope:** V6 действующего плана прямо сохраняет protected lifecycle: «Pending own Help withdrawal/duplicate appeal/Complaints appeals не превращаются в ordinary content edit». В полном первоначальном принятом V6 (`8181645:USER_ACTIONS_SERVICE_PLAN.md`) формулировка ещё явнее: «не превращаются в запрещённый content edit из-за hide». В DECISIONS/актуальном handoff нет отмены этого исключения. General ordinary Help writer gate из V4/V5 не отменяет явно названное исключение V6.

**Проверяемое воспроизведение:** создать pending Help signal от active ordinary actor; скрыть его topic; выполнить прежний авторский withdraw с тем же signalId/topicId. Фактический результат — 404/pending; ожидается штатный авторский withdrawal без hidden source. Варианты — Hide proposed original либо target selected-answer post.

Существующие real-PG tests в `tests/database/moderation-visibility-commands.test.ts` около строк 660, 748, 763 специально ожидают отказ withdrawal. Они подтверждают текущий путь, но закрепляют противоположную принятому V6 политику. Exact-head CI этих tests SUCCESS; это не подтверждение правильности требования. В этой проверке PG suite локально заново не запускался.

**Что требуется исправить:** сохранить author/pending/active-account/membership и корректный lock order, но не делать доступность контента prerequisite для чистого own withdrawal. Не ослаблять ordinary accept/review/content mutation gates. Обновить реальные PG и route regressions на разрешённый own withdrawal при hidden topic/original/answer, отрицательные foreign/nonpending/inactive случаи и отсутствие hidden-source disclosure.

### VIS-FINAL-LEVA-02 [P2] — Admin topic теряет permanent numbering и original-post identity

**Место:** [app/admin/topic-model.ts:51](https://github.com/iliya1947/vico-forum/blob/fdad1930fc68a854d52bee31922f923be5c1c751/app/admin/topic-model.ts#L51).

Новая `filter(post.kind !== "hidden")` полностью удаляет sanitized tombstones из AdminTopic DTO. Затем существующий `AdminTopicView` вычисляет numbers по индексам уже укороченного массива и принимает `topic.posts[0]` за исходный вопрос (`app/admin/topic.tsx:41–49`).

Для chronology p1, p2, p3:
- Hide p1 → p2 показан как Message #1 и получает `original-question`, хотя является ответом #2.
- Hide p2 → p3 показан как Message #2 вместо #3.
- Пропадают hidden anchors/parent links. При Hide root первый видимый ответ также выпадает из `postCandidates = topic.posts.slice(1)` для выбора best answer.

Это изменение обычного `/:locale/admin/forum/topics/:topicId`, который использует public-safe reader. Наличие Admin admission не разрешает менять chronology или подменять root. V5 требует stable positions/anchors/relations, V7 сохраняет hidden-post tombstone для обычного Admin read; именно privileged inspection имеет отдельный guard.

**Локальное подтверждение:** disposable Vitest reproduction использовал настоящие `projectAdminTopic` и `AdminTopicView`, Data Router, общий English catalog/i18n. Три assertions:
1. hidden p1: p2 anchor = Message #2 — FAIL, фактически Message #1;
2. hidden p1: p2 не original-question — FAIL, фактически original-question;
3. hidden p2: p3 anchor = Message #3 — FAIL, фактически Message #2.

Все три FAIL — ожидаемые reproductions подтверждённого дефекта, не новая поломка исходного test suite. Временный test удалён из worktree после запуска, source PR не изменялся.

**Что требуется исправить:** сохранить sanitized tombstones и persisted chronology в ordinary Admin presentation, вычислять original identity/номера/candidates по исходной полной последовательности, не раскрывать hidden body/revision/attachments. Добавить Admin loader/model/render regressions для hidden root, middle parent и best-answer, проверить stable numbers/anchors/parent links и first visible reply candidate. Не переводить обычный Admin reader на includeHidden.

### Остальной проверенный объём

Проверка продолжена после первого finding. Дополнительные blocking current-feature findings в перечисленных границах не подтверждены:

| Область | Проверенные основания |
|---|---|
| B1 schema/catalog | Forward 0071, visible defaults/checks/version/timestamp/queue indexes, permission grants, AP-10 family/raw authority, schema/journal/manifest/Owner action classification |
| Commands/History | Topic→post→actor order; fresh active/AP-10/direct RBAC/Owner, admitted no-op, version+revision CAS/overflow/reason, neutral ID-only append-last History/rollback; остальные content writer gates |
| Public reads | Consistent REPEATABLE READ thread; source-free typed tombstones; SQL filtering до body match/rank/count/LIMIT; title/tag без visible bodies; Help/duplicate/solution retained projection; raw service callers отдельно от public readers |
| Personal/inbox | ON denial/own OFF без existence oracle; retained unavailable bookmark/mute rows; visible blocked-author projection; chronology/read markers; mixed/legacy notice masking и mark/open без обратного topic lock |
| Assets/translation | Public exact membership/visibility до bucket; отдельный fresh private guard, private/no-store/safe content delivery; body planning topic lock до post; accepted execution не получает новый hidden-write gate |
| Protected domains | Existing Complaint/evidence/context/result/appeal и retained History boundaries; duplicate appeal остаётся independent. Исключение own Help withdrawal нарушено отдельно в finding 01 |
| Private routes/UI | Capability до query oracle, strict cursors, target/membership/current-event lookup, дополнительное history permission, actor snapshot lifetime; ordinary Admin chronology нарушена отдельно в finding 02 |
| Action/UI/cache | Strict visibility payload/Origin/session/actor expectation; typed status/receipt; scoped fetchers и duplicate-submit guard; no auto retry/rebase; explicit verification, pending/stale/unknown/revoke/late actor response; document/.data no-store |
| Acceptance/CI | Новый #355 workflow context, actual browser/Worker/local-R2 harness wiring; real PG barriers используют pg_blocking_pids; fault paths/restore cleanup и positive asset/result cases проверяются assertions |

Это independent review текущей feature, не отдельный полный аудит всей документации и не Stage6/deployed acceptance.

### Проверки и границы evidence

**Локально выполнено:**

```text
vitest run app/admin/visibility app/forum/visibility-actions.test.ts \
  app/routes/admin-forum- app/routes/topic-visibility app/forum/public-read.test.tsx
16 files / 295 tests PASS
```

Отдельное временное reproduction finding 02: 1 file / 3 expected FAIL, значения выше. `git diff --check 9cff976 HEAD` PASS. Зависимости переиспользованы из существующего workspace; installation/build/deploy и production данные не затрагивались.

**Независимо прочитано через GitHub API:** exact-head check-runs и job steps. В свежем #355 context — 48 checks: 24 SUCCESS +24 SKIPPED, без failure/pending. CI [45149489505](https://github.com/iliya1947/vico-forum/actions/runs/45149489505) имеет SUCCESS для lint/typecheck/unit/build/preview, history/schema metadata и database/migration/manifest/privilege/Worker smoke steps. Connected [45149490457](https://github.com/iliya1947/vico-forum/actions/runs/45149490457) и [45149490210](https://github.com/iliya1947/vico-forum/actions/runs/45149490210) SUCCESS на том же head. Skipped twins относятся к другому label event; более ранний #376 context не выдан за fresh #355 evidence.

В этом review локально не перезапускались full PG suite, built Worker/browser/R2 acceptance и full build. Их hosted SUCCESS проверен по API; полный CI не запускается повторно только ради независимого reviewer при неизменном exact head. Local 295 PASS не отменяют два найденных пропуска контракта/coverage.

### Следующий маршрут

Мире — сопоставить два finding с принятым V6/V5 и её whole-feature PASS, затем подготовить bounded correction assignment исполнителю. Review не является назначением Лёве исправлять реализацию. Повторное owner-принятие продуктовой модели не требуется: требования уже зафиксированы.

После исправлений — author self-check/regressions и применимые checks на новом stable head → свежий whole-feature coordinator cycle Миры → независимый review того же head по AGENTS. До этого #355 остаётся Draft/unmerged; owner merge/docs/deploy/structure task не активируются.

---

## Предыдущие bounded reviews

Ниже сохранены результаты промежуточных checkpoints. Они относятся к своим exact heads и не заменяют финальный HOLD выше.


## B1 — schema/catalog/History foundation

### Final status

**PASS**

Final reviewed exact head: `704d5a46d59841538524424296ac28eaa39aa5e6`.

### Previous finding

`VIS-B1-MIRA-01` on `736da519e3f3fcae716ec5fb1b81886cdac63a6e`:
new `forum.content.visibility.manage` was missing from:
1. Admin Forum admission;
2. locale/header Admin projection;
3. shared AP-10 `admin.forum` family map.

### Correction verification

Correction commit changed exactly seven scoped files:
- added capability to `ADMIN_FORUM_PERMISSIONS`;
- added it to locale-boundary authorization resolution/Admin projection;
- added it to `USER_MEASURE_ADMIN_PERMISSION_FAMILIES["admin.forum"]`;
- added focused route/AP-10/raw-authority/real-PG regressions.

The existing DB restriction wrapper already contained the capability, so correction restores parity rather than introducing a new policy.

No B2 command, route-exposed Hide/Restore, schema, grant, dependency or unrelated change was added by the correction.

### Exact-head evidence

- CI run `44691969348`: `checks` SUCCESS; `database` SUCCESS.
- 13/13 associated workflows completed SUCCESS.
- PR remains Draft/unmerged.
- No confirmed current-B1 blocker remains.

### Next boundary

B2 may start only as a new stacked PR based on B1 head branch after explicit owner continuation. This PASS is an intermediate bounded checkpoint, not final whole-feature acceptance.


## B2 — transactional commands and writer admission

### Final status

**PASS**

Reviewed local stacked diff B1 `704d5a46d59841538524424296ac28eaa39aa5e6` → B2 `778568e83b89fd0ac14827cbeeaff3e2fd4dc5eb`.

### Verified

- desired-state topic/post Hide/Restore with version+revision CAS;
- nonblank reason only for real transition; stale/denied/no-op create no visibility History;
- active actor, AP-10 `admin.forum`, fresh direct `forum.content.visibility.manage` authority before admitted no-op;
- bound Owner effective authority without role-name proxy;
- visibility version overflow protection;
- one neutral ID-only History event per real transition, appended last in the transaction;
- forced History failure rolls back the visibility mutation;
- two-moderator CAS commits exactly one transition;
- topic→post→actor lock discipline and real actor-deactivation ordering;
- hidden topic/post/direct-parent gates for B2 content writers, with committed receipt replay kept inert;
- retained state: Hide/Restore does not rewrite close/pin/solution/duplicate/appeal state;
- protected Complaint and duplicate-appeal flows preserve their own authority instead of becoming ordinary hidden-content edits;
- deterministic real PostgreSQL barriers for both Hide/Restore orders against planning/reply/direct reply/edit/Complaint;
- accepted translation tasks may complete privately after Hide and stored results remain reusable after Restore.

### Exact-head evidence

Final CI run `44753654036` on exact `778568e83b89fd0ac14827cbeeaff3e2fd4dc5eb`: 22/22 checks and 18/18 workflows SUCCESS; 2758/2758 unit, 1578/1578 PostgreSQL17.

### Scope note

Translation planning/accepted-task coverage overlaps part of planned B4. This is future-stage overlap, not a confirmed B2 defect; do not roll it back solely to restore stage purity. B4 must inspect the current stack and implement/verify only its remaining boundary.

### Next boundary

B3 may start only as the next stacked PR based on `feature/moderation-visibility-b2-commands`, after explicit owner continuation. B1/B2 remain Draft/unmerged.
