# Shared service channel

## Текущая реализация — пакет 2 auth/session/identity (2026-10-25)

- Назначение Лёве: [6398462662](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6398462662). Выполнен только PR2 из принятого fix-plan; следующие пакеты не начаты.
- [Implementation PR #238](https://github.com/iliya1947/vico-forum/pull/238), ветка `fix/auth-session-identity`; stable exact head `8866bd8bfb6f8121a5e181c88a9e542741040b64`, base main `ab4d29e8853b216d4aef6c22f1fc373fed8ebf0d`.
- Scope: `AUTH-01`, `AUTH-02`, `AUTH-LINK-01`, `AUTH-LOCALE-RETURN-01`, `AUTH-SESSION-AVAIL-01`, `XR-CROSS-TAB-IDENTITY`; documentation sidecar `DOC-04`.
- Подготовлены chronological cookie propagation, controlled missing-role assignment, safe nested credential returnTo locale remap, explicit authenticated same-email Google linking из собственного профиля с сохранением verification gates, narrow session-storage503 boundary и stale-editor identity expectation/revalidation. History docs следуют effective forum.post.history.read, moderator/admin — default grants.
- Application permissions architecture, схема/миграции и pinned dependencies сохранены. Client expectation не выбирает actor; server session/current permissions authoritative. Owner locale optionA и negative unverified-email linking invariant соблюдены.
- Локально PASS:995 application tests,283 PostgreSQL tests,121 final targeted regressions,typecheck,lint(1прежнееwarning),обе сборки,migration/Drizzle/schema parity,local built Worker smoke. Cookie/role/stale-editor baseline controls воспроизводят defects. Подробности и setup corrections — в личном файле Лёвы.
- [CI #40202422836](https://github.com/iliya1947/vico-forum/actions/runs/40202422836) **SUCCESS**: checks121196211898 и database121196211728 **SUCCESS** на указанном head. Remote tree `d536c1656821643540e87966f200aab902a3b170` совпадает с локально проверенным.
- Implementation готова к независимому whole-PR review; review/merge #238 ещё не выполнены. Следующий шаг: Мира организует проверку PR238 по актуальному AGENTS.md. Технический handoff опубликован в личном файле Лёвы и комментарии #236; разработчик только подключает Миру. Лёва STOP после пакета2.
- Real Google/provider smoke, external Stage6/production rollout и visual acceptance не запускались. Служебный PR236 не merge.

## Завершённый пакет 1 — AUTH-RATE-LIMIT-RACE-01

- [PR #237](https://github.com/iliya1947/vico-forum/pull/237), implementation head `4a445b1c31b7465007bf3f9ddc55c0cd62eda03b`, tree `2071f624becacb49deeb1da9b8cd2b74f66b1f3f`.
- Better Auth/Drizzle adapter1.7.4→1.7.7, deterministic PostgreSQL active/reset concurrency regressions. Schema/storage/permission contracts сохранены.
- Local979app/281DB + checks passed; [CI #40195292682](https://github.com/iliya1947/vico-forum/actions/runs/40195292682) checks/database SUCCESS.
- Мира whole-PR PASS опубликован в [6398160555](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6398160555). Её первоначальное назначение review Лире отменено; дополнительная независимая проверка не заявляется.
- Владелец влил PR237; merge commit/current baseline пакета2 `ab4d29e8853b216d4aef6c22f1fc373fed8ebf0d`. External deployment этим merge не заявляется.

## AUD-20261022 — итог общей сверки (2026-10-25)

Baseline кода: `main d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.

Общая межаудиторская сверка опубликованных результатов и финальное совещание завершены. Мира сформировала консолидацию; Лира в T4 независимо проверила её и не нашла технических расхождений; Лёва в T5 выполнил финальную техническую сверку и также не нашёл расхождений. Ниже зафиксирован общий согласованный registry команды. Реализация, schema, dependencies, production/external services и `main` не менялись. Служебный PR #236 остаётся communication-only и никогда не merge.

### Итоговая классификация

1. **61 подтверждённый current-Stage technical root-cause group.**
2. **2 подтверждённых current preview/tooling defects** — отдельно от production/runtime.
3. **4 подтверждённых documentation/SOT defects** — отдельно от implementation.
4. `AUTH-LOCALE-RETURN-01` закрыт решением владельца: при смене locale безопасный nested `returnTo` должен сохранять исходный destination с заменой старой locale на новую.
5. `NOTIFY-BODY-01` оставлен **observation / guard-order hardening**, а не подтверждённый current defect: порядок body parse до auth/origin установлен, но самостоятельный current bypass/resource failure не установлен.
6. Technical/documentation/preview **unchecked queue = 0**. Owner decisions по итогам сверки закрыты.

По решению владельца выбран вариант A: смена языка не должна терять исходный внутренний destination. Следовательно `AUTH-LOCALE-RETURN-01` включён в final current-Stage registry как технический дефект №61.

### Canonical technical registry — 61

| Область | Canonical IDs |
|---|---|
| Auth/session/identity | `AUTH-01`, `AUTH-02`, `AUTH-LINK-01`, `AUTH-LOCALE-RETURN-01`, `AUTH-RATE-LIMIT-RACE-01`, `AUTH-SESSION-AVAIL-01`, `XR-CROSS-TAB-IDENTITY` |
| Error/runtime boundaries | `ARCH-01`, `ARCH-03`, `SEC-01`, `POST-EDIT-AVAIL-01`, `FORUM-READ-AVAIL-01` |
| Forum/read/discovery | `CORE-01`, `CORE-02`, `CORE-03`, `DISCOVERY-01` |
| Database/contracts | `DB-01`, `DB-02`, `DB-03` |
| Help & solutions | `HELP-01`, `HELP-02`, `HELP-MOD-01` |
| Attachments | `ATTACH-01`, `ATTACH-02`, `ATTACH-03`, `ATTACH-04`, `ATTACH-HTTP-405-01`, `ATTACH-STRUCT-01` |
| Editor / Markdown / UI | `EDITOR-01`, `EDITOR-02`, `EDITOR-03`, `EDITOR-04`, `EDITOR-05`, `EDITOR-06`, `EDITOR-07`, `EDITOR-08`, `EDITOR-10`, `EDITOR-11`, `EDITOR-PUB-01`, `EDITOR-PUB-02`, `LITERAL-TEXT-01`, `MARKDOWN-CUSTOM-STRUCTURE-DIVERGENCE-01`, `MARKDOWN-SPOILER-01`, `RES-EDITOR-02`, `RES-UI-01`, `RES-A11Y-01`, `CODE-HISTORY-01`, `CODE-SEARCH-01`, `M-M07`, `XR-THROWN-ACTION-BUFFER` |
| Localization / translation | `LOC-01`, `LOC-02`, `LOC-03`, `LOC-04`, `LOC-05`, `LOC-06`, `LOC-08`, `LOC-09`, `I18N-UI-POLICY-01`, `I18N-UGC-META-01` |
| Persistent public write amplification | `TAG-CARDINALITY-01` |

`MARKDOWN-CUSTOM-STRUCTURE-DIVERGENCE-01` — единственная causal dedup в остаточной очереди: прежние `EDITOR-09` + `LOC-07` являются двумя проявлениями одного structural mismatch. Остальные проверенные похожие families не были искусственно слиты.

### Preview — 2

| ID | Итог |
|---|---|
| `CODE-PREVIEW-01` | Dedicated best-answer confirmation preview route показывает неправильное solved/author state и скрывает confirmation. |
| `CODE-PREVIEW-02` | `Appeals (1)` использует plural group id против singular fixture kind и показывает пустую queue. |

### Documentation/SOT — 4

| ID | Итог |
|---|---|
| `DOC-01` | `PROJECT_STATE.md` содержит stale current/in-progress statements, противоречащие merged baseline. |
| `DOC-02` | Migration SOT отстаёт от authoritative chain `0044`; прежний `MIGRATION-SOT-01` — alias этой записи. |
| `DOC-03` | Current docs одновременно описывают pending `Disputed` как public и moderator-only; runtime/tests реализуют moderator-only. |
| `DOC-04` | History access описан и через fixed role, и через effective permission; current code следует effective-permission model. |

### Ключевые reclassification / exclusions

1. `ARCH-02` — снят из current defects: current Cloudflare Hyperdrive Worker lifecycle не требует ручного `client.end()` для этого request path.
2. `M-M10/F06` light-theme contrast — реальный известный UI issue, но по owner MVP-first contract отложен в final accessibility/UI refinement, не current-fix defect.
3. `CONTENT-SIZE-01` — отсутствие общего max остаётся policy/hardening observation; самостоятельный current failure не установлен. `MARKDOWN-SPOILER-01` остаётся отдельным concrete current parser defect.
4. `ATTACH-SEC-01` — server-derived stable contextual security ID соответствует принятой semantics; обязательность отдельного raw client UUID не установлена.
5. Generic forum pagination, `UNREAD-SCOPE-01`, `POPULAR-AGG-01` — future scalability/efficiency, не current defects.
6. Anti-framing headers, personalized cache policy и post-merge CI/audit automation — pre-release/security/governance hardening, не current defects.
7. Aggregate dependency-advisory count не считается одним defect. Отдельно подтверждён применимый `AUTH-RATE-LIMIT-RACE-01`.
8. Stage 6 live Cloudflare/Neon/Hyperdrive/R2/OAuth/backup/restore acceptance остаётся вне этого audit verdict.

### Owner decision — `AUTH-LOCALE-RETURN-01`

1. Владелец выбрал вариант A: при смене языка безопасный внутренний nested `returnTo` должен сохранять исходную страницу, заменяя старую locale на новую.
2. Safe redirect sanitizer ослаблять нельзя; remap применяется только после обычной проверки внутреннего destination.
3. Текущий fallback на root новой locale при таком сценарии не соответствует принятому продуктовым контракту.
4. `AUTH-LOCALE-RETURN-01` поэтому включён в final current-Stage technical registry.

### Provenance / limits

1. Canonical inventory собран из опубликованных аудитов Миры, Лиры, Лёвы и исторического материала Мишани с дедупликацией по causal root cause, а не голосованием.
2. Мишанин старый baseline и нарушенная независимость не считаются отдельным независимым голосом.
3. Где уже существовал достаточный native/browser/PG reproduction, reconciliation проверяла его causal relevance и unchanged current source; одинаковый experiment заново запускался не всегда.
4. Новые browser/visual проверки в финальном reconciliation не запускались по owner rule.
5. Детальные causal chains и evidence limits сохранены в PR #236 comments этапов 3.1–3.39 и личных agent files.

### Финальный consensus

1. Лира T4: согласна с консолидацией Миры; список технических расхождений пуст.
2. Лёва T5: рекомендует тот же registry; технических расхождений нет.
3. Владелец затем выбрал вариант A для `AUTH-LOCALE-RETURN-01`, поэтому final technical registry увеличен с 60 до 61.
4. Итог общей сверки: **61 technical + 2 preview/tooling + 4 documentation/SOT**. После повторной проверки owner-only вопросов восстановлен один ещё не решённый SOT/product choice — `DOC-04`.

### Owner decision — `DOC-04`

1. Владелец выбрал **permission-based** модель.
2. Историю опубликованных revisions может читать любой actor с effective permission `forum.post.history.read`.
3. Moderator/admin получают эту capability только как default grants; custom roles и per-user overrides остаются authoritative.
4. Current runtime и `docs/auth/AUTHORIZATION.md` соответствуют принятому контракту.
5. Role-only формулировка в `docs/EDITOR.md` и связанный descriptor считаются устаревшей документацией и входят в `DOC-04`; изменения кода authorization для этого finding не требуются.

### Черновой fix-plan Миры — 11 proposed implementation PR

1. Better Auth dependency/rate-limit — `AUTH-RATE-LIMIT-RACE-01`.
2. Auth/session/identity — 6 technical + `DOC-04`.
3. Failure semantics + published-edit recovery — 8 technical.
4. Database contracts + notifications/read-state — 6 technical + `DOC-02`.
5. Help lifecycle + tag amplification — 4 technical + `DOC-03`.
6. Attachments — 6 technical.
7. Editor/Markdown semantic correctness — 11 technical.
8. Localization/translation runtime — 9 technical.
9. Search/discovery content integrity — 3 technical.
10. Editor interaction/UI + preview tooling — 7 technical + 2 preview.
11. Documentation/current-state closeout — `DOC-01` и только оставшиеся passages из `DOC-02/03/04`.

Полный черновой execution plan Миры с required result и done criteria опубликован в PR #236 comment `6397105809`. Coverage: **61/61 technical + 2/2 preview + 4/4 docs**. Лира в FPLAN-T1 (`6397337524`) приняла 11-PR decomposition без split/merge и добавила два acceptance-уточнения, которые Мира приняла: PR2/AUTH-LINK-01 должен явно проверять отсутствие небезопасного implicit linking только по unverified same-email; PR6/ATTACH-04 должен явно сохранять несохранённый текст и остальные selected files при selective Remove. План ещё не считается командно утверждённым до архитектурной сверки Лёвы.

Общие границы:
- каждый PR bounded и строится от уже принятого актуального `main`;
- implementation и whole-PR review разделены;
- exact-head checks/review выполняются для каждого implementation PR отдельно;
- owner visual acceptance и production/external rollout не запускаются автоматически;
- deferred/future findings не возвращаются в current scope без нового основания.

### Текущий implementation status

1. **PR #237 / `AUTH-RATE-LIMIT-RACE-01` — merged.**
   - merge commit: `ab4d29e8853b216d4aef6c22f1fc373fed8ebf0d`;
   - current `main`: `ab4d29e8853b216d4aef6c22f1fc373fed8ebf0d`;
   - exact-head implementation CI был green;
   - whole-PR review Миры: PASS без findings.
2. Остаются следующие 10 implementation packages из принятого 11-PR fix-plan.

### Следующий шаг

Лёва реализует **PR 2 — Auth/session/identity behavior** от актуального `main`.

Scope:
- `AUTH-01`
- `AUTH-02`
- `AUTH-LINK-01`
- `AUTH-LOCALE-RETURN-01`
- `AUTH-SESSION-AVAIL-01`
- `XR-CROSS-TAB-IDENTITY`
- documentation sidecar: `DOC-04`

Ключевые принятые границы:
- `AUTH-LOCALE-RETURN-01`: owner option A — уже safe internal nested `returnTo` сохраняется при locale switch через remap старой locale на новую; sanitizer не ослабляется.
- `DOC-04`: history access остаётся effective-permission-based через `forum.post.history.read`; moderator/admin — только default grants.
- `AUTH-LINK-01`: supported same-email local+Google flow должен работать, но нельзя разрешать implicit linking только по совпадению непроверенного email; regression должен доказывать владение/авторизацию связываемой identity.
- Real Google provider smoke остаётся external Stage 6, если correction полностью проверяется local/CI.
- Следующие packages до завершения этого PR не начинать.
### Следующий шаг

Лира выполняет **независимый whole-PR review PR #238** на stable exact head `8866bd8bfb6f8121a5e181c88a9e542741040b64`.

Проверить весь назначенный scope PR #238 против актуального `main`, текущего Stage и SOT. Не использовать выводы других reviewers как доказательство. Findings до завершения собственной проверки не публиковать в #236; сообщить их только разработчику в текущем чате. Implementation во время review не менять. Visual acceptance и external/production checks не запускать без отдельного запроса.

После завершения review — STOP.