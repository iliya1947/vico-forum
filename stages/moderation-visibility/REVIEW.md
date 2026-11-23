# Moderation visibility — независимая проверка собранной feature

## Текущий вердикт — PASS

2026-11-23. Лёва завершил independent whole-feature re-review #355 на **exact head `66b1bb7ec0f4a1f5bed17583398d5acc041da143`**, base/current main **`9cff976a9621d9fe5dfef28ea5367e390ff435b1`**.

**VIS-FINAL-LEVA-01 и VIS-FINAL-LEVA-02 CLOSED. Подтверждённых открытых current-feature blockers нет.** Mira whole-feature PASS относится к тому же head. Implementation остаётся open/Draft/unmerged; reviewer код не исправлял.

Основание — принятый V1–V9 в [PLAN.md](PLAN.md), D-08/D-09 и актуальное назначение WORKFLOW.md. Результат относится ко всей собранной moderation-visibility feature, а не только к двум строкам fixes.

## Объём повторной проверки

Предыдущий whole-feature review выполнен на `fdad1930fc68a854d52bee31922f923be5c1c751` и дал HOLD по двум P2. С тех пор main не изменился. Независимо проверенный correction diff — **8 files /5 commits, +246/−30**:

- production: `db/forum-repository.ts`, `app/admin/topic-model.ts`, `app/admin/topic.tsx`;
- regression tests: `app/admin/quick-actions.test.tsx`, `app/admin/topic.test.tsx`, `app/routes/admin-topic.test.ts`, `tests/database/moderation-visibility-commands.test.ts`, `tests/database/sa04-forum-help-signal-lifecycle.test.ts`.

Весь этот delta прочитан. Проверены его callers и влияние на canonical topic action, Admin loader/translation projection, shared QuickActions и существующий preview consumer. Вне этих восьми файлов implementation совпадает с ранее проверенным exact head. Неизменившиеся источники не объявлялись заново выполненной проверкой: сохраняется предыдущая whole-feature оценка, а новые выводы основаны на delta и связанных boundaries.

Schema/grants, Public Reader predicates/snapshot, asset membership, private inspection, accepted translation execution, inbox/personal state, visibility action/cache/lifecycle и connected harness не изменялись. Коррекция не добавляет им обходов. Состав всей feature остаётся в принятом B1–B9 scope; Stage6/deployment/general UI/UX/structure task не активируются.

## VIS-FINAL-LEVA-01 [P2] — CLOSED

**Прежний дефект:** `withdrawHelpSignal` вызывал helper, требующий visible topic/proposed-original/target-answer, поэтому Hide запрещал автору отозвать уже отправленный pending Help signal вопреки protected exception V6.

**Проверенная коррекция:** private dependency helper сохраняет sorted topic locks, optional target-post lock и exact membership, но принимает `requireVisible = true`. Только `withdrawHelpSignal` передаёт `false`; rejected review продолжает использовать default `true`, accepted review сохраняет отдельные visibility gates. Public input не управляет этим флагом.

После dependency locks остаются signal row lock → signal/topic membership → author-only → pending-only → active-account admission → withdrawal. Отзывается только свой сигнал; hidden source не читается/не возвращается. Content state, visibility, relationships и History не меняются. Lock ordering и FK compatibility коррекцией не изменены.

Canonical `topicAction` по-прежнему направляет withdraw в этот writer, без предварительного public reader gate, который вернул бы тот же запрет на route layer.

Regression coverage проверено по исходникам:
- hidden primary topic/proposed original/selected answer → собственный pending withdrawal разрешён;
- foreign actor, wrong topic, nonpending и inactive author отклоняются;
- accepted/rejected ordinary review hidden source остаются запрещены;
- withdrawal не меняет topic/posts/relations/History и не возвращает hidden source;
- Restore не отменяет уже выполненный withdrawal.

Real-PG assertion прежде ожидавший ошибочную 404 заменён требованием разрешённого own lifecycle. Свежий hosted database job на проверенном head SUCCESS. Локально PG suite в этом re-review не запускался.

## VIS-FINAL-LEVA-02 [P2] — CLOSED

**Прежний дефект:** `projectAdminTopic` удалял hidden rows, после чего AdminTopicView вычислял номера и original identity по укороченному массиву.

**Проверенная коррекция:** Admin DTO сохраняет discriminated hidden stub с whitelist `kind/id/parentPostId/createdAt`. У hidden row нет author/body/revision/attachments/visibility-reason. Chronology полная; number map строится до visual best-answer promotion, original остаётся первым persisted id.

Admin view обрабатывает hidden variant до обращения к body/presentation:
- скрытые root/middle/best остаются якорями на прежних позициях;
- номера остальных сообщений не сдвигаются;
- parent links сохраняются, original/best badges остаются на правильных ids;
- hidden card не получает translation/body/attachments/MessageQuickActions;
- видимые best-answer candidates сохраняют permanent number, hidden candidates исключены.

Admin loader остаётся на public-safe `readTopicPage`; translation service и postPresentations получают только visible revisions. Приватное inspection permission, includeHidden или hidden-source bypass не добавлены. Shared QuickActions уже умеет hidden union и не создаёт solution-moderation controls для hidden selected answer. Новый DTO также совместим с existing preview consumer.

**Независимое локальное подтверждение:** те же три disposable reproduction assertions из первого review теперь PASS:
1. hidden p1 → p2 остаётся Message #2;
2. hidden p1 → p2 не становится original-question;
3. hidden p2 → p3 остаётся Message #3.

Штатные loader/render/QuickActions regressions дополнительно покрывают hidden root/middle/best, отсутствие hidden serialization/translation, anchors/parent links и candidate numbering.

## Тесты и evidence

### Выполнено локально

```text
vitest run app/admin/topic.test.tsx app/admin/quick-actions.test.tsx \
  app/routes/admin-topic.test.ts app/admin/message-quick-actions.test.tsx \
  app/admin/visibility app/forum/visibility-actions.test.ts \
  app/routes/topic-visibility app/forum/public-read.test.tsx

17 test files /304 tests PASS
```

В этот запуск входят три сохранённых независимых reproduction cases finding 02. Временная копия reproduction test удалена после запуска; implementation worktree приведён к clean state. `git diff --check fdad1930 HEAD` PASS. Зависимости переиспользованы, installation/production changes не выполнялись.

### Независимо проверено через GitHub API

- **48 exact-head checks: 24 SUCCESS +24 expected SKIPPED**, без failed/pending.
- [CI 45168532264](https://github.com/iliya1947/vico-forum/actions/runs/45168532264): SUCCESS, head `66b1bb7e...`, PR context #355. Unit/lint/typecheck/build/preview, migration-history/metadata/schema и database/migration/manifest/privilege/provisioning/Worker smoke steps SUCCESS.
- [SA04-N 45168532275](https://github.com/iliya1947/vico-forum/actions/runs/45168532275): SUCCESS на том же head в #355 context; действующий actual Chromium/Worker/Better Auth/PG harness.
- [SA04-K5 45168532028](https://github.com/iliya1947/vico-forum/actions/runs/45168532028): SUCCESS на том же head в #355 context; действующий connected attachment/local-R2 harness.

PG/browser/full build локально повторно не запускались. Hosted checks и их привязка к exact head проверены независимо; чужой runtime run не представлен как собственный. Green CI использован вместе с разбором требований, кода и отрицательных/положительных regressions.

## Whole-feature итог и следующий маршрут

Прежний HOLD на `fdad1930...` superseded этим PASS. Оба открытых finding закрыты по исправлениям и regression evidence; новых current-feature blockers не обнаружено. Остальные ранее проверенные границы feature сохраняют действующие основания, correction не меняет их семантику.

**#355 готов к owner merge на `66b1bb7ec0f4a1f5bed17583398d5acc041da143` после снятия Draft.** Reviewer merge не выполняет. При изменении implementation новый exact head требует нового применимого review cycle.

После фактического merge — отдельное назначение documentation closeout по AGENTS.md; не заявлять feature состоянием main заранее. Forum structure/topic move начинается только после закрытия visibility/docs debt по #342. #342 никогда не merge; deployment не входит в этот PASS.

Предыдущие полные reports доступны в Git history: final HOLD на service commit `f61b1e42f3e86b911d9f5bd461f79f765c349829`; bounded B1/B2 — в прежних версиях этого файла. Их исторические PASS/HOLD не являются текущими открытыми findings.
