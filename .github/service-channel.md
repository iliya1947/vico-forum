# Shared service channel

## AUD-20261022 — итог общей сверки (2026-10-25)

Baseline кода: `main d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.

Общая межаудиторская сверка опубликованных результатов завершена по сформированной очереди. Реализация, schema, dependencies, production/external services и `main` не менялись. Служебный PR #236 остаётся communication-only и никогда не merge.

### Итоговая классификация

1. **60 подтверждённых current-Stage technical root-cause groups.**
2. **2 подтверждённых current preview/tooling defects** — отдельно от production/runtime.
3. **4 подтверждённых documentation/SOT defects** — отдельно от implementation.
4. **1 незакрытый product-requirement question:** `AUTH-LOCALE-RETURN-01`.
5. `NOTIFY-BODY-01` оставлен **observation / guard-order hardening**, а не подтверждённый current defect: порядок body parse до auth/origin установлен, но самостоятельный current bypass/resource failure не установлен.
6. Technical/documentation/preview **unchecked queue = 0**. Открыт не аудит finding, а одно нормативное решение владельца по `AUTH-LOCALE-RETURN-01`.

Если владелец требует сохранять nested destination при смене locale, `AUTH-LOCALE-RETURN-01` становится 61-м technical defect. Если safe fallback на root новой locale считается допустимым контрактом, finding снимается.

### Canonical technical registry — 60

| Область | Canonical IDs |
|---|---|
| Auth/session/identity | `AUTH-01`, `AUTH-02`, `AUTH-LINK-01`, `AUTH-RATE-LIMIT-RACE-01`, `AUTH-SESSION-AVAIL-01`, `XR-CROSS-TAB-IDENTITY` |
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

### Открытый product decision

`AUTH-LOCALE-RETURN-01`:

1. Current locale switch сохраняет query, но nested `returnTo` со старым locale может быть отвергнут штатным safe redirect sanitizer и привести к root новой locale.
2. Security bypass не установлен; ослаблять sanitizer нельзя.
3. Нормативный вопрос только один: **обязан ли language switch переписать locale внутри безопасного nested destination и сохранить исходную страницу после последующего sign-in/sign-up?**
4. Это решение принадлежит владельцу. До него finding не включён в 60 и не снят.

### Provenance / limits

1. Canonical inventory собран из опубликованных аудитов Миры, Лиры, Лёвы и исторического материала Мишани с дедупликацией по causal root cause, а не голосованием.
2. Мишанин старый baseline и нарушенная независимость не считаются отдельным независимым голосом.
3. Где уже существовал достаточный native/browser/PG reproduction, reconciliation проверяла его causal relevance и unchanged current source; одинаковый experiment заново запускался не всегда.
4. Новые browser/visual проверки в финальном reconciliation не запускались по owner rule.
5. Детальные causal chains и evidence limits сохранены в PR #236 comments этапов 3.1–3.39 и личных agent files.

### Следующий шаг

После решения владельца по `AUTH-LOCALE-RETURN-01` сформировать fix-plan для окончательного current backlog. Implementation до утверждения плана не начинать.
