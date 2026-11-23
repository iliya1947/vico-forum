# Task 6 / F3 — авторская самопроверка

- Stacked Draft implementation PR: [#381](https://github.com/iliya1947/vico-forum/pull/381).
- Branch: `feat/forum-structure-f3`; base `feat/forum-structure-f2`, accepted F2 `11a2808f14a79efd69dbbb120f5b732bf2880d4f`.
- Stable F3 head: `ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`.
- Только F3 из S8 [PLAN.md](PLAN.md). Accepted F1/F2 branch heads не менялись. Новых migrations/grants/public readers/routes/UI нет. Не merge отдельно.

## Authoritative move

Новый typed server-only `TopicMoveWriter/PostgresTopicMoveWriter` использует exact request move capability, затем READ COMMITTED transaction: singleton FOR UPDATE (без increment) → actual topic NO KEY UPDATE → обычные categories/sections NO KEY UPDATE в C-sorted ID order → actor NO KEY UPDATE/shared native AP-10/current raw permissions → UPDATE двух location fields → neutral structural History last.

Hidden applicability проверяется по реально locked topic до global/source/location CAS и до destination результата. Без обоих raw move+visibility keys hidden/absent дают один neutral404; обычный actor без move по-прежнему denied до target. При actor admission права перепроверяются; no-op проходит current expectations/ordinary/active/AP-10/permission guards. Новый revocation commit barrier не обещается.

Обычные source/destination берутся по stable IDs/actual parent. Help/service/forged Help relationships запрещены, включая no-op. Location CAS независим от visibility/closure/content revisions; ABA/stale desired destination конфликтуют. Bigint strings точны выше Number precision, location overflow controlled, current no-op at max разрешён. Global version не меняется даже на max.

Переиспользован существующий `effectivePermission` из authorization repository: только export, без смены SQL/policy/RBAC. Producer `appendStructureHistory` принятого F2 не меняется. Event содержит neutral topic ID label и bounded before/after category/section metadata с location versions; не читает/не сохраняет topic source, author, revision или visibility reason.

## Receipt correction

В прежний plain persisted-topic SELECT matching create-topic receipt добавлен sectionId; DTO возвращает его вместо input.sectionId. Исходный section остаётся частью original fingerprint. Receipt/fingerprint/draft/attachment/notification logic не переписаны; после actor admission не добавлены topic/structure locks. Replay может вернуть snapshot до ещё не committed concurrent move; следующий replay получает новую location. Topic permalink остаётся прежним.

## Локальное доказательство

- 48 F3 real PG17 tests, плюс регрессии F2 (36), существующих closure/visibility History; финальные дополнительные canonical-counter cases PASS.
- 41 validation unit tests; lint/typecheck/migration guard PASS, 0 new migrations.
- Move меняет только section_id/location_version; полный snapshot всех таблиц (кроме этих двух полей и ожидаемой History) сохраняет заполненные closed/solved/best-answer/pin, revisions/translations, Watch/Bookmark/Mute/Block/read/inbox, published/draft/evidence refs и timestamps, включая inactive content author.
- Hidden move: move-only / visibility-only / structure-only / history-only / author denied, dual/Owner admitted; raw deny/revoke/AP-10/active checks/no-op не обходятся. Public topic/ordinary Admin lists/published assets остаются закрыты; owner-private draft и protected Complaint evidence membership сохраняются.
- Внутри/между category, missing/reserved/actual Help service/forged relationships, source/global/location CAS, ABA, no-op, bigint max/overflow и принудительный History rollback.
- Реальные visible+hidden moves проходят под exact web role текущего runtime contract, без дополнительных privileges.
- Publish→move→reparent→Hide/Close→original replay: current section, один receipt/asset set, неизменные fingerprint/counters/notices/events; попытка заменить исходный section во fingerprint отклоняется.

### Concurrency

Shared PG test utility вынесен из F2 без изменения проверяемых команд; статистический snapshot обновляется при polling. Gates открываются только после завершившегося SQL row-lock acquisition; затем проверяется `pg_blocking_pids`, не sleep вместо доказательства.

Реальные отдельные connections, обе очередности:
- два moves одной темы с одним expected baseline: один effect, второй stale;
- Move × topic Hide/Restore для move-only и dual actors; Move × individual post Hide/Restore;
- Move × reply, Watch, closure, title edit, published post edit;
- Move × real planning и accepted translation result publication (с настоящим allowance/claim/task/head/publication store contract); отдельно accepted work завершается после Hide+dual move с неизменным source metadata;
- Move × section reparent: глобальный CAS отклоняет stale destination snapshot; fresh retry использует actual parent;
- actor deactivation first / admission first, actual effect и no-op; revoke move/visibility и AP-10 до native admission;
- receipt × move той же учётной записи: receipt-first plain SELECT завершается, пока move ждёт actor; move-first receipt ждёт actor и получает новую persisted location. Нет actor→topic/structure inversion.

## Exact-head CI/acceptance

[CI45252637056](https://github.com/iliya1947/vico-forum/actions/runs/45252637056) и 10 applicable acceptance workflows запущены на указанном head; результат пока ожидается. До подтверждения gate остаётся у Лёвы.

## Передача

После applicable checks — Мира для bounded F3 coordinator checkpoint на этом exact head. Это author self-check, не independent/whole-feature review. Лёва STOP; F4 readers/private context/picker/routes, F5 live forms/UI/Owner projection и F6 assembly не начинаются без отдельного назначения. #379/#380/#381 Draft/unmerged, docsF7 после фактического implementation merge.
