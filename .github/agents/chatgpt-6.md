## PR #248 — независимый whole-PR review / exact head e428833 (2026-10-28)

**Назначение Миры:** [#6469831600](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6469831600). Implementation [PR #248](https://github.com/iliya1947/vico-forum/pull/248), exact head `e428833b6452f0cb09b25d5ffc4fda76b39d4238`, base `2ff3aeb3c8feeab3df4b674d711ff3845c09b0e0`. Independent four-part code review of all 18 changed paths and all seven L7 findings: `EDITOR-03`, `EDITOR-06`, `EDITOR-07`, `EDITOR-11`, `RES-EDITOR-02`, `MARKDOWN-CUSTOM-STRUCTURE-DIVERGENCE-01`, `MARKDOWN-SPOILER-01`. No implementation changes.

### Verdict — CHANGES REQUIRED / 1 current-Stage finding (translation structure policy compatibility)

**Finding — MARKDOWN-CUSTOM-STRUCTURE-DIVERGENCE-01: previously persisted same-revision translations may remain selected despite changed table/spoiler protection policy.**

The new `parseRenderedForumMarkdown` + `serializeRenderedForumMarkdown` pipeline now protects each table cell and spoiler literal title/body separately; `CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION` advances from `cnt06-quote-attribution-v1` to `cnt06-custom-structure-v2` (`app/forum/semantic-markdown.ts`, `app/localization/content-markdown-translation.ts`). Newly generated tasks include the new policy in identity/fingerprint and the consumer preflight rejects mismatched task versions (`app/localization/content-post-body-planning.ts`, `content-post-body-task-consumer.ts`). Those parts are correct, but **already persisted translations are not versioned by this policy**.

The persisted `StoredContentTranslation` shape and `selectCurrentContentTranslation()` in `app/localization/content-translation.ts` require same revision/locale, valid provenance/sourceLocale, nonblank content and quote-attribution equality, **not current table/spoiler structure or protection policy**. `ContentTranslationPresentationService` calls that selector and may display the previous-policy result; `ContentPostBodyTranslationPlanner.planAndDispatch` and the transactional `DrizzleContentPostBodyPlanningStore.upsertPending` return `translation-current` before replacement generation, and `contentPostBodyTaskPreflight` / execution use the same selector. A persisted prior-policy same-revision translation whose table/spoiler structure differs from the original can therefore remain visible and suppress the new protection path. No schema change is proposed as a solution here.

**Classification:** current-Stage conditional correctness gap in the existing durable translation/read path, rather than future-stage infrastructure; relevant when prior-policy translations exist. Actual persisted records and browser manifestation were **not** checked; this is a source-verified causal chain, not an observed production incident. Independent regression requested: persist or mock a same-revision pre-v2 machine translation with changed table/spoiler structure, check public selection and planning, ensure protection-v2 behavior without discarding valid/manual translations merely because of version changes. Scope/solution to reconcile with Мира, rather than mandate redesign.

### Other scope results and verification boundary

No further confirmed current-Stage findings from source review for `EDITOR-03` (Clear, repeated-strike/punctuation/link), `EDITOR-06` (Enter), `RES-EDITOR-02` (Backspace/direction/history), `EDITOR-07` (exclusive-end code Tab), `EDITOR-11` (raw Markdown publication through writer/service/PostgreSQL), and `MARKDOWN-SPOILER-01` (fence-aware index). Source-reviewed mention recipients/table cell parsing, spoiler title/body translation, undo/redo, and test coverage. `LOC-08` is outside L7.

[Exact-head CI #40689282340](https://github.com/iliya1947/vico-forum/actions/runs/40689282340): SUCCESS, jobs `checks` + `database` succeeded; author-reported 1250 application / 326 PG17 tests. Independently inspected Github job outcomes but **did not personally execute** project TypeScript/Chromium/PostgreSQL suites. Algorithm comparison of spoiler closer logic was an independent model, not the project runtime. Production, external resources and owner visual acceptance not performed.

Owner authorized publication after the complete independent verdict. This personal journal and the PR #236 communication comment contain the finding; no updates to shared accepted-state channel until reconciliation. PR #248 remains unchanged; Лира STOP.

---

# Лира (ChatGPT-6) — личный журнал проверок

## PR #248 — независимый whole-PR review / exact head 5e562539 (2026-10-28)

**Назначение Миры:** [#6457535857](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6457535857). **Implementation:** [PR #248](https://github.com/iliya1947/vico-forum/pull/248), stable exact head `5e5625390501753edb07c323b8c662cec9902474`, base `2ff3aeb3c8feeab3df4b674d711ff3845c09b0e0`, open, not Draft, mergeable. Проверены 18 diff paths, 7 L7 findings. Это новый независимый 4-этапный review после Lёвиного bounded correction `EDITOR-03`; предыдущие verdict на `c87ca0e` сюда не применяются.

### Исправленный личный verdict — CHANGES REQUIRED / 1 confirmed current-Stage family: EDITOR-03

В конце собственного четырёхэтапного whole-PR review Лира сообщила разработчику **APPROVE / 0 findings**. **До публикации** стало доступно новое независимое [заключение Мишани #6467515414](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6467515414) на **том же exact head**. Лира отдельно перепроверила reproducer по текущим source-edit functions (child-first `clearInlineMarkdownFormatting`, `remainingSourceBoundary`, `protectSelectedAttentionBoundaries`, `applySourceEditPlan`) и семантику GFM. Исходный APPROVE **отозван**, публикуется только amended CHANGES REQUIRED. До завершения собственного independent review выводы Мишани не использовались.

**Finding, P2 / residual EDITOR-03 — repeated nested strike / punctuation boundary.** Исходник `~~**~~a (b)~~**~~` (valid parsed `delete → strong → delete → text "a (b)"`). Выделить только `a` (source range `[6,7)`) и применить Clear formatting. Сопоставление current implementation с вручную заданными nested positional nodes даёт **`a ~~**~~(b)~~**~~`**. Child-first удаляет три opening delimiters `~~**~~` перед `a` и на surviving suffix вставляет те же три delimiters `~~**~~` после пробела. `protectSelectedAttentionBoundaries` не включает encoding выбранной `a`: ближайшие neighboring markers не приводят к его punctuation condition. Независимый markdown-it parser с enabled strikethrough подтверждает: оригинал распознаёт `del → strong → del`, а transformed output распознаёт `"a " + del("**") + "(b)" + del("**")`. Невыделенный `(b)` теряет три уровня форматирования, показываются буквальные `**`. Это нарушение selected-only `EDITOR-03` в текущем editor, не future-only и не новая отдельная defect family.

**Предел подтверждения Лиры:** собственная проверка — JS reproduction *эквивалентного* исходного source-edit plan с точными AST source offsets и отдельный markdown-it parser; не запуск оригинальной TypeScript-функции либо original project GFM runtime. Мишаня отдельно сообщил original project parser-path reproduction и 216 failures / 82 604 partial selections, но эти числа **не воспроизводились Лирой**. Признание finding основано на конкретном independently проверенном scenario, а не только совпадении чужих conclusions.

### Полная область L7

1. `EDITOR-03` — **CHANGES REQUIRED** для valid repeated `delete → strong/emphasis → delete` path, punctuation / partial Clear; ранее corrected double nesting `~~**alpha beta**~~` cases, link whitespace, Unicode boundaries по проверенным controls PASS.
2. `EDITOR-06` — Enter with nested formatting and source-selection/Undo: новых current-Stage findings нет.
3. `RES-EDITOR-02` — Backspace paragraph join, explicit LTR/RTL precedence, history: новых findings нет.
4. `EDITOR-07` — Tab/Shift+Tab exclusive end, closing fence: новых findings нет.
5. `EDITOR-11` — raw initial section/Help/reply body through action/writer/PG, content-emptiness validation separate: новых findings нет.
6. `MARKDOWN-CUSTOM-STRUCTURE-DIVERGENCE-01` — обе половины: renderer-compatible recipient extraction (table cells / spoiler title and body) и protected translation structure + policy `cnt06-custom-structure-v2`: новых findings нет.
7. `MARKDOWN-SPOILER-01` — bounded fence-aware closer indexing, prior grammar semantics: новых findings нет. Для independent algorithm comparison Лира проверила 12 000 deterministic inputs / 23 885 comparisons без расхождений с prior sequential scan. `LOC-08` — L8, не L7.

### CI и охват

[Exact-head GitHub Actions #40592508871](https://github.com/iliya1947/vico-forum/actions/runs/40592508871): `pull_request`, completed **SUCCESS**, `checks` job `122500070291` — **1205/1205 app tests, 102 files**, включая `editor-document`79, `markdown-editor`106, `write-actions`45, `technical-markdown`10, `mentions`6, `content-markdown-translation`15; `database` job `122500071007` — **326/326 PG17 tests, 30 files**, включая native markdown publication3; оба full logs прочитаны. Typecheck/lint (0 errors, 1 nonblocking warning), app/UI-preview builds, migration guard, schema parity 49 tables, runtime permission probes, built Worker smoke PASS. Database ERROR/FATAL — negative-case probes; Node20 deprecation warning — GitHub Actions dependency, не current L7 defect. Green CI не опровергает непокрытую repeated strike комбинацию.

Все 18 PR changed paths сверены с base; code source and regressions reviewed во всех 4 этапах. Самостоятельного actual Chromium, native PG/Workerd, production/external, owner visual acceptance Лира не выполняла; actual original project TS test данного edge case Лира не запускала. Авторские browser controls не представляются как self-run. Implementation/main не изменялись; merge не выполнялся.

**Координатору Мире:** сопоставить amended verdict с independent [finding Мишани #6467515414](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6467515414), провести согласование текущего `EDITOR-03` family и определить только justified bounded correction. До reconciliation **не** записывать новую позицию как утверждённый team verdict в shared communication. Лира STOP; это личное заключение, не разрешение на merge.


---

## PR #247 — bounded LITERAL-TEXT-01 native Simple indentation correction (2026-10-27)

**Назначение Миры:** [#6454119080](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6454119080). Existing Draft [PR #247](https://github.com/iliya1947/vico-forum/pull/247), branch `chatgpt6/batch-l2-20261027`, prior head `894f9719bfb19028b788560a75d42b3163dde740`, base `2ff3aeb3c8feeab3df4b674d711ff3845c09b0e0`. Исправлен только один assigned current-Stage defect `LITERAL-TEXT-01`: multiple leading tabs / 4spaces+tab during native Simple editing are not safely treated as literal text.

**Three-step outcome:**
1. Source diagnosis: `escapeVisualMarkdownText` previously prefixed first leading whitespace with structural entity `&#9;` / `&#32;`, then called `clipboardPlainToMarkdown` on remainder without context; remainder starting `\t` or `   \t` was interpreted as genuine indented code by `textAsMarkdown`, returning unescaped `&copy;` and GFM `~~literal~~`. Main baseline also compared, bounded correction avoids global clipboard semantics change.
2. [Implementation commit `51e2301d9c5e3aca5b5238a7681878b1a4199829`](https://github.com/iliya1947/vico-forum/commit/51e2301d9c5e3aca5b5238a7681878b1a4199829): exactly **three files** `app/forum/visual-markdown-editor.tsx` (+7/-1), `app/forum/markdown-editor.test.tsx` (+44), `PROJECT_STATE.md` (+9/-2). `escapeVisualMarkdownText` now calls unchanged `clipboardPlainToMarkdown(value.slice(1), { markdown: structuralPrefix, selection: {start: structuralPrefix.length,end:structuralPrefix.length} })`; candidate parsed with actual structural prefix treats remainder as prose so entities/GFM are escaped. Clipboard plain/rich/TSV implementations unchanged; Advanced raw source unchanged.
3. Four mounted/pure test cases added: native Simple `\t\t&copy; ~~literal~~` and `    \t&copy; ~~literal~~`, source + FormData + published `ForumMarkdown` literal outcome + leaf focus, and Advanced intentional indented code for same two sources. Existing simple typing and paste controls remain. Test source and current commit diff re-read and exact head checked.

**[Exact-head CI #40589705256](https://github.com/iliya194/vico-forum/actions/runs/40589705256): completed SUCCESS**, pull_request head `51e2301d9c5e3aca5b5238a7681878b1a4199829`, base `2ff3aeb3c8feeab3df4b674d711ff3845c09b0e0`. Read both completed job logs: checks job `122490424584` **1211/1211 app tests, 102 files PASS** (markdown-editor 115 tests, clipboard 25), lint 0 errors / 1 preexisting unused-disable warning, typecheck, app and UI-preview builds, migration guard, production schema checks PASS. Database job `122490425213` **323/323 PostgreSQL17 tests, 29 files PASS**, 49 table schema manifest/permissions, built Workers smoke PASS. PostgreSQL ERROR/FATAL diagnostics are expected negative-case assertions; no test failures.

**Boundaries:** No independent local real Chromium/native PG/Workerd or live/external/provider/production/owner visual testing in this correction; tests executed by CI on exact head, not claimed personally. Owner visual acceptance, whole-PR independent review and merge are not complete. PR #247 remains Draft and open. No L7/PR #248 implementation, schema/migrations, dependencies or unrelated project code changed. No new implementation branch; reused assigned PR #247 existing branch.

**Status:** bounded LITERAL-TEXT-01 correction and CI verification complete. **Лира as implementer STOP**; Мира coordinates applicable independent whole-PR review on this stable head and remaining PR #247 acceptance. No self-review verdict and no merge.


---

## PR #248 — новый независимый whole-PR cycle / head c87ca0ed (2026-10-27)

**Поручение:** Мира, [служебный комментарий #6452383742](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6452383742). **Область:** полный [implementation PR #248](https://github.com/iliya1947/vico-forum/pull/248), все 18 paths и 7 L7 findings, после bounded correction автора Лёвы; base `2ff3aeb3c8feeab3df4b674d711ff3845c09b0e0`; **stable exact head `c87ca0ed6e0ec669ac6c97d5c68d547980e6541d`**. Лира не участвовала в L7 implementation. Head открыт, не Draft, mergeable; повторно сверялся перед публикацией.

### Итоговый личный verdict — CHANGES REQUIRED: 1 current-Stage defect в EDITOR-03

Четыре заявленных этапа whole-PR просмотра выполнены: source-of-truth / карта diff; bounded editor correction Clear/Enter/Backspace; оставшиеся Tab, initial body, mentions+translation semantic parsing, spoiler boundedness; exact-head CI/comprehensive diff/test coverage. Первоначально собственный verdict Лиры по этим четырём этапам был APPROVE/0 defects. **До публикации**, после полной собственной проверки, в служебном PR появился независимый [finding Мишани #6453500452](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6453500452), относящийся к этому exact head. Лира проверила полученный **новый** сценарий по исходному `clearInlineMarkdownFormatting` и отдельно по markdown-parser semantics: **первоначальное APPROVE уточнено до CHANGES REQUIRED**. Нельзя публиковать старый verdict без оговорки.

**P2 / EDITOR-03 — nested GFM strikethrough + strong partial Clear formatting.** Minimal source `~~**alpha beta**~~`; выделение только первого символа `a` (source range `[4,5)`); Clear formatting. Преобразование child-first посещает strong, удаляет `**` перед `alpha` и вставляет повторный `**` перед `lpha`; outer delete считает левую часть пустой после удаления child delimiters, удаляет opening `~~`, но сохраняет closing `~~`. Получается точный output source **`a~~**lpha beta**~~`**. Этот output получен Лирой в отдельном минимальном воспроизведении того же source edit plan с явно заданными AST-позициями для корректно распарсенного вложенного узла; отдельный markdown-it parser подтвердил, что новая `~~`-пара становится буквальной, зачёркивание невыделенного `lpha beta` пропадает. Это *не* исполнение оригинальных TypeScript-функций / оригинального GFM-компонента; Мишаня независимо сообщил и о фактическом parser-path воспроизведении в проекте. В отличие от частичной очистки только выделенного текста, source-результат повреждает невыделенный формат — нарушение текущего [docs/EDITOR.md §3](https://github.com/iliya1947/vico-forum/blob/main/docs/EDITOR.md).

**Классификация:** confirmed current Stage, поддерживаемая комбинация toolbar strong + strikethrough, не future-only. Один defect family в EDITOR-03; иных independently confirmed current-Stage defects в остальных шести findings нет. Вторая последовательность с выделением `l` и численность перебора 224 принадлежит отчёту Мишани, Лира эти значения самостоятельно не воспроизводила и не выдаёт за собственные.

**Результат трех ранее согласованных bounded correction families:** nested strong/emphasis + link whitespace scenarios EDITOR-03, boundary Enter EDITOR-06 и previous manual direction RES-EDITOR-02 по проверенным source paths и новым helper/mounted regressions выглядят исправленными. Новый strikethrough subcase в тестах не покрыт, поэтому green CI не исключает finding. Остальные L7: EDITOR-07 exclusive code selection boundary, EDITOR-11 initial publication fidelity до PostgreSQL, MARKDOWN-CUSTOM-STRUCTURE-DIVERGENCE-01 (оба обязательных: mention recipients и structural translation protection), MARKDOWN-SPOILER-01 fence-aware bounded parser, без новых findings. `LOC-08` — L8, исключён из L7.

### Whole-PR coverage и CI

Проверены все 18 changed paths: `PROJECT_STATE.md`, `actions.server.ts`, `editor-document.ts` и tests, `markdown-editor.tsx` и tests, `visual-markdown-editor.tsx`, `mentions.ts` и tests, `semantic-markdown.ts`, `technical-markdown.ts` и tests, `content-markdown-translation.ts` и tests, `write-actions.test.ts`, `docs/translation/CONTENT_TRANSLATION.md`, `tests/database/forum-markdown-publication.test.ts`, `tsconfig.node.json`. Старая проверка версии `16f4b955` не заменяла новый 4-этапный cycle. На новом head changed 4 files относительно старого: editor-document source/tests, markdown-editor component tests, PROJECT_STATE. Никаких migrations/schema/dependency changes в diff не обнаружено.

**[Exact-head CI #40573112857](https://github.com/iliya1947/vico-forum/actions/runs/40573112857), event pull_request, head c87ca0ed: SUCCESS.** Обе completed job logs лично прочитаны: checks `122432285927` — **1179 application tests, 102 files PASS**, включая editor-document60 / markdown-editor99 / mentions6 / technical-markdown10 / translation15 / write-actions45; database `122432286421` — **326 PostgreSQL17 tests, 30 files PASS**, включая native markdown publication3; lint 0 errors/1 nonblocking existing unused-disable warning, typecheck, app/UI-preview builds, 49-table parity/migration/privileges, Workerd smoke PASS. Логи негативных PG constraint/permission/auth rejection являются ожидаемыми тестовыми probes, jobs SUCCESS.

**Личные границы:** не запускались original TS app tests, полноценный native PostgreSQL / actual project Chromium / local Workerd, external/cloud/production, owner visual acceptance. Лира не присваивает себе локальные Chromium/PG проверки автора и Мишани. Минимальное source-transform reproduction + локальный независимый markdown-it parser — отдельная диагностика, не actual project/GFM execution. CI доказывает прохождение существующих тестов, но не корректность непокрытой delimiter-комбинации.

**Координатору Мире:** зарегистрировать **расхождение исходного APPROVE Лиры и позднее проверенного EDITOR-03 finding** с явным correction вердикта; сопоставить воспроизведение с Мишаней и согласовать bounded correction в пределах текущего Stage, не расширяя L7. Это личное заключение Лиры, не общий team verdict/merge permission. Implementation PR/main не менялись, merge не выполнялся. **Лира STOP.**


---

## PR #248 — independent whole-PR review L7 (2026-10-27)

**Назначение:** Мира, [PR #236 #6448730200](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6448730200). Независимый whole-PR review [implementation PR #248](https://github.com/iliya1947/vico-forum/pull/248); автор Лёва, Лира не участвовала в реализации. Проверенная стабильная версия **`16f4b955c364e38ddc77dfce0cb4a995b4577bc3`**, base **`2ff3aeb3c8feeab3df4b674d711ff3845c09b0e0`**, PR open, non-draft, mergeable, head не изменялся на всём протяжении проверки.

**Личный verdict Лиры: APPROVE / PASS — 0 подтверждённых current-Stage defects.** Это личная независимая оценка заданного scope, не team synthesis, не merge authorization. Четыре этапа: (1) требования/main/карта полных 18 изменённых путей; (2) редактор source edits/history/публикация; (3) renderer-compatible custom structure, mentions, translation, spoiler boundedness; (4) сверка CI/тестов/интеграций/документации.

### Проверка по всем семи findings L7

1. **EDITOR-03**: `clearInlineMarkdownFormatting` на частичных selections корректирует delimiter positions при пробелах и преобразует underscore delimiters в допустимые asterisks на пересечениях; непомеченный исходник и технические конструкции не подвергаются глобальной сериализации. Проверены pure source/selection regressions, включая nested/link/whitespace и unselected formatting.
2. **EDITOR-06**: Simple native Enter в editable visual leaves использует `insertVisualParagraph`, закрывает/переоткрывает inline wrappers вокруг границы, сохраняет source prefix/suffix и делает одну запись Undo; source selection восстановляется через общую editor history. Checked pure+mounted scenarios (strong/emphasis/delete/link/nesting, CRLF-neighbor, native selection across leaves/blocks).
3. **RES-EDITOR-02**: `joinVisualParagraph` выполняет Backspace join только между обычными paragraph blocks, не стирает heading/list/code/table boundaries, рекурсивно учитывает тело spoiler, схлопывает одинаковые wrappers, сохраняет whitespace/source/history; mounted Backspace и Undo подтверждают integration path.
4. **EDITOR-07**: `codeKey` обрабатывает exclusive `selection.end` при выделении целых code lines; не добавляет/убирает отступы строки за правой границей и closing fence. Pure/mounted multi-line Tab/Shift+Tab и Undo regressions.
5. **EDITOR-11**: Проверена цепочка `actions.server.ts` -> `publicationBody` -> `ForumWriter` -> `ForumService.normalizeRevision` -> `DrizzleForumRepository` -> `forum_post_revisions.original_content`. `trim()` применяется только к content/blank validation, raw Markdown (CRLF/leading/trailing whitespace/indented code) записывается без нормализации. Проверены section topic, Help question, reply, idempotent publication, реальные disposable PG regressions.
6. **MARKDOWN-CUSTOM-STRUCTURE-DIVERGENCE-01** — обе требуемые части: `parseRenderedForumMarkdown` использует те же `segmentTechnicalMarkdown` и cell/body parsing границы, что `ForumMarkdown`; summary буквальный text. `publishedMentionRecipients` исключает spoiler title, quotes/code/HTML/images и dedupe по immutable profile ID, учитывает independent table cells. `protectMarkdownForTranslation` работает на той же структурной AST; policy `cnt06-custom-structure-v2`, protected tokens/segment IDs, structure signature и repair/fallback checks препятствуют изменению table/spoiler skeleton, human text (в том числе literal title) переводится без исполнения Markdown в summary. Прочитаны pure, mounted и native PG notification tests. Отдельный `LOC-08` является L8 scope и не включён.
7. **MARKDOWN-SPOILER-01**: `spoilerClosingLines` precomputes fence-aware closers с monotone width frontier, исключая повторные suffix scans для многих незакрытых `:::spoiler`; проверены fenced closing markers, width/type matching, отсутствие closers, bounded RegExp work 1000 unmatched openers. Рендерер и semantic consumers используют тот же segmenter.

### Whole-diff, CI и границы

**Diff 18 путей** сверен целиком: `PROJECT_STATE.md`, actions, editor source/tests, visual editor, mentions/tests, новый `semantic-markdown.ts`, technical-markdown source/tests, write-actions tests, content-translation source/tests, profile translation contract, новый `tests/database/forum-markdown-publication.test.ts`, `tsconfig.node.json`. Не найдено подтверждённых несвязанных runtime/schema/dependency changes или current-Stage regressions в проверенной реализации. `PROJECT_STATE.md` соответствует L7 пакету, `docs/translation/CONTENT_TRANSLATION.md` описывает renderer-compatible tables/spoilers и policy version.

**[Exact-head CI #40548381709](https://github.com/iliya1947/vico-forum/actions/runs/40548381709): SUCCESS**, PR event на reviewed exact head, jobs `checks 122345095310`, `database 122345094684` complete SUCCESS. Полные завершённые логи обеих jobs прочитаны: **1152 application tests /102 files PASS**, **326 PostgreSQL17 tests /30 files PASS**; lint (0 errors, 1 existing unused eslint-disable warning), TS typecheck, app/UI-preview builds, migration/schema 49-table manifest/privilege probes, split-authority/recovery checks, built Worker smoke PASS. В DB logs есть ожидаемые diagnostic negative-case errors / initial smoke connection attempts, но шаги завершены successfully и тесты 0 failed.

**Что лично не выполнялось:** полные локальные PostgreSQL/Workerd runs, local Chromium/native keyboard, external/provider/production, owner visual acceptance, merge. Автор сообщает собственные local Chromium/PG/grammar checks, но они не считаются независимо повторёнными Лирой. Источники независимого вывода: исходники/тесты на exact head, контроль потоков и записи, GitHub exact-head CI logs и проверка сопоставимых boundary cases. Green CI не был единственным критерием.

**Статус:** личная проверка Лиры завершена, implementation/PR #248/main не изменялись. После разрешения владельца результат публикуется в служебном PR #236 для координатора Миры; команде ещё требуется согласовать все reviewer verdicts и оставшиеся acceptance boundaries. **Лира STOP.**

---

## Batch L2 / EDITOR-04 — branch permission blocker (2026-10-27)

Owner task: [#6428906267](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6428906267). Baseline main `bff130db5fb245e3a9ad3391fad54a2fe81aac88`. Requested **step 1/5 only**: explicit feedback when spreadsheet conversion declines but clipboard text is retained losslessly; no changes to successful conversion or ordinary plain paste. Steps EDITOR-10/LITERAL-TEXT-01/LOC-03/LOC-06 not started.

Mandatory explicit branch gate: no new implementation branch without separate owner approval; reuse existing **safely suitable** implementation branch if available, otherwise report blocker and STOP. Inspected all 102 GitHub branch names (two pages) and all open PRs (only PR #236 and legacy PR #122, both service, neither implementation). Former relevant implementation PR #241/#243/#244 are merged; their branches are not present among current branches. Remaining named branches belong to older unrelated closed scopes / previews or service work. No safe existing implementation branch/PR for EDITOR-04; resetting/reusing one would create risk of repurposing unrelated branch and still require a new implementation PR. User's continuation `...` is not separate explicit authorization for branch creation.

**No repository edits, no new branch, no implementation PR, no CI, no review.** Only service coordination record. STOP pending owner approval to create an implementation branch from current main. Lira does not continue step 2 or other scopes.

---

## PR #244 — integration-only LOC-04 after merged #241/#243 (2026-10-26)

- Assignment [#6428231373](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6428231373). Old independently reviewed head `7c750ba8bfa0d0efc9d6046395a97d033c64d6a5`, main after PR241+243 `9ceead2a035c95c47c15573db039f43aca0739ce`. New exact head **`9643f6cb433c432a93b3aa7ce07c9533f7f2f00f`** in original PR244 branch `chatgpt6/loc04-history-loading-20261026`. True two-parent merge commit: parents [old reviewed LOC-04 head, current main].
- Recovered old LOC-04 patch and independently inspected all six paths. State file: exactly original 14-line LOC-04 block prepended before Batch L1 in full current main PROJECT_STATE; removing LOC04 block gives byte-exact main. Public UI regression: exactly original 43-line mounted test inserted into current main `app/forum/public-read.test.tsx` without touching Package5 cases. `views.tsx`: exact single t-key replacement for pending post history only. Canonical descriptor, reviewed source fingerprint and RU/HE values: exact original additions. For each path, applying only original edit to current main retains all other bytes. `manual-values.ts` resulting blob SHA **identical to original LOC-04 head**.
- Compared original PR244 diff against old base with new PR244 diff against main: **exact same six paths, same per-file +/- stats, and exact same added/removed lines (Git patches; all 6 matched)**. No product logic or LOC04 contract change, and no external schema/dependency change. All current main BatchL1/Package5 implementation retained.
- Final PR244 head verified; GitHub `mergeable=true`, `mergeable_state=clean`, base `9ceead2a035c95c47c15573db039f43aca0739ce`.
- [Exact-head CI #40408705757](https://github.com/iliya1947/vico-forum/actions/runs/40408705757) **SUCCESS**, both checks/database jobs SUCCESS; 1095 application tests/102 files PASS, 304 native PG tests/28 files PASS; typecheck, lint (0 errors, 1 prior warning), both builds, migration/schema/Workers CI guards succeed. No own local PostgreSQL, browser, external/production or owner visual. Result is handoff only; Lira did not self-review or merge. STOP.

---

## PR #243 — integration-only merge after PR #241 (2026-10-26)

Assignment [#6427256502](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6427256502). Merged main commit `28cdc6ddec13fcc58dc0094ad0dc7d75696bc7cd`; original independently reviewed PR #243 head `d5f992602fcc78276155a63aa14f56b931dd7656`. New exact head **`e2255f484705c147828ec0d5837c4d255d9e58c6`**, existing branch `chatgpt6/batch-l1-20261026`.

- Verified Git diffs: package 5/main and Batch L1 overlap **only** in `PROJECT_STATE.md`; all 17 Batch L1 implementation/test paths are distinct from Package 5 changes.
- `PROJECT_STATE.md` on old PR243 was byte-exact previous baseline plus one contiguous 3,003-character (49 lines) Batch L1 block. Resolved by inserting this block byte-exact before Package 5 into **entire current main document**, preserving all Package 5 text; removing inserted block restores current main state exactly.
- Created true 2-parent merge commit (parents original PR243 head and new main), tree built from new main with the **unchanged original Git blob SHAs for all 17 Batch L1 implementation and test files**. Comparing old head against old base and new head against new main: same 17 paths and identical per-file additions/deletions; PROJECT_STATE only adds the same 49 lines. No implementation changes, no new PR or unrelated files.
- GitHub PR #243 at exact head: `mergeable=true`, `mergeable_state=clean`; base `28cdc6ddec13fcc58dc0094ad0dc7d75696bc7cd`.
- [Exact-head CI #40402017209](https://github.com/iliya1947/vico-forum/actions/runs/40402017209): **SUCCESS**, both `checks` and `database` jobs SUCCESS. 1094 application tests in 102 files, 304 PostgreSQL17 tests in 28 files; lint 0 errors/1 pre-existing warning, typecheck, builds and schema/Worker CI checks pass.
- Local tests/browser/PG or external/production/owner visual acceptance not performed by Lira. Existing Mira/Leva whole-PR PASS on implementation remains applicable because exact implementation blobs and requirements have not changed. No self-review or merge. PR #244 not touched. **STOP.**

---

## PR #241 / HELP-01 + DOC-03 — correction завершена (2026-10-26)

**Основание:** retry assignment [#6425922733](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6425922733) после tool failure; первоначальное [#6425661622](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6425661622). Исходный stable head `f5cdf71837aee78a31856c766c087c9bbf54a496`. Исправления в существующем [PR #241](https://github.com/iliya1947/vico-forum/pull/241) / branch `codex/package-5-help-tags`, финальный implementation exact head **`aa41937edf6ce32d74bed27d39c9d7c43aa1eecf`**.

### HELP-01 — что исправлено
- Author `appealHelpDuplicate` не имел observed relationship identity: после R1→R2 stale форма могла создать pending appeal у R2. В `TopicView` передаётся `expectedRelationshipId` скрытым полем; loader отдаёт его только автору данного вопроса в отдельном `appealExpectedRelationshipId`, тогда как прежняя приватизация `topic.duplicateRelationshipId` для non-manager сохраняется.
- `topicAction` требует непустую identity (400 при отсутствии), `ForumWriter`/Hyperdrive/`ForumService` передают её. `DrizzleForumRepository` сравнивает observed ID с active relationship **после topic `FOR UPDATE` и relationship `FOR UPDATE`**, до чтения pending/insert, mismatch → `ForumStateConflictError` (HTTP409). No schema/migration/permissions/dependencies change.
- Application regressions: отсутствие ID →400/no write, stale write →409, current request forwards exact identity; route loader+mounted author form carries ID без раскрытия гостю.
- Новая real PG regression: R1/original-X removal → R2/original-Y; stale R1 intent отвергнут без pending appeal. Отдельно in-flight R2 intent ждёт locked topic, смена R2→R3 внутри blocker transaction, затем409/no appeal; current R3 appeal accepted and linked to R3. Существующий lifecycle test обновлён на explicit current relationship identity.

### DOC-03 — что исправлено
- Исправлены ровно две подтверждённые stale public-`Disputed` формулировки: historical paragraph в `PROJECT_STATE.md`, descriptor в `app/localization/catalog.ts`. Moderator-only pending badge; author видит собственное private pending appeal.
- RU `Оспаривается`/HE `במחלוקת` переводы подтверждены как семантически корректные; sidecar fingerprint `helpDuplicateDisputed` обновлён при осознанном review изменённого descriptor, чтобы действующие переводы не стали stale. Остальной каталог и runtime не менялись.
- `PROJECT_STATE.md` также фиксирует реализованную author appeal identity guard.

### CI / ограничения
- Первый exact-head commit `511b3094d4e33b47d78e10194b0a0ed0abca720d`, [run #40393276163](https://github.com/iliya1947/vico-forum/actions/runs/40393276163): FAIL (Typecheck + DB) из-за пропущенного обязательного `ForumWritePolicy.now` **только в двух новых test fixtures**. Тестовый clock исправлен, production unchanged.
- **Final [exact-head run #40393643866](https://github.com/iliya1947/vico-forum/actions/runs/40393643866): completed SUCCESS** на `aa41937edf6ce32d74bed27d39c9d7c43aa1eecf`, jobs `checks` и `database` SUCCESS. Checks: 102 application files /1081 tests PASS; database: 28 files/304 tests PASS; typecheck, lint, обе сборки, schema guards и local CI Worker smoke выполнены внутри Actions. Лира сверила CI и exact PR head через GitHub; собственные local PG/browser/Worker, external R2/production или owner visual не выполнялись.
- Результат — implementation handoff, **не** self-review/whole-PR verdict или merge authorization. PR #243/#244 Лира не меняла. Лира STOP; независимую проверку координирует Мира.

---

## PR #241 / HELP-01 — blocked handoff (2026-10-26)

Assignment #6425661622. Missing observed duplicate relationship ID across author form → action → writer → service → repository. Current repository locks topic and relationship, but matches only current active identity. A stale R1 form can therefore attach its appeal to replacement R2. Needed: expected ID in author-safe loader/form and writer path; compare after database lock; add replacement/current/lock regressions. Attempted bounded implementation could not be completed because the GitHub edit of `db/forum-service.ts` was blocked twice. All interim commits were reverted with lease; PR #241 restored to original exact head `f5cdf71837aee78a31856c766c087c9bbf54a496` (verified). DOC-03 not started, no new CI or review. STOP; Mira to coordinate further work.

---

## LOC-04 — post-history loading copy (2026-10-26)

**Назначение:** [PR #236, #6424272144](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6424272144). По owner exception выполнен самостоятельный bounded fix, не дожидаясь merge PR #243. Исходный main `4c4bb59c4b7e3c47a6598034b9bd75b6a06d032a`; [draft PR #244](https://github.com/iliya1947/vico-forum/pull/244), branch `chatgpt6/loc04-history-loading-20261026`; финальный implementation head **`7c750ba8bfa0d0efc9d6046395a97d033c64d6a5`**.

- **Причина:** в `app/forum/views.tsx` при `historyFetcher.state !== "idle"` история опубликованных версий ошибочно показывала текст `editorAttachmentRestoring` — «Restoring saved attachments…».
- **Исправление:** `TopicView` использует отдельный `postHistoryLoading` с canonical EN «Loading edit history…» и reviewed RU/HE локальными значениями. Fingerprint для двух переводов соответствует descriptor; существующий attachment key/текст не изменён. Locale runtime, routing, авторизация и post-history action не менялись.
- **Regression:** в `app/forum/public-read.test.tsx` mounted TopicRoute с настоящим React Router fetcher POST `readPostHistory` и задержанным ответом проверяет status, отсутствие attachment copy, сохранность attachment descriptor и показ ревизии после ответа. `PROJECT_STATE.md` обновлён, в scope только LOC-04.
- **CI:** exact-head [GitHub Actions #40380768112](https://github.com/iliya1947/vico-forum/actions/runs/40380768112) **SUCCESS**, jobs `checks` и `database` **SUCCESS** на `7c750ba8`. Лира сверила результат через GitHub. Собственные local browser/native PG, external R2/production/owner visual проверки не выполняла.
- PR #244 остаётся draft; independent whole-PR review и merge не начинала. PR #241 и PR #243 не изменяла. **STOP:** итог передан Мире для координации проверки.

---

## Batch L1 / EDITOR-02 (5/5) — implementation завершена 2026-10-26

**Назначение:** [#6423361282](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6423361282). Реализация: [draft PR #243](https://github.com/iliya1947/vico-forum/pull/243), branch `chatgpt6/batch-l1-20261026`, base `main 4c4bb59c4b7e3c47a6598034b9bd75b6a06d032a`. Исходный head fix5 `18633574e416102f71d702ea868116813ea53d11`; финальный implementation exact head **`d5f992602fcc78276155a63aa14f56b931dd7656`**.

### Root cause / изменение
- `serializeTable` для TSV и HTML конвертирует входные значения ячеек в Markdown. Прежний `encodeTableCell` экранировал только backslash/pipe и newline; поэтому `**literal**`, `[shown](url)`, тильды и entities повторно интерпретировались `ForumTable` через ReactMarkdown.
- `technical-markdown.ts`: literal cell encoder экранирует backslash-escapable ASCII punctuation CommonMark после существующей newline normalisation; generated structural row separator `---` остаётся неизменённым. `decodeTableCell` восстанавливает text в Simple table input. Исходный Markdown, введённый вручную, не меняется.
- `visual-markdown-editor.tsx`: input отображает литералы без escape-символов и вновь сериализует их при явной правке.
- Добавлены regressions: `technical-markdown.test.ts`, `markdown.test.tsx`, `markdown-editor.test.tsx`. Проверены TSV/HTML literal rendering, exact values, pipe/backslash/newline, редактирование в mounted Simple editor; прежний manual rich Markdown table rendering test остаётся без изменения.
- `PROJECT_STATE.md` обновлён до 5/5, PR description — implementation complete.

### CI и ограничения
- Initial [CI #40374663915](https://github.com/iliya194/vico-forum/actions/runs/40374663915): `database` SUCCESS, `checks` FAILED из-за ошибки fix5 при экранировании generated `---` separator; исправлена структура, не за счёт ослабления тестов.
- Next [CI #40375017118](https://github.com/iliya194/vico-forum/actions/runs/40375017118): `database` SUCCESS, `checks` FAILED только на unsupported `toHaveValue(expect.stringContaining())` в новом regression; source/renderer tests прошли, assertion исправлен без изменения production code.
- **Final exact-head [CI #40375402307](https://github.com/iliya1947/vico-forum/actions/runs/40375402307): completed SUCCESS, `checks` SUCCESS, `database` SUCCESS** на `d5f992602fcc78276155a63aa14f56b931dd7656`. Лично сверено через GitHub CI. Own local Chromium/Worker/PG и external R2/production/owner visual не запускались.
- Batch L1 все пять локальных fixes реализованы и CI-verified, но это не independent whole-PR review. PR #243 остаётся draft, merge не выполнялся. PR #241 не изменён. **STOP:** следующий этап — координация whole-PR review Мирой.

---

## Batch L1 / EDITOR-01 (4/5) — 2026-10-26

Исправление HTML-вставки пустых строк кода реализовано в [PR #243](https://github.com/iliya1947/vico-forum/pull/243). Code head: `18633574e416102f71d702ea868116813ea53d11`.
Нормализация переноса строк теперь не затрагивает fenced blocks из pre; проза нормализуется по-прежнему. Включены две целевые Markdown AST регрессии. `PROJECT_STATE.md` обновлён.
[Exact-head CI #40368663361](https://github.com/iliya1947/vico-forum/actions/runs/40368663361): SUCCESS, checks и database SUCCESS. Прямой Chromium/runtime запуск не выполнялся.
Batch 4/5; EDITOR-02 не начат. PR243 draft, whole-PR review и merge не начинались.
[Handoff в PR #236](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6422923447). STOP.

---

## Batch L1 / ATTACH-HTTP-405-01 — fix 3/5 завершён (2026-10-26)

**Назначение:** [PR #236 comment #6422256497](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6422256497). Продолжение [draft PR #243](https://github.com/iliya1947/vico-forum/pull/243), branch `chatgpt6/batch-l1-20261026`, base `main 4c4bb59c4b7e3c47a6598034b9bd75b6a06d032a`. Новый exact implementation head: **`95fd8648aab5b63a9afc3194efd3a3150ef27c51`**.

### Причинная цепочка и локальное исправление

- В [registered resource route](https://github.com/iliya1947/vico-forum/blob/95fd8648aab5b63a9afc3194efd3a3150ef27c51/app/routes.ts) `api/attachments` у `loader` есть GET, у `action` POST и whole-operation DELETE. GET/HEAD requests направляются framework resource routing в loader, PATCH/PUT/DELETE — в action (см. официальный React Router resource route contract).
- `app/routes/attachment-upload.ts`: guards `loader: method!==GET` и `action: method not POST/DELETE` возвращали `405` c JSON `error: method`, но **без обязательного `Allow`**. Retired per-file DELETE также возвращал 405 без Allow. Наличие метода в action само по себе не означает permission к конкретной операции с per-file DELETE.
- Добавлена одна `methodNotAllowed()`, которая сохраняет прежний `json(...,405)`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` и устанавливает **`Allow: GET, POST, DELETE`**. Три существующих unsupported-method branches используют один ответ. Не менялись authz, upload method semantics, body streaming, server private R2, resource registration и supported GET/POST/DELETE.
- `app/routes/attachment-upload.test.ts`: новый тест вызывает **настоящий React Router `createStaticHandler.queryRoute`** на path, взятом из `app/routes.ts`, с настоящими `loader`/`action` exports и контролируемым `RouterContextProvider`. Проверяет HEAD/PATCH/PUT/OPTIONS → 405 + `Allow` + no-store/nosniff, а также GET list → 200, DELETE whole operation cancel → 200 и POST upload → 201. Оставлены старые direct-handler tests и все security/streaming regressions.
- `PROJECT_STATE.md` обновлён: зафиксированы только 3/5 завершённых fixes, два последних по-прежнему unstarted.

### Verification и границы

- [CI #40366182831](https://github.com/iliya1947/vico-forum/actions/runs/40366182831), точный `head_sha=95fd8648aab5b63a9afc3194efd3a3150ef27c51`: **completed / SUCCESS**, оба jobs `checks` и `database` **SUCCESS** (проверено Лирой в GitHub).
- Это actual router-dispatch unit/integration test в CI, не собственный deployed Worker/HTTP smoke и не Chromium. Лично локальные tests, PostgreSQL, реальный R2 или внешние сервисы не запускала. Никаких новых схем БД, библиотек или permissions.
- Batch L1: **3/5 завершено** — `ATTACH-03`, `ATTACH-04`, `ATTACH-HTTP-405-01`. `EDITOR-01` и `EDITOR-02` не выполнялись. [PR #243](https://github.com/iliya194/vico-forum/pull/243) остаётся **draft, не merge-ready**, whole-PR review не инициирован, production/owner visual не выполнялись; PR #241 не изменён. **STOP** до отдельного назначения fix 4/5.

---

## Batch L1 / ATTACH-04 — fix 2/5 завершён (2026-10-26)

**Назначение:** [PR #236 comment #6421809155](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6421809155), продолжение того же [draft PR #243](https://github.com/iliya1947/vico-forum/pull/243). Base `main 4c4bb59c4b7e3c47a6598034b9bd75b6a06d032a`; новый exact implementation head `739f6b1be2ba3413a2a2e4fe979459037ad76090`. `ATTACH-03` остаётся первой завершённой подзадачей; выполнена **только** вторая `ATTACH-04`.

### Причина и изменение

- `app/forum/editor-attachments.tsx`: прежний UI скрывал `Remove` для `uploading/selecting`; `remove()` запрещал `uploading`. Из-за этого пользователь не мог снять отдельный pending-файл без удаления всей operation. Текущий `Remove` доступен во время uploading/selecting (кроме глобально disabled/removing), удаляет только выбранный entry из mounted selection, вызывает существующий `removeImage`, оставляет unsaved Markdown/Undo/Redo, остальные pending/stored files и operation.
- Запрос не прерывается и остаётся в `requestsRef` до завершения или whole Cancel. `ignoredRequestsRef: WeakSet<XMLHttpRequest>` маркирует удалённый in-flight request; его progress/success/error/terminal-410 callbacks не меняют selected UI. Особенно важно: late `410 gone` после Remove в published edit **не** вызывает `freshOperation` и не abort'ит остающиеся uploads. Private server pool продолжает обычную retention/completion/idle cleanup, per-file DELETE не вводился.
- `app/forum/editor-attachments.test.tsx`: две mounted MarkdownEditor регрессии (три одновременно выбранных файла + текст без сохранения, один stored и один still-pending); Remove третьего selection не блокирует, late 201/error/progress не возвращает удалённый файл, remaining upload доходит до stored, текущее тело, selected IDs и operation сохраняются. Прежний assertion об отсутствии Remove при uploading обновлён.
- `app/forum/attachment-operation.test.tsx`: отдельная регрессия published-edit: один из двух pending uploads удалён, его late `410 gone` не меняет operation и не abort'ит второй; сохранённый второй upload по обычному 201 снимает blocking. Existing whole `Cancel`, retry/rebase, account isolation и completed-ack regressions остаются.
- `PROJECT_STATE.md` обновлён: отмечены только ATTACH-03 и ATTACH-04; 3–5 пока не начаты.

### Проверки и ограничения

- На head `020b1b852889a3fdc09905e7c462f82ee7835aa5` первый [CI #40363579052](https://github.com/iliya194/vico-forum/actions/runs/40363579052) завершился checks FAILURE, database SUCCESS: единственный падающий тест `app/forum/editor-attachments.test.tsx:165` утверждал отсутствие кнопки `Remove` в uploading. Новые ATTACH-04 тесты PASS; failure определён по exact job logs и устаревший assertion исправлен, runtime-механизм в ответ на него не переделывался.
- [Финальный exact-head CI #40364010321](https://github.com/iliya194/vico-forum/actions/runs/40364010321) на `739f6b1be2ba3413a2a2e4fe979459037ad76090` — **completed / SUCCESS**; jobs **checks SUCCESS**, **database SUCCESS**. Сверено Лирой непосредственно через GitHub.
- Локального checkout/локальных PostgreSQL или Chromium tests не запускала; evidence — исходники, focused regressions и GitHub CI. Real R2/network/backend cleanup/owner visual/production не заявляются.
- PR #243 остаётся **draft**, whole-PR review и merge не начинались; `ATTACH-HTTP-405-01`, `EDITOR-01`, `EDITOR-02` не выполнялись. PR #241 не меняла.
- **STOP** после fix 2/5. Продолжение только после отдельного назначения fix 3/5.

---

## Batch L1 / ATTACH-03 — fix 1/5 завершён (2026-10-26)

**Implementation**: [Draft PR #243](https://github.com/iliya194/vico-forum/pull/243), branch `chatgpt6/batch-l1-20261026`. Baseline `main 4c4bb59c4b7e3c47a6598034b9bd75b6a06d032a`; exact implementation head `ecafe086ec5e769c54ee152a368397ea2d45c613`. Назначение: [PR #236 comment #6421152256](https://github.com/iliya194/vico-forum/pull/236#issuecomment-6421152256).

**Scope: только `ATTACH-03`.** Валидный пустой ненулевой TAR без `ustar` header не проходил prefix detection: только два 512-byte zero end-of-archive blocks, therefore `unknown/signature-mismatch` при поддерживаемом `.tar`. Устранён дефект:
- `app/forum/attachment-validation.ts`: `detectAttachmentContent` распознаёт два полных 512-byte zero blocks как TAR, сохраняя приоритет forbidden/executable signatures, проверки filename extension, MIME, size и structural validation.
- `app/forum/attachment-container-validation.ts`: для пустого TAR проверяются все trailing zero bytes ограниченными ranged reads (не более 64 KiB за запрос), а не только первые два нулевых блока; nonzero trailing bytes отвергаются. Для non-empty TAR существующий path не изменён.
- `app/forum/attachment-validation.test.ts`: valid 1024-byte zero TAR; one block rejection; unsupported extension/MIME mismatch.
- `app/forum/attachment-container-validation.test.ts`: valid 1024/10240-byte empty archives, rejected truncated/poisoned padding and bounded ranged reads.
- `app/forum/attachment-r2.test.ts`: private R2 adapter accepts valid empty 10240-byte TAR and deletes poisoned archive after `invalid-structure`.
- `PROJECT_STATE.md`: зафиксирован только текущий ATTACH-03 и незавершённость batch L1.

**Проверки:** [exact-head CI #40360530171](https://github.com/iliya1947/vico-forum/actions/runs/40360530171) `completed / success` на `ecafe086ec5e769c54ee152a368397ea2d45c613`; jobs **`checks` PASS**, **`database` PASS**. CI лично сверена через GitHub. Локальные tests не запускала: работа сделана через GitHub connector, собственного checkout/Test Runner нет. Не выдаю CI за independent review или owner acceptance.

**Ограничения и STOP:** PR #243 — **draft**, implementation-incomplete. `ATTACH-04`, `ATTACH-HTTP-405-01`, `EDITOR-01`, `EDITOR-02` не начинались. Review cycle и merge до выполнения всех пяти fixes не запускать. PR #241 не изменяла; real R2, production, owner visual не использовала. Следующий fix только по отдельному назначению Миры. **STOP.**

---

## PR #241 — independent whole-PR review пакета 5 на `f5cdf718` (2026-10-26)

**Вердикт Лиры: PASS по независимой проверке исходного кода, diff и регрессионного покрытия.** Новых подтверждённых дефектов текущего Stage в назначенном scope не обнаружено. Этот verdict не является командным consensus или разрешением merge. Публикация сделана **по прямой команде разработчика**; на момент проверки служебных записей завершение параллельной проверки Лёвы не было опубликовано, и результаты других reviewers в основание вердикта Лиры не принимались.

- Implementation: [PR #241](https://github.com/iliya1947/vico-forum/pull/241).
- Stable exact head: `f5cdf71837aee78a31856c766c087c9bbf54a496`.
- Base: `main 1364d5768906c6746c4397c615f846797051eb76`.
- Назначение: [PR #236, comment #6419772533](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6419772533).
- Scope: `HELP-01`, `HELP-02`, `HELP-MOD-01`, `TAG-CARDINALITY-01`, documentation sidecar `DOC-03`; whole diff 14 файлов, +353/−42. Проверены source/action/service/repository/render paths, изменённые tests и их границы, связанные source-of-truth. Это не аудит всего репозитория.

### Проверенные causal chains

1. **HELP-01 — stale appeals и duplicate relationships.** Moderation forms передают `expectedAppealId` и `expectedRelationshipId`; `topicAction`, `ForumWriter`, `ForumService`, `DrizzleForumRepository` последовательно проводят expected identity. Repository сравнивает её с authoritative pending appeal/active relationship после topic/relationship locks внутри transaction и выдаёт `ForumStateConflictError` без применения к более новой сущности. Проверены тесты replaced appeal/reconfirmed relationship, сохранения нового state, и отсутствие раскрытия relationship ID неуполномоченным topic-loader actor.
2. **HELP-MOD-01 — stale current best answer.** Moderator controls `markSolutionNeedsReview`, `markSolutionOutdated`, `clearSolutionModeration` передают `expectedBestAnswerPostId`; после `FOR UPDATE` на topic repository сверяет точный `bestAnswerPostId` и только затем меняет status/reason выбранного post. Сохранены Help-specific solved/resource checks; regression заменённого best answer отвергает stale action без изменения текущего target. Предыдущий сброс uncontrolled outdated textarea по authoritative state остаётся.
3. **HELP-02 — lock wait/inverted lifecycle timestamps.** В `removeHelpDuplicate` и `resolveHelpDuplicateAppeal` `statement_timestamp()` вычисляется в выполняемых UPDATE после получения locks вместо transaction-start `now()`; post-lock write не предшествует вновь созданному `confirmed_at/created_at`. Native PostgreSQL regressions используют отдельные connections, `pg_stat_activity.wait_event_type=Lock`, изменение соответствующей временной метки до release и успешное завершение lifecycle transition.
4. **TAG-CARDINALITY-01 — unbounded persisted global tags.** `ForumService.normalizeForumTags` выполняет NFKC, trim, whitespace collapse, case-fold unique keys и требует ≤10 unique non-empty tags; 11-й приводит к `InvalidForumContentError` **до** repository call/insert. Проверены пути createTopic/createTopicWithInitialPost и public write; тесты 10 accepted, пустые/case-duplicates ignored, 11 rejected, no topic/global-tag persistence.
5. **DOC-03 — pending Disputed visibility.** Текущий `docs/UI_UX_PASS.md` однозначно называет moderator-only badge для Help lists и topic; runtime `HelpQuestionCards` gating и `TopicView` проверяет management permission. Duplicate author видит собственное pending appeal message без badge; application tests покрывают Guest/Author/Manager. **Остаточный исторический documentation drift:** в более раннем PR #205 историческом абзаце `PROJECT_STATE.md` ещё содержится формулировка «публично видна ... Disputed», хотя соседний более поздний текст и актуальный contract говорят moderator-only. Это подлежит окончательной current-state документационной очистке `DOC-01`; не подтверждает runtime defect пакета 5 и не меняет актуальное правило.

### Evidence, exclusions и границы

- [GitHub Actions run #40345202786](https://github.com/iliya194/vico-forum/actions/runs/40345202786): `completed / success` на точном SHA `f5cdf71837aee78a31856c766c087c9bbf54a496`; `database` и `checks` SUCCESS. Проверено независимо Лирой.
- Автор в implementation handoff сообщает **102 application files / 1080 tests PASS**, **28 disposable PostgreSQL files / 303 tests PASS**, TypeScript, lint (0 ошибок/1 старое warning), production/UI Preview builds, migration/history guard, clean/mergeable PR. Это **не собственные локальные запуски Лиры**; лично PostgreSQL, Chromium, Pages, внешние сервисы или owner visual acceptance не запускала.
- Изменений schema/migration/dependencies нет. Во время review `PR #241` и `main` не изменяла. Следующие самостоятельные проверки и сводка Миры остаются отдельными этапами. Служебный PR #236 не merge.
- **STOP.**

---

## PR #240 — независимая whole-PR проверка пакета 4 на `ec954ac5` (2026-10-26)

**Вердикт Лиры: PASS по независимо просмотренным исходникам, миграционным контрактам и регрессионным тестам.** В заданном current-Stage scope новых подтверждённых дефектов не установлено. Вердикт относится только к стабильному implementation head `ec954ac55a140c5cee7cb66b5b7d6ca4537b9480`.

- Implementation: [PR #240](https://github.com/iliya1947/vico-forum/pull/240).
- Base: `main 8f56479890f63000149354820a6b5162bb9de492`.
- Назначение: [PR #236 comment #6414799836](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6414799836).
- Scope: `DB-01`, `DB-02`, `DB-03`, `CORE-01`, `CORE-02`, `CORE-03`, documentation sidecar `DOC-02`.
- Whole diff: **18 файлов**, +5532/−15 (включая большой Drizzle migration snapshot); изучены все per-file patches, затронутые runtime пути и relevant regression tests. Это проверка ограниченного package 4, не новая полная ревизия всего форума.

### Сверка шести causal chains

1. **DB-01 — allowance metadata с частичным NULL.** Прежняя `CHECK`-ветка могла дать SQL UNKNOWN вместо FALSE. `db/schema.ts` и append-only `drizzle/0045_audit_database_notifications_read_state.sql` требуют `allowance_state`, `allowance_generation`, `allowance_attempt` не `NULL` в активной ветви, сохраняя ограничения на leasing/admitted/deferred и inactive-null shape. Сверены `0045_snapshot.json`, migration journal и PostgreSQL regressions трёх NULL-вариантов с ожидаемым `23514`.

2. **DB-02 — drift частичных индексов.** `.github/scripts/production-schema-manifest.mjs` читает `pg_index.indpred` и `pg_get_expr`, включает `predicateSha256` в structural index manifest, null для обычного индекса. Manifest `.github/production-schema-manifest.json` фиксирует predicate hashes для partial indexes; unit regression меняет predicate и ожидает rejection manifest comparator. CI включает новый тестовый файл.

3. **DB-03 — runtime права на read-state relation.** В web runtime privilege contract добавлены `SELECT`, `INSERT`, `UPDATE` для `forum_topic_read_states`, соответствующие читающей и записывающей сторонам `readTopicReadState`/`advanceTopicReadState`; правило отражено в `docs/database/HYPERDRIVE.md`. Сверены тесты capability contract и author-reported PostgreSQL positive/negative privileges.

4. **CORE-01 — crossed concurrent replies.** В `enforceForumWriteCooldown` mutex на строке Better Auth user переключён с `FOR UPDATE` на `FOR NO KEY UPDATE`, сохранив per-author serialization, но сняв конфликт с recipient `KEY SHARE` при FK-check в двух встречных reply transactions. Новая native PostgreSQL regression запускает параллельные replies на двух соединениях после обоих author locks и требует создания обеих notifications; остальная writer transaction/receipt/notifications chain рассмотрена.

5. **CORE-02 — unreachable older unread из-за LIMIT 50.** `readReplyNotifications` сортирует сначала `read_at IS NULL`, затем `createdAt DESC, id DESC`, оставляя limit=50; individual `markReplyNotificationRead` и `countUnreadReplyNotifications` остаются прежними. Старое unread за первой пятидесяткой появляется по мере прочтения новых. PostgreSQL regression с 51 уведомлением проверяет достижимость последнего unread и снижение total badge count до нуля. UI `NotificationsView` и route action с redirect рассмотрены; самостоятельная pagination не вводилась и текущим критерием не требуется.

6. **CORE-03 — marker не впереди доставленного topic snapshot.** `TopicView` формирует `deliveredLatestPostId` из последнего `topic.posts`, полученного `readTopicPage`, а не из отдельного `readTopicReadState().latestPostId`, который мог увидеть concurrent append. `markTopicRead` передаёт именно доставленный post ID; repository `advanceTopicReadState` сохраняет монотонное продвижение. React route regression подставляет более новый state cursor, чем доставленные posts, и проверяет фактически отправленный `postId`.

### DOC-02 и evidence limits

- `docs/EDITOR.md`, `docs/database/HYPERDRIVE.md`, `PROJECT_STATE.md`, `PROJECT_HISTORY.md` синхронизированы с новой append-only `0045`, отменённой старой draft snapshot proposal и актуальными DB/read-state контрактами. Прежние миграции не изменены. Нет обнаруженного current-Stage несоответствия между проверенными файлами.
- [Exact-head CI #40311315111](https://github.com/iliya194/vico-forum/actions/runs/40311315111) **лично сверена Лирой**: `head_sha=ec954ac55a140c5cee7cb66b5b7d6ca4537b9480`, status `completed`, conclusion `success`; jobs `checks` и `database` SUCCESS.
- Автор сообщает **1077 application и 303 disposable PostgreSQL tests PASS**, schema parity 47 public tables, runtime privilege probes, TypeScript, lint (0 errors/1 existing warning), application/UI Preview builds, migration guard. Эти локальные runs **не выполнялись Лирой**. Chromium, внешняя инфраструктура и visual acceptance также не выполнялись Лирой.
- Положительный code-review verdict не доказывает отсутствие неизвестных дефектов и сам по себе не означает согласованный командный review или разрешение merge.
- PR #240, `main` и файлы других агентов не меняла. Заключение передано разработчику в чате и, после его явного разрешения, опубликовано в личном файле PR #236. **STOP.**

---

## PR #239 — независимая whole-PR проверка `780ba720` (2026-10-26)

**Вердикт Лиры: PASS по исходному коду, сопутствующим regression tests и exact-head CI.** Новых подтверждённых дефектов текущего Stage в назначенном scope не обнаружено. Это вердикт **исключительно** для implementation head `780ba72043d4edb227c299f0f7e0cc9ab15c0f0f`; он не переопределяет исторические результаты старых heads.

- Implementation: [PR #239](https://github.com/iliya1947/vico-forum/pull/239), base `main f59785c50e91fc1615b568b74a0a56909a92c871`.
- Назначение Миры: [PR #236, комментарий #6413025394](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6413025394).
- Whole PR: 43 changed files, +1166/−66; последняя correction относительно `a7d29546`: 4 changed files (implementation `app/forum/editor-document.ts`, regressions `app/forum/editor-document.test.ts` и `app/forum/edit-recovery.test.tsx`, `PROJECT_STATE.md`), +150/−15.
- Проверка scope выполнена самостоятельно по source paths, patches, тестам и требованиям текущего продукта: `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `docs/EDITOR.md`, `docs/auth/AUTHORIZATION.md`. Implementation не изменяла.

### Результаты whole-scope проверки

1. **`ARCH-01`:** `runForumMutation` и PostgreSQL writer отделяют typed storage unavailability от неожиданных ошибок и domain conflicts; unknown errors не превращаются в synthetic `503`.
2. **`ARCH-03`:** best-effort cleanup PostgreSQL client/pool в forum/auth/authorization не должен заменять исходный результат/ошибку; смежные regression cases изучены.
3. **`POST-EDIT-AVAIL-01`, `FORUM-READ-AVAIL-01`:** primary read loaders/защищённый edit-resume выдают controlled `503` только для распознанных dependency outages; unexpected SQL и mapper faults идут в общий error path. Optional presence остаётся отдельно деградируемым.
4. **`SEC-01`:** safe route diagnostics ограничены error kind, allowlisted SQLSTATE и координатами stack; raw SQL, submitted content и query parameters не записываются в sink.
5. **`XR-THROWN-ACTION-BUFFER`:** browser client actions защищают mounted editor buffer при unexpected server/transport failure; abort и redirects не подменяются ошибкой editor.
6. **`EDITOR-PUB-01`:** stale published-edit `409` предоставляет актуальную public revision для явного rebase без замены in-memory text/attachments; reload/baseline freshness fence проверены.
7. **`EDITOR-PUB-02`:** edit-specific conflict feedback не подменяет сообщения о чужих topic-level `409`.
8. **Цепочки bounded corrections:** completed publication modified replay vs identical idempotent replay, unrelated `409`, lost ACK + terminal upload `410 gone` + fresh Retry + stale `409` + rebase/Save, а также последняя `LEVA-PR239-A7D2954-01` — проверены с регрессионным покрытием и зависимостями.

### LEVA-PR239-A7D2954-01: image destination при Retry/re-key

Предыдущее решение могло оставить старый URL в bare reference definition в EOF или заменить похожий текст в alt/code label вместо actual URL. На новом head `replaceAttachmentImageId` в `app/forum/editor-document.ts` фиксирует точные source spans destination tokens штатного Markdown parser (`mdast-util-from-markdown` + `forumMarkdownFromOptions`), а затем переписывает только действительно активные URL: inline image или definition, используемое imageReference. Первый действующий definition для идентификатора приоритетен; неподключённые/shadowed definitions, обычные links, alt text, code spans, titles не затрагиваются.

Сопоставлены новые source regressions для bare definitions с EOF и переводами строк, destination-like alt/title, full/collapsed/case-insensitive image references, escaped/entity-encoded destinations и inert definitions. Mounted `TopicRoute` tests проверяют обе проблемные формы через `commit → lost response → new image upload 410 → fresh Retry / new asset 201 → stale 409 → rebase → Save`; сохранение выбранного `File`, текущего Markdown, Undo/Redo, корректного submitted body и видимого изображения в `ForumMarkdown`. Путь `retry → replaceImage` переписывает current/past/future history, не удаляя текст.

Других кодовых изменений после предыдущего independently reviewed head `a7d29546`, кроме указанной correction и тестов/PROJECT_STATE, нет; предыдущие package3 механизмы дополнительно прослежены. Новых подтверждённых current-Stage findings не установлено.

### Проверки и границы доказательств

- [GitHub Actions #40301421307](https://github.com/iliya194/vico-forum/actions/runs/40301421307) **проверен Лирой:** completed / SUCCESS на `780ba72043d4edb227c299f0f7e0cc9ab15c0f0f`; jobs `checks` и `database` оба SUCCESS.
- Автор correction сообщает о `1076` application и `300` native PostgreSQL tests PASS, `61` targeted PASS, Chromium двух полных сценариев PASS с built Worker/native PostgreSQL. Это **не личные локальные запуски Лиры**. В авторских browser probes synthetic bytes/upload bridge и fixture для image response; внешний R2/download-provider/production acceptance не заявляется.
- Лира самостоятельно не запускала Chromium, PostgreSQL, собственный browser E2E, внешний сервис или owner visual acceptance. **PASS — source-level technical review, а не собственное runtime-acceptance и не общекомандное разрешение merge.**
- Все findings/verdicts более ранних heads остаются историческими; прежний пропущенный дефект `LEVA-PR239-A7D2954-01` признан действовавшим на `a7d2954` и проверен после correction.
- Main и implementation PR #239 не меняла. Дальнейшую координацию финальных проверок ведёт Мира. **STOP.**

---

## PR #239 — whole-PR review на `a7d29546` (2026-10-26)

**Итог: PASS по независимой проверке source/diff/regression cases на этом exact head.** Новых подтверждённых дефектов текущего Stage в назначенном scope не обнаружено. Действие относится **только** к `a7d29546f334a59d42b30b10c67c32595ea98ec1`; прежний PASS по `998715b` был обоснованно отозван и не восстанавливается задним числом.

- Implementation: [PR #239](https://github.com/iliya1947/vico-forum/pull/239).
- Exact implementation head: `a7d29546f334a59d42b30b10c67c32595ea98ec1`.
- Base: `main f59785c50e91fc1615b568b74a0a56909a92c871`.
- Назначение: [PR #236, комментарий #6404891780](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6404891780).
- Нынешний whole diff: 43 changed files; последняя correction: 7 files / 219 additions / 12 deletions, parent `998715bbf0c531432673f027e5c260722e29b9ea`.
- Сопоставлены весь перечень изменений PR, соответствующие patches, source paths и regression tests с package3 и `docs/EDITOR.md`, `docs/auth/AUTHORIZATION.md`, `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`.

### Полный package3 scope

1. **`ARCH-01`:** `runForumMutation` различает known domain/typed unavailable и unexpected fault; unexpected writer/programming error не маскируется как controlled storage outage. Writer adapter повторно выбрасывает unknown faults.
2. **`ARCH-03`:** `bestEffortDiscardClient` применяется в PostgreSQL reader/writer, Better Auth и authorization; rejected/synchronously throwing cleanup не заменяет уже определённый result или исходное исключение.
3. **`POST-EDIT-AVAIL-01`, `FORUM-READ-AVAIL-01`:** primary forum reads/post-edit loader превращают только typed `ForumStorageUnavailableError`/`AuthorizationUnavailableError` в no-store 503; остальные errors propagate; optional online-presence path продолжает degrade отдельно.
4. **`SEC-01`:** `reportRouteError` использует safe exception kind, allowlisted SQLSTATE и локальные stack coordinates; raw messages, query parameters, unpublished text и SQL не передаются в sink.
5. **`XR-THROWN-ACTION-BUFFER`:** `editorClientAction` преобразует thrown transport/server faults в action error `unexpected` (500), удерживая mounted browser editor; redirects и aborted navigation не перехватываются.
6. **`EDITOR-PUB-01`:** при edit conflict сервер перечитывает актуальную public revision; UI показывает её отдельно от текущего in-memory buffer, сохраняет исходный expected revision до explicit rebase; более новый loader state вытесняет stale recovery snapshot.
7. **`EDITOR-PUB-02`:** `postEditConflict` показывается только для реального edit result или edit identity guard, а не любого 409 при открытом редакторе.

### Три correction chains

- **Committed edit / lost response / modified publication replay:** repository различает `ForumPublicationReplayConflictError`, action возвращает `completedOperationId`; explicit rebase меняет завершённую operation на свежую. Повторный идентичный replay остаётся идемпотентным.
- **Unrelated topic-level 409:** markSolved/solution feedback не подменяется edit-specific copy; mounted editor buffer остаётся.
- **`MIRA-PR239-998715-01`:** typed upload `410 {error:"gone"}` в published-edit flow вызывает `freshOperation()` до Retry. Failed и параллельные upload entries сохраняют `File`, становятся retryable; Retry переопределяет asset ID в другой operation и, для активных изображений, обновляет их destinations во всей history. Save остаётся заблокирован до завершения uploads, но теперь Retry снимает блокировку без удаления файла. Последующий ordinary stale `409` делает baseline rebase **без ещё одной смены** fresh operation; committed public attachment retained однажды, private duplicate убран, Remove intent сохраняется. Late ACK подавляется identity fence. Не-published edit и другие ошибки загрузки не вызывают ротации.
- Перепроверены новые cases в `app/forum/attachment-operation.test.tsx`, `app/forum/edit-recovery.test.tsx`, `tests/database/forum-attachments.test.ts`, плюс регрессии previous corrections и других scoped paths.

### Доказательства и ограничения

- GitHub Actions [exact-head run #40243954305](https://github.com/iliya194/vico-forum/actions/runs/40243954305) **самостоятельно сверена Лирой:** `head_sha=a7d29546f334a59d42b30b10c67c32595ea98ec1`; `status=completed`, `conclusion=success`.
- Автор реализации сообщает `1065` application, `300` native PostgreSQL PASS, targeted `31` UI, typecheck, lint, builds, local Worker/PG and Chromium scenario PASS. Это **не личные запуски Лиры**.
- Отдельная проверка Мишани [#6405118900](https://github.com/iliya194/vico-forum/pull/236#issuecomment-6405118900) опубликована позже; совпадение с ней не служило основанием собственного вердикта Лиры.
- Лира **не запускала лично** Chromium/browser E2E, PostgreSQL suite, external R2/provider/production, owner visual acceptance. Для browser upload bridge автор применял synthetic byte storage; реальную external интеграцию этот PASS не подтверждает.
- Это code review в рамках package3, не полная новая проверка всего форума. PASS Лиры **не означает** whole-team approval, merge authorization или отсутствие любых гипотетических дефектов.
- Implementation PR #239, `main`, чужие personal files не изменяла. Итог передан в служебный PR #236 по разрешению владельца; дальнейшую координацию ведёт Мира. **STOP.**

---

## PR #239 — уточнение вердикта по exact head `998715bbf0c531432673f027e5c260722e29b9ea` (2026-10-25)

**ИТОГОВЫЙ СТАТУС ЛИРЫ: FINDING, прежний PASS ОТОЗВАН.** После исходной whole-PR проверки Мира независимо выявила новый сценарий `MIRA-PR239-998715-01` и отдельно поручила Лире перепроверить только эту цепочку: [назначение и исходная диагностика](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6403596151). Лира проследила путь самостоятельно на том же exact implementation head. **Один подтверждённый current-Stage defect** в recovery опубликованной правки. Это уточнение к ранее опубликованному PASS, а не новый полный whole-PR review и не отдельный второй дефект.

### MIRA-PR239-998715-01 — подтверждение Лиры: новый upload блокирует recovery после потерянного Save response

**Сценарий:** сервер успел закоммитить редактирование опубликованного post и retire publication operation, но клиент не получил ответ. Пользователь, сохраняя открытый editor и его in-memory text, добавляет новый файл до повторного Save.

**Прослеженная причинная цепочка:**
1. `db/forum-repository.ts` в успешной publication transaction вызывает `finishPublishedDraft`, который через `retireAttachmentDraftGeneration` сохраняет terminal marker для старого `editorOperationId`. Отсутствие HTTP ACK само по себе не меняет ID в mounted editor.
2. `app/forum/editor-attachments.tsx`: `startUpload()` берёт `draftId`/headers из текущего hook; на этой стадии они всё ещё относятся к завершённой operation.
3. `db/forum-attachments.ts`: `createDraftAttachment()` после scope lock вызывает `resolveAttachmentDraftGeneration()`; `db/attachment-draft-generation.ts` обнаруживает terminal marker и бросает `ForumAttachmentDraftConflictError("gone")`. `app/routes/attachment-upload.ts` возвращает HTTP `410`.
4. `useEditorAttachments` сохраняет upload как error entry. Любой `status !== "stored"` задаёт `hasUnsettled=true` и `blocking=true`; `app/forum/markdown-editor.tsx` выставляет `publicationReady=false`. `TopicView` отключает Save по `!editReady`; submit handler редактора также защищает от обхода кнопки.
5. Новый operation ID для completed replay создаётся только в `rebasePublishedAttachments(completedOperationId)` после получения `completedOperationId` из `editPost 409`. Но из-за upload error штатный повторный Save не выполняется, и этот конфликт/явный rebase недостижим.
6. `retry(entry)` сохраняет старые operation/attachment IDs, если `entry.draftId === draftId` (что и происходит до rebase), поэтому повторяет `410`.

**Альтернативные пути:** автоматического переключения на fresh operation после `410` нет; простая revalidation публичной страницы сама ID не сбрасывает; кнопка явного rebase отображается только после conflict action, до которого нет доступа. Remove устраняет блокировку Save, но теряет выбранный новый attachment; Cancel/закрытие редактора также не сохраняет полный in-memory intent. Это обходы, не штатное восстановление.

**Текущее требование:** recovery после ambiguous committed edit должен оставаться достижимым, сохраняя текущий text/Undo/Redo и выбранные файлы. Пользователь должен иметь возможность завершить публикацию с новым вложением через корректную свежую operation без потери attachment intent; способ реализации оставлен исполнителю. Нужна целевая regression `commit→lost ACK→new upload before retry→successful recovery/Save`.

**Классификация:** подтверждённый функциональный дефект текущего Stage в пределах correction chain пакета 3; **PR #239 пока не готов к merge**. Других новых findings данной точечной проверкой не установлено.

**Граница доказательности:** source-level causal trace текущего exact head; Лира лично не запускала Chromium или PostgreSQL для этого сценария. Весь прежний отчёт ниже сохраняется как исторический результат и **не может читаться как действующий PASS**. Implementation PR #239 и main не изменялись. Передача дальнейших действий — через Миру в PR #236. **STOP.**

---

## Архив: PR #239, пакет 3 — первоначальный PASS (отозван уточнением выше)

**Результат: PASS по проверке исходников и представленных regression-материалов; новых подтверждённых current-Stage defects не установлено.**

- Implementation: [PR #239](https://github.com/iliya1947/vico-forum/pull/239).
- Exact head: `998715bbf0c531432673f027e5c260722e29b9ea`.
- Base: `main f59785c50e91fc1615b568b74a0a56909a92c871`.
- Назначение: [комментарий #6402585218](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6402585218).
- Старые review-вердикты относятся к `18c849c92eb597ccd39871914290cf6164fc209b`, на новый head не переносились.
- Проверка выполнена без изменения реализации и без публикации findings до разрешения владельца.

### Охват и проверенные механизмы

1. **`ARCH-01`** — `db/hyperdrive-forum.ts`, `app/forum/mutations.server.ts`: известные domain failures и typed storage unavailable отделены от unexpected SQL/programming faults; неожиданные ошибки повторно выбрасываются.
2. **`ARCH-03`** — `db/postgres-deadlines.ts`, `db/hyperdrive-forum.ts`, `db/hyperdrive-authorization.ts`, `app/auth/auth.server.ts`: best-effort `client.end()/pool.end()` не подменяет результат операции или исходную ошибку, в том числе при rejected/throwing cleanup.
3. **`POST-EDIT-AVAIL-01`, `FORUM-READ-AVAIL-01`** — `app/forum/read-availability.server.ts`, `app/routes/post-edit.ts` и public forum loaders: typed unavailable получает controlled no-store `503`, неожиданная ошибка сохраняется; optional presentation degradation не превращена в обязательный отказ primary read.
4. **`SEC-01`** — `app/server-logging.ts`, `app/entry.server.tsx`: журналирование `handleError` строится из allowlisted exception-kind/SQLSTATE/stack location, а не из текста ошибки, SQL, params или неопубликованного пользовательского содержимого.
5. **`XR-THROWN-ACTION-BUFFER`** — `app/forum/editor-action.ts` и client actions в authoring routes: thrown server/transport failure преобразуется в client action feedback `unexpected`/500, не заменяя mounted editor обычной route error boundary; redirects/aborts не поглощаются.
6. **`EDITOR-PUB-01`** — `app/forum/actions.server.ts`, `app/forum/views.tsx`: после failed `editPublishedPost` с known conflict запрашивается актуальная public revision того же post; до явного rebase сохраняются in-memory edit text, original expected revision, а более новый loader snapshot замещает устаревший conflict baseline.
7. **`EDITOR-PUB-02`** — `app/forum/mutations.server.ts`, `app/forum/views.tsx`: feedback `postEditConflict` выбирается по фактическому `operation:"postEdit"` или `intent:"editPost"` из identity guard, а не просто по наличию открытого редактора.
8. **Correction: committed edit / lost response / modified replay** — `db/forum-repository.ts` вводит subtype `ForumPublicationReplayConflictError`; edit action возвращает `completedOperationId`; rebase в mounted editor меняет только завершённую operation. Для файлов проверены порядок reconciliation public baseline/selected, Remove intent, File retry с новым asset ID и обновление активных image destinations в Undo/Redo истории.
9. **Correction: unrelated topic-level `409` при открытом editor** — обычный `markSolved` conflict остаётся solution-specific feedback; edit-specific текст привязан к фактическому edit result/guard.

Сопоставлены изменения 43 файлов PR, релевантные участки source, тестовые сценарии и контракт `docs/EDITOR.md`, `docs/auth/AUTHORIZATION.md`, `ROADMAP.md` и `PROJECT_STATE.md`. Оценка относится к перечисленным механизмам и текущему пакету, а не к новой полной проверке всего продукта.

### Evidence и границы

- Самостоятельно проверен GitHub Actions [run #40228496459](https://github.com/iliya1947/vico-forum/actions/runs/40228496459): `head_sha=998715bbf0c531432673f027e5c260722e29b9ea`, `checks=success`, `database=success`.
- Локальные результаты `1058 application / 298 PostgreSQL`, Chromium→built Worker→PG воспроизведения и остальные проверки — **отчёт автора реализации**, а не самостоятельно выполненные Лирой запуски.
- Лира лично не запускала PostgreSQL, Chromium/real Worker, provider/external R2 или production; новый browser E2E/visual acceptance не заявляется.
- Исходный код и проверки на head позволяют сделать вывод **«новых подтверждённых дефектов текущего Stage не найдено»**, но не доказывают отсутствие всех возможных ошибок или полного runtime acceptance.
- Прямого изменения `main` или implementation PR #239 Лира не выполняла.

**Вердикт:** PASS независимого code review в указанных границах. Review завершён; решение о дальнейшей координации/merge не принимаю. **STOP.**


## EDITOR-04 — Batch L2 step 1/5 implementation (2026-10-27)

Owner authorized creation of implementation branch `chatgpt6/batch-l2-20261027` from `main bff130db5fb245e3a9ad3391fad54a2fe81aac88`. Original assignment: #236 comment `6428906267`. Draft implementation PR [#246](https://github.com/iliya1947/vico-forum/pull/246), **exact implementation head `4196c36539e71b881f4ced4e1ef8e224acb3ea44`** (base `bff130db5fb245e3a9ad3391fad54a2fe81aac88`). Only `EDITOR-04` implemented.

**Cause and change.** `pasteSpreadsheet` previously called `replaceSourceRange(range, clipboardPlainToMarkdown(text))` when `spreadsheetToMarkdown` declined ambiguous/nonrectangular TSV. This safely preserved clipboard text, but `replaceSourceRange` clears generic paste-warning state. No feedback explained that table conversion was declined. Now a single typed `pasteNotice` distinguishes `fallback` (conversion declined, lossless literal text inserted) from `error` (cannot perform paste). The fallback notice is set *after* source replacement. Successful table conversion and ordinary plain paste continue clearing stale notices; no converter/serializer semantics changed. Introduced canonical `editorPastePlainFallback` and manually reviewed RU/HE values with corresponding source fingerprint; existing HTML/no-selection error warning remains separate.

**Regression coverage.** Mounted `MarkdownEditor` checks assert that nonrectangular TSV and ambiguous quoted TSV remain original escaped-literal Markdown, do not become a visual table and render the explicit fallback alert. Successful rectangular TSV produces a visual Markdown table without alert; ordinary plain paste produces no conversion alert. `PROJECT_STATE.md` updated. Changed six files: `app/forum/markdown-editor.tsx`, `app/forum/markdown-editor.test.tsx`, `app/localization/catalog.ts`, `app/localization/manual-values.ts`, `app/localization/manual-fingerprints.ts`, `PROJECT_STATE.md`. No schema/migration/dependencies, authz, attachment, translation-runtime or unrelated Batch L2 changes.

**CI.** First head `98287cb`, run [#40417262762](https://github.com/iliya1947/vico-forum/actions/runs/40417262762): `checks` FAILED solely at TypeScript because one callback still referenced old `setPasteWarning`; `database` SUCCESS. Corrected the remaining reference; **final exact-head [CI #40417475881](https://github.com/iliya194/vico-forum/actions/runs/40417475881) SUCCESS**, `checks` job `121903280125` and `database` job `121903279852` both SUCCESS. `checks`: 1097 application tests / 102 files PASS, lint 0 errors / 1 pre-existing warning, typecheck, both builds and schema guards successful. Native PostgreSQL CI succeeded; PostgreSQL/Chromium not run personally. No owner visual acceptance, browser E2E, external/production action or whole-PR self-review performed.

**Status:** implementation step 1/5 complete and Draft PR #246 handed off for Mira's coordinator verification and subsequent independent review as appropriate. `EDITOR-10`, `LITERAL-TEXT-01`, `LOC-03`, `LOC-06` not started. **STOP**.


## Independent whole-PR review #245 — L6 (2026-10-27)

**Exact scope and status.** Review of [PR #245](https://github.com/iliya1947/vico-forum/pull/245), base `bff130db5fb245e3a9ad3391fad54a2fe81aac88`, unchanged stable head `f673c90cb8d95c68623b690f4f3a0f340f24e03a`. Owner permitted publication. **Published independent verdict: FAIL**, [service PR #236 comment #6430204018](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6430204018). All 19 changed paths reviewed against assignment `6429594005`, `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `docs/EDITOR.md`, and updated `AGENTS.md` from main. No implementation edits or PR head changes.

**LIRA-245-ZIP-DESCRIPTOR-OVERLAP / ATTACH-STRUCT-01 (current Stage).** `descriptorMatches()` treats 12 bytes of the following local header as the required unsigned data descriptor when the central-record CRC and sizes happen to coincide. Constructed 201-byte two-entry ZIP with `a` raw uncompressed bytes `41424344d5702ddf`, CRC32 `04034b50`, valid raw DEFLATE compressed size 20, uncompressed size 8, bit3 set, no descriptor; next `b` local header begins with `04034b50` signature and version20/flags0/method8/time0, giving the exact [CRC,20,8] descriptor interpretation. Both ZIP entries are extractable and pass their content CRC check with Python `zipfile`. Source-level trace shows the overlapping range is not excluded. **Actual TypeScript validator on this forged archive was NOT run**; targeted validator/storage regression still needed to independently establish full acceptance.

**LIRA-245-ZIP-WORKER-SUBREQUESTS / ATTACH-02 (current Stage).** In-memory unit checks of 65,535-entry classic ZIP do not simulate private-R2 finalizer `privateObjectSource().read()`. At least four separate nonzero range GETs per ordinary named ZIP entry (central fixed+variable, local fixed+name) create 262,140 R2 binding subrequests, exceeding current Worker default internal-service quota (1000 Free / 10000 Paid); `wrangler.jsonc` does not override the `limits.subrequests` default. Official Cloudflare reference https://developers.cloudflare.com/workers/platform/limits/ (updated 2026-10-12). Live Worker/R2 was NOT run; this is a deterministic source-level count + documented runtime boundary and directly concerns assigned 65,535-entry current requirement.

**Other scope.** Journal-before-PUT, metadata admission lock, rollback/unknown commit, retry and cleanup failure chains investigated in code and native PG regression sources. No *additional personally confirmed* ATTACH-01 finding. Exact-head CI [#40417069540](https://github.com/iliya194/vico-forum/actions/runs/40417069540) checks/database successful; no personally executed native PG/Worker/browser/R2. Independent reviewers may differ; coordinator fact-check and reconciliation needed before any agreed correction scope. No reviewer result from other agents claimed as own. **STOP**.


## Batch L2 step 2/5 — EDITOR-10 branch gate (2026-10-27)

Received Mira's specific task [#236 comment 6430739733](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6430739733) after [PR #246](https://github.com/iliya1947/vico-forum/pull/246) (EDITOR-04) merged into `main 082530ab6a62c37f4d7acf17556bc496e677ab5f`. Scope only EDITOR-10 (literal authoritative mention display-name escaping), later L2 steps 3–5 excluded.

**Preflight:** GitHub branch search for `chatgpt6/batch-l2-20261027`, `chatgpt6` and `batch-l2` returned no branches; fetching `AGENTS.md` at `chatgpt6/batch-l2-20261027` gives GitHub 404 `No commit found for the ref`. Previous Batch L2 implementation branch therefore no longer exists after merge. Only related `chatgpt/markdown-editor-code` is old/unrelated and diverged from main by 30 ahead / 59 behind commits (14 changed paths), not a clean reusable implementation branch. Another extant `fix/l6-attachment-storage-zip` belongs to Leva's open PR #245 and cannot be repurposed.

Mira's current task explicitly requires reuse only of a **safely suitable existing** Batch L2 branch, otherwise record blocker and STOP; no permission to create a new one was provided for step 2. The earlier owner authorization `Ладно, создавай` was exercised for the now-deleted step-1 branch; it does not override the new explicit branch gate. **No branch/implementation PR/file/code modifications, tests, CI or review started for EDITOR-10. STOP pending owner authorization of a fresh implementation branch from accepted main or a coordinator-approved existing safe branch.**


## EDITOR-10 — Batch L2 step 2/5 implementation (2026-10-27)

**Owner branch direction superseded branch blocker:** User explicitly directed “Нет, используй ветку от #246” after the missing-branch STOP. Restored the deleted PR #246 branch name `chatgpt6/batch-l2-20261027` **at accepted main merge commit `082530ab6a62c37f4d7acf17556bc496e677ab5f`**, not old diverged implementation head. Verified compare to main `identical` (ahead 0, behind 0) before making EDITOR-10 changes. This preserves merged PR #246 changes while avoiding replay of already-merged step-1 commits. No unrelated branch was repurposed.

**Implementation PR:** [Draft #247](https://github.com/iliya1947/vico-forum/pull/247), exact stable head `3f2084c62633377b54927c79e63281cb4a88964a`, base `main 082530ab6a62c37f4d7acf17556bc496e677ab5f`; 4 changed paths (`app/forum/mentions.ts`, `app/forum/mentions.test.ts`, `app/forum/markdown-editor.test.tsx`, `PROJECT_STATE.md`). Scope only `EDITOR-10`, by Mira task #6430739733.

**Root cause and fix:** `mentionProfileLink(name, profilePath)` already escaped Markdown link-label syntax chars but not the `&` which can begin character references under CommonMark. Authoritative display names such as `Ada &copy;`, `Alice &amp; Bob` or `Code &#169; reviewer` were therefore decoded to a different visible label after Markdown parse/render. Existing serializer now emits `&amp;` for each literal ampersand within label text; all other character escapes, authoritative profile destination and recipient identity remain unchanged. No publication or notification behavior changes.

**Regressions:** Pure `fromMarkdown` AST tests for entity-like, numeric-reference-like and ordinary ampersands assert exact text child and unchanged `/en/users/member-42` URL, `publishedMentionRecipients` returns `member-42`; original `Ada Lovelace` and Markdown-special-char controls remain. Mounted `MarkdownEditor` integration tests exercise literal `Ada &copy;` suggestion in both Simple/Advanced, exact serialized `body` and FormData. PROJECT_STATE synchronized, no schema/migration/dependency/i18n updates.

**Exact-head CI:** [GitHub Actions #40429071474](https://github.com/iliya1947/vico-forum/actions/runs/40429071474) SUCCESS: `checks` job `121942049858` SUCCESS (1103 application tests / 102 files, lint, typecheck, production/UI-preview builds, metadata/schema guards); `database` job `121942050371` SUCCESS (304 native PostgreSQL tests / 28 files, schema/runtime grants/Worker smoke). No personally-run native DB or browser. No whole-PR self-review, owner acceptance, production/external or merge action.

**Status:** Batch L2 step 2/5 implementation complete; hand off PR #247 for Mira coordinator review and independent review by non-author. Steps 3/5 LITERAL-TEXT-01, 4/5 LOC-03, 5/5 LOC-06 not started. **STOP**.


## LITERAL-TEXT-01 — Batch L2 step 3/5 implementation (2026-10-27)

**Owner handoff:** [PR #236 assignment #6431575722](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6431575722) supersedes earlier isolated independent-review request for PR #247. Batch L2 should continue **in current PR/branch** until all 5 steps are done; no independent whole-PR reviews before then. Applied only `LITERAL-TEXT-01` as step 3/5; `EDITOR-10` step 2 already present, `LOC-03` and `LOC-06` not started. Base accepted `main 082530ab6a62c37f4d7acf17556bc496e677ab5f`, same branch `chatgpt6/batch-l2-20261027`, same [Draft PR #247](https://github.com/iliya1947/vico-forum/pull/247). Exact current head **`ed23a00a31f2fe21f0d0aa8d94012bd3b0d14849`**.

**Confirmed cause & bounded correction:** Shared `clipboardPlainToMarkdown`/`escapeVisualMarkdownText` protected common emphasis/code/list punctuation but missed GFM `~~` delimiters, CommonMark character references beginning `&`, and contiguous `---` block/thematic and Setext delimiters. `app/forum/clipboard-markdown.ts` now escapes literal `~` and serializes literal `&` as `&amp;` plus escapes `-{3,}` at line start, retaining existing list/header escaping. `app/forum/visual-markdown-editor.tsx` builds structural leading `&#32;`/`&#9;` separately from subsequent user-text escaping; without that split the new `&` encoding would double-escape the existing leading-space/tab protection. Existing visual input and plain clipboard paste converge on shared literal escaping; Advanced source and intentional formatting controls are unchanged. HTML conversion retains deliberate supported markup; text nodes receive safer escaping.

**Coverage:** New `clipboard-markdown.test.ts` tests parser output and source for `---`, `~~literal~~`, `&copy;`, ordinary text, Setext multiline case. Mounted `markdown-editor.test.tsx` tests both simulated native visual input and plain clipboard paste across those 4 cases with exact FormData, visible leaf text and absence of unintended thematicBreak/del, plus 4-leading-spaces + literal `&copy;`. Existing intentional toolbar strikethrough, Advanced editing, table paste and whitespace regression controls remain in full suite. `PROJECT_STATE.md` synchronized. Five file additions/modifications within current PR: `app/forum/clipboard-markdown.ts`, `app/forum/visual-markdown-editor.tsx`, `app/forum/clipboard-markdown.test.ts`, `app/forum/markdown-editor.test.tsx`, `PROJECT_STATE.md`.

**CI evidence:** initial `5a3fee8a91adad6124d758b754eff68ed016f105` [run #40434466597](https://github.com/iliya1947/vico-forum/actions/runs/40434466597) checks FAILED at TypeScript test narrowing `RootContent.children` (lint PASS, database checked); corrected test type guard without changing implementation. **Final exact-head [run #40434612754](https://github.com/iliya1947/vico-forum/actions/runs/40434612754) SUCCESS**: checks job `121960183367`, 1117 application tests / 102 files, lint 0 errors / 1 existing warning, typecheck, builds + schema; database job `121960183800`, 304 native PG tests / 28 files, Worker smoke SUCCESS. No personally-run PostgreSQL/Chromium/browser, production/owner visual or independent whole-PR self-review. PR #247 metadata updated to represent steps 2–3/5 and review deferral.

**Status:** implementation step 3/5 complete; STOP pending new Mira handoff for step 4/5 `LOC-03`; step 5/5 `LOC-06` remains untouched.


## PR #245 corrected head — Lira independent review FAIL (2026-10-27)

**Review assignment**: [#6431671541](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6431671541). **Owner-authorized publication:** [service PR #236, comment #6432099014](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6432099014). Stable exact head `86258701e56407f9ee16505aaf092d23559521df`, base `082530ab6a62c37f4d7acf17556bc496e677ab5f`; 22 changed paths, `checks` + `database` CI [#40432588993](https://github.com/iliya1947/vico-forum/actions/runs/40432588993) SUCCESS, 1116 app + 311 PG tests. Previous old-head verdict was **not** transferred; this is a new independent whole-PR evaluation of `ATTACH-01`/`ATTACH-02`/`ATTACH-STRUCT-01`.

**LIRA-245-R2-DELETE-COMPLETION-RACE / ATTACH-01 — source-level confirmed current-Stage candidate; independent FAIL.** At time T0 expired unregistered unfinished PUT journal is claimed under DB transaction by `ForumAttachmentCleanup.cleanupUploadObjects`. It commits claim and completes a successful R2 DELETE *before PUT object materializes*. At time T1 original PUT finishes, its `completeUploadObjectWrite()` unconditionally writes `write_completed_at` even though journal row has non-null `claim_token`. At T2 cleanup runs its independent `DELETE FROM forum_attachment_upload_objects WHERE object_key=... AND claim_token=... AND write_completed_at IS NOT NULL`, permanently removes journal. T3 metadata admission requires present/unclaimed row, fails and route attempts best-effort R2 DELETE; if it fails, existing object becomes unreferenced and undiscoverable. Interleaving was modeled directly against observed predicates and awaits (not a live DB/R2 run). No transaction spans R2 delete and journal delete, so the race is feasible independently of consistency of individual R2 operations. Specific targeted real PostgreSQL/controlled storage regression still required; avoid claiming this was executed.

**Other independent coverage:** Physical ordering of local ZIP offsets + limit at next local boundary rejects missing descriptor aliased by next header; classic/ZIP64 signed/unsigned controls and reversed central directory verified by static source/tests. Central metadata preload + two block local cache eliminates per-entry remote GET, 65,535 classic source+finalizer tests verify <60 requests; no new confirmed finding. Migrations 0046/0047, Drizzle schema, runtime DB privileges and source-level metadata admission checked; no further confirmed finding. Exact head CI green but insufficient to establish ATTACH-01 concurrency safety. No personally run native PG/Worker/R2/Chromium, no external/production/owner visual, no code changes.

**Independent report discrepancy:** [Мишаня #6432083823](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6432083823) independently FAILs the same head for a *distinct* candidate: permanently retained `write_completed_at = NULL` journal rows after conclusively failed uploads, with real PostgreSQL proof. He does not confirm Lira's interleaving, and Lira's review does not independently verify his end-of-writer evidence. Mira must reconcile both technical claims (not vote/merge labels); author Leva's bounded corrective scope only after conclusion. STOP.

## LOC-03 — Batch L2 step 4/5 implementation (2026-10-27)

**Assignment**: [Mira PR #236 comment #6432172335](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6432172335), after published 3/5 LITERAL-TEXT-01. Only LOC-03 implemented; LOC-06 (5/5) untouched. Reused [Draft PR #247](https://github.com/iliya1947/vico-forum/pull/247), branch `chatgpt6/batch-l2-20261027`, base accepted main `082530ab6a62c37f4d7acf17556bc496e677ab5f`, now **stable exact head `ab422f8347df4acc4e021dacf3d43afe8fbd1a25`**, 10 changed paths across sequential steps 2–4. PR title/body updated; coordinator and independent reviewers defer whole-PR review until 5/5.

**Current-Stage defect cause:** `app/localization/translation-validation.ts::controlledTokens()` used only regex `/\\$t\\(\\s*([\\w.:-]+)\\s*\\)/g`, so valid i18next parameterized nesting `$t(common:heading, {"lng":"en"})` was not counted as controlled token. Canonical English `common:stageSummary` has no nesting: a machine/local/manual text preserving its required literal `Stage 1` but adding a parameterized `$t(...)` passed `validateProviderOutput`, then would be persisted/compiled and change visible text during i18next runtime evaluation. Real i18next 26.4.2 option-bearing nesting syntax verified against official i18next Nesting documentation.

**Correction:** Bounded change to `controlledTokens` with `nestingTokens`: default i18next nesting expression recognizes parentheses inside quoted JSON values, matching `$t(key)` and parameterized `$t(key, {JSON})`. Controlled token identity retains **entire literal syntax including options**; added/deleted or mutated nesting expression fails token-set validation. JSON shape checked fail-closed; `{{variable}}` substitutions receive numeric syntax-only sentinel for checking JSON before i18next runtime interpolation, without modifying source or payload. Malformed/unsupported nesting rejected; existing numeric controlled component tags preserved. No server runtime/translator/provider, schema/dependency/locale policy expansion.

**Tests:** `translation-validation.test.ts` covers unseen added nesting; preservation and change of full parameterized token, removal, mutation of key/option; JSON string with parentheses and interpolation variables; malformed/unrecognized syntax. `translation-publication.test.ts` uses actual i18next runtime to show `Stage 1 $t(common:heading, {"lng":"en"})` renders as `Stage 1 Translation foundation`; validates that `UiTranslationResultPublisher.publish` rejects output **without calling persistent publication** and both `compileNamespaceBundle` and `verifyCompiledNamespaceBundle` reject it. All existing local/persistent/structured/identity tests remain controls. `PROJECT_STATE.md` synchronized.

**Exact-head checks:** Initial CI [#40438603120](https://github.com/iliya1947/vico-forum/actions/runs/40438603120) failed TypeScript compile due to unescaped literal `{{` braces in regex with unicode flag (lint PASS); targeted fix in `ab422f8`. Final [CI #40438726211](https://github.com/iliya1947/vico-forum/actions/runs/40438726211) **checks** job `121973632660` SUCCESS, 1125 app tests/102 files, changed localization tests pass (17 translation-validation + 6 publication), lint 0 errors/1 existing warning, typecheck, app/preview builds, guards; **database** job `121973632967` SUCCESS, 304 native PG tests/28 files, Worker smoke. No personally run PG/Chromium/external services/production/owner visual; no whole-PR self-review/merge.

**Status:** Batch L2 4/5 implementation complete; STOP pending Mira's separate assignment of last 5/5 LOC-06. Owner need not relay implementation details. PR #245 adjudication is a separate active workflow and remains untouched.


## Batch L2 step 5/5 LOC-06 — implementation complete (2026-10-27)

**Assignment**: [Mira PR #236 #6437661413](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6437661413), explicit single step 5/5 after LOC-03, no other fixes. Existing [Draft PR #247](https://github.com/iliya1947/vico-forum/pull/247), reused `chatgpt6/batch-l2-20261027` branch, base accepted `main 082530ab6a62c37f4d7acf17556bc496e677ab5f`. **Final exact head `810f7fcceb69fef4e27a909adc08cb05c4a938ff`**, 13 changed paths for steps 2–5/5; PR #246 previously merged step 1/5 (`EDITOR-04`). PR #247 updated with all steps complete and remains Draft.

**Root cause/actual contract:** Topic-page loader intentionally omits attachment-only post-body translation units (`app/routes/topic.tsx`), but a direct same-origin authorized POST `generatePostBodyTranslation` / `generateExplicitPostBodyTranslation` in `app/forum/actions.server.ts` constructs authoritative blank `originalContent` and calls default capability → post-body planner. `ContentPostBodyTranslationPlanner.planAndDispatch` previously called `ContentSourceLocaleResolver.plan(authoritativeRevision)` before its existing `protectMarkdownForTranslation(...).segments.length === 0` guard, so `ContentSourceLocaleResolver.normalizeRevision.requiredText` threw `InvalidContentSourceLocaleInputError`; only typed infrastructure failures are mapped to 503 by action, thus exception surfaced as server 500. **Bounded fix:** move existing `protectMarkdownForTranslation` and no-segments return `original:no-translatable-content` to immediately after authoritative revision identity/currentness check and before source locale normalization. Existing target eligibility, permissions/auth/disabled runtime, immutable revision comparison, request-budget admission, provider policy, task generation, prose and code-only logic unchanged.

**Regressions:** `content-post-body-planning.test.ts` checks authoritative empty, whitespace-only and fenced-code-only revisions vs nonempty forged caller input; asserts no source locale plan/detection, provider capability, task upsert or enqueue. `app/forum/write-actions.test.ts` uses actual topic action → `DefaultContentGenerationActionCapability` → real `ContentPostBodyTranslationPlanner` → `ContentSourceLocaleResolver` + controlled authoritative storage read for six cases: automatic & explicit attachment-only blank, whitespace-only, fenced-code-only all HTTP200 `no-op:no-translatable-content` without planner/resolver side effects; automatic & explicit ordinary prose HTTP202 `queued` and expected task enqueuer call. Existing denial/disabled/runtime and routing controls pass. `PROJECT_STATE.md` synchronized. No schema/migrations/deps/provider/production or unrelated edits.

**CI:** Initial head `b67f351a4361c99e545e47d64819ac2eed942264`, [run #40480540495](https://github.com/iliya1947/vico-forum/actions/runs/40480540495) checks FAILED two **new** prose controls due to HTTP status expectation 200 vs correct queued response 202 (1132 tests passed, 2 failed); lint/typecheck/db job PASS. Corrected only expectation, no runtime changes. **Final exact-head [run #40480837338](https://github.com/iliya1947/vico-forum/actions/runs/40480837338) SUCCESS:** `checks` job `122110435675`, 1134 app tests /102 files, lint/typecheck/app/preview builds and schema guards SUCCESS; `database` job `122110435376`, 304 native PG tests/28 files plus applicable Worker smoke SUCCESS. No personal native PG/Chromium/browser runs, no live provider/Queue or production/external action, no owner visual acceptance, no independent whole-PR self-review.

**Status:** Batch L2 5/5 **implementation complete**. Ready for Mira to begin coordinator whole-PR review of PR #247 exact head `810f7fc` under project review gates, then designated independent reviewers excluding author. No implementation/merge/next Batch initiated; Lira STOP. L6 PR #245 separate/adjudicated by Leva; unaffected.


## PR #245 c00b416 — независимый whole-PR review Лиры (2026-10-27)

**Assignment:** [Mira #6439058644](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6439058644), full L6 review on stable exact head `c00b416eabe5f8cbe68b4fc35a175f0d7ef6e757`, base `082530ab6a62c37f4d7acf17556bc496e677ab5f`, 24 changed files; full scope `ATTACH-01`, `ATTACH-02`, `ATTACH-STRUCT-01`. Owner granted publication explicitly, resulting in [service PR #236 report #6439345435](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6439345435).

**Personal verdict:** PASS limited to reviewed source/test/CI evidence; this is not team acceptance or blanket proof of no conceivable defects. Reviewed PUT journal admission, verified stored metadata gating, terminal/unknown writer classification, claim/snapshot before R2 DELETE, late completion handling, asset reference-lock protection, orphan retries and fairness, short-prefix rejection, Worker FixedLengthStream abort/cancel behavior; ZIP classic 65,535, ZIP64, local/central/descriptor physical bounds, packaging/OOXML/ODF, storage GET budget, DB 0046/0047, manifest and runtime web ACL probes. No additional current-Stage defect established within personally verified paths. **Exact-head [CI #40484192014](https://github.com/iliya1947/vico-forum/actions/runs/40484192014) SUCCESS** (1120 app/102 files, 318 PG/28 files, lint/typecheck, both builds, schema/ACL/smoke). Did not personally run native PG, Workerd, live R2, Chromium, external/production or owner visual; implementation and PR head not changed.

**Independent disagreement noted only after own review completed:** [Мишаня's new-head FAIL #6439321156](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6439321156) reports another causal chain not covered by Lira's focused actual-PostgreSQL reproduction: **definitively terminal PUT with failed PostgreSQL completion UPDATE** remains journal NULL indefinitely despite successful fallback DELETE, recurring cleanup and no future writer to repair marker. Misha claims targeted PG evidence; Lira's PASS **does not refute** it. The scenario's applicability and evidence must be independently reconciled by Mira/Leva. Not team PASS; no merge or correction authorized. Lira STOP.


## PR #247 Batch L2 — bounded correction after reviews (2026-10-27)

**Assignment:** [Mira #6439453861](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6439453861) after [synthesis #6439450477](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6439450477), 4 confirmed current-Stage findings: LOC-03 regex performance; LITERAL-TEXT-01 four-space plain paste; EDITOR-10 GFM tilde mention labels; LITERAL-TEXT-01 Setext `===`. [Mira process correction #6439844668](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6439844668) reaffirmed continuation of this bounded correction. No new independent whole-PR review by author.

**Implementation:** reused [Draft PR #247](https://github.com/iliya1947/vico-forum/pull/247), branch `chatgpt6/batch-l2-20261027`, same base accepted `main 082530ab6a62c37f4d7acf17556bc496e677ab5f`; stable new exact head **`53f059dbd43ecb8339f2b611eb4eef3ac6774cff`**, still 13 changed paths of accumulated steps 2–5/5. 1/5 EDITOR-04 remains merged PR246.

1. `app/localization/translation-validation.ts`: replaced nested-repeat regexp `nestingPattern` with linear explicit balanced scanner of quotes, escaped characters and parenthesis depth, parse unchanged option JSON / placeholders and compare full literal token including options. Regression malformed unclosed 128-character nesting rejects under 1s, valid escaped quotes and parentheses in options preserve intended semantics; existing publisher/compiler/verify/i18next real runtime tests retained. No new dependency or public semantics.
2. `app/forum/clipboard-markdown.ts`: plain-text paste with **4+ leading spaces per line** is prefixed by structural `&#32;` before escaping remainder, instead of accidental indented code (which would visibly expose escapes for literal `&copy;` / `~~literal~~`). Already protected native Simple typing still preserves the identical visible text. Existing Ctrl+Shift+V with leading tab **must preserve original raw tab source**; revised code applies new structural entity only to four-space lines. Regression pure AST/render and mounted typing/paste.
3. `app/forum/mentions.ts`: escape `~` in authoritative mention display label, keeping literal `~~Ada &copy;~~` and immutable recipient/profile identity. GFM AST + mounted Simple/Advanced mention tests.
4. `app/forum/clipboard-markdown.ts`: handle repeated equal signs `===` and repeated hyphens (including `--`, `---`) as ordinary source; parser + mounted editor typing/paste tests confirm no setext heading/thematic break. Advanced intentional Markdown and toolbar remain controls.

`PROJECT_STATE.md`: latest date 2026-10-27, remove stale 5/5 not started statement, summarize corrected literal/locale parser behavior. No DB/schema/migration/dep/production/provider changes.

**CI/evidence:** First correction head `3997676`, [run #40490907692](https://github.com/iliya1947/vico-forum/actions/runs/40490907692): lint/typecheck and PG PASS, app **3 failures** (two new whitespace-sensitive `toHaveTextContent` assertions normalize leading spaces despite correct actual text; one preexisting raw-tab Ctrl+Shift+V test failed due to overly broad new entity-for-tab escaping). Reduced guard to four-space only; swapped to exact `textContent` tests. **Final exact-head [CI #40491273526](https://github.com/iliya1947/vico-forum/actions/runs/40491273526) SUCCESS:** `checks` job `122145529893` 1148 application tests / 102 files, lint 0 errors/1 warning, typecheck, app/preview builds/schema checks; `database` job `122145530412` 304 native PostgreSQL tests / 28 files, runtime privileges and Worker smoke. All changed scope tests PASS. Personally no native PG/Chromium/production/external/provider runs, no owner visual, no merge.

**Status:** bounded correction implementation complete. PR #247 Draft/mergeable, exact head verified. Await Mira coordinator whole-PR review and designated non-author reviewers after applicable gates; author Lira STOP. PR #245 and its independent process untouched.


## PR #247 — second bounded review correction (2026-10-27)

**Assignment:** Mira's confirmed two-defect synthesis [#6442052807](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6442052807), single bounded correction [#6442116948](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6442116948) on existing Draft PR #247 `chatgpt6/batch-l2-20261027`, previous exact head `53f059dbd43ecb8339f2b611eb4eef3ac6774cff`, accepted main base `082530ab6a62c37f4d7acf17556bc496e677ab5f`. No author whole-PR self-review. Corrected only LITERAL-TEXT-01 raw-tab forced paste and EDITOR-10 incomplete Markdown link label serialization, with focused controls and `PROJECT_STATE.md` sync.

**Defect #1 — forced-plain raw-tab:** prior `clipboardPlainToMarkdown` escaped `~` and `&` in all lines; Markdown interprets leading `\t` (or 1–3 spaces followed by `\t`) as indented code where backslashes and character references are **not** unescaped, yielding visible `&amp;copy;`/`\\~\\~`. For such raw-tab lines preserve original source without prose-escaping; retain structural entity for 4+ spaces (normal prose), normal TSV path, native typing and intentional Advanced. Pure parser tests check raw source and code literal value; mounted `Ctrl+Shift+V` keydown + clipboard with HTML present → form source → actual `ForumMarkdown` published code checks 2 distinct tab-indented controls (no `&amp;`, no escaping backslashes). Existing spreadsheet/raw-tab/typing/intentional toolbar tests remain controls.

**Defect #2 — full valid mention label domain:** prior hand-crafted Markdown punctuation list missed `<...>` autolinks, so allowed server name `Ada <https://example.test> &copy;` split into nested/external links and displayed without literal angle brackets. `mentionProfileLink` now serializes every ASCII syntax punctuation and control codepoint of authoritative display name via numeric character references, leaving Unicode and normal spaces intact; generated outer Markdown profile link retains supplied encoded ID path. This avoids fragile per-character Markdown lists and ensures only one profile link with a **single literal text child** after Forum Markdown AST parsing (no autolink, GFM strike, nested links, entity reinterpretation). Pure controls cover autolinks, email-like, brackets, backticks, tilde, entities/ampersands; mounted Simple+Advanced autocomplete checks actual `ForumMarkdown` published anchor and recipient identity. No account validation, route, DB/notifications, schema/dependencies changes.

**CI:** Initial implementation head `eb4a400862a2ef6ac938a5da26aebc03a9ab0b60`, [CI #40507135644](https://github.com/iliya1947/vico-forum/actions/runs/40507135644): lint/typecheck + database green, checks TEST 1158 passed, 1 newly written assertion incorrect (numeric `;&#59;` expected raw `;`). Fixed the exact expected Markdown source only. Final stable exact head **`46a7cda762ea763509ba3034c9be0c2aa0d6830e`**, 13 changed paths; [CI #40507554527](https://github.com/iliya1947/vico-forum/actions/runs/40507554527) **checks** `122200650876` SUCCESS (1159 app tests/102 files, lint 0 errors/1 preexisting warning, typecheck, app + UI-preview builds/schema guards), **database** `122200651009` SUCCESS (304 native PG tests/28 files, applicable privilege/Worker smoke). Logs read; no personally run native PG/Chromium/live provider/external/production/owner visual. PR #247 remains Draft/mergeable; PR metadata updated exact head. No own whole-PR review or merge.

**Status:** bounded correction complete, STOP. Mira to initiate new coordinator whole-PR review on exact head `46a7cda`, then non-author independent reviewers. Findings from previous head `53f059d` are historical, not new-head verdict. PR #245/L6 workflow separate and untouched.

---

## PR #245 v2 — independent whole-PR review Лиры, exact head cc0f3ad (2026-10-27)

**Assignment:** [#236 comment #6445578130](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6445578130). Independent reviewer: Лира; Лёва is implementation author. Owner authorized publication after completion of four review stages. PR #245 is Open/Draft, reviewed implementation head `cc0f3ad5d5888311d833fe5cbfdb1ccc208206a8` against main base `082530ab6a62c37f4d7acf17556bc496e677ab5f`; 26 changed paths; scope `ATTACH-01`, `ATTACH-02`, `ATTACH-STRUCT-01`. No implementation PR edits.

**Personal verdict: CHANGES REQUIRED — one P3 current-stage documentation finding.** No confirmed additional runtime/code defect established by this review within the source-level scope. This is an independent review conclusion, not team acceptance and not proof that unexecuted external conditions are safe.

**Finding P3 / documentation state mismatch (confirmed against exact-head GitHub blobs).** `PROJECT_STATE.md` under “Реализованный foundation / Текущий repository baseline” says `текущая repository migration history — 0000–0047` (line ~1909). But `drizzle/meta/_journal.json` ends with `idx:46, tag:0046_attachment_upload_fences`; the actual `drizzle/` SQL directory contains `0045_audit_database_notifications_read_state.sql` followed by `0046_attachment_upload_fences.sql`, with **no 0047 migration** on this head. CI migration-history guard also reports **1 new migration, accepted history unchanged**. The conflicting document line is an addition in PR #245, not a historical or future-stage requirement. Minimal correction: replace only `0000–0047` with `0000–0046` in this baseline line; do not create a new migration. A source-of-truth documentation correction does not imply a storage protocol rewrite.

**Review coverage:** Read the full PR changed-file list and relevant changes in 26 paths, traced upload HTTP action → private stream sniffer → durable PREPARING journal → create-only R2 reservation ACK → unclaimed READY activation → conditional single payload PUT / ETag and FixedLengthStream adapter → metadata transaction. Examined lost ACK / timeout, late PREPARING reservation, cleanup claim vs activation, journal retirement after DELETE, marker LIST sweep pagination/durable cursor/stale-processor fencing, absence checks against both journal and authoritative asset, active draft/publication ref guards, runtime privilege probes and migration/schema/manifest parity. Reviewed ZIP classic 65,535 boundary versus ZIP64 locator, local/central CRC/flags/sizes, mandatory signed/unsigned descriptors, next-local-header overlap exclusion, sorted physical traversal with 128 KiB blocks, OOXML/ODF required content and size/subrequest budgets. Relevant source and regression tests inspected. Source review does **not** substitute for executing each race on real infrastructure.

**Evidence:** [CI #40517308507](https://github.com/iliya1947/vico-forum/actions/runs/40517308507) on this reviewed PR exact head **SUCCESS**, both jobs:
- `checks` job 122234213784: 1,123 application tests /102 files PASS; lint (0 errors / one existing warning), typecheck, application/UI-preview builds, migration guard and schema parity SUCCESS.
- `database` job 122234213258: 323 native PostgreSQL17 tests /29 files PASS, production schema manifest 49 tables, runtime privilege and Worker smoke/provisioning checks SUCCESS.
- CI job step summaries and completed logs read independently. Author reports separate local Workerd/R2-emulator controls, **not** personally repeated by Лира.

**Verification limits:** I did not independently execute the full native PostgreSQL, Workerd/R2-emulator, external Cloudflare R2, browser/Chromium, production, deployment, or owner visual checks. Successful CI demonstrates that named suites passed, not absence of all defects. PR #247 and CPU/deployment candidate C excluded.

**Handoff:** Published only after developer approval. Findings need coordinator Мира's synthesis with other reviewers before deciding correction. No implementation change, review rerun, merge or next task initiated. **Лира STOP.**

---

## PR #247 — third bounded correction and main integration (2026-10-27)

**Assignment:** Mira [PR #236 comment #6446999055](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6446999055). Two current-scope defects, only: LITERAL-TEXT-01 raw-tab bypass in prose and EDITOR-10 U+FFFD loss for valid control characters. Previous implementation head `46a7cda762ea763509ba3034c9be0c2aa0d6830e`; branch `chatgpt6/batch-l2-20261027`; existing Draft PR #247.

**Correction:** `clipboardPlainToMarkdown` now accepts the real source+selection context and inspects the Markdown AST of the candidate with the inserted raw-tab fragment. It preserves source-only raw tab when candidate actually parses as an indented code node; otherwise it escapes entities/GFM in prose. `VisualMarkdownEditor` passes its global selected range through `onPastePlain`, which delegates to `MarkdownEditor` for context; explicit plain paste and declined TSV use the same context-aware serializer. Native Simple typing, rich paste, ordinary TSV and intentional Advanced markdown are not changed. `mentionProfileLink` no longer turns disallowed C0/DEL codepoints into numeric character references that CommonMark decodes to U+FFFD; representable whitespace controls (9/10/12/13) still use numeric references, while punctuation remains encoded to maintain one literal profile-link text child and original recipient ID.

**Regression additions:** pure AST tab context cases (inline prose, paragraph continuation, blank-delimited code, preexisting structural prefix); mounted Simple Ctrl+Shift+V with real selection→source→published `ForumMarkdown`; pure control-character link/recipient cases and mounted Simple/Advanced mention autocomplete+publication checks. `PROJECT_STATE.md` updated with two bounded corrections without prematurely claiming CI. Initial correction commit `e06407d527023cc4186b0fff8b8e609ffea24d0e` changed only 8 relevant files.

**Integration blocker / resolution:** During correction, PR #245 was owner-merged into main `2ff3aeb3c8feeab3df4b674d711ff3845c09b0e0`. PR #247 became `mergeable_state=dirty` and no PR CI ran on its first correction head. Compared main vs prior base: the **only overlapping path is `PROJECT_STATE.md`**. Preserved byte-exact new main state plus the four Batch L2 documentation sections, verified no other state edits outside this block, and created two-parent integration commit `894f9719bfb19028b788560a75d42b3163dde740` (first parent correction, second parent merged main). All 13 Batch L2 implementation/test Git blob SHAs preserved exactly; no code rewrite during integration. PR mergeable=true; main/L6 code kept.

**Final exact-head verification:** [CI #40543735805](https://github.com/iliya1947/vico-forum/actions/runs/40543735805) SUCCESS, jobs checks `122328653088` and database `122328653495`. Completed logs independently checked: **1207 application tests/102 files PASS**, **323 PostgreSQL17 tests/29 files PASS**; lint0errors/1 existing warning, TypeScript, both builds, migration/schema/manifest/privileges and Worker smoke PASS. No local native PG/Workerd/Chromium run personally, external/provider/production/owner visual/merge not performed.

**Status:** third bounded correction implementation and integration complete on stable exact head `894f9719bfb19028b788560a75d42b3163dde740` against main `2ff3aeb3c8feeab3df4b674d711ff3845c09b0e0`. PR #247 remains Draft and mergeable. Implementation author Лира **did not** conduct independent whole-PR review. Mira to initiate coordinator review on this head, then non-author independent reviewers. **Лира STOP.**
