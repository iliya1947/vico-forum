# Shared service channel

## Текущая реализация — PR #241 paused; Lira batch L1 5/5 and LOC-04 complete (2026-10-26)

- Пакет 4 / PR #240 merged владельцем. Final implementation head `ec954ac55a140c5cee7cb66b5b7d6ca4537b9480`; merge/current `main 1364d5768906c6746c4397c615f846797051eb76`.
- Review cycle package 4 завершён: Мира PASS, Лира PASS, Лёва final technical PASS. Мишаня — автор реализации; его self-review не считался отдельным independent verdict. Confirmed current-Stage defects не осталось. Exact-head CI `40311315111` SUCCESS.
- Package 5 — **Help lifecycle + public-write tag amplification**. Scope: `HELP-01`, `HELP-02`, `HELP-MOD-01`, `TAG-CARDINALITY-01`; documentation sidecar `DOC-03`.
- Implementation handoff Мишане опубликован в #236 comment `6418615989` от актуального `main 1364d5768906c6746c4397c615f846797051eb76`.
- Required result: stale Help/moderation intents не применяются к более новым сущностям; lifecycle timestamps остаются валидными после lock waits; public tag creation имеет bounded current-product write boundary; pending `Disputed` документируется как moderator-only.
- Revised post-package5 plan зафиксирован в #236 comments `6419029403` и `6419135497`: после package5 остаётся 39 findings = 16 в трёх связанных implementation packages Лёве (`L6` attachment core, `L7` structural Markdown, `L8` durable translation runtime) + 23 локальных fixes Лире, выполняемых по одному внутри implementation PR партиями по 5 (итого 5 PR: 5+5+5+5+3). `L7` предшествует `L8`; `DOC-01` выполняется последним. Автор implementation не считается собственным independent reviewer; Мишаня остаётся доступен как reviewer PR Лёвы/Лиры.
- Мишаня завершил package 5 в PR #241 на stable exact head `f5cdf71837aee78a31856c766c087c9bbf54a496`; exact-head CI `40345202786` SUCCESS. Авторский handoff — comment `6419399136`.
- Мира завершила первый whole-PR review в текущем чате; findings остаются непубличными до окончания предусмотренных проверок согласно AGENTS.md.
- Owner decision о параллельных independent reviews зафиксирован в #236 comment `6419873950`: reviewers одного stable head работают одновременно, findings не раскрываются до завершения всех назначенных reviews.
- Лира назначена нейтрально в #236 comment `6419772533`; Лёва назначен параллельно в #236 comment `6419875144`. Findings Миры им не передавались.
- Лёва завершил независимый whole-PR technical review **всего scope HELP-01,HELP-02,HELP-MOD-01,TAG-CARDINALITY-01 и DOC-03** на `f5cdf71837aee78a31856c766c087c9bbf54a496`: **PASS, подтверждённых current-Stage defects не найдено**. Итог сохранялся только в текущем чате до последующей явной команды владельца «Публикуй». [Полный личный отчёт Лёвы](https://github.com/iliya1947/vico-forum/blob/9738ecc946f50729bbcd81bfc8687ae9a767a65c/.github/agents/codex-6.1-sol.md).
- Лёва лично запустил1080application/303nativePG PASS,typecheck,lint(1existingwarning),обе сборки,Drizzle metadata,migration guard0new,built Worker smoke. Дополнительные настоящие action→writer→PG probes:3наблюдаемых Lock waits с подменой relationship/appeal/best-answer, stale409 без изменения replacement; missing identity400 для6intents; актуальные targets302. Обе public tag flows принимают10unique с empty/case/NFKC duplicates и отклоняют11unique без topic/global-tag writes. Exact-head CI40345202786/checks121650163977/database121650163590 SUCCESS независимо сверены.
- Личный PASS Лёвы не является синтезом результатов остальных reviewers или общекомандным merge authorization. PR241/main не менялись; local Worker/PG остановлены, review-worktree удалена. GitHub publication разрешена отдельной командой владельца после завершения проверки Лёвы; публикация чужих verdicts/завершение всего цикла из этого не выводятся.
- **Лира завершила независимый whole-PR source-review** всех 14 изменённых файлов и полного scope package5 (`HELP-01`, `HELP-02`, `HELP-MOD-01`, `TAG-CARDINALITY-01`, `DOC-03`) на `f5cdf71837aee78a31856c766c087c9bbf54a496`: **индивидуальный PASS, новых подтверждённых current-Stage defects не обнаружено**. [Полный личный отчёт Лиры](https://github.com/iliya1947/vico-forum/blob/0bfb77eedf6474476b7e97f26f3e6a8288e1bfbe/.github/agents/chatgpt-6.md). Exact-head CI checks/database SUCCESS проверены; PostgreSQL/Chromium Лира лично не запускала. Отмечена историческая wording-несогласованность о public Disputed в старом абзаце `PROJECT_STATE.md`, несмотря на текущий moderator-only контракт; отнесена к позднему `DOC-01`, не к runtime defect этого PR. Публикация личного verdict выполнена по прямой команде разработчика, без общего synthesis.
- Comment `6420883610` преждевременно обозначил disputed findings Миры как confirmed. Этот статус отменён: при verdicts Мира CHANGES REQUIRED / Лира PASS / Лёва PASS общий verdict **не установлен** до отдельной technical adjudication расхождений.
- Два disputed findings переданы Лёве на adjudication в #236 comment `6420951578`: (A) `HELP-01` stale author appeal creation; (B) classification/boundary оставшегося public-`Disputed` wording по `DOC-03`.
- `HELP-02`, `HELP-MOD-01`, `TAG-CARDINALITY-01` не спорны; exact-head CI `40345202786` SUCCESS; PR241 head остаётся `f5cdf71837aee78a31856c766c087c9bbf54a496`.
- Codex временно недоступны по лимиту; PR #241 остаётся неизменным и ждёт adjudication Лёвы по comment `6420951578`.
- Owner разрешил параллельно перейти к задачам Лиры. Batch L1 строится от актуального `main 4c4bb59c4b7e3c47a6598034b9bd75b6a06d032a` и будет одним implementation PR на 5 последовательных fixes: `ATTACH-03`, `ATTACH-04`, `ATTACH-HTTP-405-01`, `EDITOR-01`, `EDITOR-02`.
- **Лира выполнила fix 1/5 `ATTACH-03`** по comment `6421152256` в [draft PR #243](https://github.com/iliya1947/vico-forum/pull/243), exact head `ecafe086ec5e769c54ee152a368397ea2d45c613` от `main 4c4bb59c4b7e3c47a6598034b9bd75b6a06d032a`. Пустой TAR с 1024-byte zero end markers узнаётся type gate; пустой TAR с nonzero trailing data не проходит structural validation. Добавлены type, structural и private R2 end-to-end regressions; обновлён `PROJECT_STATE.md`. [CI #40360530171](https://github.com/iliya1947/vico-forum/actions/runs/40360530171) **SUCCESS**, `checks` и `database` SUCCESS на exact head. [Отчёт Лиры](https://github.com/iliya1947/vico-forum/blob/4ec9d211791a6bb27d38500feba86d72487ce0be/.github/agents/chatgpt-6.md). Own local tests/real R2/production не запускались. PR #243 остаётся draft и не готов к whole-PR review до завершения всех пяти fixes; только первый выполнен.
- **Лира выполнила fix 2/5 `ATTACH-04`** по [назначению #6421809155](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6421809155) в том же [draft PR #243](https://github.com/iliya1947/vico-forum/pull/243), новый exact head `739f6b1be2ba3413a2a2e4fe979459037ad76090`. Remove доступен для pending/uploading entries, оставляет unsaved text и остальные selected files; late progress/201/error/410 снятого request игнорируются, без per-file abort/DELETE. Существующий whole-operation Cancel сохраняется. Focused mounted editor regressions: 3 attachments + unsaved text + late success/error; published-edit late-410 не сбрасывает operation. Первый CI `40363579052` checks FAILED на устаревшем assertion о недоступности Remove, database SUCCESS; assertion исправлен. [Exact-head CI #40364010321](https://github.com/iliya194/vico-forum/actions/runs/40364010321) **SUCCESS**; `checks` и `database` SUCCESS. [Полный handoff Лиры](https://github.com/iliya194/vico-forum/blob/99c14e7ae14d4ca413ebc27df8bf1ddc511277b3/.github/agents/chatgpt-6.md). Локальные PG/browser или внешние R2/production tests не запускались.
- **Лира выполнила fix 3/5 `ATTACH-HTTP-405-01`** по [назначению #6422256497](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6422256497) в том же [draft PR #243](https://github.com/iliya1947/vico-forum/pull/243), exact head `95fd8648aab5b63a9afc3194efd3a3150ef27c51`. Resource route `api/attachments` возвращает **405 + `Allow: GET, POST, DELETE`** для HEAD/PATCH/PUT/OPTIONS; уже действующие GET/POST/whole-operation DELETE, authorization и upload semantics не изменены. Добавлен тест через **React Router `createStaticHandler.queryRoute`** с path из `app/routes.ts` на unsupported и supported methods (без helper-only shortcut). `PROJECT_STATE.md` обновлён. [Exact-head CI #40366182831](https://github.com/iliya194/vico-forum/actions/runs/40366182831) **SUCCESS**, `checks` и `database` SUCCESS. [Полный handoff Лиры](https://github.com/iliya194/vico-forum/blob/13bad73d095a0df70f6eb0426564cba5b76f1567/.github/agents/chatgpt-6.md). Локальные/deployed HTTP/browser/PG/real R2 проверки лично не запускались.
- **Лира выполнила fix 4/5 `EDITOR-01`** по [назначению #6422608436](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6422608436) в том же [draft PR #243](https://github.com/iliya1947/vico-forum/pull/243), exact implementation head `18633574e416102f71d702ea868116813ea53d11`. HTML-paste сохраняет подряд идущие пустые строки внутри созданного `<pre>` fenced code; prose newline normalization вне блоков не меняется. Две целевые регрессии проверяют code/Markdown parser round-trip, длинный backtick fence и соседний prose. `PROJECT_STATE.md` обновлён. [Exact-head CI #40368663361](https://github.com/iliya1947/vico-forum/actions/runs/40368663361) **SUCCESS**, `checks` и `database` SUCCESS. [Личный отчёт Лиры](https://github.com/iliya1947/vico-forum/blob/822a53754d19c90719a43a8ac836772e41f455e8/.github/agents/chatgpt-6.md); [handoff #6422923447](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6422923447). Прямой local browser/production/owner visual запуск не выполнялся.
- **Лира выполнила fix 5/5 `EDITOR-02`**, назначение [#6423361282](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6423361282), [draft PR #243](https://github.com/iliya1947/vico-forum/pull/243), final exact implementation head `d5f992602fcc78276155a63aa14f56b931dd7656`. Таблицы из TSV/HTML теперь сохраняют literal Markdown-significant cell text (strong/link/code/entities), generated `---` separators остаются структурными, Simple input показывает/редактирует значения без накопления escape. Добавлены pure, HTML/TSV rendered и mounted paste/edit regressions, `PROJECT_STATE.md` обновлён до 5/5. Ранний CI выявил escaped structural row, следующий — неподдерживаемое assertion в новом тесте; оба исправлены. [Final exact-head CI #40375402307](https://github.com/iliya1947/vico-forum/actions/runs/40375402307) **SUCCESS**; `checks` и `database` SUCCESS. [Личный отчёт Лиры](https://github.com/iliya1947/vico-forum/blob/5c90d4d031029a93d3b600e54dcc15fe24557c5a/.github/agents/chatgpt-6.md), [handoff #6423829581](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6423829581). Browser/PG локально Лира не запускала, external/production/owner visual не выполнялись.
- **LOC-04 — отдельный fix по owner exception [#6424272144](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6424272144):** Лира завершила [draft PR #244](https://github.com/iliya1947/vico-forum/pull/244) от `main 4c4bb59c4b7e3c47a6598034b9bd75b6a06d032a`, final exact head `7c750ba8bfa0d0efc9d6046395a97d033c64d6a5`. Post-history pending UI использует новый `postHistoryLoading` вместо attachment-specific `editorAttachmentRestoring`; EN/RU/HE copy, reviewed fingerprints и mounted fetcher regression добавлены. Attachment flow, localization runtime, permissions без изменений. [Exact-head CI #40380768112](https://github.com/iliya1947/vico-forum/actions/runs/40380768112) **SUCCESS** (`checks`, `database`). [Handoff #6424577847](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6424577847), [личный отчёт](https://github.com/iliya1947/vico-forum/blob/3bc5f443723f5e7246a61b5ac8d9bd183e2f336a/.github/agents/chatgpt-6.md). Локальные browser/PG/production/external/owner visual не выполнялись. PR #241 и PR #243 не менялись.
- **Следующий шаг:** Мира координирует готовность [draft PR #243](https://github.com/iliya1947/vico-forum/pull/243) (batch L1 5/5, head `d5f99260`) и отдельно [draft PR #244](https://github.com/iliya1947/vico-forum/pull/244) (`LOC-04`, head `7c750ba8`) к предусмотренным independent whole-PR проверкам. Оба имеют success exact-head CI, но ни одному не присвоен independent PASS или merge authorization. Лира STOP, self-review собственной implementation не выполняет. PR #241 paused/awaits adjudication Лёвы. PR #236 — communication-only, никогда не merge.

## Завершённый пакет3 — failure semantics + published-edit recovery (2026-10-26)

- Final review cycle exact head `780ba72043d4edb227c299f0f7e0cc9ab15c0f0f` завершён: Мира — PASS, Лира — PASS, Мишаня — PASS. Лёва — автор последней bounded correction; повторный self-review отменён и в independent verdict не считается.
- Проверены все 8 групп package3 и все bounded correction chains, включая `LEVA-PR239-A7D2954-01`. Новых подтверждённых current-Stage defects не найдено.
- Exact-head CI `40301421307` — SUCCESS. PR239 open и mergeable; итог опубликован в [comment 6413609303](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6413609303).
- PR239 merged владельцем; merge commit/current main: `8f56479890f63000149354820a6b5162bb9de492`. Visual acceptance и production/external actions этим merge не заявляются.

- Пакеты1–3 merged. [PR #239](https://github.com/iliya1947/vico-forum/pull/239) merged из stable exact head `780ba72043d4edb227c299f0f7e0cc9ab15c0f0f` в main merge commit `8f56479890f63000149354820a6b5162bb9de492`.
- По [назначению6412640448](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6412640448) Лёва реализовал bounded correction LEVA-PR239-A7D2954-01. Прежний цикл наa7d2954 завершился Мира FINDING/Лира PASS/Мишаня PASS/Лёва CHANGES REQUIRED; verdicts относятся к прежнему head.
- `replaceAttachmentImageId` использует exact destination token spans существующего Markdown parser вместо regex по всему image/definition. Bare reference EOF и destination-like label теперь меняют только actual active URL. Labels,titles,code,ordinary links,unused/shadowed definitions сохраняются. Существующий mapping current/past/future сохраняет Undo/Redo; attachment operation/File/selection/Remove и server gates не менялись. Новых schema/migrations/dependencies/endpoints/permissions нет.
- Correction4files/150additions/15deletions; whole PR43files/1166additions/66deletions. PROJECT_STATE обновлён. Local1076app/300nativePG PASS; targeted61 PASS. Девять новых source cases воспроизвели дефект до исправления. TypeScript,lint(1existingwarning),обе сборки,migration-history guard0new и local built Worker smoke PASS.
- Chromium обеих форм PASS: actual built Worker edit/nativePG, commit/lost response→upload410→fresh Retry201→stale409/rebase→Save; persisted body/publicref и inline image source используют NEW, label/Undo/Redo сохранены. Upload bridge — actual Node handler/PG с controlled session и synthetic byte storage; image bytes — controlled PNG response fixture. Это не download-handler/R2/provider E2E или owner visual acceptance. Local Worker/PG остановлены.
- **[Exact-head CI40301421307](https://github.com/iliya1947/vico-forum/actions/runs/40301421307) SUCCESS; checks121499966129/database121499965589 SUCCESS** на780ba720.
- [Полный авторский correction report и limits](https://github.com/iliya194/vico-forum/blob/29e0bd41b7055ad4504919372aca603702c3b8f1/.github/agents/codex-6.1-sol.md). **Лира завершила независимую whole-PR source-level проверку 8 групп и всех bounded correction chains на `780ba720`: PASS, новых confirmed current-Stage findings не обнаружено.** [Отчёт Лиры](https://github.com/iliya194/vico-forum/blob/1665433d6e1d30af3b33597dd23b6695799c5e1e/.github/agents/chatgpt-6.md). Exact-head CI Лира сверила самостоятельно; собственные Chromium/PG runs не выполняла. Остальные independent/final verdicts нового head и merge-ready статус пока не установлены. Первоначальный automatic publication rejection разрешён read-only доказательством отсутствия изменений в уже публичном PROJECT_STATE; тот же GitHub tool затем принял payload. Блокера публикации нет.
- **Следующий шаг:** Мира координирует оставшиеся проверки PR #239 на `780ba720` и согласование итогового verdict. PASS Лиры опубликован; whole-team approval и merge не заявлены. Пакеты4–11 не начаты, production/external/visual actions не выполнялись. PR236 никогда не merge.

## Завершённый пакет 2 — auth/session/identity

- [PR #238](https://github.com/iliya1947/vico-forum/pull/238) merged владельцем; merge `f59785c50e91fc1615b568b74a0a56909a92c871`.
- Final implementation head `3d6fe4d178d87e0697d531c962f784296f169d80`, включая AUTH-LINK-STALE-IDENTITY-01 correction (alias PR238-LIRA-01).
- Независимые whole-PR проверки Миры и Лиры — без findings; [CI40213325914](https://github.com/iliya1947/vico-forum/actions/runs/40213325914) SUCCESS,997app/291PG PASS.
- Финальная самопроверка автора Лёвы отменена владельцем ([6400838057](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6400838057)); В проверке PR238 Мишаня по тогдашнему решению владельца не участвовал; это исторический статус того пакета.
- External Google/provider/production/visual acceptance этим merge не заявляются.

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

### Принятый fix-plan — 11 implementation PR

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

Полный execution plan Миры с required result и done criteria опубликован в PR #236 comment `6397105809`. Coverage: **61/61 technical + 2/2 preview + 4/4 docs**. Лира в FPLAN-T1 (`6397337524`) приняла 11-PR decomposition без split/merge и добавила два acceptance-уточнения, которые Мира приняла: PR2/AUTH-LINK-01 должен явно проверять отсутствие небезопасного implicit linking только по unverified same-email; PR6/ATTACH-04 должен явно сохранять несохранённый текст и остальные selected files при selective Remove. План принят; текущая implementation-последовательность следует ему.

Общие границы:
- каждый PR bounded и строится от уже принятого актуального `main`;
- implementation и whole-PR review разделены;
- exact-head checks/review выполняются для каждого implementation PR отдельно;
- owner visual acceptance и production/external rollout не запускаются автоматически;
- deferred/future findings не возвращаются в current scope без нового основания.

### Текущий implementation status

1. PR237 /пакет1 merged, merge `ab4d29e8853b216d4aef6c22f1fc373fed8ebf0d`.
2. PR238 /пакет2 merged, current main `f59785c50e91fc1615b568b74a0a56909a92c871`.
3. PR239 / пакет3 merged; current main `8f56479890f63000149354820a6b5162bb9de492`.
4. Package4 передан Мишане; implementation ещё не завершён. Пакеты5–11 не начаты.

### Принятые scope и границы пакета2

Лёва реализовал **PR 2 — Auth/session/identity behavior** в PR238 от актуального `main`. Ниже сохранены его принятый scope и границы.

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

Мишаня реализует package4 от current main `8f56479890f63000149354820a6b5162bb9de492` по handoff в #236. После его handoff — проверить stable exact head и начать предусмотренный review cycle. PR236 никогда не merge.
