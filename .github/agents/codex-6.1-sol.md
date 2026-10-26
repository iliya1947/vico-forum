# Лёва — Codex-6.1 Sol

## PR239 — final technical review: CHANGES REQUIRED (2026-10-26)

Date: 2026-10-26 (Asia/Jerusalem). Assignment: PR236 comment 6412169759.

Exact head: `a7d29546f334a59d42b30b10c67c32595ea98ec1`.
Base: `f59785c50e91fc1615b568b74a0a56909a92c871`.
Reviewed implementation tree: `5caf7582cb6358ff377c5443b6e24718f6e5cae5`.
Local equivalent commit: `a37703469714f6f83d0acfc47bff99af85df366d`.

Verdict: **CHANGES REQUIRED**. One confirmed current-Stage defect, with two reproduced manifestations. The whole assigned review is complete; implementation was not changed. This is the author's final technical review, not a claim of independent authorship. Other reviewers' PASS verdicts were not used as evidence.

## LEVA-PR239-A7D2954-01 — P2 — attachment re-key leaves active image destinations stale

Location: `app/forum/editor-document.ts:91–102`, called by `MarkdownEditor.replaceImage` and attachment Retry when an entry moves to another operation.

After a committed published edit loses its response, a new image upload can receive typed410 gone. The uploader correctly changes operation; Retry creates and uploads a new asset ID. However, `replaceAttachmentImageId` does not reliably replace the active image destination:

1. An ordinary reference image `![screenshot][file]` with bare definition `[file]: vico-attachment:OLD` keeps OLD. The parsed definition's source span ends immediately after its URL, so the regex's required trailing whitespace/angle/parenthesis cannot match. A trailing document newline or a following paragraph does not help: both are outside the definition span. Angle-delimited or titled definitions are positive controls already covered by existing tests.
2. For `![` + backtick + `x](vico-attachment:OLD)` + backtick + `](vico-attachment:OLD)`, the parser identifies one valid image with destination OLD. The regex finds the destination-like text inside its alt label first, changes that text to NEW and stops; the actual destination remains OLD.

The subsequent stale409 and explicit rebase work; Save becomes available with the new selected attachment ID. Mounted TopicRoute tests drove this path through the actual client/action/component code, completed the final successful mocked writer response and observed editor closure. The submitted body still had OLD. Real `ForumMarkdown` rendered no inline image with the NEW published attachment. Original source with OLD attachment, and the same source with only the actual destination corrected to NEW, both rendered an image: these controls rule out unsupported Markdown and a broken renderer fixture.

Separate native PostgreSQL probes invoked the actual topicAction → writer/service/repository chain. It accepted both faulty re-key results (302), persisted the stale body and published the NEW attachment ref. The server does not repair the Markdown; inline presentation resolves only IDs in current authorized refs. Thus the image disappears from its authored inline position despite successful recovery/Save. The second variant also changes authored label text. The file remains an attachment; this is not deletion of its bytes or an access-control bypass.

Current-Stage applicability: reference images are already parsed/rendered and explicitly covered by editor source handling. The correction promises active image re-key throughout text/Undo/Redo without touching labels. This defect is in newly introduced recovery code, not a future feature or an external storage issue.

Required outcome for a later correction: locate and replace only the actual parsed URL source, including a bare reference definition ending at its node boundary; leave labels/code unchanged. Add regressions for both manifestations and preserve existing inline, angle/title, reference, escape, history and ordinary retry controls. No server permission relaxation or new endpoint is justified. No correction was made during this review.

## Whole scope checked

| Scope | Review coverage |
| --- | --- |
| ARCH-01 | Known domain errors, typed storage availability, unexpected writer faults, SQL/schema faults and caller mapping; unexpected failures propagate. |
| ARCH-03 | Forum writer, auth runtime and authorization pool cleanup; synchronous/rejected cleanup cannot replace determined result/error. Native signup/session and mutation controls pass. |
| POST-EDIT-AVAIL-01 | Protected resume loader ownership/permission gates, typed503/no-store, unexpected fault propagation and route boundary. |
| FORUM-READ-AVAIL-01 | All ten wrapped primary loaders; preserved404/redirect and optional presentation degradation. |
| SEC-01 | Router diagnostic allowlists, multiline message removal, cyclic causes, profile SQL/params/private-text controls, SSR logging. |
| XR-THROWN-ACTION-BUFFER | Three authoring client-action exports; controlled errors, thrown unexpected/transport faults, aborts, redirects and retained mounted forms. |
| EDITOR-PUB-01 | Conflict refresh, public baseline/ownership projection, latest-loader supersession, explicit revision acceptance and source/history retention; re-key defect above. |
| EDITOR-PUB-02 | Edit-specific feedback follows actual result/identity guard; unrelated topic409 keeps solution feedback; EN/RU/HE catalog/fingerprints checked. |

All bounded chains checked: modified completed-receipt replay versus identical replay; fresh versus ordinary stale operation identity; published/private dedup; explicit Remove intent; File retention and Retry/newasset; same-post Edit focus guard; terminal410 before Save, pending aborts/late ACK fences; subsequent stale rebase preserving the already fresh operation. Source review included the repository transaction order and attachment completion/receipt gates. No additional confirmed defect in the remaining assigned scope.

## Verification performed in this review

- Full application suite: **1065/1065 PASS**.
- Native PostgreSQL17 suite on a disposable local container: **300/300 PASS**.
- New mounted-editor/renderer probes: **2 expected-behavior assertions FAIL**, reproducing this finding; positive renderer controls passed first.
- Separate native action/PG probes: **2/2 PASS**, confirming successful persistence of the stale image destination with a NEW published attachment.
- TypeScript PASS; ESLint0 errors and one preexisting unused-disable warning at `app/forum/ui.test.tsx:174`.
- Application and UI Preview builds PASS; existing preview chunk-size warning remains.
- Migration history guard PASS,0 new migrations. First invocation lacked required CI environment; second was blocked by sandbox child-process EPERM; configured invocation with allowed execution permissions passed. Neither failure was a product defect.
- Local built Worker smoke PASS.
- Exact-head CI40243954305 confirmed SUCCESS, checks121321492211/database121321492371 both SUCCESS. Green CI does not include these new probes.

Probe harness corrections: the first native copy referenced a helper scoped inside another describe; the next comparison exposed normal multipart LF→CRLF serialization. Both harness issues were corrected outside the implementation tree; final native probes passed. The stale URL behavior was unchanged.

Evidence in `/workspace/work`: `pr239-final-review-app.json`, `pr239-final-review-db.json`, `pr239-final-review-typecheck.log`, `pr239-final-review-lint.log`, `pr239-final-review-build.log`, `pr239-final-review-preview.log`, `pr239-final-review-migrations3.log`, `pr239-final-review-smoke.log`, `pr239-final-review-probes3.log`, `pr239-final-review-native-probes3.log`; probe sources/configs are in `pr239-final-review-probes/` outside the implementation worktree.

Limits: the new UI recovery probes use controlled writer/upload responses and the real mounted component/action/renderer; native persistence probes use real local PG and writer/service/repository, controlled route permissions and verified-asset fixtures, not external byte storage. No new Chromium run or owner visual acceptance is claimed. No real Cloudflare, Neon, Hyperdrive, R2, OAuth, backup/restore, production or deployment action was performed. No merge or package4 work.

The full review is complete. Publication to the existing service PR uses the developer’s standing authorization for comments/publication. No preliminary finding was published before completion. Handoff to Мира for coordination only; correction is not started. Local Worker and disposable PostgreSQL container have been stopped/removed. STOP.


## PR239 — MIRA-PR239-998715-01 реализован; новый head (2026-10-26)

Назначение [6404447575](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6404447575). Проверена собственная causal chain на998715b; implementation изменён только по этому defect. Это авторская implementation verification, не whole-PR review нового head.

- [PR #239](https://github.com/iliya1947/vico-forum/pull/239), final exact head `a7d29546f334a59d42b30b10c67c32595ea98ec1`.
- Parent reviewed head `998715bbf0c531432673f027e5c260722e29b9ea`; base main `f59785c50e91fc1615b568b74a0a56909a92c871`.
- Tree `5caf7582cb6358ff377c5443b6e24718f6e5cae5` совпал с локальным commit `a37703469714f6f83d0acfc47bff99af85df366d`.
- New correction7 files/219 additions/12 deletions; whole PR43 files/1030 additions/65 deletions.

### Причина и выбранная граница

После commit/lost ACK операция закрыта, но mounted form её ещё использует. Новый upload получает настоящий410 gone; error-entry блокирует Save, поэтому прежний modified-replay409/rebase не достигается. Retry повторял terminal operation. Две новые UI regressions воспроизвели это на исходном998715b, остальные24 controls того run прошли.

Исправление только в uploader опубликованной правки:
- MarkdownEditor передаёт внутренний publishedEdit flag из фактического publicationIntent=editPost.
- Только точный server response HTTP410 + error=gone переводит uploader на fresh operation до следующего Retry. Это подтверждение terminal operation, не догадка из transport/503/прочих ошибок.
- Исходный File, выбранные строки, text/Undo/Redo остаются. Save по-прежнему блокируется незавершённым upload; обычный Retry теперь работает под fresh operation/asset ID.
- Другие pending uploads прерываются с сохранением File для Retry; старые ACK подавляются existing identity fence.
- Последующий Save со старой revision штатно получает stale409. Explicit rebase берёт current public baseline, сохраняет уже fresh operation, переносит committed asset в retained один раз. Непубличные uploads от старой operation сохраняются для Retry.
- Ordinary create/reply flows,409/503 и410 без точного gone не меняют retry identity. Ordinary stale revision, completed-receipt rebase,Remove и identical publication replay сохраняются.
- Новый recovery endpoint/preflight/auto-publication не добавлен. Server owner/context/permission/operation checks не менялись.

Source anchors: [rollover и обычный rebase](https://github.com/iliya1947/vico-forum/blob/a7d29546f334a59d42b30b10c67c32595ea98ec1/app/forum/editor-attachments.tsx#L181), [terminal upload boundary](https://github.com/iliya1947/vico-forum/blob/a7d29546f334a59d42b30b10c67c32595ea98ec1/app/forum/editor-attachments.tsx#L244), [edit-only wiring](https://github.com/iliya1947/vico-forum/blob/a7d29546f334a59d42b30b10c67c32595ea98ec1/app/forum/markdown-editor.tsx#L265).

### Проверки и limits

- Local full1065 application /300 native PostgreSQL tests PASS.
- New targeted UI suite31 PASS; включает full mounted editor chain, Undo/Redo, exact File preservation, ordinary retry identity controls, concurrent Files/late ACK и committed asset dedup при обычном rebase.
- Native PG tests используют настоящие edit/upload handlers и проверяют commit/lost ACK→upload410→fresh Retry201→stale409→rebase→Save success с прежним attachment и без него. История ровно3 revisions, итоговые refs без дублей.
- Typecheck,lint(одно прежнееwarning app/forum/ui.test.tsx:174),application/UI-preview builds,migration-history guard и local built Worker smoke PASS.
- Chromium прошёл ту же цепочку с prior.txt и new-file.txt, реальной потерей HTTP response после commit, Undo/Redo, fresh Retry,409/rebase и успешным Save. Итоговые PG refs — ровно два разных выбранных asset.
- Edit requests шли в actual built Worker/native PG. Upload requests мостом направлялись в настоящий Node upload handler/native PG; private bytes storage и upload-session fixture синтетические, real authorization gates сохранены. Это не external R2/provider acceptance и не полный Worker/R2 upload E2E.
- Server410 здесь корректен: исправлена недостижимость client recovery, а не ослаблен отказ terminal operation.
- Test Worker/Chromium/PG container остановлены. Schema,migrations,dependencies и public HTTP contracts unchanged; PROJECT_STATE и docs/EDITOR обновлены.
- Exact-head CI: **[CI #40243954305](https://github.com/iliya1947/vico-forum/actions/runs/40243954305) SUCCESS; checks121321492211/database121321492371 SUCCESS наa7d29546f334a59d42b30b10c67c32595ea98ec1.**.

Первоначальный automatic review отклонил публикацию большого PROJECT_STATE. Read-only checks установили: #236/#239 — один public repository; remote/base blob SHA совпадает; новый diff не содержит infrastructure secrets. После этих проверок повтор через тот же GitHub tool принят. Перенос в другой destination/обход отклонения не применялся; publication blocker отсутствует.

### Передача

Мире: организовать новый whole-PR review **всего8-group package3 scope, предыдущих correction chains и MIRA-PR239-998715-01** на `a7d29546f334a59d42b30b10c67c32595ea98ec1`. Старые PASS/FINDING относятся к прежним heads и не являются verdict по этому head. Технический контекст готов; владельцу не нужно его пересказывать. Автор не объявляет новый independent PASS или merge. Лёва STOP; пакет4+ не начинать.


## Предыдущие heads и handoffs — исторический контекст

Их verdicts/evidence относятся к указанным прежним heads; текущий handoff находится выше.

## PR239 — bounded correction двух review defects; новый stable head (2026-10-25)

Назначение [6402172083](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6402172083). Оба causal chains проверены самостоятельно и исправлены в том же PR239. Это реализация и проверки автора, не новый независимый whole-PR review.

- Exact head `998715bbf0c531432673f027e5c260722e29b9ea`; base main `f59785c50e91fc1615b568b74a0a56909a92c871`.
- Old reviewed head `18c849c92eb597ccd39871914290cf6164fc209b`; correction содержит два коммита (основная correction4cadbf8 + final mounted-editor guard998715b).
- Tree `2c43b9f682cdaa10e6808d4c59e6fff50ab5c862` совпал с локальным `f1b01fb05b25eb652420e1d31e13e0c004a5abff`.
- Correction diff:13 files/270 additions/31 deletions. Whole PR scope остаётся исходными8 группами пакета3; отдельная новая audit group не создаётся.

### 1. Modified replay после committed edit с потерянным response

Проверена реальная цепочка: successful edit записывает publication receipt и закрывает operation. Identical retry idempotent; modified fingerprint отклоняется до revision validation. Старая UI rebase меняла только revision, поэтому повторно использовала несовместимую operation. Red controls: native PostgreSQL/action tests с вложением и без него, плюс hook test fresh-operation/dedup; они воспроизвели исходный отказ/старый ID.

Исправление:
- publicationReceipt бросает ForumPublicationReplayConflictError — subtype прежнего ForumStateConflictError, без изменения schema/domain HTTP409 для других callers.
- edit action только для этого subtype добавляет completedOperationId к existing current-public-post conflict response.
- Explicit rebase заменяет именно совпавшую completed operation; ordinary stale-revision conflict сохраняет прежнюю незавершённую operation и её uploads.
- Новая public selection исключает asset из private selection: уже committed upload retained ровно один раз. Remove отслеживается и до promotion, чтобы file не появлялся обратно.
- Непопавшие в current public baseline uploads сохраняют исходный File в RAM для штатного Retry. Retry использует новый asset ID, поскольку existing server owner/context/operation gates запрещают присваивать old asset ID другой operation. Эти gates не ослаблены; нового endpoint/transfer API нет.
- Активные image destinations меняют opaque ID в current/past/future in-memory history без нового Undo шага; code, escaped literals, labels и прочий source не переписываются. UUID имеют одинаковую длину, selection offsets сохраняются. Bytes/File не сохраняются в text cache.
- Повторный Edit для той же mounted формы только фокусирует её, сохраняя pending recovery, expected revision и operation. При переходе к действительно новой форме completed expectation сбрасывается.

### 2. Wrong edit feedback для unrelated topic-level409

Red component test воспроизвёл реальный topicAction markSolved→ForumStateConflictError при открытом редакторе: прежний UI выбирал postEditConflict только по editingPostId.

Теперь copy выбирается по фактическому result.operation=postEdit либо edit-specific stale-identity guard context. Наличие открытой формы не определяет intent. Positive controls проверяют настоящий edit conflict и stale-account edit guard; unrelated markSolved409 сохраняет solution feedback и тот же buffer без ложного rebase.

### Новое evidence и проверки

- 4 initial red controls:2 UI/hook и2 native PG/action cases. После correction green; совпадение reviewer conclusions не использовано вместо проверки.
- Full local1058 application /298 native PostgreSQL tests PASS.
- Первый concurrent app run:1057 PASS,1 initial-form timeout до injection tested error. Изолированные11 editor cases PASS; fixture ждёт initial form до3s вместо1s, повторный full1058 PASS. Product logic этим timeout не менялась.
- После последнего same-mounted-editor guard:75 editor/public-read UI tests PASS; typecheck,lint(одно прежнее warning app/forum/ui.test.tsx:174) и обе сборки повторно PASS.
- Migration-history guard и local built Worker smoke PASS; schema/migrations/dependencies unchanged.
- Native PostgreSQL cases: committed edit→identical replay→modified409→fresh operation→successful second publication; variants with/without attachment, unique public refs и revision history.
- Chromium→actual built Worker→native PG17: (1) intercept настоящий HTTP response после successful commit, abort его доставку, изменить retained buffer, получить409, explicit rebase/new operation и Save success; (2) mounted editor + real stale markSolved409, верный solution feedback и сохранный buffer. Оба PASS.
- Hook File/ACK controls и source transformation controls синтетические. Новый full R2/provider upload E2E не заявляется. Внешние сервисы/production/owner visual acceptance не запускались; тестовые ресурсы остановлены.
- PROJECT_STATE и docs/EDITOR обновлены в основной correction; необязательная дополнительная заметка последнего guard не публиковалась после automatic review rejection её повторной полной загрузки. Rejected document не передавался другим способом. Final guard и его regression опубликованы только двумя source files; blocker для implementation отсутствует.
- Final exact-head CI: **[CI #40228496459](https://github.com/iliya1947/vico-forum/actions/runs/40228496459) SUCCESS; checks121274983746/database121274983601 SUCCESS на998715bbf0c531432673f027e5c260722e29b9ea.**.

### Handoff

Мире: новый whole-PR review **всего PR239 scope (8 групп) и обоих correction chains** на `998715bbf0c531432673f027e5c260722e29b9ea`. Прежние verdicts относятся к18c849c и не заменяют проверку финального head. Технический контекст готов; владельцу не нужно его пересказывать. Лёва STOP после публикации handoff, пакет4+ не начинать.


## Предыдущие implementation heads и handoffs — исторический контекст

Ниже сохранены прежние результаты; актуальный head и handoff находятся выше.

## PR239 — пакет 3 реализован; stable exact head и handoff (2026-10-25)

Назначение: [6400908779](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6400908779). Реализован только назначенный пакет3. Это работа автора реализации и его проверки; независимый whole-PR review ещё должен состояться.

- [PR #239](https://github.com/iliya1947/vico-forum/pull/239), branch `fix/failure-semantics-edit-recovery`.
- Exact head `18c849c92eb597ccd39871914290cf6164fc209b`; base main `f59785c50e91fc1615b568b74a0a56909a92c871`.
- Tree `315dae98367a489ad62771c4d9536f895b3ebde8` совпал с локальным commit `71f1f3ed0400729f54934845229b57e23610e0c5`.
- 37 files /563 additions /44 deletions. Schema, migrations, dependencies unchanged.

### Scope и причинные исправления

| Canonical group | Реализация и подтверждение |
|---|---|
| ARCH-01 | [runForumMutation](https://github.com/iliya1947/vico-forum/blob/18c849c92eb597ccd39871914290cf6164fc209b/app/forum/mutations.server.ts#L96) больше не превращает неизвестный writer fault в503. Обычный [PG writer](https://github.com/iliya1947/vico-forum/blob/18c849c92eb597ccd39871914290cf6164fc209b/db/hyperdrive-forum.ts#L124) классифицирует установленные connection/query-timeout failures как typed storage unavailable; domain results сохраняются, TypeError/42703 проходят дальше. Два новых action controls были red до изменения, green после. |
| ARCH-03 | Existing bestEffortDiscardClient применяется к writer/auth client и authorization pool. Cleanup не заменяет success/domain/availability/unexpected result. Native PG regressions подтверждают committed reply и404 после sync/async cleanup fault; реальные BetterAuth signup/session results сохраняются. Pool controls используют synthetic Pool/Client, без заявления native pool fault injection. |
| POST-EDIT-AVAIL-01 | [Protected edit loader](https://github.com/iliya1947/vico-forum/blob/18c849c92eb597ccd39871914290cf6164fc209b/app/routes/post-edit.ts#L8) отображает только typed storage/authz outage как503 и экспортирует ForumRouteError. Auth/ownership/permission checks сохранены. Loader controls + shared status-specific boundary tests; отдельный production outage не вызывался. |
| FORUM-READ-AVAIL-01 | [forumReadLoader](https://github.com/iliya1947/vico-forum/blob/18c849c92eb597ccd39871914290cf6164fc209b/app/forum/read-availability.server.ts#L5) применяется к10 primary routes (включая edit resume). Typed outage →503/no-store, TypeError/SQL schema fault остаются ошибками. Existing optional presence/read-state/authz degradation сохранена; explicit optional home control сохраняет200. |
| SEC-01 | [Router handleError](https://github.com/iliya1947/vico-forum/blob/18c849c92eb597ccd39871914290cf6164fc209b/app/entry.server.tsx#L48) вызывает [safe reporter](https://github.com/iliya1947/vico-forum/blob/18c849c92eb597ccd39871914290cf6164fc209b/app/server-logging.ts#L32). Только allowlisted error kind/SQLSTATE и безопасные file-line frames; никакого message/cause payload/SQL/params. Full multiline message удаляется до разбора stack, чтобы private text с fake frame не попал в журнал. Native Chromium→Worker→PG profile failure:500, unpublished bio отсутствует в HTML и Worker log. |
| XR-THROWN-ACTION-BUFFER | [client action](https://github.com/iliya1947/vico-forum/blob/18c849c92eb597ccd39871914290cf6164fc209b/app/forum/editor-action.ts#L5) трёх authoring routes сохраняет mounted форму при server/transport fault с отдельным unexpected result500. Server faults продолжают бросаться и диагностироваться серверным Router. Redirects/aborted navigation не поглощаются. Actual topic loader/action component tests сохраняют тот же form/textarea; browser проверяет реальный network abort и retry. |
| EDITOR-PUB-01 | [Edit conflict action](https://github.com/iliya1947/vico-forum/blob/18c849c92eb597ccd39871914290cf6164fc209b/app/forum/actions.server.ts#L500) после known conflict читает текущий public post baseline, без loader revalidation, которая могла бы снять форму при повторном read fault. [TopicView recovery](https://github.com/iliya1947/vico-forum/blob/18c849c92eb597ccd39871914290cf6164fc209b/app/forum/views.tsx#L2106) показывает current body/attachments и явный rebase; expected revision не меняется автоматически, text/Undo и local attachment intent остаются. Более новый loader snapshot supersedes старый409. Native PG stale revision и реальный browser r1→r2→rebase→save прошли. |
| EDITOR-PUB-02 | [Edit-specific feedback](https://github.com/iliya1947/vico-forum/blob/18c849c92eb597ccd39871914290cf6164fc209b/app/forum/views.tsx#L2581) использует новый postEditConflict вместо solution-selection copy. EN/RU/HE values + reviewed fingerprints добавлены; solution action semantics сохранены. |

Выбранные механизмы проверены по current source и actual error classes. Репозиторий editPublishedPost бросает ForumStateConflictError при stale revision; action работает с этим реальным классом. Новый server reply содержит только текущую публичную post revision, а не submitted buffer. При сбое conflict read форма остаётся открытой; более поздняя unsuccessful submission не откатывает уже refreshed baseline.

### Проверки

- Первые7 новых classification/cleanup controls воспроизвели исходные failures до реализации; существующие55 controls в том run прошли.
- Полные local suites:1051 application tests PASS /296 PostgreSQL tests PASS.
- После последней snapshot-refinement:22 targeted editor/profile/logging tests PASS; typecheck/lint/application/UI builds повторно PASS. Lint имеет только прежнее warning app/forum/ui.test.tsx:174.
- Migration-history guard:0 new migrations, accepted history unchanged. Local built Worker smoke PASS.
- Пять final Chromium cases через built Worker и отдельную native PG17 DB:409 refresh/rebase/save redirect; typed08006→503 + retained buffer/retry; unexpected42703→500 + retained buffer/retry; реальный transport abort + retained buffer/retry; unexpected profile SQL fault500 без private bio в HTML/log.
- В browser повторные успешные redirects закрывали editor и сохраняли отправленный buffer в PG. Новый server-side error reporter был реально вызван на SQL faults.
- PROJECT_STATE, docs/EDITOR.md и docs/auth/AUTHORIZATION.md обновлены только по относящемуся scope.
- CI exact head: **[CI #40219758202](https://github.com/iliya1947/vico-forum/actions/runs/40219758202) SUCCESS; checks121248559346 и database121248559564 SUCCESS на exact head18c849c92eb597ccd39871914290cf6164fc209b**.

### Границы и передача

Loader outage tests используют typed capability errors; Worker/browser faults injected только в отдельной disposable PG17 DB. Внешние Cloudflare/Neon/Hyperdrive/R2/OAuth/backup-restore сервисы и production не проверялись/не менялись. Browser checks технические, не owner visual acceptance. Новые SOT assertions не объявляют whole-PR review или merge выполненными. Local Worker/Chromium и тестовый PG container остановлены.

Мире: организовать whole-PR review **всего scope PR239** на exact head `18c849c92eb597ccd39871914290cf6164fc209b`; CI сам по себе не заменяет причинную проверку. Technical context опубликован здесь и в #236; пересказ владельцем не нужен. Лёва STOP после handoff. Пакет4+ не начинать.

## Исторические записи до пакета3

Статусы ниже относятся к указанным прежним heads/этапам; актуальный handoff находится выше.

## PR238 — bounded correction AUTH-LINK-STALE-IDENTITY-01 готова к новому review (2026-10-25)

Назначение: [6400105733](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6400105733). Исправлен только подтверждённый stale-visible/current identity boundary; пакет3 не начат.

- PR238 / branch `fix/auth-session-identity`.
- New stable exact head `3d6fe4d178d87e0697d531c962f784296f169d80`; parent reviewed head `8866bd8bfb6f8121a5e181c88a9e542741040b64`.
- Base main `ab4d29e8853b216d4aef6c22f1fc373fed8ebf0d`.
- Tree `a644f588a0a4f3fe0ec1a567a4227c8f83f31a25` совпадает с локальным commit `763cee69c0f80de8f6650c1890081bca7d606e26`.
- Correction:10files/192additions/16deletions. Schema/migrations/dependencies unchanged.

### Выбранная минимальная граница

Own-profile GoogleAccountLink передаёт именно profile.id (отображаемый аккаунт) как expectedUserId; auth-client посылает его в `x-vico-link-user` на том же linkSocial request. Это expectation, не authentication evidence.

В существующий BetterAuth before-hook добавлен branch по нормализованному endpoint `/link-social`. Через public exported `getAuthoritativeSessionFromCtx` BetterAuth1.7.7 читается authoritative DB session; guest401, missing/mismatched expectation409/VICO_LINK_IDENTITY_CHANGED до state/account creation. Endpoint sessionMiddleware использует ту же request-local session, а штатный signed OAuth state фиксирует её target. Отдельный endpoint/wrapper/preflight request или новая session/permission architecture не введены. Registration hook сохранён в том же before middleware; его имя уточнено как betterAuthRequestHooks.

Это закрывает разрыв между отдельной client preflight-проверкой и реальным link request. CallbackURL остаётся только адресом возврата. Existing same-email/provider-verification/origin gates не ослаблены. Client показывает прежний safe auth feedback и не подменяет expectation на currentB для автоматического retry.

### Регрессии

Новый tests/database/auth-link-identity.test.ts использует настоящий PostgreSQL17, Vico options, BetterAuth HTTP initiation, signed state и callback. Только внешний provider code-exchange/getUserInfo synthetic.8cases:

1. stale expectedA/currentB + verified GoogleB →409, verification/state rows0 и Google links0.
2. normal A/A + verified GoogleA → initiation200, callback302, persisted link.userIdA.
3. A/A + GoogleB email mismatch → callback error, no link.
4. A/A + unverified GoogleA → callback error, no link.
5. guest →401, no state/link.
6. missing expectation/currentB →409, no state/link.
7. initiationA/A, browser cookie меняется наB перед callback → signed state сохраняет targetA, B не подхватывается.
8. foreign Origin →403, no state/link.

В positive initiation spy подтверждает ровно один internal findSession, то есть handler не переопределяет checked identity второй выборкой. В test options явно включены origin/CSRF checks: BetterAuth по умолчанию отключает origin check в test mode. Production config ради теста не менялась.

До code correction исходные6cases дали4pass/2fail: stale и missing expectation возвращали200 вместо409. После correction весь targeted auth-native run11/11 (8новых+3legacy) и полный291/291 PG PASS. Существующие ID-token negative controls теперь передают правильную expectation для проверяемого пользователя и проверяют LINKING_DIFFERENT_EMAILS_NOT_ALLOWED/LINKING_NOT_ALLOWED; новый guard не маскирует эти проверки собственным409. SDK/component regressions проверяют передачу expected profile ID и отсутствие автоматического retry.

### Проверки / handoff

Полные997 application tests и291 PostgreSQL tests PASS. Typecheck, lint(одно прежнееwarning ui.test.tsx:174),app/UI-preview builds,migration-history guard и local built Worker smoke PASS. Во время разработки harness origin-control выявил test-mode skipOriginCheck; исправлена только конфигурация теста. Один TS optional-field index в новом тесте исправлен до финальных checks. Локальные Worker и disposable PG остановлены/удалены после проверок.

**[CI40213325914](https://github.com/iliya1947/vico-forum/actions/runs/40213325914) SUCCESS:** checks121229042957 и database121229043132 SUCCESS на новом exact head. Remote tree совпал с локально проверенным. PR description, PROJECT_STATE и auth SOT обновлены.

Предыдущие FINDING-verdicts относятся к8866bd8; новый stable head требует нового whole-PR review всего назначенного PR238 scope. Независимый review correction/merge не выполнены и не заявляются; исправление не считается принятым вmain. External Google/provider smoke, production rollout, visual acceptance и другие audit packages не запускались.

**Следующий шаг — Мира организует новый whole-PR review PR238 через #236. Лёва STOP после correction.** Разработчик только подключает Миру; контекст передан здесь.

---

## PR #238 — полный технический review автора: FINDING (2026-10-25)

Назначение: [6399879967](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6399879967).
Exact head: `8866bd8bfb6f8121a5e181c88a9e542741040b64`; base `ab4d29e8853b216d4aef6c22f1fc373fed8ebf0d`.
Локальный commit196d03a имеет то же дерево `d536c1656821643540e87966f200aab902a3b170`, что опубликованный head; PR head повторно проверен и не менялся. Просмотрен весь diff34files и относящиеся execution paths/SOT.

**Verdict: один подтверждённый current-Stage P2 defect; PASS/merge пока невозможны.** Это техническая самопроверка автора реализации, а не третий независимый аудит. Выводы Миры/Лиры были известны до проверки; их совпадение доказательством не использовалось.

### AUTH-LINK-STALE-IDENTITY-01 — подтверждён собственной проверкой

`PR238-LIRA-01` — alias того же finding, не второй дефект.

Исходная цепочка:
1. `app/routes/profile.tsx:24` вычисляет isOwner при sessionA; `app/forum/profile-view.tsx:32` оставляет ConnectGoogle на загруженном профилеA.
2. После смены browser session наB старая вкладка до очередного heartbeat/revalidation может сохранять профильA. Presence interval60000 и visibility event — последующая eventual revalidation, не guard нажатия.
3. `app/auth/google-account-link.tsx:19` вызывает link(callbackURL); `app/auth/auth-client.ts:6` передаёт provider+callbackURL+errorCallbackURL без expected visible actor. Auth API route направляет запрос напрямую в BetterAuth.
4. В установленном BetterAuth1.7.7 `api/routes/account.mjs` linkSocial использует c.context.session и сохраняет link.userId/session.user.id + link.email в OAuth state. В `oauth2/state.mjs` callbackURL сохраняется отдельно как адрес возврата.
5. `api/routes/callback.mjs` → linkOAuthAccount использует именно userId из state; profile ID из callbackURL не выбирает и не проверяет target identity.
6. Поэтому sessionB + подходящий verified GoogleB создаёт связь уB и возвращает браузер на профильA. GoogleA при той же sessionB отклоняется штатной same-email проверкой.

**Новая локальная проверка полного redirect/state/callback path:** настоящие BetterAuth1.7.7 HTTP handlers и production Vico options; только persistence заменён memory adapter, внешняя code-exchange/getUserInfo boundary — synthetic provider. Два controls выполнены, оба PASS как воспроизведение текущего поведения:

| Видимый профиль / current session | Provider | Результат |
|---|---|---|
| A / B | verified GoogleA | link initiation200; callback302 с error; Google-связей0 |
| A / B | verified GoogleB | link initiation200; callback302 на профильA; Google-связь записана с userIdB, неA |
| A / guest | любой | link-social401 до state/link |

В обоих provider cases guest401 проверяется отдельно. Синтетический провайдер возвращает уже подтверждённую identity; тест не отключает production verification policy и не утверждает реальную Google acceptance. Signed state, его cookie validation, настоящий callback handler, account email gates и target adapter write не заменялись. Native multi-tab/browser/Google/production E2E не выполнялся.

Локальные artifacts: `/workspace/work/pr238-review/link-boundary.test.ts`, `link-results.json`, `link-boundary-evidence.json`. Реализация PR не менялась; review harness находится вне worktree.

**Уточнение published finding:** это не захват аккаунта и не обход email/provider ownership. Отклонение GoogleA не опровергает defect: GoogleB соответствует текущей server identityB и проходит все штатные gates. CallbackURL профиляA, fresh sessionB и eventual heartbeat также не предотвращают операцию надB. Уже сформированный OAuth state фиксируетB; сам callback не переопределяет target через profile URL. Текущие PR integration tests проверяли B+GoogleA mismatch, но не этот B+GoogleB сценарий при stale UIA.

**Требуемое исправленное поведение:** stale visibleA/currentB не должен незаметно инициировать/выполнить linking дляB. Нужна проверяемая привязка операции к отображаемой identity либо её осознанное обновление до запуска; одна предварительная client getSession проверка не доказывает отсутствие гонки между check и link request. Существующие provider/email/authentication/origin gates сохранить. Конкретный механизм этим review не предписывается. После correction проверить staleA/B+GoogleB deny/no mutation, нормальный same-identity link success и guest/mismatched-provider negatives.

### Весь остальной назначенный scope

| Scope | Проверка / технический итог |
|---|---|
| AUTH-01 | Chronological Set-Cookie lookup→endpoint сохраняет cache headers и завершающий session result; проверены expired-session/login, sliding refresh, request composition. Дополнительных findings нет. |
| AUTH-02 | Role existence/key-share внутри существующей serialized authz management transaction; missing-role → typed404, assignment rollback; runtime role имеет необходимые SELECT/UPDATE. Lockout/effective permissions не ослаблены. Других findings нет. |
| AUTH-LINK-01 | Explicit own-profile link поддерживает unverified local email без снятия implicit-link gate; same-email/provider ownership contracts сохранены. Блокер описан выше. |
| AUTH-LOCALE-RETURN-01 | Только credential pages, старый sanitizer до remap + новый после; registered canonical target из navigation provider; query/hash сохраняются, unsafe/cross-locale destinations отвергаются. OwnerA соблюдён. Новых findings нет. |
| AUTH-SESSION-AVAIL-01 | Request-local adapter observer сохраняет query cause до BetterAuth cause-less APIError; narrow cause-chain classifier и safe503 до Router. Unexpected/schema/config failures не становятся guest/permission denial. Дополнительных current defects не установлено. |
| XR-CROSS-TAB-IDENTITY (editor) | Mounted editorActorId реально попадает в native FormData; четыре action paths сравнивают с request session до writer; expectation не authority. Heartbeat409 прекращает polling и revalidates. Других findings в назначенном editor path нет. |
| DOC-04 | docs/EDITOR и auth SOT согласованы с effective forum.post.history.read, default grants/custom roles/overrides; role-name checks не добавлены. Findings нет. |

Посмотрены также все сопутствующие изменения locale UI, manual values/fingerprints, preview auth-action suppression, PROJECT_STATE и тестов; новых несвязанных current defects не подтверждено. Известный исторический DOC01 не переоткрывался в этом PR.

### Verification / STOP

Свежий targeted run: **190 tests PASS** (auth, cookie/credential, editor/native submit, write actions, profile, presence, language UI, authorization route, Worker). Дополнительно2 local redirect/callback cases PASS. Полный995app/283PG прогон, сборки и guards — результаты предшествующей реализации на том же дереве, не новый review-run; native PostgreSQL suite в этом review не перезапускался. Exact-head [CI40202422836](https://github.com/iliya1947/vico-forum/actions/runs/40202422836) повторно проверен: SUCCESS. GreenCI не снимает найденный defect.

Implementation/main не изменялись; tracked diff чист. External/production/visual acceptance не запускались. **STOP после review.** Мира координирует bounded correction этого одного finding; исправление и новый exact-head review — отдельный следующий этап, мной автоматически не начаты.

---

## Пакет 2 — auth/session/identity: реализация готова к review (2026-10-25)

Поручение: [PR236 comment6398462662](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6398462662). В текущем чате владелец направил к PR236; выполнен только назначенный пакет2, без перехода к следующим.
Implementation: [PR #238](https://github.com/iliya1947/vico-forum/pull/238), ветка `fix/auth-session-identity`.
Stable exact head: `8866bd8bfb6f8121a5e181c88a9e542741040b64`.
Base main после owner merge #237: `ab4d29e8853b216d4aef6c22f1fc373fed8ebf0d`.
Tree: `d536c1656821643540e87966f200aab902a3b170`, совпал с локально проверенным commit `196d03a3cfb4151f600ad05152371ff6406ea941`.
34 файла, 412 additions/27 deletions. Схема, миграции и зависимости не изменены.

### Причины и исправления

- AUTH-01: preliminary getSession cleanup раньше добавлялся после нового endpoint cookie. Теперь chronological Set-Cookie order: lookup → final response. Настоящий Better Auth HTTP + PostgreSQL regression проходит expired-cookie → password login → subsequent authenticated session; на baseline main падает на потерянной сессии.
- AUTH-02: stale custom role ID доходил до FK failure. В существующей serialized authz management transaction проверяется существование role с key-share lock; отсутствующая роль даёт AuthorizationNotFoundError, route mapping404 уже существует. Assignment не меняется. Native PostgreSQL regression red на baseline, green с исправлением.
- AUTH-LOCALE-RETURN-01: LanguageSwitcher remap-ит nested returnTo только для credential pages и только после старого credentialReturnPath sanitizer. Query/hash и посторонние параметры сохранены; unsafe/cross-locale inputs остаются отвергнуты. Owner optionA соблюдён.
- AUTH-LINK-01: защитный requireLocalEmailVerified gate сохранён. Добавлен штатный authenticated linkSocial Google из собственного профиля и credential-page guidance сначала войти паролем. Real Better Auth/PostgreSQL tests с synthetic provider ownership проверяют: implicit same-email/unverified local login не выдаёт сессию/связь; guest link401; другая local identity не может link; unverified provider не может link; authenticated owner + verified same-email Google успешно связываются, subsequent Google login возвращает исходный user ID. Production Google/provider verification не подменялась: fake существует только внутри test options. Static preview блокирует и новую auth action, чтобы не вызывать реальный API.
- AUTH-SESSION-AVAIL-01: Better Auth1.7.7 getSession заменяет query failure cause-less APIError. Узкий request-local observer DB adapter сохраняет исходную ошибку только для session lookup; classifier обходит cause chain и принимает только известные transport/connection/query timeout failures. Worker возвращает safe no-store503 до Router; schema/programming/configuration failures остаются unexpected. Проверены actual Better Auth query failure, missing-schema negative и Worker boundary.
- XR-CROSS-TAB-IDENTITY: mounted MarkdownEditor передаёт editorActorId как expectation, не authority. Несовпадение с session отклоняет четыре publication/edit paths409 до writer. Heartbeat отправляет expectedUserId; mismatch409 останавливает polling и запускает loader revalidation. Current session/permissions остаются единственным authority. Positive native submit проверяет реальное поле; server negative regressions red на main, green с исправлением.
- DOC-04: docs/EDITOR.md согласован с effective forum.post.history.read; moderator/admin — default grants, custom grants/overrides не исключены. Новая permission architecture не вводилась.

### Проверки и ограничения

Pinned Node24.21.0/pnpm12.3.4. Полные 995 application и283 PostgreSQL tests PASS; финальный targeted editor/action/link run121 PASS. Typecheck, lint(одно прежнее warning ui.test.tsx:174), app/UI-preview builds, Drizzle metadata/generation parity, accepted-migration history, schema manifest47tables и local built Worker smoke PASS. Изолированные baseline controls: cookie1 failure, role1 failure, stale-editor4 failures ожидаемы; на implementation соответствующие проверки зелёные.

Первый full DB run имел5 CLI harness failures из-за PATH системного pnpm; после pinned PATH остался один cold CLI10s timeout, targeted повтор12/12 и полный повтор283/283 прошли. Продуктовый код ради этих setup failures не менялся. Повторный lint после сборки зацепил generated dist; собственный build artifact вынесен из source tree, полный source lint прошёл. Локальный PostgreSQL контейнер и Worker preview после проверок остановлены/удалены.

[CI #40202422836](https://github.com/iliya1947/vico-forum/actions/runs/40202422836): checks SUCCESS (job121196211898), database SUCCESS (job121196211728), exact head указан выше. Содержимое remote tree совпадает с локально проверенным. CI выполняет также privilege/provisioning/Worker gates.

Независимый whole-PR review и merge #238 не выполнены и не заявляются. Findings этого пакета не считать закрытыми в main до принятия/merge. External Stage6, реальные Cloudflare/Neon/Hyperdrive/R2/OAuth/backup-restore, production rollout и owner visual acceptance не выполнялись. Auth UI проверен component tests; новой real-browser visual acceptance не заявляется.

### Передача / STOP

Мира: организовать независимую whole-PR проверку PR238 на stable head8866bd8bfb6f8121a5e181c88a9e542741040b64 в порядке актуального AGENTS.md; этот handoff описывает реализацию и её проверки, не заменяет независимый review. Разработчику достаточно подключить Миру к PR236, технический контекст уже здесь. Лёва STOP после пакета2.

---

## AUTH-RATE-LIMIT-RACE-01 — первый implementation package (2026-10-25)

Поручение владельца: PR236 comment6397600154; публикация и CI дополнительно прямо разрешены владельцем в текущем чате после остановки auto-review. Реализацию первого пакета выполняет Лёва; остальные пакеты не начаты.

Implementation PR: https://github.com/iliya1947/vico-forum/pull/237
Stable code/test/doc head: `4a445b1c31b7465007bf3f9ddc55c0cd62eda03b`.
Baseline main: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.
Tree: `2071f624becacb49deeb1da9b8cd2b74f66b1f3f`, совпадает с локально проверенным деревом.

### Реализация

- Пять файлов: package.json, pnpm-lock.yaml, tests/database/auth-rate-limit-concurrency.test.ts, PROJECT_STATE.md, docs/auth/AUTHORIZATION.md.
- Better Auth и @better-auth/drizzle-adapter обновлены с1.7.4 до1.7.7, первого patched release GHSA-44jh-23m7-hpcf. Из lockfile обновлены связанные auth family/required fetch peer; unrelated resolver reordering удалён.
- PostgreSQL/Drizzle и database-backed limits сохранены. Production config/auth/session/effective-permission semantics не изменялись. Новая схема/migration, custom rate-limit wrapper, внешнее хранилище не введены.
- Native PostgreSQL17 regression использует actual Better Auth HTTP handler и production options с малым test-only rule: три admission UPDATE одновременно ждут блокировку одного row. После освобождения только оставшееся allowance получает200, остальные429. Проверены active window, expired-window reset, persisted count, positive retry metadata, JSON error content type и отдельный IP bucket.

### Доказательства

Контроль на baseline dependencies1.7.4: оба случая red — все3 concurrent requests прошли при allowance1/2. Тот же regression на1.7.7: оба green. Это bounded local concurrency test, не attack/stress production.

Локально pinned Node24.21.0/pnpm12.3.4:979 application tests,281 PostgreSQL tests; lint(одно прежнее warning),typecheck,app/preview builds,frozen-lockfile,migration/schema/parity/privilege/provisioning probes и local Workers smoke passed. Первоначальные setup/lint harness issues исправлены до публикации; final validations success.

CI: [GitHub Actions #40195292682](https://github.com/iliya1947/vico-forum/actions/runs/40195292682) — SUCCESS, checks и database SUCCESS на head4a445b1c31b7465007bf3f9ddc55c0cd62eda03b.

### Передача / STOP

Проверка относится только к указанному implementation head; независимый whole-PR review не выполнен и не заявляется. Merge не выполнялся. Реальные Cloudflare/Neon/Hyperdrive/R2/OAuth, production rollout,visual acceptance и следующие10 пакетов не запускались. Следующий шаг — Мира организует независимую whole-PR проверку PR237 по принятому процессу; технический контекст уже в служебном PR236. После отчёта Лёва останавливается на первом пакете.

---

## Архитектурная сверка fix-plan — Лёва / FPLAN-T2 (2026-10-25)

**Поручение:** [PR236 comment6397485409](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6397485409). Полностью сопоставлены три planning checkpoints Миры6396882503/6397022247/6397105809 и FPLAN-T1 Лиры6397337524 с двумя уже принятыми Мирой acceptance-уточнениями. Baseline planning/code: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.

### Вердикт

**ACCEPT — согласен с уточнённым планом из11 implementation PR.** Конкретных архитектурных расхождений, обязательного split/merge, пропусков или повторов finding IDs не обнаружил. Двух принятых уточнений Лиры достаточно; дополнительных обязательных изменений плана не предлагаю. Это архитектурное согласие с планированием, не разрешение начинать код/upgrade/deploy и не заявление, что дефекты исправлены.

После зафиксированных owner decisions итог61 technical +2 preview +4 docs, открытых нормативных вопросов для этой проверки нет. Прежний мой60-count предшествовал решению по AUTH-LOCALE-RETURN-01. DOC-04 остаётся документационным, effective-permission model принята; новый technical authz defect из него не создаётся.

### Механическая проверка покрытия Scope

Проверен именно Scope каждого execution PR, а не случайные упоминания ID в пояснениях. Все61 technical IDs уникальны и точно совпадают с принятым реестром;2 preview и4 primary documentation assignments покрыты. Повторная conditional проверка DOC-02/03/04 в PR11 не считается второй реализацией или лишним finding.

| PR | Technical | Preview | Основная documentation запись |
|---|---:|---:|---|
| 1 Dependency/rate-limit | 1 | 0 | — |
| 2 Auth/session/identity | 6 | 0 | DOC-04 |
| 3 Failure + edit recovery | 8 | 0 | — |
| 4 DB + notifications/read-state | 6 | 0 | DOC-02 |
| 5 Help + tags | 4 | 0 | DOC-03 |
| 6 Attachments | 6 | 0 | — |
| 7 Markdown semantics | 11 | 0 | — |
| 8 Localization runtime | 9 | 0 | — |
| 9 Search/discovery | 3 | 0 | — |
| 10 Interaction/UI + preview | 7 | 2 | — |
| 11 Documentation closeout | 0 | 0 | DOC-01; остаточная сверка sidecars |
| Итого | 61 | 2 | 4 уникальных |

### Causal/verification dependencies и порядок

1. **PR1 перед PR2:** dependency/config correction изолирует version/compatibility risk; auth behavior проверяется на уже принятой версии. Изменения upstream не следует компенсировать application workaround поверх заменяемой версии. Следующий task всё равно должен начинаться от actual accepted main и проверять оставшийся symptom — план не требует воспроизводить уже устранённую зависимостью ошибку как дополнительную реализацию.
2. **PR2 затем PR3:** auth identity/session contract становится принятым baseline для fault recovery. Pre-router auth startup failure относится к PR2, общий mutation/route classification и editor recovery — к PR3. Это разные места ответственности, а не два новых конкурирующих error frameworks. Требование сохранить authoritative identity не отменяется сохранением буфера в failed-action recovery.
3. **PR3 вместе с edit409:** catch/rethrow/classification, безопасная observability и mounted-editor failure state имеют общий integration regression. Разносить исправление unexpected faults и buffer recovery так, чтобы промежуточный PR снова терял текст, оснований нет. При этом восемь causal findings не объявлены одной причиной; EDITOR-PUB-01/02 остаются двумя записями.
4. **PR4:** DB-03 непосредственно нужен read-state paths; DB/schema/privilege и notifications/read-state проверяются в одном disposable PostgreSQL boundary. Migration/parity/constraint changes не смешаны с production ACL rollout. DB-01/DB-02 остаются самостоятельными regressions, даже если их можно проверить в том же пакете.
5. **PR5:** четыре ограниченных current public-write/domain corrections можно проверить одним пакетом без redesign Help. Tag validation касается обычной и Help publication; критерий bounded write — общий, отсутствие нового численного cap в плане не делает его неполным. Выбор конкретной границы — implementation design, а не дополнительный feature scope. Не требуется связывать tags и stale Help intent одним root cause.
6. **PR6 перед позднейшими editor изменениями:** attachment selection/lifecycle стабилизируется независимо от Markdown transformations. Orphan reconciliation, archive validation и HTTP methods имеют собственные regressions. Достаточных причин обязательного раздробления шести ограниченных findings не установлено; конкретный fix должен соблюдать запрет несвязанного redesign.
7. **PR7 перед PR8:** shared custom structural grammar закрывается в PR7 целиком, включая mention recipients и translation structure protection. PR8 не оставлен местом для второй competing grammar/компенсации первой. LOC-08 direction round-trip и durable translation generations остаются самостоятельными задачами PR8; это предотвращает повторную переделку одного структурного контракта.
8. **PR9 отдельно:** URL/search state и известные source lang/dir на discovery surfaces не требуют расширения durable translation jobs/provider scope. Наличие общих presentation файлов само по себе не требует merge с PR8.
9. **PR10 после semantic исправлений:** interaction/selection/disabled/layout проверяются на принятом editor baseline. Два preview defects — bounded fixture/router corrections в том же представительном tool surface; обязательной причины вынести их в отдельный PR нет. Кодовый regression и production/tooling classification остаются разными, preview не выдаётся за production acceptance.
10. **PR11 последний:** закрывает DOC-01 и проверяет остатки четырёх подтверждённых doc findings. Это не разрешение откладывать обязательные project-state/doc changes каждого implementation PR: handoff execution plan прямо требует их до whole-PR review. DOC-02 всегда относится к фактической authoritative migration chain после изменений, а не к захардкоженному старому0044. Будущее verified/merged состояние заранее не записывается.

План задаёт допустимую последовательность. Не все соседние PR являются жёсткой causal зависимостью, и это не нужно для его корректности. Важные version/structural/state boundaries учтены; зависимости по незамерженным branches не создаются. Факт пересечения views/editor/repository файлов не является самостоятельным основанием искусственного split/merge: каждый следующий PR строится от уже принятого main.

### Done criteria и два уточнения FPLAN-T1

**FPLAN-01 / PR2 / AUTH-LINK-01 — принимаю.** Позитивный same-email flow недостаточен: regression должен подтвердить владение/авторизацию связываемой local identity и запрет доступа/implicit linking лишь по совпадению unverified email. Этот отрицательный контроль не позволяет выдать ослабление protective gate за корректное исправление. Конкретный безопасный linking/verification mechanism не предписан; реальные Google credentials/provider smoke не требуются и не объявляются выполненными.

**FPLAN-02 / PR6 / ATTACH-04 — принимаю.** Проверка с несколькими pending/stored файлами и набранным текстом должна показать: Remove одного pending сохраняет текст и остальные выбранные файлы, late ACK не восстанавливает снятый файл. Это прямо проверяет отличие selective Remove от whole Cancel. Не требуется per-file DELETE/network abort.

Остальные критерии достаточно конкретны для назначения bounded implementation tasks: они называют broken invariant и наблюдаемый результат, не требуют новой архитектуры. В частности, PR3 различает typed/unexpected/cleanup cases и проверяет buffer/logging, PR4 задаёт concurrent/constraint/privilege cases, PR7 сохраняет обе custom-grammar подпроблемы, PR8 проверяет policy generations/bundle hit/direction, PR9 — URL/results/metadata, PR10 — функциональные interaction/layout/preview failures. Конкретные технические решения и безопасные размеры regression fixtures выбираются при реализации, а не подменяются обязательным переписыванием системы.

### Scope и owner decisions сохранены

- AUTH-LOCALE-RETURN-01: accepted option A, remap только безопасного внутреннего nested destination, sanitizer не ослабляется; query/hash не теряются.
- DOC-04: effective permission authoritative, moderator/admin — initial/default grants, custom roles/overrides сохраняются.
- DOC-03: moderator-only pending Disputed; не вводить новый public badge.
- M-M10/F06 — deferred contrast refinement; не подмешивать его в текущий PR10. ARCH-02, общий content max, raw UUID, generic pagination и прочие observations не возвращены в fix scope.
- Реальные Cloudflare/Neon/Hyperdrive/R2/OAuth/backup/restore, real provider/Queue/production rollout и owner visual acceptance не подразумеваются. Local/CI internal contract checks не выдаются за external acceptance.
- Текущая planning review не назначает Мишаню участником. Future whole-PR review следует актуальному AGENTS и более поздним owner instructions; состав planning reviewers не переопределяет молча будущие роли.
- `PROJECT_STATE.md`/implementation tasks относятся к реально проверенному exact head. Merge остаётся действием владельца. На этом шаге ничего не реализовано и не запущено из будущего плана.

### Передача результата

**Архитектурная проверка завершена: ACCEPT с двумя уже принятыми уточнениями Лиры, новых обязательных изменений нет.** Мира может свести командный fix-plan из checkpoints и FPLAN-T1/T2; дальнейший implementation task PR1 — отдельный шаг после принятия плана. Владелец не должен пересказывать scope/замечания между агентами: технический контекст и результат уже опубликованы в PR236.

Evidence этого review — полные planning comment inputs и механическая set/coverage сверка (`FIX-PLAN-ARCHITECTURE-REVIEW.json`). Новые product tests, CI, native/browser/PG acceptance, полный кодовый аудит, implementation/schema/dependency/main изменения не выполнялись. Чужие личные файлы и общий service-channel не менялись; публикация только в личный файл Лёвы и краткий PR comment.

---

## Финальное совещание — технический итог Лёвы / T5 (2026-10-25)

**Поручение:** [PR236 comment6392064227](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6392064227), после публикации T4 Лиры. Проверены консолидация Миры6391992192 / shared commit046365d0f458ea955687e4d1446a20ef96e48736, T4 Лиры6392203749 / file blob19ff8030c986ab8d74d9ff5f432cc2f57e91e1ba и поздние checkpoint verdicts, изменяющие мой прежний итог. Код baseline `d72b27ca762dd930f0e7ad614e5b00832a07ec0c` не изменился. Это финальная техническая сверка результатов, не новый аудит репозитория.

### Вердикт

**Рекомендую тот же реестр, что Мира и T4 Лиры: 60 уникальных текущих технических групп, отдельно2 preview/tooling и4 documentation/SOT; AUTH-LOCALE-RETURN-01 остаётся одним открытым продуктовым вопросом. Список технических отличий от консолидации Миры — пусто.**

Проверено точное множество60 ID, отсутствие повторов и соответствие собственным evidence/matrix. Это моё техническое согласие, не самовольное объявление общего consensus и не утверждение fix-plan. Следующее сведение consensus выполняет Мира. Реестр и severity сами по себе не разрешают implementation/dependency/schema changes.

**Эта запись уточняет прежний итог Лёвы «58 supported code groups +4 questions» и имеет над ним приоритет.** Предыдущие отчёты остаются историческими доказательствами; их технические наблюдения не объявляются несуществовавшими.

### Что изменилось относительно моего прежнего итога и почему

| Пункт | Новый вердикт | Основание и границы |
|---|---|---|
| AUTH-LINK-01 | Включить, +1 | Ранее я слишком широко применил исключение OAuth и исключил внутренний code/config contract. В package/installed Better Auth1.7.4 requireLocalEmailVerified по умолчанию true; signup оставляет local identity unverified, verification отложена, обычный offered social sign-in не является explicit link. Same-email local user без linked Google account попадает в account-not-linked. Это bounded conditional internal configuration defect, не утверждение, что любой Google вход сломан. Внешний OAuth/Google, credentials/redirect provisioning/smoke не проверялись; отключение security gate не предлагается. |
| AUTH-RATE-LIMIT-RACE-01 | Добавить новый применимый dependency/config finding, +1 | Официальный GHSA-44jh-23m7-hpcf: affected Better Auth/Drizzle adapter >=1.6.17,<1.7.7 при PostgreSQL database-backed limits. Здесь оба package pins1.7.4, provider pg, rateLimit enabled/database/model rateLimit. Условия совпадают. Не aggregate25 vulnerabilities; не native/production exploit, не bypass пароля. Dependency upgrade/compatibility review не выполнялись. |
| ATTACH-04 | Включить, +1 | Ранее я сформулировал открытый вопрос как обязательность abort pending request. Current docs/EDITOR.md182,194–199,364–367 требуют возможности исключить файл из mounted selection; Remove локален, late ACK не должен вернуть selection. Для этого не обязателен network abort/per-file server DELETE. Собственный component repro уже достаточен: pending row запрещает Remove, обычная whole Cancel имеет другую semantics и очищает всю операцию. Дефект выбора файла, а не штатного publication barrier или Cancel. Дополнительного решения владельца об API отмены для классификации не требуется. |
| TAG-CARDINALITY-01 | Включить, +1 | Для маленькой строки t000…t499 нормализатор допускает500 distinct tags; repository записывает500 global tags и500 links в одном permitted topic transaction; readTags выводит global catalogue. Перечитан действующий basic anti-spam contract public-write boundaries (ROADMAP42,210): cooldown ограничивает mutations, но не persistent/public fan-out одной. Это конкретная current write-boundary gap, а не просто отсутствие гипотетического max длинного body. Правильный численный cap — fix design, здесь не выбирается; latency/exhaustion/deployed DoS не доказаны. |
| M-M10/F06 | Deferred UI/accessibility, −1 из текущего technical count | Обе известные контрастные пары остаются истинными. Owner MVP-first decision docs/UI_UX_PASS17–24 и ROADMAP349–370 отделяют неблокирующий refinement от functional/security/data/authz дефектов. Не удалять из pre-release обязательств, не объявлять сайт WCAG compliant. RES-A11Y-01 с отсутствующим accessible name функционального input остаётся отдельным current finding. |
| EDITOR-09 + LOC-07 | Одна MARKDOWN-CUSTOM-STRUCTURE-DIVERGENCE-01, −1 net | Renderer использует segmentTechnicalMarkdown для собственных table/spoiler, recipient extraction — plain fromMarkdown, translation protection — generic parse/serialize без той же structural grammar. Общий root-cause family: вторичные semantic consumers не видят canonical custom structures. **Обязательно сохранить обе проверяемые подпроблемы** — recipient selection и translation structure protection. Это не навязывает один parser/fix. LOC-08 direction parse/serialize non-round-trip остаётся отдельным. |

Арифметика от моего прежнего code-total: **58 +1 link +1 rate +1 attachment +1 tags −1 contrast −1 merge =60**. Точный set-diff: added ATTACH-04, AUTH-LINK-01, AUTH-RATE-LIMIT-RACE-01, TAG-CARDINALITY-01, MARKDOWN-CUSTOM-STRUCTURE-DIVERGENCE-01; removed-as-separate EDITOR-09, LOC-07, M-M10. Это изменение классификации/гранулярности и один новый advisory, не60 новых найденных уязвимостей.

### Другие уточнения, не меняющие этот set-diff

- ARCH-02 окончательно снять как current leak, не оставлять обязательным owner/service вопросом. Официальный Worker/Hyperdrive lifecycle освобождает клиентское соединение после invocation; current loader request-scoped, не global. Мой native Pg idle-client proof моделировал standalone client без platform lifecycle. Нулевой endCalls остаётся локальным фактом, runtime leak из него не следует. Live service не тестировался.
- EDITOR-PUB-01/02 уже разделены в моём последнем реестре: revalidation/rebase409 и solution-oriented conflict copy — две причины. Не возвращать прежнее ошибочное объединение.
- HELP-01 содержит stale appeal и stale relationship removal subcases; HELP-MOD-01 относится к смене best-answer target и отдельно сохраняется. Transaction locks текущего объекта не привязывают старое UI intent к увиденной identity.
- ATTACH-02 classic65535 ZIP rejection не равен ATTACH-STRUCT-01 inconsistent ZIP metadata acceptance. CORE-01 deadlock не равен ARCH-01 exception→503 classification. LOC-08 не поглощён общей custom-table/spoiler family.
- DISCOVERY-01 и I18N-UGC-META-01 поддержаны собственными SQL/DOM проверками части5: internal service-section name/id в generic unanswered и Hebrew title без lang при dir=auto. Direct service-section read заблокирован; broad privacy bypass/all UGC failures не заявляются.
- DB-03 — внутренний exact ACL contract mismatch, не утверждение о production grants. POST-EDIT-AVAIL-01 Router500 подтверждён, но post-edit не имеет собственной ForumRouteError. Сохранить эти bounds в fix-plan.
- NOTIFY-BODY-01 остаётся order observation без установленного bypass/resource failure. CONTENT-SIZE-01 и ATTACH-SEC-01 не переходят в подтверждённые дефекты. Отсутствие обязательного raw UUID не превращать в вопрос, который владелец обязан решить для закрытия этого аудита.
- DOC-03/04 остаются документационными/SOT findings, не доказанными auth/privacy bypass. Runtime visibility/effective permissions не переписывались. Противоречивые тексты требуется согласовать в соответствующей работе; технический счёт от выбора wording не меняется. Никакого самостоятельного изменения требований не выполнено.

### Рекомендуемый canonical registry — 60

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

### Preview / документация / один product decision

Preview: CODE-PREVIEW-01, CODE-PREVIEW-02. Документация/SOT: DOC-01, DOC-02, DOC-03, DOC-04. Они не включены в технические60 и не дублируют runtime.

Единственный открытый продуктовый вопрос перед окончательным technical count: **AUTH-LOCALE-RETURN-01**. Должен ли language switch безопасно remap locale вложенного returnTo и сохранять исходную страницу после credential flow, либо fallback на root новой локали допустим? Query сохраняется, old-locale nested path отвергается штатным sanitizer. Security bypass не установлен. Если owner требует remap — ещё один technical finding; если root fallback допустим — вопрос снимается. Я не выбираю ответ за владельца и не ослабляю redirect guard.

### Проверяемые источники и limits

- [Консолидация Миры](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6391992192), [поручение финального совещания](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6392064227), [T4 Лиры](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6392203749).
- [AUTH-LINK checkpoint](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6387984892), [tags](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6388113646), [attachment Remove](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6391178524), [Markdown family](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6390665639), [deferred contrast](https://github.com/iliya1947/vico-forum/pull/236#issuecomment-6388718904).
- [Официальный advisory GHSA-44jh-23m7-hpcf](https://github.com/better-auth/better-auth/security/advisories/GHSA-44jh-23m7-hpcf): проверена applicability, не выполнялся exploit. [Официальный lifecycle](https://developers.cloudflare.com/hyperdrive/concepts/connection-lifecycle/): проверен текст контракта, не реальная инфраструктура. Local installed dependency source Better Auth1.7.4 link-account.mjs подтверждает default/conditional return branch.
- Сверены только code/SOT цепочки, меняющие итоговую классификацию, и уже опубликованные матрица/evidence на том же baseline. Достаточные исторические native/browser/PG proofs не запускались заново. Их происхождение и ограничения остаются прежними. Новые tests/CI/browser/PG/adversarial/stress не выполнялись в T5; число новых тестов T5=0. Прежние28 локальных cross-review cases не выдаются за повторный прогон.
- Ни implementation, ни схема, зависимости, main, чужие agent files или общий service-channel в этом шаге не меняются. Результат опубликован в личном файле и PR comment, чтобы Мира выполнила следующее сведение consensus.

**T5 завершена. Конкретных technical disagreements с Мирой/T4 не осталось. Общий team consensus и fix-plan должен отдельно свести Мира; исправления до этого не начаты.**

---

## Итог моей общей сверки аудитов (2026-10-24)

**Предметная сверка опубликованных отчётов выполнена на baseline d72b27c.** Это мой итог сравнения и проверки, не коллективное утверждение команды, не новый независимый аудит и не разрешение исправлять/merge. Вопросы требований ниже сохранены открытыми; они не скрывают незавершённые проверки. Новая версия implementation требует отдельной проверки.

119 исходных утверждений сопоставлены. Итоговый инвентарь: **58 групп внутреннего кода с поддерживающими доказательствами, 2 preview и 4 документационных противоречия**; отдельно **4 технических вопроса применимости/требований**, OAuth исключён и notification parse-order оставлен наблюдением. Это не58 новых находок и не58 воспроизведённых production incidents. Условия и confidence различны: сохранённые native/browser proofs, source analysis, новые controlled tests. Severity и пакет исправлений не утверждены.

По сравнению с T3 Лиры: из64 технических кандидатов OAuth1 исключён по scope, notification order1 не признан доказанным defect; ARCH-02/ATTACH-04 переведены в вопросы, DISCOVERY/UGC дополнительно проверены до конкретного SQL/DOM и поддержаны в узком scope. Получается62 технических кандидата =58 supported +4 questions. Preview/documents считаются отдельно. Разделение EDITOR-PUB-01/02 исправляет моё прежнее чрезмерное объединение: разные причины, две записи. Post-edit и Home оставлены отдельными местами классификации failure, без искусственного слияния по одинаковому500.

28 новых различных локальных тестовых случаев passed за сверку; ещё6 исполнений — повторные/расширенные проверки старых случаев и не добавлены к28. Последняя часть13/13passed (10новых+3повторных). Initial harness failures частей1/3/4 сохранены и явно описаны; они не замаскированы под продуктовые дефекты. Полный CI, все исторические proof tests, native DB/browser/infrastructure acceptance заново не запускались. Проверяемый исходный код не менялся.

### Разделённые решения

- Поддержанные группы ниже сохраняют ограничения первичных доказательств. Условные failure/injected-session сценарии не повышены до реальных incidents; blind independence после чтения чужих результатов не восстановлена.
- DB-03 — внутренний ACL-контракт, не проверка реальных grants. ARCH-02 — endCalls0 локально, реальная runtime-утечка не установлена. Не поручать исключённый live Hyperdrive как обязательное завершение аудита.
- ATTACH-04 — отдельного abort pending file нет; whole Cancel работает. Обязательность per-file отмены во время ongoing upload требует решения владельца. До этого не включать безусловным P2.
- AUTH-LOCALE-RETURN-01 — query сохраняется; nested old-locale destination отвергается sanitizer. Требование remap остаётся открытым; нельзя ослаблять redirect guard на основании этого наблюдения.
- TAG-CARDINALITY-01 — max уникальных tags не согласован, count failure не доказан. CONTENT-SIZE-01 — отсутствие max не самостоятельный дефект. Это не отменяет отдельный static O(N²) spoiler finding.
- ATTACH-SEC-01 — нужно ли сохранять raw client UUID отдельно от contextual server ID не установлено. Это дополнительный вопрос корреляции, вне4 технических кандидатов, не доказанная потеря существующего asset.
- DOC-03 (Disputed visibility) и DOC-04 (history role vs effective permission) требуют выбора source of truth владельцем; требования не переписаны. Остальные doc/preview пункты отделены от runtime.

### Полный классифицированный инвентарь

S = поддержано в указанном scope; Q = требование/применимость, не confirmed count; O = наблюдение; X = исключено; P = preview; D = документация. Совпадение авторов не является доказательством. Детальное происхождение/контроли — предыдущий индивидуальный JSON, части1–5 и полная claim matrix ниже.

| ID | Статус | Суть |
|---|---|---|
| `ARCH-01` | S | Неожиданные ошибки записи маскируются под временную недоступность 503 |
| `ARCH-02` | Q | Загрузчик реестра локалей не завершает соединение после успешного чтения и части ошибок |
| `ARCH-03` | S | Ошибка завершения соединения подменяет успешный результат или исходную ошибку операции |
| `ATTACH-01` | S | Объект вложения без записи метаданных недоступен штатной очистке |
| `ATTACH-02` | S | Корректный обычный ZIP с 65535 записями ошибочно требует ZIP64 |
| `ATTACH-03` | S | Корректный пустой TAR отклоняется на распознавании сигнатуры |
| `ATTACH-04` | Q | Загружаемый файл нельзя удалить отдельно; до завершения загрузки публикация блокируется |
| `AUTH-01` | S | Удаляющий cookie старой сессии перезаписывает cookie успешного нового входа |
| `AUTH-02` | S | Назначение уже удалённой роли из старой формы завершается необработанной ошибкой 500 |
| `CORE-01` | S | Встречные одновременные ответы могут вызвать взаимную блокировку при записи уведомлений |
| `CORE-02` | S | Старое непрочитанное уведомление выпадает из последних 50 при сохранении общего счётчика |
| `CORE-03` | S | Отметка прочитанного может опередить фактически отданный снимок сообщений |
| `DB-01` | S | CHECK допускает неполные NULL-комбинации метаданных состояния allowance |
| `DB-02` | S | Верификатор схемы пропускает изменение предиката частичного индекса |
| `DB-03` | S | Контракт прав web runtime не включает используемую таблицу отметок прочитанного |
| `EDITOR-01` | S | Нормализация HTML-вставки схлопывает пустые строки внутри программного кода |
| `EDITOR-02` | S | Обычный текст ячеек таблицы превращается в Markdown-форматирование и ссылки |
| `EDITOR-03` | S | Очистка форматирования части жирного текста повреждает невыделенный суффикс |
| `EDITOR-04` | S | Отказ преобразования сложной таблицы молча заменяется обычным текстом |
| `EDITOR-05` | S | Find next не переносит выделение при уже открытом режиме записи |
| `EDITOR-06` | S | Enter внутри форматированного текста в Простом режиме повреждает разделители |
| `EDITOR-07` | S | Отступ захватывает исключённую конечную строку и может повредить закрывающий fence |
| `EDITOR-08` | S | Заблокированный редактор допускает изменение через Find/Replace или вставку |
| `EDITOR-09` | S | Выделение получателей упоминаний расходится с отображением таблиц и спойлеров |
| `EDITOR-10` | S | HTML-сущности в имени участника декодируются и меняют подпись упоминания |
| `EDITOR-11` | S | Публикация обрезает граничные пробелы Markdown и может превратить код в обычный текст |
| `HELP-01` | S | Старая форма решения апелляции может примениться к новой апелляции |
| `HELP-02` | S | Время начала транзакции может нарушить CHECK при снятии дубликата |
| `LOC-01` | S | Транспортная ошибка после COMMIT пропускает сверку результата записи локали |
| `LOC-02` | S | Неожиданная ошибка проверки compiled bundle может привести к удалению корректного bundle |
| `LOC-03` | S | Параметризованный i18next nesting проходит мимо проверки разрешённых токенов |
| `LOC-04` | S | При загрузке истории показывается сообщение о восстановлении вложений |
| `LOC-05` | S | Быстрое переключение политики A–B–A может потерять нужное поколение задачи |
| `LOC-06` | S | Запрос генерации для сообщения только с вложением завершается ошибкой 500 |
| `LOC-07` | S | Защита перевода не охватывает структуру собственных таблиц и спойлеров |
| `LOC-08` | S | Перевод теряет явное направление абзаца либо ошибочно отклоняет экранированный текст |
| `LOC-09` | S | Отклонённый перевод с завершённой задачей старой политики застревает в converging |
| `SEC-01` | S | Неожиданные ошибки профиля передают неопубликованный текст и SQL-параметры логгеру |
| `RES-EDITOR-02` | S | Backspace в начале второго обычного абзаца не соединяет абзацы в Простом режиме |
| `RES-UI-01` | S | Меню дополнительных инструментов редактора расширяет страницу на 320 px |
| `RES-A11Y-01` | S | Редактируемое текстовое поле Простого режима не имеет доступного имени |
| `CODE-SEARCH-01` | S | После возврата назад поле поиска не соответствует адресу и результатам |
| `CODE-HISTORY-01` | S | История правок расширяет узкую страницу вместо локального размещения текста |
| `M-M07` | S | Английская шапка менеджера переполняется при ширине 320 px |
| `M-M10` | S | У проверенного навигационного текста светлой темы недостаточный контраст |
| `AUTH-LINK-01` | X | Email signup without verification ↔ Google linking same email |
| `AUTH-SESSION-AVAIL-01` | S | Auth/session storage outage before normal Router boundary |
| `AUTH-LOCALE-RETURN-01` | Q | Locale-switch drops effective nested returnTo destination |
| `DISCOVERY-01` | S | Hidden Help service-section identity in discovery metadata |
| `HELP-MOD-01` | S | Stale solution moderation applies to newer best answer |
| `LITERAL-TEXT-01` | S | Plain visual content treated as Markdown syntax/entities |
| `EDITOR-PUB-01` | S | Failed 409 edit lacks normal loader refresh/rebase |
| `EDITOR-PUB-02` | S | Published edit conflict displays solution-specific error text |
| `MARKDOWN-SPOILER-01` | S | Repeated unmatched spoiler opening leads to quadratic scans |
| `ATTACH-STRUCT-01` | S | ZIP inconsistent local metadata/data descriptor accepted |
| `ATTACH-HTTP-405-01` | S | Attachment 405 response omits Allow header in route branch |
| `I18N-UI-POLICY-01` | S | Compiled UI bundle hit skips required generation policy validity |
| `I18N-UGC-META-01` | S | Secondary UGC presentation lacks source lang/dir in selected cases |
| `POST-EDIT-AVAIL-01` | S | Post-edit authorization/reader unavailable can reach generic 500 |
| `FORUM-READ-AVAIL-01` | S | Primary forum read availability fails to map into typed 503 |
| `NOTIFY-BODY-01` | O | Notification action reads form body before cheap auth/Origin rejection |
| `TAG-CARDINALITY-01` | Q | Unbounded unique tag count per publication expands persistent public catalog |
| `XR-THROWN-ACTION-BUFFER` | S | Unexpected action throw unmounts topic editor and in-memory content |
| `XR-CROSS-TAB-IDENTITY` | S | Cached A identity, server B reply author on topic |
| `DOC-01` | D | Текущие статусы и остаточные задачи в документации устарели |
| `DOC-02` | D | Документация отстаёт от фактического номера последней миграции |
| `DOC-03` | D | Документация противоречиво определяет видимость отметки Disputed |
| `DOC-04` | D | Доступ к истории описан через роль и через effective permission противоречиво |
| `CODE-PREVIEW-01` | P | Сценарий подтверждения лучшего ответа открывается решённым и не показывает подтверждение |
| `CODE-PREVIEW-02` | P | Вкладка Appeals (1) стенда показывает пустую очередь |

### Полная привязка 119 исходных строк

JSON ниже позволяет проверить, что исходная строка не потеряна, куда она отнесена, какие bounds сохранены и где исправлено grouping. Это матрица утверждений, а не119 дефектов. Локальные пути не выдаются за опубликованные raw proof artifacts: сами тесты/скриншоты остаются в workspace, опубликованы результаты, условия и ограничения.

<details><summary>Claim matrix (119 rows)</summary>

```json
{
  "status": "COMPARISON_COMPLETED_WITH_EXPLICIT_QUESTIONS_AND_LIMITS",
  "codeBaseline": "d72b27ca762dd930f0e7ad614e5b00832a07ec0c",
  "serviceSnapshot": "19f6a3ba78b2d2d57318ec2f4b35a40aa0a9dd25",
  "sourceReports": {
    "Мира": "27 claimed technical defects +1 SOT",
    "Лира": "6 classes +2 docs +2 conditional risks",
    "Мишаня": "30 historical statements, baseline21386887, not independent",
    "Лёва": "51 groups, with provenance/limits; not blind independent"
  },
  "countRule": "Never add 27+6+30+51. Current table is claim-to-cause/evidence mapping, not consensus or a final defect total.",
  "claimRows": 119,
  "rows": [
    {
      "auditor": "Лёва",
      "id": "ARCH-01",
      "mapsTo": "ARCH-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "ARCH-02",
      "mapsTo": "ARCH-02",
      "crossReviewStatus": "LOCAL_LIFECYCLE_FACT_RUNTIME_DEFECT_UNESTABLISHED",
      "decision": "Actual factory fake-client endCalls0 after success/unexpected error confirmed. Remove unconditional current-Stage defect status; excluded runtime lifecycle/leak not established.",
      "evidence": [
        "work/audit-cross-review/phase4-section.md"
      ]
    },
    {
      "auditor": "Лёва",
      "id": "ARCH-03",
      "mapsTo": "ARCH-03",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "ATTACH-01",
      "mapsTo": "ATTACH-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "ATTACH-02",
      "mapsTo": "ATTACH-02",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "ATTACH-03",
      "mapsTo": "ATTACH-03",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "ATTACH-04",
      "mapsTo": "ATTACH-04",
      "crossReviewStatus": "CONFIRMED_UI_LIMITATION_REQUIREMENT_CONFLICT_NOT_UNCONDITIONAL_P2",
      "decision": "Three prior component cases rerun passed. Pending per-file Remove absent; error Remove and whole Cancel work. Mandatory abort-during-upload unspecified; UX prompt broader than available controls.",
      "evidence": [
        "work/audit-cross-review/phase4-section.md"
      ]
    },
    {
      "auditor": "Лёва",
      "id": "AUTH-01",
      "mapsTo": "AUTH-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "AUTH-02",
      "mapsTo": "AUTH-02",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "CORE-01",
      "mapsTo": "CORE-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "CORE-02",
      "mapsTo": "CORE-02",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "CORE-03",
      "mapsTo": "CORE-03",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "DB-01",
      "mapsTo": "DB-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "DB-02",
      "mapsTo": "DB-02",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "DB-03",
      "mapsTo": "DB-03",
      "crossReviewStatus": "CONFIRMED_INTERNAL_CONTRACT_EXTERNAL_ACTIVATION_EXCLUDED",
      "decision": "Actual ACL assertion accepts missing read-state grants and rejects required extras. Stage6 external roles not checked; checked-in contract mismatch retained. Prior native proof not rerun.",
      "evidence": [
        "work/audit-cross-review/phase4-section.md"
      ]
    },
    {
      "auditor": "Лёва",
      "id": "DOC-01",
      "mapsTo": "DOC-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "DOC-02",
      "mapsTo": "DOC-02",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "DOC-03",
      "mapsTo": "DOC-03",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "DOC-04",
      "mapsTo": "DOC-04",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-01",
      "mapsTo": "EDITOR-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-02",
      "mapsTo": "EDITOR-02",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-03",
      "mapsTo": "EDITOR-03",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-04",
      "mapsTo": "EDITOR-04",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-05",
      "mapsTo": "EDITOR-05",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-06",
      "mapsTo": "EDITOR-06",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-07",
      "mapsTo": "EDITOR-07",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-08",
      "mapsTo": "EDITOR-08",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-09",
      "mapsTo": "EDITOR-09",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-10",
      "mapsTo": "EDITOR-10",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "EDITOR-11",
      "mapsTo": "EDITOR-11",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "HELP-01",
      "mapsTo": "HELP-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "HELP-02",
      "mapsTo": "HELP-02",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "LOC-01",
      "mapsTo": "LOC-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "LOC-02",
      "mapsTo": "LOC-02",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "LOC-03",
      "mapsTo": "LOC-03",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "LOC-04",
      "mapsTo": "LOC-04",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "LOC-05",
      "mapsTo": "LOC-05",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "LOC-06",
      "mapsTo": "LOC-06",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "LOC-07",
      "mapsTo": "LOC-07",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "LOC-08",
      "mapsTo": "LOC-08",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "LOC-09",
      "mapsTo": "LOC-09",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "SEC-01",
      "mapsTo": "SEC-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "RES-EDITOR-02",
      "mapsTo": "RES-EDITOR-02",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "RES-UI-01",
      "mapsTo": "RES-UI-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "RES-A11Y-01",
      "mapsTo": "RES-A11Y-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "CODE-PREVIEW-01",
      "mapsTo": "CODE-PREVIEW-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "CODE-PREVIEW-02",
      "mapsTo": "CODE-PREVIEW-02",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "CODE-SEARCH-01",
      "mapsTo": "CODE-SEARCH-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "CODE-HISTORY-01",
      "mapsTo": "CODE-HISTORY-01",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "M-M07",
      "mapsTo": "M-M07",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Лёва",
      "id": "M-M10",
      "mapsTo": "M-M10",
      "crossReviewStatus": "RETAINED_SCOPED_EVIDENCE_NOT_FOUR_AUDITOR_CONSENSUS",
      "decision": "Сохранены собственные/ранние доказательства с прежними границами; отсутствие пункта у других не означает опровержения.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "AUTHZ-01",
      "mapsTo": "AUTH-02",
      "crossReviewStatus": "PARTIAL_DUPLICATE",
      "decision": "Удалённая роль совпадает с AUTH-02; более широкий missing-user вариант не подтверждён этим воспроизведением.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "AUTH-LINK-01",
      "mapsTo": null,
      "crossReviewStatus": "OUT_OF_SCOPE",
      "decision": "Google linking относится к исключённому OAuth; не включать в общий текущий список.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "AUTH-SESSION-AVAIL-01",
      "mapsTo": "XR-AUTH-STARTUP",
      "crossReviewStatus": "REEXECUTED_WORKER_PREROUTER_FAILURE_WITH_FAKE_CAPABILITIES",
      "decision": "Actual Worker session rejection prevents Router dispatch/Response; ordinary session handler200 control. No actual platform status/body or external service check.",
      "evidence": [
        "work/audit-cross-review/phase5-section.md"
      ]
    },
    {
      "auditor": "Мира",
      "id": "AUTH-COOKIE-ORDER-01",
      "mapsTo": "AUTH-01",
      "crossReviewStatus": "DUPLICATE",
      "decision": "Та же последовательность clearing/new cookie; дополнительные локальные доказательства уже есть.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "AUTH-LOCALE-RETURN-01",
      "mapsTo": "XR-AUTH-LOCALE",
      "crossReviewStatus": "REPRODUCED_DESTINATION_FALLBACK_REQUIREMENT_UNESTABLISHED",
      "decision": "Actual switcher preserves query/nested old-locale destination; safe guard returns new locale root. Remapping requirement remains unsettled.",
      "evidence": [
        "work/audit-cross-review/phase5-section.md"
      ]
    },
    {
      "auditor": "Мира",
      "id": "DISCOVERY-01",
      "mapsTo": "XR-HELP-DISCOVERY",
      "crossReviewStatus": "CONFIRMED_GENERATED_SQL_AND_PRESENTATION_SCOPE",
      "decision": "Actual query/mapper exposes service-section metadata in generic unanswered path; direct readSection remains blocked. docs UI_UX_PASS314–325 require hidden generic discovery; no privacy bypass.",
      "evidence": [
        "work/audit-cross-review/phase5-section.md"
      ]
    },
    {
      "auditor": "Мира",
      "id": "HELP-MOD-01",
      "mapsTo": "XR-STALE-SOLUTION",
      "crossReviewStatus": "CONFIRMED_TARGET_SELECTION_WITH_INJECTED_TRANSACTION",
      "decision": "Actual action/service/repository selects answer-B for old intent; no expected answer identity. Two SQL-capture cases; no native concurrency.",
      "evidence": [
        "work/audit-cross-review/phase3-stale.test.ts",
        "work/audit-cross-review/phase3-stale-evidence.json"
      ]
    },
    {
      "auditor": "Мира",
      "id": "HELP-DUP-01",
      "mapsTo": "HELP-01",
      "crossReviewStatus": "PARTIAL_DUPLICATE_PLUS_CONFIRMED_STALE_REMOVE_VARIANT",
      "decision": "Existing stale appeal overlap retained; remove variant targets current relationship-B and its appeals, actual action/service/repository with injected snapshots.",
      "evidence": [
        "work/audit-cross-review/phase3-stale.test.ts",
        "work/audit-cross-review/phase3-stale-evidence.json"
      ]
    },
    {
      "auditor": "Мира",
      "id": "LITERAL-TEXT",
      "mapsTo": "XR-LITERAL",
      "crossReviewStatus": "REPRODUCED_LOCAL_HELPER",
      "decision": "escapeVisualMarkdownText и реальный published parser: --- становится thematicBreak, ~~literal~~ — delete, &copy; — ©. Не дублировать EDITOR-02 (таблицы) или EDITOR-10 (подпись mention).",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "EDITOR-PUB-01",
      "mapsTo": "XR-EDIT-409",
      "crossReviewStatus": "REPRODUCED_ACTUAL_LOCAL_ROUTE",
      "decision": "Настоящие Topic route loader/view/action: после controlled409 загрузчик остаётся на одном вызове, fence r1, текст сохранён, rebase отсутствует; явная revalidation даёт второй вызов и кнопку.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "EDITOR-PUB-02",
      "mapsTo": "XR-EDIT-CONFLICT-COPY",
      "crossReviewStatus": "CONFIRMED_SEPARATE_COPY_CAUSE_ACTUAL_ROUTE",
      "decision": "Correct earlier grouping: loader409/rebase and wrong conflict message key are independent causes. Actual edit409 repeats exact solution-oriented text; separate group.",
      "evidence": [
        "work/audit-cross-review/phase5-conflict-copy-evidence.json"
      ]
    },
    {
      "auditor": "Мира",
      "id": "CONTENT-SIZE-01",
      "mapsTo": "XR-CONTENT-BOUNDS",
      "crossReviewStatus": "POLICY_OBSERVATION_NOT_STANDALONE_CONFIRMED_DEFECT",
      "decision": "No domain max fact retained; no agreed threshold/current failure established. Separate from statically established spoiler complexity.",
      "evidence": [
        "work/audit-cross-review/phase5-section.md"
      ]
    },
    {
      "auditor": "Мира",
      "id": "MARKDOWN-SPOILER-01",
      "mapsTo": "XR-SPOILER-COMPLEXITY",
      "crossReviewStatus": "STATIC_ALGORITHM_CORROBORATED_NO_STRESS",
      "decision": "spoilerAt сканирует хвост и при отсутствии конца возвращает null; outer loop сдвигает i только на 1. Для N открывающих маркеров сумма проходов квадратична. Это отдельный статический вывод; остановленные ресурсные опыты не возобновлялись.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "ATTACH-LIFECYCLE-01",
      "mapsTo": "ATTACH-01",
      "crossReviewStatus": "DUPLICATE",
      "decision": "Тот же orphan object без достижимой metadata row и последующего claim очистки.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "ATTACH-STRUCT-01",
      "mapsTo": "XR-ZIP-METADATA",
      "crossReviewStatus": "REPRODUCED_BOUNDED_STRUCTURE_VALIDATION_GAP",
      "decision": "Два113-byte ZIP: local compressed size123 при central/actual5 и bit3 с отсутствующим descriptor принимаются actual validator и private finalization. Base control accepted, one-sided flags mismatch rejected. No deep content/AV/publication failure claim. PKWARE APPNOTE6.3.10 sections4.3.9.1/4.4.8-9 confirm format requirement.",
      "evidence": [],
      "phase2Evidence": "phase2-evidence.json"
    },
    {
      "auditor": "Мира",
      "id": "ATTACH-SEC-01",
      "mapsTo": "XR-SECURITY-ID",
      "crossReviewStatus": "DERIVED_ID_INTENT_CONFIRMED_SPECIFIC_UUID_REQUIREMENT_UNESTABLISHED",
      "decision": "Actual rejection route produces contextual stable attachment-v1 key; same retry same key, other inputId other key; no asset row. Filename/owner/context/draft/type/reason retained. Raw client UUID not separately retained. Tests confirm implementation intent, not specification sufficiency; no proven requirement to expose/persist raw UUID established.",
      "evidence": [],
      "phase2Evidence": "phase2-evidence.json"
    },
    {
      "auditor": "Мира",
      "id": "ATTACH-HTTP-405-01",
      "mapsTo": "XR-HTTP-ALLOW",
      "crossReviewStatus": "REPRODUCED_ROUTER_RESOURCE405_MISSING_ALLOW",
      "decision": "Actual static resource dispatch HEAD→loader and PATCH→action returns405 without Allow; scoped to attachment-upload resource, no deployed server/proxy claim. RFC9110 section15.5.6.",
      "evidence": [
        "work/audit-cross-review/phase4-section.md"
      ]
    },
    {
      "auditor": "Мира",
      "id": "I18N-UI-POLICY-01",
      "mapsTo": "XR-UI-POLICY",
      "crossReviewStatus": "REPRODUCED_LOCAL_POLICY_CONSISTENCY_GAP",
      "decision": "Bundle compiled/verified for v1 text accepted on hit, bypassing configured v2 raw source; miss drops v1 row. Spec requires current generation-policy checks. Runtime locale boundary currently also lacks required-policy parameter. No deployed policy-switch incident claimed.",
      "evidence": [],
      "phase2Evidence": "phase2-evidence.json"
    },
    {
      "auditor": "Мира",
      "id": "I18N-COPY-01",
      "mapsTo": "LOC-04",
      "crossReviewStatus": "DUPLICATE",
      "decision": "Тот же editorAttachmentRestoring в pending истории; не путать с CODE-HISTORY-01 overflow.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "I18N-UGC-META-01",
      "mapsTo": "XR-UGC-META",
      "crossReviewStatus": "CONFIRMED_SECONDARY_TITLE_LANGUAGE_METADATA_GAP",
      "decision": "Actual unanswered SQL omits source_locale, route projection discards fixture metadata; DOM strong dir=auto, no lang, inherits English for Hebrew title. No blanket UGC/visual/screen-reader claim.",
      "evidence": [
        "work/audit-cross-review/phase5-section.md"
      ]
    },
    {
      "auditor": "Мира",
      "id": "DB-MANIFEST-01",
      "mapsTo": "DB-02",
      "crossReviewStatus": "DUPLICATE",
      "decision": "Тот же отсутствующий partial index predicate в parity manifest.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "DB-ERROR-01",
      "mapsTo": "ARCH-01",
      "crossReviewStatus": "DUPLICATE",
      "decision": "Та же catch-all503 ошибка, что Лира F03 и Миша High. High не установлен; не все request errors становятся503.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "POST-EDIT-AVAIL-01",
      "mapsTo": "XR-POST-EDIT-503",
      "crossReviewStatus": "REPRODUCED_ROUTER500_TYPED_UNAVAILABLE",
      "decision": "Actual post-edit reader/authz typed failures become Router500. Correct previous boundary attribution: post-edit has no own ForumRouteError export.",
      "evidence": [
        "work/audit-cross-review/phase5-section.md"
      ]
    },
    {
      "auditor": "Мира",
      "id": "FORUM-READ-AVAIL-01",
      "mapsTo": "XR-PUBLIC-503",
      "crossReviewStatus": "REPRODUCED_ROUTER500_WITH_OPTIONAL200_AND_NOTIFICATION503_CONTROLS",
      "decision": "Home primary unavailable yields Router500; optional presence unavailable retains200; notification typed unavailable maps503. No deployed response claimed.",
      "evidence": [
        "work/audit-cross-review/phase5-section.md"
      ]
    },
    {
      "auditor": "Мира",
      "id": "NOTIFY-BODY-01",
      "mapsTo": "XR-NOTIFY-GUARD",
      "crossReviewStatus": "OBSERVATION_NOT_ESTABLISHED_SECURITY_DEFECT",
      "decision": "Small actual-action guest cases parse first, then401 or parsing400; writer0. No auth bypass/exhaustion/invariant failure established.",
      "evidence": [
        "work/audit-cross-review/phase5-section.md"
      ]
    },
    {
      "auditor": "Мира",
      "id": "NOTIFY-PAGING-01",
      "mapsTo": "CORE-02",
      "crossReviewStatus": "DUPLICATE",
      "decision": "Тот же latest50 inbox/all unread badge; старый post остаётся доступен другими путями.",
      "evidence": []
    },
    {
      "auditor": "Мира",
      "id": "TAG-CARDINALITY-01",
      "mapsTo": "XR-TAG-BOUNDS",
      "crossReviewStatus": "REQUIREMENT_QUESTION_NOT_CONFIRMED_CURRENT_DEFECT",
      "decision": "Unique tag count is unbounded while individual names<=64 and deduplicated. No agreed count threshold or current failure established.",
      "evidence": [
        "work/audit-cross-review/phase5-section.md"
      ]
    },
    {
      "auditor": "Мира",
      "id": "MIGRATION-SOT-01",
      "mapsTo": "DOC-02",
      "crossReviewStatus": "DUPLICATE_DOCUMENTATION",
      "decision": "Та же разница0043/0044; отдельно от runtime дефектов.",
      "evidence": []
    },
    {
      "auditor": "Лира",
      "id": "F01",
      "mapsTo": "XR-EDIT-409",
      "crossReviewStatus": "REPRODUCED_ACTUAL_LOCAL_ROUTE",
      "decision": "F01 covers edit409 refresh plus separate wrong-copy cause; shared scenario does not merge distinct mechanisms.",
      "evidence": [],
      "alsoMapsTo": [
        "XR-EDIT-CONFLICT-COPY"
      ]
    },
    {
      "auditor": "Лира",
      "id": "F02",
      "mapsTo": "XR-THROWN-ACTION-BUFFER",
      "crossReviewStatus": "CONDITIONAL_BUFFER_LOSS_REPRODUCED_JSDOM",
      "decision": "Unexpected permission exception replaces actual TopicView via actual route boundary; typed unavailable control keeps buffer. No universal network failure or production incident claim.",
      "evidence": [
        "work/audit-cross-review/phase3-buffer.test.tsx",
        "work/audit-cross-review/phase3-buffer-evidence.json"
      ]
    },
    {
      "auditor": "Лира",
      "id": "F03",
      "mapsTo": "ARCH-01",
      "crossReviewStatus": "DUPLICATE",
      "decision": "Тот же writer catch-all503.",
      "evidence": []
    },
    {
      "auditor": "Лира",
      "id": "F04",
      "mapsTo": "XR-CROSS-TAB-IDENTITY",
      "crossReviewStatus": "IDENTITY_MISMATCH_REPRODUCED_INJECTED_SESSION",
      "decision": "Actual heartbeat204 on topic leaves cached A; actual reply passes body to permitted B. Denied-B control does not write. No real two-tab/cookie/DB persistence reproduction.",
      "evidence": [
        "work/audit-cross-review/phase3-identity.test.tsx",
        "work/audit-cross-review/phase3-identity-evidence.json"
      ]
    },
    {
      "auditor": "Лира",
      "id": "F05",
      "mapsTo": "HELP-01",
      "crossReviewStatus": "DUPLICATE",
      "decision": "Та же stale appeal identity; прежняя native race сильнее source-only доказательства.",
      "evidence": []
    },
    {
      "auditor": "Лира",
      "id": "F06",
      "mapsTo": "M-M10",
      "crossReviewStatus": "RELATED_SAME_PALETTE_FAMILY",
      "decision": "Белый текст submit на accent — дополнительное место; не тот же цветовой pair, что навигация. Не суммировать как новый класс без определения root cause.",
      "evidence": []
    },
    {
      "auditor": "Лира",
      "id": "D01",
      "mapsTo": "DOC-02",
      "crossReviewStatus": "DUPLICATE_DOCUMENTATION",
      "decision": "Migration0043/0044.",
      "evidence": []
    },
    {
      "auditor": "Лира",
      "id": "D02",
      "mapsTo": "DOC-04",
      "crossReviewStatus": "DUPLICATE_DOCUMENTATION",
      "decision": "History role-only vs effective permission.",
      "evidence": []
    },
    {
      "auditor": "Лира",
      "id": "R01",
      "mapsTo": "CORE-01",
      "crossReviewStatus": "PRIOR_NATIVE_PROOF_RESOLVES_CONDITIONAL",
      "decision": "У Лиры PG race не запускалась; прежнее native PG доказательство в реестре Лёвы найдено. Это не исполнение Лиры.",
      "evidence": []
    },
    {
      "auditor": "Лира",
      "id": "R02",
      "mapsTo": "SEC-01",
      "crossReviewStatus": "PARTIAL_OVERLAP",
      "decision": "Raw diagnostics риск шире; конкретный profile form/SQL leakage подтверждён прежним injected-DB-error доказательством. Не расширять на все handlers без проверки.",
      "evidence": []
    },
    {
      "auditor": "Мишаня",
      "id": "M-H01",
      "mapsTo": "ARCH-01",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; HIGH_NOT_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Actual sectionAction through React Router createStaticHandler maps injected unexpected writer TypeError and schema-like Error(code=42703) into status503 actionData unavailable with errors=null; each writer called once. Classified storage outage has the same status/body.",
          "controls": "Success redirects302; guest401/foreign-origin403 prevent write; domain errors400/403/404/409/429; source-locale correction wrapper preserves unexpected TypeError identity.",
          "newTestReport": "/workspace/work/audit/repo/work/misha-verification-part1/results.json",
          "bounds": [
            "Session, permission resolver and writer are fakes; no real database, schema failure or service accessed.",
            "No actual data loss, privilege impact or separate availability failure established. High priority is not justified by this reproduction alone.",
            "Targeted source-test search found explicit unexpected-error coverage for correction/authorization/generation; absence of all possible equivalent tests across repository was not exhaustively established."
          ],
          "baseline": "Mutation wrapper unchanged between Misha baseline21386887 and currentd72b27ca."
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M01",
      "mapsTo": "DOC-04",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; DOCUMENTATION_CONFLICT_CONFIRMED_MEDIUM_NOT_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "EDITOR.md285-286 restricts revision history to administrator/moderator roles and excludes ordinary users absolutely; AUTHORIZATION.md13-17,51 defines mutable grants/overrides and history.read as authoritative. Contradiction persists on current baseline.",
          "code": "topicAction readPostHistory branch checks forum.post.history.read, without role-name restriction. topic loader derives history visibility from same permission. edit loader and attachment guard require editOwn plus authoritative ownership, not history.read.",
          "testReport": "/workspace/work/audit/repo/work/misha-verification-part2/results.json",
          "bounds": [
            "Tests use actual post-edit loader and attachment authorization with fake session/reader/resolver: own+edit allowed, own+history only forbidden, foreign owner+edit forbidden; loader guest401 and missing404.",
            "Revision-history action behavior inspected in source, not separately executed in this part. No authorization bypass established.",
            "Do not silently rewrite requirements to resolve the two documents. This finding is a documentation conflict."
          ]
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M02",
      "mapsTo": "M-M02",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; COUPLING_OBSERVATION_NOT_ESTABLISHED_DEFECT. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "App request contexts reference ForumReader from repository and ForumWriter from adapter; mutations use db-defined errors. Scoped AST graph has51 app->db module edges,10 explicitly type-only.",
          "method": "AST static graph and targeted import review; modular-monolith contract read.",
          "bounds": [
            "No explicit prohibition found in inspected contract passages, not full re-audit of all architecture docs.",
            "Imports/coupling alone do not prove functional defect, client bundle leak or necessity of refactor. Medium not established.",
            "Server-side auth ORM/schema composition is expected wiring and not automatically counted as a defect."
          ],
          "graph": "/workspace/work/audit/repo/work/misha-verification-part3/graph.json",
          "report": "/workspace/work/misha-verification/part3.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M03",
      "mapsTo": "XR-CONTENT-BOUNDS",
      "crossReviewStatus": "POLICY_OBSERVATION_NOT_STANDALONE_CONFIRMED_DEFECT",
      "decision": "No domain max fact retained; no agreed threshold/current failure established. Separate from statically established spoiler complexity.",
      "evidence": [
        "work/audit-cross-review/phase5-section.md"
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M04",
      "mapsTo": "M-M04",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; MEDIUM_NOT_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Prior own HTTP captures on identical current baseline show no Cache-Control or Vary on profile HTML/HEAD/single-fetch and authenticated notifications resource projection. Current entry, Worker wrapper and route source review show no global injection.",
          "reusedOwnEvidence": [
            "/workspace/work/audit/repo/work/audit-stage10-part5/http-evidence.json",
            "/workspace/work/audit-stage0/stage10-part5.json"
          ],
          "bounds": [
            "Prior captures reused, not counted as new test runs. Actual profile loader/component/root/SSR entry; manually assembled manifest includes synthetic root loader; locale parent absent.",
            "Notifications loader projected as resource route, not full actual notifications document. No enumeration of every personalized SSR page completed in this part.",
            "No cross-account cache disclosure established. Production cache/CDN/service behavior explicitly excluded.",
            "Local route-specific no-store policies exist, including attachments/mentions/presence and selected locale redirects. Vary alone is not a universal substitute for private/no-store."
          ]
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M05",
      "mapsTo": "M-M05",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; MEDIUM_NOT_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Prior actual profile HTML response has only Content-Type:text/html; no X-Frame-Options or CSP frame-ancestors. Current entry/root/Worker/locale wrapper review and targeted production-source header search show no common application HTML anti-framing policy.",
          "reusedOwnEvidence": [
            "/workspace/work/audit/repo/work/audit-stage10-part5/http-evidence.json",
            "/workspace/work/audit-stage0/stage10-part5.json"
          ],
          "bounds": [
            "No browser framing/clickjacking flow tested in this verification part; no concrete dangerous framed action established.",
            "Deployed proxy/platform headers not inspected and outside scope. No global assessment of every HTML endpoint or every possible security header.",
            "Attachment responses have their own sandbox/nosniff policies; that does not establish a policy for HTML pages.",
            "Absence of a hardening header is recorded as absence, not automatically a demonstrated exploitable vulnerability."
          ]
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M06",
      "mapsTo": "M-M06",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; TRIGGER_GAP_CONFIRMED_MEDIUM_NOT_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Primary ci.yml triggers only pull_request. Main push UI Preview workflow builds preview but does not repeat primary tests/database checks.",
          "bounds": [
            "Not equivalent to absence of every main check. PR merge-ref checks may test integration before merge.",
            "Branch protections, org-required checks, merge queue settings and actual execution history not queried."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part4/ci-evidence.json",
          "report": "/workspace/work/misha-verification/part4.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M07",
      "mapsTo": "M-M07",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; EN_OVERFLOW_CONFIRMED_ORIGINAL_METRICS_AND_HE_NOT_REPRODUCED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "EN manager home fixture at320px documentWidth357; account content348/client302; screenshot shows clipped Sign out. HE320 has no reproduced overflow; at1280 neither document overflows.",
          "bounds": [
            "Original75pxEN/32pxHE not reproduced.",
            "Fresh built UI Preview fake identity/data; no production auth flow or exhaustive names/fonts/state matrix."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/browser-evidence.json",
          "report": "/workspace/work/misha-verification/part7.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M08",
      "mapsTo": "M-M08",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; PAGINATION_ABSENCE_CONFIRMED_MEDIUM_IMPACT_NOT_MEASURED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "readSection2527 selects all topic rows in requested section, then tags. readTopicPage2574 selects all posts with revisions in requested topic, then metadata for their attachments. No page/cursor/limit/offset for these lists. Reader contracts accept ID only; actual loaders call these methods.",
          "method": "Targeted static source and route/view flow review; no SQL executed.",
          "bounds": [
            "Attachment metadata is read, not file bytes. Other repository methods have bounds; no claim all queries unpaginated.",
            "No latency, EXPLAIN, load or cost measurement. No severity Medium acceptance based on this inspection alone."
          ],
          "report": "/workspace/work/misha-verification/part3.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M09",
      "mapsTo": "M-M09",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; QUERY_SCOPE_CONFIRMED_MEDIUM_IMPACT_NOT_MEASURED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Section loader passes only userId to readUnreadForUser then constructs section-only states in app. Repository query joins forum topics/posts and has no section predicate or pagination; uses grouping and array_agg for all unread topics. Internal reader delegates directly to repository.",
          "testReport": "/workspace/work/audit/repo/work/misha-verification-part2/results.json",
          "tests": "Real section loader with fake reader requests exactly(actor), receives inside/outside topics, returns only section state including read fallback. Guest does not call unread reader.",
          "bounds": [
            "No SQL executed or query plan measured in this part; repository query inspected statically.",
            "No observed production latency, bill or service problem claimed. Actual cardinality/performance impact unmeasured.",
            "Section route unchanged between old and current baseline; this issue is not removed by draft deletion."
          ]
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M10",
      "mapsTo": "M-M10",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; SELECTED_NORMAL_TEXT_WCAG_AA_CONTRAST_FAILURE. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Rendered navigation label Unanswered and HE counterpart at1280 use253,109,41 text over248,246,243 background,13.12px. Contrast2.6322:1 below4.5:1.",
          "bounds": [
            "Light theme and selected text only; logo excluded; not universal AA audit of all controls.",
            "Shared components in fake preview, not full production runtime. Refinement-stage/merge policy not changed."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/contrast-evidence.json",
          "report": "/workspace/work/misha-verification/part7.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-M11",
      "mapsTo": "M-M11",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; HISTORICAL_ADVISORY_COUNTS_AND_REPO_GATE_ABSENCE_CONFIRMED_APP_MEDIUM_NOT_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Retained raw report25 records,8High13Moderate4Low, same lock hash as current. No configured audit/update gate or repository dependabot/renovate config found.",
          "controls": "Exact dependency pins,frozen-lockfile,integrity present. Registry severity differs from application exploitability. Prior own stage10part4 condition review reused without rerunning probes.",
          "bounds": [
            "No fresh registry audit; no new dependency graph transmission or new auto-review rejection.",
            "No organization/server-side updater settings inspected. No blanket lack of governance or25 reachable forum vulnerabilities established."
          ],
          "rawAudit": "/workspace/work/audit/repo/work/audit-stage10-part1/audit-all.json",
          "rawAuditSha256": "47c4f1f881c661479764bc256bffbeda26e12dad2050f274d0e4456b6eba5fe1",
          "lockSha256": "1a8108bb9eaa6f46b3339fedb9bef8d598e5199e8a7a7d833a2a9445959cfef3",
          "priorOwnConditionAssessment": "/workspace/work/audit-stage0/stage10-part4-advisory-progress.json",
          "report": "/workspace/work/misha-verification/part8.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L01",
      "mapsTo": "M-L01",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: NOT_CONFIRMED_ON_CURRENT_BASELINE; BLANKET_DOCUMENTATION_CLAIM_NOT_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Current PROJECT_STATE23-61 explicitly separates current drafts removal from retained historical Editor snapshots; block added after source baseline. README links separate PROJECT_HISTORY.",
          "bounds": [
            "Targeted passages only, not whole-documentation clean bill.",
            "Original report gives no exact counterexamples; retained dated history not automatically current requirements."
          ],
          "report": "/workspace/work/misha-verification/part6.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L02",
      "mapsTo": "DOC-01",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; HISTORICAL_UI_WORDING_AMBIGUOUS_ACCEPTANCE_REFERENCES_UNVERIFIED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "UI_UX_PASS568 calls attachments/WYSIWYG future relative to old editor slice;645-646 describes future signup and Under development. Current editor and credential signup already implemented.",
          "bounds": [
            "Accumulated older slice/history context; misleading if read as current product status.",
            "Exact obsolete acceptance/archive refs not identified or verified; old owner acceptance not declared invalid.",
            "Drafts genuinely future after current removal."
          ],
          "report": "/workspace/work/misha-verification/part6.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L03",
      "mapsTo": "M-L03",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; SOURCE_SIZE_OBSERVATION_NOT_ESTABLISHED_DEFECT. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Measured files large, per graph fileSizes. Excessiveness criterion and concrete defect not established.",
          "sizes": [
            {
              "file": "db/forum-repository.ts",
              "lines": 3915,
              "bytes": 162943
            },
            {
              "file": "app/forum/views.tsx",
              "lines": 3079,
              "bytes": 129096
            },
            {
              "file": "app/styles.css",
              "lines": 9643,
              "bytes": 209186
            }
          ],
          "bounds": [
            "Source bytes, not compressed production bundle size.",
            "No full manual read of these three files in this part. No architectural changes or automatic split justified from line count alone."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part3/graph.json"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L04",
      "mapsTo": "M-L04",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; TYPE_DEPENDENCY_CYCLE_ONLY_RUNTIME_IMPACT_NOT_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "profile-view.tsx5 imports type ProfileActionData from routes/profile.tsx; route imports ProfileView as value. Only nontrivial SCC in scoped static graph.",
          "method": "TypeScript AST SCC analysis plus transpileModule experiment with verbatimModuleSyntax; type import absent from emittedJS, component import retained.",
          "bounds": [
            "160 files; app/db/workers relative static imports/re-exports only; tests/declarations/ui-preview excluded. Dynamic imports, aliases, package imports and implicit uses not analyzed.",
            "Removing explicit type-only edges yields no cycles in this graph; not universal absence of runtime cycles.",
            "Compiler experiment not full typecheck/build or runtime execution. No initialization failure established."
          ],
          "graph": "/workspace/work/audit/repo/work/misha-verification-part3/graph.json",
          "compilerEvidence": "/workspace/work/audit/repo/work/misha-verification-part3/type-erasure.json"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L05",
      "mapsTo": "M-L05",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; UNCONSUMED_EXPORT_NOT_DEAD_FUNCTION. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "normalizeForumTags exported at forum-service364; tracked word search finds only definition and internal call379, no external consumer.",
          "bounds": [
            "Function needed internally; exported surface unused, not dead function.",
            "No exhaustive export inventory or bundle-size benefit established; no removal proposed."
          ],
          "report": "/workspace/work/misha-verification/part6.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L06",
      "mapsTo": "M-L06",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; SPECIFIC_APP_ONLY_RULES_CONFIRMED_DEFECT_NOT_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Tag normalized name max64 and slash exclusion enforced by normalizeForumTags but absent from forum_tags declared CHECK/migration0021. Concrete instances of app-only rules.",
          "controls": "Posts have same-topic parent FK and parent-not-self CHECK. Empty-body CHECK removal is explicitly intentional in0039 for attachment-only publication.",
          "bounds": [
            "Original report does not identify exact constraints; cannot claim exhaustive match.",
            "No demonstrated invalid write through user flow, no requirement all service rules must be DB-enforced.",
            "Declared metadata and SQL read, no database execution."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part5/evidence.json",
          "report": "/workspace/work/misha-verification/part5.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L07",
      "mapsTo": "M-L07",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; FK_ABSENCE_CONFIRMED_LIFECYCLE_DEFECT_NOT_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Receipt schema and migration0039 have owner FK only, no topic/post FK. No later migration reference adds such FKs.",
          "sourceFlow": "Writes receipt with fingerprint/IDs; replay validates fingerprint; topic/reply replay returns storedIDs before normal content checks.",
          "bounds": [
            "Deletion+replay not reproduced; no proven broken operation, orphan acceptance in liveDB or loss.",
            "Adding cascade FK without lifecycle/idempotency contract not justified.",
            "No actual PostgreSQL or external schema inspected."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part5/evidence.json",
          "report": "/workspace/work/misha-verification/part5.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L08",
      "mapsTo": "M-L08",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; DEPRECATED_QUEUE_USAGE_CONFIRMED_COUNT_THREE_NOT_REPRODUCED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Four direct Promise.all groups ofthree client.query on one client in two test files, four different test cases. Each is SELECT count assertions after tested operation.",
          "groups": [
            {
              "file": "tests/database/content-post-body-task-planning.test.ts",
              "line": 271,
              "queryCalls": 3,
              "testCall": "\"rechecks a serialized body translation before admission and rolls back planning metadata\"",
              "queries": [
                "\"select count(*)::int as count from content_translation_request_budget_counters\"",
                "\"select count(*)::int as count from translation_task_generation_heads where translation_kind = 'content-post-body'\"",
                "\"select count(*)::int as count from translation_tasks where translation_kind = 'content-post-body'\""
              ]
            },
            {
              "file": "tests/database/content-post-body-task-planning.test.ts",
              "line": 693,
              "queryCalls": 3,
              "testCall": "\"rolls back body budget counters when task metadata insertion fails\"",
              "queries": [
                "\"select count(*)::int as count from content_translation_request_budget_counters\"",
                "\"select count(*)::int as count from translation_tasks where translation_kind = 'content-post-body'\"",
                "\"select count(*)::int as count from translation_task_generation_heads where translation_kind = 'content-post-body'\""
              ]
            },
            {
              "file": "tests/database/content-topic-title-task-planning.test.ts",
              "line": 205,
              "queryCalls": 3,
              "testCall": "\"rechecks a serialized translation before admission and rolls back planning metadata\"",
              "queries": [
                "\"select count(*)::int as count from content_translation_request_budget_counters\"",
                "\"select count(*)::int as count from translation_task_generation_heads where translation_kind = 'content-topic-title'\"",
                "\"select count(*)::int as count from translation_tasks where translation_kind = 'content-topic-title'\""
              ]
            },
            {
              "file": "tests/database/content-topic-title-task-planning.test.ts",
              "line": 597,
              "queryCalls": 3,
              "testCall": "\"rolls back both budget counters when task metadata insertion fails\"",
              "queries": [
                "\"select count(*)::int as count from content_translation_request_budget_counters\"",
                "\"select count(*)::int as count from translation_tasks where translation_kind = 'content-topic-title'\"",
                "\"select count(*)::int as count from translation_task_generation_heads where translation_kind = 'content-topic-title'\""
              ]
            }
          ],
          "baseline": "All four blocks also present in21386887; numerical discrepancy is not current baseline change.",
          "driver": "Installed pg8.23.0 has non-pipeline query queue and deprecation notice for concurrent queued client.query usage, warning of removal inpg9. Driver source inspected, no protocol/database experiment.",
          "bounds": [
            "Original exactthree not identified, not verified. Narrow AST query is not exhaustive for aliases/callbacks/indirect calls.",
            "No claim current pinned driver misexecutes SELECTs or concurrency transaction tests universally invalid.",
            "Database tests not rerun; no new Vitest executions."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part5/evidence.json",
          "report": "/workspace/work/misha-verification/part5.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L09",
      "mapsTo": "M-L09",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; MANUAL_CLEANUP_CONFIRMED_RUNTIME_DEPENDENCE_OVERSTATED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Reconciliation script limited to localhost/127.0.0.1 disposable *_test DB; locked reverify/delete. Only production-source caller found is local script.",
          "controls": "Adapter integrity failure becomes miss; loader compiles fallback in memory; successful conditional machine publication atomically writes namespace bundle.",
          "bounds": [
            "Does not establish all translations require manual cleanup.",
            "Request path remains read-only; local-only cleanup explicitly accepted in current Stage5. No external automation assessed.",
            "Five loader tests use fake sources/stores; no invalid realDB row/database test."
          ],
          "testReport": "/workspace/work/audit/repo/work/misha-verification-part6/results.json",
          "report": "/workspace/work/misha-verification/part6.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L10",
      "mapsTo": "M-L10",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; COVERAGE_MEASUREMENT_ABSENCE_NOT_ESTABLISHED_FUNCTIONAL_DEFECT. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Neither tracked Vitest configuration nor package scripts/primary workflow enables coverage reporting or threshold; no separate tracked coverage configuration found.",
          "bounds": [
            "No claim actual coverage low or existing tests inadequate from absence alone.",
            "External env/config not inspected; no arbitrary threshold required."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part4/ci-evidence.json",
          "report": "/workspace/work/misha-verification/part4.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L11",
      "mapsTo": "M-L11",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; TRACKED_LOADER_TEST_GAP_NO_AUTH_BYPASS_ESTABLISHED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Tracked test/spec reference search across137 files finds route registration and attachment-upload tests, not direct post-edit loader execution.",
          "bounds": [
            "Five own direct loader tests already executed in part2 remain untracked audit scratch, not shipped suite. No rerun/recount here.",
            "No claim missing auth guard; source checks session, existence, authoritative owner and editOwn.",
            "Reference search not full manual read of137 test files."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part4/ci-evidence.json",
          "ownPriorTestReport": "/workspace/work/audit/repo/work/misha-verification-part2/results.json",
          "report": "/workspace/work/misha-verification/part4.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L12",
      "mapsTo": "M-L12",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; ESLINT_BOUNDARY_GAP_CONFIRMED_FULL_TOOLCHAIN_NOT_TESTED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Merged browser/node/worker globals; effective ESLint config permits document/process/self in virtual app,db,workers TS paths with0 errors/warnings. Restricted globals/import rules absent.",
          "bounds": [
            "Partial scope: TypeScript configs read, but no dedicated TypeScript rejection/acceptance experiment or bundler test.",
            "No conclusion all framework/server-only protections absent; no client secret/DB bundle leak claimed.",
            "Probe text linted only; source not executed."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part4/lint-boundaries.json",
          "report": "/workspace/work/misha-verification/part4.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L13",
      "mapsTo": "M-L13",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; EXPLICIT_TIMEOUT_ABSENCE_NO_OBSERVED_HANG. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Main checks/database jobs have no job timeout-minutes or step timeouts.",
          "bounds": [
            "Platform default limits still apply, not infinite execution.",
            "Actual runs, hangs, costs and suitable timeout duration not measured."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part4/ci-evidence.json",
          "report": "/workspace/work/misha-verification/part4.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L14",
      "mapsTo": "M-L14",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; HEADING_FACTS_CONFIRMED_NOT_AUTOMATIC_WCAG_VIOLATION. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Home has0h1 in all4browser loads; renderer explicitly supports h1 from Markdown.",
          "bounds": [
            "Multiple h1 topic document not built in this part; static capability checked.",
            "No universal WCAG failure inferred from h1 count alone."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/browser-evidence.json",
          "report": "/workspace/work/misha-verification/part7.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L15",
      "mapsTo": "M-L15",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; UNIGNORED_BUILD_OUTPUT_HYGIENE. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Fresh UI Preview build succeeds and creates dist/ui-preview per config; git check-ignore says not ignored, git status ??dist/.",
          "bounds": [
            "Dist existed untracked before this part and was rebuilt, not deleted. Not tracked artifacts or secret leak."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/repository-evidence.json",
          "report": "/workspace/work/misha-verification/part7.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L16",
      "mapsTo": "M-L16",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; WEB_ASSET_ABSENCE_NOT_ALL_MANDATORY_FEATURES. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Tracked inventory and route/root review show no favicon,robots.txt,sitemap,web manifest.",
          "bounds": [
            "No external hosting/runtime content checked.",
            "Preview robots meta noindex exists; not production robots.txt. PWA manifest and sitemap are not universal requirements."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/repository-evidence.json",
          "report": "/workspace/work/misha-verification/part7.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L17",
      "mapsTo": "M-L17",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: CONFIRMED; SOURCE_METADATA_ABSENCE_NO_SEARCH_IMPACT_MEASURED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Category/section/topic lack meta exports; root has Meta outlet but no default title/description/canonical; selected route/locale files lack dynamic metadata.",
          "bounds": [
            "Static source review; actual selected route SSR not run in this part, no indexing/traffic impact measured."
          ],
          "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/repository-evidence.json",
          "report": "/workspace/work/misha-verification/part7.md"
        }
      ]
    },
    {
      "auditor": "Мишаня",
      "id": "M-L18",
      "mapsTo": "M-L18",
      "crossReviewStatus": "HISTORICAL_STATEMENT_REUSE_WITH_CURRENT_BASELINE_VERIFICATION",
      "decision": "Original baseline21386887, independence disclaimed. Prior d72b27c verification: PARTIALLY_CONFIRMED; CURRENT_ASSET_SIZES_AND_NO_BLOCKING_GATE_CONFIRMED_USER_PERFORMANCE_NOT_MEASURED. Statement is not automatically a new defect.",
      "evidence": [
        {
          "fact": "Fresh production build plus previous part7 preview build. Home entry/root/locale/home static closure888944 bytes239706gzip; sharedviews272980/72539; previewJS941893/277241. No blocking bundle/performance gate in checked config/CI.",
          "bounds": [
            "Static closure excludes dynamic imports,manifestJS,HTML/hydration,images,headers/runtime requests. Not actual Network transfer.",
            "Independent per-file gzip9,not deployed encoding.",
            "Old Misha SSR/HE/hydration/initial measurements not reproduced or refuted on different baseline/method.",
            "Vite chunk warning exists but not blockinggate; large relative to no agreed budget not automatically functional defect. No LCP/INP/target-network measurement."
          ],
          "metrics": "/workspace/work/audit/repo/work/misha-verification-part8/payload.json",
          "report": "/workspace/work/misha-verification/part8.md"
        }
      ]
    }
  ],
  "newExecutedChecks": {
    "edit409": {
      "passed": true,
      "evidence": "edit-conflict-evidence.json",
      "scope": "Actual local route/loader/view/action, controlled repo error; no browser/DB"
    },
    "literal": {
      "passed": true,
      "evidence": "literal-evidence.json",
      "scope": "Actual escape helper/parser, tiny ordinary strings"
    }
  },
  "openVerification": "Runtime applicability/Stage classification, broader stale-state variants, UI bundle policy, ZIP metadata contract, upload ID semantics, source-only throw/cross-tab scenarios; no whole-repository restart.",
  "noImplementationChanges": true,
  "servicesExcluded": true,
  "phase2": {
    "status": "THREE_SELECTED_DISPUTES_REVIEWED_TWO_TECHNICAL_GAPS_ONE_SPEC_QUESTION",
    "testsPassed": 4,
    "testsFailed": 0,
    "realServicesUsed": false,
    "stressProbes": false,
    "officialZipReference": "https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT",
    "formatSections": [
      "4.3.9.1",
      "4.4.8",
      "4.4.9"
    ],
    "recordedAtUtc": "2026-10-24T18:27:34.237843+00:00"
  },
  "additionalCrossReviewInput": {
    "author": "Лира",
    "file": ".github/agents/chatgpt-6.md",
    "sha": "19792f3a450bbe52b219f17e962daf7bb8793853",
    "section": "T3",
    "changesHandled": [
      "separate edit copy cause",
      "scope/external limitations",
      "candidate vs defect counts"
    ]
  }
}
```
</details>

---

## Общая сверка — завершающие предметные проверки (2026-10-24)

Baseline `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, implementation не изменён. Окончательные прогоны этой части: **13 passed, 0 failed** — 10 новых случаев (read/order7, UI2, discovery1) и 3 повторных/расширенных (Worker2 и edit409 copy1). По сверке 28 различных новых случаев; повторения не добавлены к этому числу. Native DB/live services/реальные browser tabs/stress tests не выполнялись.

### Availability и ошибки чтения

Actual React Router static document query с injected capabilities:

| Сценарий | Наблюдаемый Router status |
|---|---:|
| Home primary readHomepage → ForumStorageUnavailableError | 500 |
| Home optional presence → тот же тип ошибки | 200, onlinePresence=null |
| post-edit readPostLocation → ForumStorageUnavailableError | 500 |
| post-edit permission check → AuthorizationUnavailableError | 500 |
| notifications read → ForumStorageUnavailableError | 503 |

Эти 5 тестов подтверждают конкретные различия классификации. **Поправка к прежней цепочке:** post-edit.ts не экспортирует ErrorBoundary, locale/root также не назначают ForumRouteError. Его500 подтверждён Router query, но нельзя утверждать, что он отрисовывает именно ForumRouteError. Home имеет собственную ForumRouteError. Deployed body/status и всю платформенную response pipeline не проверяли.

Actual Worker fetch с fake factories повторно проверен в 2 случаях: нормальная session lookup допускает handler200; getSession rejection предотвращает Router handler и возвращение Response. Это conditional pre-router availability failure path; не заявляется конкретный Cloudflare HTTP500/503/body или реальный service incident. Actual auth runtime делает connect/getSession без локального availability response boundary; реальный OAuth не запускался.

### Notification body guard — факт порядка, не доказанный security defect

В actual action гость с малым синтетическим form body сначала проходит request.formData. Корректная форма затем получает401, ошибка parsing —400; writer ни разу не вызван. 2 теста passed. Это подтверждает порядок обработки, но не auth/Origin bypass, resource exhaustion или согласованный недостающий domain invariant. NOTIFY-BODY-01 переводится из списка безусловных defects в наблюдения; необходимость раннего cheap rejection не выдаётся за установленный пользовательский сбой.

### Help discovery — конкретное несоответствие внутреннего представления

Actual Drizzle readUnanswered SQL не исключает service section, выбирает его name/id и возвращает их в generic summary. Actual readSection(HELP_SOLUTIONS_SERVICE_SECTION_ID) возвращает undefined без запроса — контроль. Fake Pg rows позволяют проверить mapper, но не заменяют исполнение WHERE в настоящей БД. Source WHERE=unsolved/HAVING one post не содержит скрытого section exclusion.

Actual Unanswered route/view показывает Internal section в generic location. docs/UI_UX_PASS.md314–325 требует скрыть внутренний service section из generic discovery. Подтверждён именно metadata presentation gap; прямой generic section route не открыт, privacy/auth bypass не установлен.

### Secondary UGC language metadata

В actual unanswered SQL source_locale не выбирается; summary interface хранит title:string. Route projection отбрасывает даже дополнительный sourceLocale из reader fixture. Actual UnansweredRoute/View в jsdom для Hebrew title при English document создаёт strong dir=auto без lang, наследуется lang=en. DOM узел проверен, dir=auto не объявляется отсутствующим или небезопасным. docs/translation/LOCALES.md506–507 требует content-level lang/dir для mixed-language UGC; известная в revision source locale теряется до представления. Сохранить узкий дефект языковой метки этого secondary title path, без blanket вывода про все UGC, screen-reader behaviour или bidi visual failure.

### Locale returnTo, size и tags

Actual LanguageSwitcher при en→he сохраняет query целиком, включая returnTo=/en/topics/topic?editPost=p1#post-p1. Actual credentialReturnPath('he',...) намеренно отвергает путь другой локали и возвращает /he; same-locale контроль сохраняет весь исходный адрес. Тест passed. Потеря effective destination подтверждена, но необходимость remap вложенного пути требует product decision; нельзя отключать sanitizer или считать, что switcher удалил query.

Отсутствие domain max для title/body и count max для unique tags сохранено как факт источников. normalizeForumTags ограничивает каждый tag64 и dedup keys, не число. Из отсутствия max не следует согласованный threshold или воспроизведённый current failure; CONTENT-SIZE-01/M-M03 не самостоятельный подтверждённый дефект. TAG-CARDINALITY-01 остаётся requirement/policy question. Static O(N²) unmatched-spoiler mechanism — отдельный подтверждённый алгоритмический пункт; ресурсные эксперименты не возобновлялись.

### Актуальность внешних отчётов и независимость причин

Файлы Миры и Мишани не изменились относительно исходного snapshot19f6a3b. Файл Лиры изменился: прочитан новый T3 верхний раздел целиком до его конца; новый blob19792f3a450bbe52b219f17e962daf7bb8793853. Учтён как дополнительная cross-review input, не новый независимый аудит.

Согласен с аргументом T3 о разных причинах EDITOR-PUB-01 и EDITOR-PUB-02: loader/rebase409 и ошибочный forumWriteError_conflict copy исправляются независимо. Повторный actual Topic route/action409 сценарий дополнен assertion точного текста «That solution cannot be selected for this topic.» — passed. **Прежнее объединение двух причин в XR-EDIT-409 как одной записи исправлено:** теперь отдельный XR-EDIT-CONFLICT-COPY; общий сценарий теста не означает одну причину.

AUTH-LINK-01 в T3 назван internal OAuth-related config finding. В моём реестре он остаётся исключённым по пользовательскому ограничению OAuth; доказательства OAuth не проверялись, дефект не опровергается и не переносится в объём молча. ARCH-02, ATTACH-04 и NOTIFY-BODY-01 имеют более узкие статусы части4/5, чем C в T3. DISCOVERY/UGC получили дополнительные точные source/DOM проверки, которых не было в прежнем Q. Подсчёт кандидатов T3 не является коллективным verdict.

Доказательства: phase5-{read,ui,discovery,worker,conflict-copy} configs/results/evidence и соответствующие test files в work/audit-cross-review. Три Worker tests не выбраны фильтром и не засчитаны. Новых failed прогонов в части5 нет. Итоговая матрица публикуется отдельно ниже; чужие личные файлы не исправлены.

---

## Общая сверка — применимость lifecycle/ACL/upload и HTTP405 (2026-10-24)

Сверка продолжается на неизменном code baseline `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Эта запись уточняет и, где указано, сужает прежний индивидуальный список. Старые статусы OPEN_UNFIXED/P2 для ARCH-02 и ATTACH-04 нельзя использовать без оговорок ниже.

Окончательные локальные прогоны: **8 passed, 0 failed** — 5 новых тестов (ACL1, registry2, Router4052), плюс 3 повторно исполненных прежних attachment-теста. Четвёртый attachment-тест picker/drop/paste не выбран фильтром и не засчитан. По общей сверке теперь 18 различных новых тестовых случаев, не число дефектов; три повторения не добавлены к 18.

### DB-03 — подтверждённое несоответствие внутреннего ACL-контракта, не утверждение о production

`.github/scripts/runtime-privileges.mjs` не включает forum_topic_read_states в web.relations. Реализованные `readTopicReadState`, `readUnreadForUser`, `advanceTopicReadState` используют SELECT и INSERT/UPDATE для этой таблицы. Actual assertRuntimeCapabilityPrivilegeContract принимает synthetic exact snapshot без прав на неё, но отвергает тот же snapshot с добавленными SELECT/INSERT/UPDATE. Новый тест passed. Документ docs/database/HYPERDRIVE.md115–127 связывает этот общий контракт с disposable probes и derivation GRANT; это уже проверяемый repository contract, а не только будущая настройка.

ROADMAP.md318 относит создание реальных roles/grants к Stage6. Это ограничивает activation/production acceptance и не устраняет внутреннее несоответствие. Сохранить DB-03 как дефект checked-in contract. Не утверждать текущий production outage или состояние реальных grants. Прежнее native доказательство read-marker failures и восстановления дополнительными grants найдено в двух идентичных локальных evidence-файлах (SHA256 a535363bc616011087e1833f353f5743e682e25a718cdbaed04695bc37da1206); оно сохранено с прежней атрибуцией, в этой части native PG не запускалась.

### ARCH-02 — локальный факт подтверждён; runtime-дефект не установлен

Actual createHyperdriveRegistryLoader с fake Pg client: успешное чтение мемоизируется, endCalls=0; unexpected query failure также оставляет endCalls=0. Drizzle оборачивает query error, оригинальный TypeError находится в cause. Эти два теста passed. Первоначальный тест ошибочно ожидал identity исходного exception; сохранён initial-results, проверка harness исправлена на cause. Это не новый дефект обработки ошибки.

Прежние локальные idle Pg connections и отсутствие finally остаются фактом локальной фабрики. Однако они не доказывают leak/exhaustion в Worker/Hyperdrive runtime: его teardown/lifecycle не был проверен и исключён владельцем. В проверенных внутренних материалах не установлено универсальное обязательство явно завершать именно этот клиент, достаточное для прежнего безусловного current-Stage P2.

**Решение сверки:** убрать ARCH-02 из безусловно подтверждённых дефектов текущего Stage; хранить как локальное lifecycle-наблюдение с непроверенной runtime-применимостью. Это не признание реализации исправленной или заведомо корректной. Реальный Hyperdrive, платформенные настройки и сервисные проверки не выполнялись и не назначаются обязательным продолжением аудита.

### ATTACH-04 — факт UI подтверждён; требование per-file cancellation неоднозначно

Повторены actual MarkdownEditor тесты с controlled XHR: pending файл не имеет отдельной Remove и блокирует Publish; обычное завершение снимает блокировку, сохраняет текст и точные selected IDs; после ошибки Remove доступна, сохраняет текст и уже загруженный второй файл. Все 3 passed.

Whole-operation Cancel aborts pending XHR, очищает текст и весь набор вложений намеренно. Она работает; это не доказательство случайной потери текста или сломанной Cancel. docs/EDITOR.md182 разрешает удалить/заменить вложение перед публикацией, §4.1 явно требует Retry/Remove после неуспеха и блокировку незавершённых загрузок, но не задаёт однозначно individual abort во время успешного ongoing upload. UI message «Finish or remove attachment uploads before publishing» шире доступных действий в pending row.

**Решение сверки:** сохранить отсутствие per-file abort и несогласованность подсказки как узкое UX/requirement расхождение; не считать прежний ATTACH-04 безусловным P2 по всему Cancel flow. Обязательность удаления именно до завершения upload требует решения владельца. В этой части никаких исправлений/изменений требований не внесено.

### XR-HTTP-ALLOW / Мира ATTACH-HTTP-405-01 — omission подтверждён через Router dispatch

Не только прямой вызов export: actual React Router createStaticHandler.queryRoute dispatch для /api/attachments вызывает loader при HEAD и action при PATCH. Обе ветви возвращают explicit405, Allow отсутствует. 2 теста passed. Требование Allow для405 установлено [RFC9110 §15.5.6](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.6).

Вывод ограничен upload/list resource app/routes/attachment-upload.ts128,144. В download route такого explicit405 нет, поэтому прежнее множественное «attachment routes» сужено. Это нарушение HTTP response contract, не установленный auth bypass/потеря файла. Deployed HTTP server/proxy и полный Worker response pipeline не проверялись. HEAD дополнительно отвергается GET-only guard; отдельную совместимость HEAD не включать автоматически вторым дефектом без самостоятельного verdict.

### Доказательства и следующий участок

`work/audit-cross-review/phase4-contract.{test,config}.ts`, phase4-contract-{results,evidence}.json; phase4-http.test.ts/config/results/evidence; phase4-attachments.config.ts/results и исходный work/audit-stage7-part3/client.test.tsx. Матрица обновлена. Implementation, зависимости и схема не менялись; личные файлы других авторов не редактировались.

Остаётся закрыть остальные source-only/requirement строки: secondary UGC language metadata, классификация read/auth startup failures, Help discovery, locale return destination и границы size/tag/body guard утверждений. Это сверка существующих утверждений, не новый полный проход репозитория. Общего окончательного счёта ещё нет; завершение сверки или согласие всей команды не заявляется.

---

## Общая сверка — устаревшие действия, буфер и идентичность (2026-10-24)

Сверка продолжается. Baseline кода: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. В этой части **7 локальных тестов passed, 0 failed в окончательных прогонах**: 2 buffer, 2 identity, 3 stale actions. Вместе с частями 1–2 — 13 тестов, не 13 дефектов. Реализация не менялась; реальные сервисы, production, native DB concurrency, браузерные вкладки/cookies не проверялись.

### XR-STALE-SOLUTION / Мира HELP-MOD-01 — выбор нового объекта старым действием подтверждён локально

В `app/forum/views.tsx:2515` формы markSolutionNeedsReview/markSolutionOutdated передают intent и, для outdated, причину, но не expected best-answer identity. `actions.server.ts:382–407` не требует identity; `ForumService.setHelpSolutionModeration` также не принимает её. В actual action → service → repository при текущем snapshot answer-B запрос старой формы, просмотренной при answer-A, создаёт UPDATE для answer-B и supersedes его pending signals. Причина, введённая для A, передаётся новому B без конфликта.

Два теста используют actual action, service, repository и компиляцию Drizzle SQL; транзакция подставляет подготовленный текущий snapshot. Это подтверждает выбор объекта и отсутствие защиты от старой формы, но не выдаётся за native race reproduction или исполнение UPDATE настоящей БД. Оба intent относятся к одной причине, а не к двум новым независимым дефектам.

### HELP-DUP-01 / HELP-01 — подтверждён дополнительный stale-remove вариант

`views.tsx:2463` removeHelpDuplicate отправляет только intent. `actions.server.ts:345–351`, `ForumService.removeHelpDuplicate` и repository не требуют expected relationship identity. При snapshot relationship-B actual chain формирует снятие именно B и принятие его pending appeals, хотя старая форма относилась к A. Третий SQL-capture тест passed. Это расширяет доказательства для варианта remove; прежнее отдельное доказательство stale appeal не подменяется этим тестом. Native concurrency в данной части не проверялась.

### XR-THROWN-ACTION-BUFFER / Лира F02 — условная потеря буфера воспроизведена

Actual TopicRoute + loader + action + штатная ForumRouteError boundary, jsdom: после введения Unsaved private text синтетический unexpected TypeError в permission capability проходит через requireForumPermission/rethrow. TopicView размонтируется, форма и текст исчезают; writer не вызывался. Контроль с AuthorizationUnavailableError возвращает controlled503 и сохраняет тот же текст в mounted editor. Внутренний authorization adapter классифицирует известные infrastructure failures, но неизвестные исключения может rethrow; не заявляется, что обычная недоступность БД даёт этот unexpected path.

`docs/EDITOR.md:271` обещает сохранение текста/вложений при сбое сервера/интернета. Подтверждён именно условный путь unexpected action exception и потеря текста в памяти. Не доказаны все сетевые ошибки, потеря вложений, конкретный production incident или частота возникновения. Обещание memory-only из §5 не отменяет проверку ошибки отправки: тест не выполняет пользовательскую навигацию/reload.

Первый прогон: один тест прошёл, контроль остановился из-за сохранённого Advanced mode между тестами. Исправлена только изоляция harness (localStorage.clear); initial-results сохранён. Окончательный прогон: 2/2 passed. Ошибка harness не записана дефектом приложения.

### XR-CROSS-TAB-IDENTITY / Лира F04 — рассогласование воспроизведено с подменой серверного контекста

Actual HeaderAuthProvider, OnlinePresenceHeartbeat, presence action и topic reply action в jsdom; родительский loader/provider воспроизводит передачу cached identity. Сначала header=A и текст набран при A; затем серверный auth context переключён на B. Heartbeat реально вызывает presence action: recordOnlinePresence(B), HTTP204. На topic это не revalidates родительский loader: header остаётся A, текст сохранён. Отправка actual reply action вызывает writer с authorId=B и текстом, набранным при A. После успешной отправки обычная revalidation обновляет header=B, но writer уже получил текст.

Контроль: если B не имеет forum.reply.create, writer не вызывается (403). Это **рассогласование отображаемой учётной записи и авторства отправляемого текста**, а не обход server authorization. Два теста passed. Реальная смена cookies в двух вкладках, полный locale loader, OAuth и сохранение записи настоящей БД не выполнялись; предпосылка смены server session задана в harness. Поэтому нельзя повышать доказательство до live two-tab reproduction.

### Доказательства и оставшаяся работа

Локальные файлы `work/audit-cross-review/phase3-{buffer,identity,stale}.test.*`, соответствующие config/results/evidence JSON и run logs. Они не загружены как implementation changes; опубликованы условия, наблюдения и ограничения. Матрица 119 исходных утверждений обновлена; финальное общее число уникальных дефектов ещё не объявляется. Чужие личные файлы не изменены; общего согласия авторов не заявляется.

Следующий участок сверки: применимость lifecycle/ACL и отмены upload к текущему Stage; затем оставшиеся source-only/requirement вопросы матрицы. Идентификатор отклонённой загрузки остаётся вопросом требуемой корреляции, не установленным нарушением. К исправлениям и merge не переходить.

---

## Общая сверка — ZIP, идентификаторы и generation policy (2026-10-24)

Общая сверка продолжается. В этой части выполнены **4 локальных теста: 4 passed, 0 failed**. Код проекта не менялся; реальные сервисы/БД, браузер и stress-inputs не использовались.

### XR-ZIP-METADATA / Мира ATTACH-STRUCT-01 — узкий дефект подтверждён

Базовый ZIP создан Python zipfile: один файл a.txt с пятью байтами hello; весь архив113байт. Контрпримеры меняют только header metadata:

- Local compressed size=123, central и фактические данные=5, bit3 выключен. Actual validateZipAttachmentStructure возвращает true, actual storePrivateAttachmentStream с memory bucket возвращает stored.
- В обоих headers выставлен bit3, local CRC/sizes=0; file data заканчивается непосредственно перед central directory, descriptor отсутствует. Тот же validator/finalizer принимает архив.
- Контроли: исходный корректный ZIP принимается; несовпадающие local/central flags отклоняются.

[PKWARE APPNOTE6.3.10](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT), раздел4.3.9.1, требует descriptor при bit3;4.4.8/4.4.9 определяют size fields. В данном fixture нет central-directory encryption и соответствующего исключения. Проверка не распаковывает архив и не доказывает обход антивируса, выполнение содержимого или сбой пользовательского extractor. Доказана конкретная неполнота structural acceptance. Metadata persistence и публичная публикация этим тестом не проверялись. Это отдельная причина от ATTACH-02/classic65535 ZIP.

### XR-UI-POLICY / Мира I18N-UI-POLICY-01 — локальная несогласованность подтверждена

`DatabaseMachineTranslationSource(..., v2)` отвергает approved machine row policy v1 и помечает key stale. Но `compileNamespaceBundle` + настоящий `verifyPersistedCompiledBundle` принимают bundle с этим текстом без policy identity. Настоящий `TranslationResourceLoader` на hit возвращает v1-текст и не вызывает raw source; на miss policy-aware source отбрасывает его. Контроль выполнен для fr/common/heading без local override.

Требования: docs/translation/STORAGE_AND_VERSIONING.md81–96 и162–164 отделяют содержательное изменение generation policy и требуют current fingerprint/policy checks. Сама смена implementation detail не требует инвалидировать всё. В active locale-boundary raw source дополнительно создаётся без required-policy аргумента. Следовательно, проблема не ограничивается одним названием bundleVersion. Тест доказывает внутреннюю согласованность version/freshness boundary, а не реально выполненное переключение deployed policy или работу внешнего provider. Выбор реализации исправления в этой части не делался.

### XR-SECURITY-ID / Мира ATTACH-SEC-01 — как технический дефект пока не установлен

Server-derived attachment-v1 hash — намеренный идентификатор наблюдаемой подозрительной загрузки и dedup key. Настоящий rejection route: один input UUID и тот же контекст дают тот же ключ, другой UUID даёт другой ключ; asset row не создаётся; имя, owner, draft/context, типы, причина и размер сохраняются. Отдельное поле исходного client UUID отсутствует.

docs/EDITOR.md238 требует пригодные модератору сведения и идентификатор файла, но не определяет, обязан ли это быть именно присланный UUID вместо устойчивого server-derived identity. Существующие тесты явно ожидают замену UUID хешем; это доказывает намерение, но не отменяет продуктового требования. Поэтому факт различия ID подтверждён, а нарушение контракта требует уточнения конкретной нужной корреляции. Не записывать этот пункт в общий подтверждённый список как потерю существующего asset: для отклонённого файла такой row может не быть.

### Воспроизводимость и следующий шаг

Локально сохранены phase2.test.ts, phase2-evidence.json, phase2-results.json и113-byte fixtures в work/audit-cross-review. Артефакты не добавлены в implementation; условия и результаты опубликованы здесь. Два ZIP-варианта, ID-route и policy-hit/miss составляют четыре разных теста.

Матрица обновлена, окончательное общее число дефектов не пересчитано: остаются другие открытые расхождения. Далее — stale solution/duplicate actions и source-only сценарии thrown-action buffer/cross-tab identity, затем runtime/Stage applicability. Чужие личные отчёты не переписаны, согласие других авторов не заявляется.

---

## Общая сверка аудитов — первый проход (2026-10-24)

Владелец разрешил общую сверку и комментарии. Кодовый baseline d72b27ca762dd930f0e7ad614e5b00832a07ec0c; снимок четырёх личных файлов и service-channel — PR head19f6a3b. Это отдельный межаудиторский этап, не переписывание чужих индивидуальных заключений.

### Происхождение и подсчёт

Мира:27 технических +1 SOT; Лира:6 классов +2 документации; Мишаня:30 утверждений на21386887 с отозванной независимостью; Лёва:51 группа с унаследованными и собственными доказательствами, без заявления слепой независимости. Эти числа не складываются. Разные code-file counts также не сравниваются без одинаковых path-set правил (JSON/config/operational границы отличаются).

### Новые выполненные проверки этой сверки

1. **XR-EDIT-409 / Мира EDITOR-PUB-01/02 / Лира F01**: настоящий локальный Topic loader/view/action с заданным repository conflict. После409 loaderCalls1, fence r1, введённый текст сохранён, rebase отсутствует. Явная router.revalidate даёт loaderCalls2 и rebase. Один успешный тест. Первый запуск имел ошибку относительных imports в тестовом файле; это не ошибка приложения.
2. **XR-LITERAL / Мира literal-text**: настоящий escapeVisualMarkdownText и published parser. Обычные строки --- / ~~literal~~ / &copy; становятся thematicBreak / delete / ©. Один успешный тест. Это не таблицы EDITOR-02 и не mention-label EDITOR-10.

Оба результата дополняют индивидуальный отчёт Лёвы: их не было в прежнем реестре. Браузер, реальные БД/сервисы и stress inputs в этих двух проверках не использованы.

### Матрица утверждений Миры и Лиры

| Автор / ID | Соответствие | Статус сверки | Решение / границы |
|---|---|---|---|
| Мира AUTHZ-01 | AUTH-02 | PARTIAL_DUPLICATE | Удалённая роль совпадает с AUTH-02; более широкий missing-user вариант не подтверждён этим воспроизведением. |
| Мира AUTH-LINK-01 | — | OUT_OF_SCOPE | Google linking относится к исключённому OAuth; не включать в общий текущий список. |
| Мира AUTH-SESSION-AVAIL-01 | XR-AUTH-STARTUP | SOURCE_CHAIN_CORROBORATED | getSession/connect rejection перед Router handler подтверждены кодом workers/app.ts и auth runtime; реальный platform HTTP body/status не проверен. |
| Мира AUTH-COOKIE-ORDER-01 | AUTH-01 | DUPLICATE | Та же последовательность clearing/new cookie; дополнительные локальные доказательства уже есть. |
| Мира AUTH-LOCALE-RETURN-01 | XR-AUTH-LOCALE | BEHAVIOR_CONFIRMED_REQUIREMENT_TO_CLARIFY | Switcher сохраняет query, а credentialReturnPath отвергает вложенный путь старой локали и возвращает новый locale root. Это не исчезновение query; необходимость ремаппинга destination требует явного требования. |
| Мира DISCOVERY-01 | XR-HELP-DISCOVERY | PARTIAL_SOURCE_SUPPORT | readUnanswered включает Help topics и отдаёт section metadata; readSection самого service section явно возвращает undefined. Нельзя утверждать открытый generic service-section route. |
| Мира HELP-MOD-01 | XR-STALE-SOLUTION | SOURCE_CHAIN_CORROBORATED_NOT_RACE_TESTED | Topic forms/actions не передают expected best answer identity; изменение текущего решения и применение старой модерации — отдельный от appeal сценарий. |
| Мира HELP-DUP-01 | HELP-01 | PARTIAL_DUPLICATE | Старая апелляция совпадает с HELP-01; более общий stale relationship remove — отдельный вариант, пока без нового воспроизведения. |
| Мира LITERAL-TEXT | XR-LITERAL | REPRODUCED_LOCAL_HELPER | escapeVisualMarkdownText и реальный published parser: --- становится thematicBreak, ~~literal~~ — delete, &copy; — ©. Не дублировать EDITOR-02 (таблицы) или EDITOR-10 (подпись mention). |
| Мира EDITOR-PUB-01 | XR-EDIT-409 | REPRODUCED_ACTUAL_LOCAL_ROUTE | Настоящие Topic route loader/view/action: после controlled409 загрузчик остаётся на одном вызове, fence r1, текст сохранён, rebase отсутствует; явная revalidation даёт второй вызов и кнопку. |
| Мира EDITOR-PUB-02 | XR-EDIT-409 | RELATED_SYMPTOM_GROUPED | Неверный conflict feedback сохранить как подпроблему той же цепочки edit409; не прибавлять автоматически второй независимый класс. |
| Мира CONTENT-SIZE-01 | XR-CONTENT-BOUNDS | POLICY_GAP_NOT_AUTOMATIC_INCIDENT | Отсутствие max title/body подтверждено кодом, но не любой размер автоматически дефект. Связать с конкретным инвариантом/сложностью, не заявлять production timeout. |
| Мира MARKDOWN-SPOILER-01 | XR-SPOILER-COMPLEXITY | STATIC_ALGORITHM_CORROBORATED_NO_STRESS | spoilerAt сканирует хвост и при отсутствии конца возвращает null; outer loop сдвигает i только на 1. Для N открывающих маркеров сумма проходов квадратична. Это отдельный статический вывод; остановленные ресурсные опыты не возобновлялись. |
| Мира ATTACH-LIFECYCLE-01 | ATTACH-01 | DUPLICATE | Тот же orphan object без достижимой metadata row и последующего claim очистки. |
| Мира ATTACH-STRUCT-01 | XR-ZIP-METADATA | STRUCTURAL_CONTRACT_REVIEW_NEEDED | Local header сверяет name/flags/method/bounds, но не все size/CRC/descriptor поля. Это факт покрытия; полноту требуемой bounded structural проверки и контрпример ещё нужно сверить. Не смешивать с classic65535 ZIP. |
| Мира ATTACH-SEC-01 | XR-SECURITY-ID | IDENTIFIER_SEMANTICS_REVIEW_NEEDED | uploadId намеренно может иметь attachment-v1 hash; исходный attachmentId участвует в hash. Сверить нужную семантику корреляции и label, не объявлять потерю существующей asset-row: rejected upload может не иметь asset. |
| Мира ATTACH-HTTP-405-01 | XR-HTTP-ALLOW | SOURCE_ROUTE_OMISSION | В attachment routes есть явный405 без Allow. Границы фактического HTTP метода/Router dispatch проверить отдельно до общего final verdict. |
| Мира I18N-UI-POLICY-01 | XR-UI-POLICY | SOURCE_POLICY_IDENTITY_GAP | Bundle verification хеширует code inputs/resources, а отдельный machine source проверяет generationPolicyVersion. Требуется сверить contract invalidation текущего compiled bundle; policy change не равен автоматически невалидному тексту. |
| Мира I18N-COPY-01 | LOC-04 | DUPLICATE | Тот же editorAttachmentRestoring в pending истории; не путать с CODE-HISTORY-01 overflow. |
| Мира I18N-UGC-META-01 | XR-UGC-META | SOURCE_PRESENTATION_GAP_REPORTED | Secondary list/title metadata нужны отдельные точные примеры; dir=auto и известный lang/dir не эквивалентны. Не считать все UGC небезопасными. |
| Мира DB-MANIFEST-01 | DB-02 | DUPLICATE | Тот же отсутствующий partial index predicate в parity manifest. |
| Мира DB-ERROR-01 | ARCH-01 | DUPLICATE | Та же catch-all503 ошибка, что Лира F03 и Миша High. High не установлен; не все request errors становятся503. |
| Мира POST-EDIT-AVAIL-01 | XR-POST-EDIT-503 | SOURCE_CHAIN_CORROBORATED | post-edit loader не преобразует typed forum/authz unavailable; ForumRouteError считает произвольный Error статусом500. Отличать от actual deployed response. |
| Мира FORUM-READ-AVAIL-01 | XR-PUBLIC-503 | SOURCE_CHAIN_CORROBORATED | Primary readHomepage failure не пойман, тогда как optional presence и notifications typed unavailable обработаны. Это не тот же writer catch-all503. |
| Мира NOTIFY-BODY-01 | XR-NOTIFY-GUARD | SOURCE_ORDER_CONFIRMED | request.formData вызывается до runForumMutation guard. Сам обход auth/Origin не установлен; body parsing до guard — отдельный порядок обработки. |
| Мира NOTIFY-PAGING-01 | CORE-02 | DUPLICATE | Тот же latest50 inbox/all unread badge; старый post остаётся доступен другими путями. |
| Мира TAG-CARDINALITY-01 | XR-TAG-BOUNDS | CARDINALITY_POLICY_GAP | normalizeForumTags ограничивает длину каждого tag64, но не число unique tags; реальный scale failure или согласованный max не доказаны одним отсутствием лимита. |
| Мира MIGRATION-SOT-01 | DOC-02 | DUPLICATE_DOCUMENTATION | Та же разница0043/0044; отдельно от runtime дефектов. |
| Лира F01 | XR-EDIT-409 | REPRODUCED_ACTUAL_LOCAL_ROUTE | Совпадает с EDITOR-PUB-01/02; после409 не теряется текст, но нет актуальной revision/rebase. |
| Лира F02 | XR-THROWN-ACTION-BUFFER | SOURCE_CONDITIONAL_NOT_REPRODUCED | Thrown action заменяет TopicView error boundary и размонтирует memory buffer. Это не любая network failure; применимость обещания сохранения текста при unexpected throw отдельно сверить. |
| Лира F03 | ARCH-01 | DUPLICATE | Тот же writer catch-all503. |
| Лира F04 | XR-CROSS-TAB-IDENTITY | SOURCE_CONDITIONAL_NOT_REPRODUCED | Heartbeat401 обновляет root, но204 на topic не обновляет cached identity. A→B stale client/user attribution требует отдельной проверки; server authority не обходится. |
| Лира F05 | HELP-01 | DUPLICATE | Та же stale appeal identity; прежняя native race сильнее source-only доказательства. |
| Лира F06 | M-M10 | RELATED_SAME_PALETTE_FAMILY | Белый текст submit на accent — дополнительное место; не тот же цветовой pair, что навигация. Не суммировать как новый класс без определения root cause. |
| Лира D01 | DOC-02 | DUPLICATE_DOCUMENTATION | Migration0043/0044. |
| Лира D02 | DOC-04 | DUPLICATE_DOCUMENTATION | History role-only vs effective permission. |
| Лира R01 | CORE-01 | PRIOR_NATIVE_PROOF_RESOLVES_CONDITIONAL | У Лиры PG race не запускалась; прежнее native PG доказательство в реестре Лёвы найдено. Это не исполнение Лиры. |
| Лира R02 | SEC-01 | PARTIAL_OVERLAP | Raw diagnostics риск шире; конкретный profile form/SQL leakage подтверждён прежним injected-DB-error доказательством. Не расширять на все handlers без проверки. |

### Остальные реестры

51 группа Лёвы сохранена как отдельные доказательства, а не объявлена коллективным консенсусом. ARCH-02 требует разрешения применимости lifecycle, DB-03 — отделения внутреннего grant-контракта от Stage6 rollout, ATTACH-04 — уточнения требования индивидуальной отмены uploading.

30 утверждений Миши сопоставлены с уже выполненной d72b27c verification:15 confirmed /14partial /1not confirmed. Это классификация утверждений, не30 дефектов. Наличие type-only cycle, неиспользуемого export, отсутствия threshold/timeout/favicon само по себе не устанавливает current-Stage функциональный дефект. Generic pagination/unread-scope scalability не объединяется с реальной потерей доступа к старым notification через inbox.

### Статус

Первый проход общей сверки завершён, окончательная общая классификация открыта. Оставшиеся спорные пункты перечислены явно; никакого общего PASS и команды исправлять весь объединённый список нет. Не нужны повторное чтение всего дерева, реальные исключённые сервисы или возобновление остановленных ресурсных опытов. Следующий проход — точечное разрешение перечисленных расхождений. Личные отчёты других агентов не изменялись.

---

## Опубликованный итог AUD-20261022 — 2026-10-24

Публикация в личный файл выполнена по прямому разрешению владельца в текущем чате. Текущий итог имеет приоритет перед историческими незавершёнными статусами ниже. Реализация не изменена; общая межагентная сверка этим обновлением не выполняется.

# Итоговый аудит кода Vico Forum

Проверенный commit: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.

Проверка кода в согласованном объёме завершена. Исправления не выполнялись. Это не утверждение об отсутствии всех ошибок, полной безопасности или успешной эксплуатации сервиса.

## Объём и происхождение

Учтены 491 tracked-путь и 437 путей исторического IN-объёма. Из 357 файлов кода три операционных пути исключены по первоначальным ограничениям пользователя; применимый кодовый объём — 354. Для 353 есть записи полного чтения; forum-repository покрыт совокупностью диапазонов 1–3915 с сохранённым унаследованным происхождением. CSS проверен по полному выводу исполняемых правил и деклараций, а не только парсером.

Отчёт объединяет ранние сохранённые записи, собственные последующие проверки и перепроверенные утверждения Миши. Неустановленное авторство ранних выполнений не присвоено мне. После ознакомления с выводами Миши слепая независимость этого аудита не заявляется.

## Подсчёт

**45 групп проблем кода приложения**, отдельно **2 дефекта preview** и **4 документальных несоответствия**. Это 51 группа, а не 51 новое личное открытие. Ранние записи сохранены с их доказательствами и границами повторной проверки.

Из рабочего реестра 50 ID объединены EDITOR-08 и RES-EDITOR-01: замена и вставка изменяют заблокированный редактор через общий незащищённый путь. Добавлены два узко подтверждённых результата перепроверки Миши — M-M07 и M-M10. M-H01 — точный алиас ARCH-01, повторно не считается. Остальные 27 утверждений Миши сохранены отдельно: факты об устройстве, тестах и CI не превращены автоматически в дополнительные дефекты.

## Существенные результаты

- AUTH-01: успешный вход может потеряться из-за порядка Set-Cookie старой и новой сессии. В продолжении подтверждено настоящим BetterAuth email engine с локальным memory adapter и cookie jar.
- CORE-01: встречные ответы могут получить deadlock. Раннее native PostgreSQL-доказательство сохранено; текущий порядок блокировок проверен по коду.
- ARCH-03: ошибка cleanup может подменить исход операции; прежнее доказательство сохранённой записи в БД и новый auth-случай разделены.
- SEC-01: при неожиданной ошибке профиля логгер получает неопубликованный текст и SQL-параметры. Это вывод о коде логирования, а не проверка реального лог-хранилища.
- HELP-01: старая форма решения апелляции не привязана к ожидаемой апелляции и может примениться к заменившей её записи.
- CORE-03: отметка прочитанного может опередить отданные сообщения; позднейшая revalidation способна доставить пропущенный снимок. Постоянная невидимость сообщений не доказана.
- Новые конкретные UI-результаты: некорректное состояние поля поиска после Back; переполнение истории на 320 px до 789 px; безымянное Simple textbox; переполнение меню редактора и два сломанных сценария preview.

## Реестр

P2 — умеренный приоритет; P3 — низкий. Сохранённая оценка не означает измеренную частоту на production. Подробные условия, исходные отчёты и ограничения находятся в FINAL-FINDINGS.json.

### Код приложения

| ID | Приоритет | Проблема |
|---|---|---|
| ARCH-01 | P2 | Неожиданные ошибки записи маскируются под временную недоступность 503 |
| ARCH-02 | P2 | Загрузчик реестра локалей не завершает соединение после успешного чтения и части ошибок |
| ARCH-03 | P2 | Ошибка завершения соединения подменяет успешный результат или исходную ошибку операции |
| ATTACH-01 | P2 | Объект вложения без записи метаданных недоступен штатной очистке |
| ATTACH-02 | P3 | Корректный обычный ZIP с 65535 записями ошибочно требует ZIP64 |
| ATTACH-03 | P3 | Корректный пустой TAR отклоняется на распознавании сигнатуры |
| ATTACH-04 | P2 | Загружаемый файл нельзя удалить отдельно; до завершения загрузки публикация блокируется |
| AUTH-01 | P2 | Удаляющий cookie старой сессии перезаписывает cookie успешного нового входа |
| AUTH-02 | P2 | Назначение уже удалённой роли из старой формы завершается необработанной ошибкой 500 |
| CORE-01 | P2 | Встречные одновременные ответы могут вызвать взаимную блокировку при записи уведомлений |
| CORE-02 | P2 | Старое непрочитанное уведомление выпадает из последних 50 при сохранении общего счётчика |
| CORE-03 | P2 | Отметка прочитанного может опередить фактически отданный снимок сообщений |
| DB-01 | P3 | CHECK допускает неполные NULL-комбинации метаданных состояния allowance |
| DB-02 | P2 | Верификатор схемы пропускает изменение предиката частичного индекса |
| DB-03 | P2 | Контракт прав web runtime не включает используемую таблицу отметок прочитанного |
| EDITOR-01 | P2 | Нормализация HTML-вставки схлопывает пустые строки внутри программного кода |
| EDITOR-02 | P2 | Обычный текст ячеек таблицы превращается в Markdown-форматирование и ссылки |
| EDITOR-03 | P2 | Очистка форматирования части жирного текста повреждает невыделенный суффикс |
| EDITOR-04 | P3 | Отказ преобразования сложной таблицы молча заменяется обычным текстом |
| EDITOR-05 | P2 | Find next не переносит выделение при уже открытом режиме записи |
| EDITOR-06 | P2 | Enter внутри форматированного текста в Простом режиме повреждает разделители |
| EDITOR-07 | P2 | Отступ захватывает исключённую конечную строку и может повредить закрывающий fence |
| EDITOR-08, RES-EDITOR-01 | P3 | Заблокированный редактор допускает изменение через Find/Replace или вставку |
| EDITOR-09 | P2 | Выделение получателей упоминаний расходится с отображением таблиц и спойлеров |
| EDITOR-10 | P3 | HTML-сущности в имени участника декодируются и меняют подпись упоминания |
| EDITOR-11 | P2 | Публикация обрезает граничные пробелы Markdown и может превратить код в обычный текст |
| HELP-01 | P2 | Старая форма решения апелляции может примениться к новой апелляции |
| HELP-02 | P2 | Время начала транзакции может нарушить CHECK при снятии дубликата |
| LOC-01 | P2 | Транспортная ошибка после COMMIT пропускает сверку результата записи локали |
| LOC-02 | P2 | Неожиданная ошибка проверки compiled bundle может привести к удалению корректного bundle |
| LOC-03 | P2 | Параметризованный i18next nesting проходит мимо проверки разрешённых токенов |
| LOC-04 | P3 | При загрузке истории показывается сообщение о восстановлении вложений |
| LOC-05 | P2 | Быстрое переключение политики A–B–A может потерять нужное поколение задачи |
| LOC-06 | P3 | Запрос генерации для сообщения только с вложением завершается ошибкой 500 |
| LOC-07 | P2 | Защита перевода не охватывает структуру собственных таблиц и спойлеров |
| LOC-08 | P3 | Перевод теряет явное направление абзаца либо ошибочно отклоняет экранированный текст |
| LOC-09 | P2 | Отклонённый перевод с завершённой задачей старой политики застревает в converging |
| SEC-01 | P3 | Неожиданные ошибки профиля передают неопубликованный текст и SQL-параметры логгеру |
| RES-EDITOR-02 | P3 | Backspace в начале второго обычного абзаца не соединяет абзацы в Простом режиме |
| RES-UI-01 | P3 | Меню дополнительных инструментов редактора расширяет страницу на 320 px |
| RES-A11Y-01 | P2 | Редактируемое текстовое поле Простого режима не имеет доступного имени |
| CODE-SEARCH-01 | P3 | После возврата назад поле поиска не соответствует адресу и результатам |
| CODE-HISTORY-01 | P3 | История правок расширяет узкую страницу вместо локального размещения текста |
| M-M07 | P3 | Английская шапка менеджера переполняется при ширине 320 px |
| M-M10 | P2 | У проверенного навигационного текста светлой темы недостаточный контраст |

### Preview

| ID | Приоритет | Проблема |
|---|---|---|
| CODE-PREVIEW-01 | P3 | Сценарий подтверждения лучшего ответа открывается решённым и не показывает подтверждение |
| CODE-PREVIEW-02 | P3 | Вкладка Appeals (1) стенда показывает пустую очередь |

### Документация — отдельно от кода

| ID | Приоритет | Проблема |
|---|---|---|
| DOC-01 | DOCUMENTATION | Текущие статусы и остаточные задачи в документации устарели |
| DOC-02 | DOCUMENTATION | Документация отстаёт от фактического номера последней миграции |
| DOC-03 | DOCUMENTATION | Документация противоречиво определяет видимость отметки Disputed |
| DOC-04 | DOCUMENTATION | Доступ к истории описан через роль и через effective permission противоречиво |

## Проверки и ограничения

Прослежены цепочки session/cookie, server actor/permission/ownership, публикации и редактирования, revision fence/transaction/replay, уведомлений и отметок прочитанного, ошибок и логирования, локализации и перевода, вложений, shared UI и preview. Более поздние тесты и source-проверки сопоставлены со старыми pending-полями по семи предметным областям; старые таблицы не переписаны как blanket PASS.

Проверены 874 source/hash ссылок, несовпадений нет. Найдены все 42 исходных отчёта ранних находок и 37 явно названных файлов доказательств. В текущих ссылках два изменения вспомогательного индекса объяснены позднейшей сохранённой версией; исходные результаты воспроизведений не заменены.

Сохранены результаты локальных unit/route/native-DB проверок прежних частей, отдельных Chromium/AX и HTTP/SSR проверок. В продолжении добавлены локальные auth/cookie проверки, воспроизведение read-snapshot, preview, поиска и мобильной истории. Неизменённые наборы не запускались заново ради счётчика. Локальные синтетические компоненты, хранилища и ответы в доказательствах обозначены отдельно от реальной БД и браузера.

Cloudflare, Neon, Hyperdrive, R2, OAuth и backup/restore как реальные сервисы и операционные проверки исключены. Внутренние адаптеры проверялись локально с обозначенными подменами. Реальные deployment/CDN/cache/log sinks и hosted CI не сертифицированы.

Ресурсная гипотеза сложного рендеринга остаётся неподтверждённым наблюдением вне числа дефектов: влияние через публикацию и чтение не установлено; дальнейшие стресс-опыты остановлены. Свежий сетевой аудит зависимостей не выполнялся — использован сохранённый отчёт. Нет утверждения о полном WCAG, всех устройствах, браузерах, screen reader, OS IME или настоящем zoom. Версии локального Node/pnpm отличались от закреплённых в проекте.

## Следующий этап

Итог пригоден для общей сверки с результатами других проверяющих с учётом указанного происхождения. Исправления, новые PR, комментарии или публикации требуют отдельного задания; в ходе этого аудита их не было.


## Подробный реестр: происхождение, причины, доказательства и ограничения

Пути `/workspace/...` в реестре обозначают локальные артефакты выполненной проверки, а не файлы, опубликованные в GitHub. В этом личном файле опубликовано содержимое итогового отчёта и полного реестра; исходные тестовые артефакты и скриншоты отдельно не загружены. Условия и результаты воспроизведений, ссылки на исходники и границы подтверждения сохранены в записях ниже. Ранние исполнения не присвоены текущему агенту; поздние собственные проверки указаны отдельно.

<details>
<summary>Полный структурированный реестр аудита</summary>

```json
{
  "baseline": "d72b27ca762dd930f0e7ad614e5b00832a07ec0c",
  "status": "CODE_AUDIT_COMPLETED_WITH_SCOPE_AND_EVIDENCE_LIMITS",
  "recordedAtUtc": "2026-10-24T11:12:36.206791+00:00",
  "scope": "Application/internal code at fixed commit; user-excluded real services and backup/restore not audited.",
  "notAnIndependentBlindAudit": true,
  "groups": [
    {
      "id": "ARCH-01",
      "memberIds": [
        "ARCH-01"
      ],
      "kind": "application-code",
      "titleRu": "Неожиданные ошибки записи маскируются под временную недоступность 503",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "ARCH-01",
          "title": "catch-all unexpected writer errors become controlled 503",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage2-part3.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage2-part3.json"
          ],
          "sourceStatus": null,
          "sourcePriority": null,
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [
            "/workspace/work/misha-verification/part1.md",
            "/workspace/work/audit-resumed/part12.md"
          ],
          "currentStatus": "RECONFIRMED_WITH_EXPLICIT_BOUNDS",
          "originalRecord": {
            "id": "ARCH-01",
            "path": "app/forum/mutations.server.ts",
            "line": 110,
            "issue": "catch-all unexpected writer errors become controlled 503",
            "reproduction": "sectionAction -> createHyperdriveForumWriter with injected client.connect throwing TypeError -> DataWithResponseInit({error:unavailable},503); connects1 ends1; no network",
            "impact": "programming/configuration failures are misclassified as temporary dependency outages and fail to reach unexpected-error handling",
            "limits": "fault injection confirms error boundary behavior; no observed production incident claimed"
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CURRENT_SOURCE_CHAIN_CHECKED_PRIOR_HTTP_PROOF_RETAINED",
          "currentContinuationReports": [
            "/workspace/work/audit/repo/work/audit-code-continuation/publication/review.json",
            "/workspace/work/audit/repo/work/audit-code-continuation/permissions/review.json"
          ],
          "currentContinuationLimit": "Unknown mutation errors become 503 in wrapper; not every request, High not established."
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "ARCH-02",
      "memberIds": [
        "ARCH-02"
      ],
      "kind": "application-code",
      "titleRu": "Загрузчик реестра локалей не завершает соединение после успешного чтения и части ошибок",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "ARCH-02",
          "title": "request registry loader omits client cleanup on success and unexpected query failure",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage4-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage4-final.json",
            "/workspace/work/audit-stage0/stage4-part4.json",
            "/workspace/work/audit-stage0/stage8-part2.json"
          ],
          "sourceStatus": "CONFIRMED_LOCAL_NATIVE_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [
            "/workspace/work/audit-stage0/stage10-part8.json"
          ],
          "currentStatus": "RECONFIRMED_WITH_EXPLICIT_BOUNDS",
          "originalRecord": {
            "id": "ARCH-02",
            "priority": "P2",
            "status": "CONFIRMED_LOCAL_NATIVE_UNFIXED",
            "location": "db/hyperdrive-registry.ts:39-53",
            "issue": "request registry loader omits client cleanup on success and unexpected query failure",
            "cause": "Client constructed and connected per loader.readAll; only classified availability catch discards; no finally. readAll and request cache do not own cleanup; outer Worker has no cleanup hook",
            "evidence": {
              "successfulRequestLoaders": 2,
              "secondCallSameLoaderReusedSnapshot": true,
              "unexpectedReadErrorPropagated": true,
              "registryEndCallsBeforeManualCleanup": [
                0,
                0,
                0
              ],
              "idleNativeConnectionsBeforeManualCleanup": 3,
              "forumReaderControlEndCalls": 1,
              "limits": "local native Pg and actual application factories, no Hyperdrive service/Worker teardown behavior tested",
              "idleConnectionsAfterManualCleanup": 0
            },
            "control": "actual forum reader invokes end once; manual diagnostic cleanup reduces registry-tag idle connections3→0",
            "limits": "local nativePg factory behavior proven, actual Hyperdrive service/Worker teardown/production exhaustion not tested; all excluded service operations remain excluded",
            "crossStage": "architecture lifecycle finding discovered in stage4 assigned registry adapter; include stage8 followup"
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "ARCH-03",
      "memberIds": [
        "ARCH-03"
      ],
      "kind": "application-code",
      "titleRu": "Ошибка завершения соединения подменяет успешный результат или исходную ошибку операции",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "ARCH-03",
          "title": "await client.end in writer finally replaces success or original domain failure when shutdown rejects",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage4-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage4-final.json",
            "/workspace/work/audit-stage0/stage4-part5.json"
          ],
          "sourceStatus": "CONFIRMED_WITH_NATIVE_FAULT_INJECTION_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [
            "/workspace/work/audit-stage0/stage10-part8.json"
          ],
          "currentStatus": "RECONFIRMED_WITH_EXPLICIT_BOUNDS",
          "originalRecord": {
            "id": "ARCH-03",
            "priority": "P2",
            "status": "CONFIRMED_WITH_NATIVE_FAULT_INJECTION_UNFIXED",
            "location": "db/hyperdrive-forum.ts:130",
            "issue": "await client.end in writer finally replaces success or original domain failure when shutdown rejects",
            "evidence": {
              "successCase": {
                "actionStatus": 503,
                "persistedTopics": 1,
                "normalCleanupReplayStatus": 302,
                "readerCleanupFailureControl": "successful result preserved"
              },
              "limits": "actual action/service/Pg commit; injected rejection after actual client.end completes; no service shutdown failure or production incidence observed",
              "domainFailureCase": {
                "normalStatus": 403,
                "cleanupFailureStatus": 503,
                "unauthorizedMutationPersisted": false
              }
            },
            "cause": "finally awaited end throws after operation outcome, overriding it; generic action catch then reports503",
            "relationToARCH01": "distinct writer cleanup root cause; generic runForumMutation classification contributes to observed503; do not count catch-all itself twice",
            "limits": "shutdown failure deliberately injected after actual client.end and DB commit; production occurrence/frequency not established; no external service behavior tested"
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CURRENT_LOCAL_CLEANUP_OCCURRENCE_EXTENSION",
          "currentContinuationReports": [
            "/workspace/work/audit/repo/work/audit-code-continuation/auth/review.json",
            "/workspace/work/audit/repo/work/audit-code-continuation/publication/review.json"
          ],
          "currentContinuationLimit": "Auth cleanup occurrence tested with fake client; earlier native writer evidence retained separately."
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "ATTACH-01",
      "memberIds": [
        "ATTACH-01"
      ],
      "kind": "application-code",
      "titleRu": "Объект вложения без записи метаданных недоступен штатной очистке",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "ATTACH-01",
          "title": "Private objects without an asset row remain permanently invisible to the internal cleanup processor",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage7-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage7-final.json",
            "/workspace/work/audit-stage0/stage7-part1.json"
          ],
          "sourceStatus": "CONFIRMED_NATIVE_WITH_LOCAL_OBJECT_EMULATOR_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "ATTACH-01",
            "priority": "P2",
            "status": "CONFIRMED_NATIVE_WITH_LOCAL_OBJECT_EMULATOR_UNFIXED",
            "issue": "Private objects without an asset row remain permanently invisible to the internal cleanup processor",
            "location": [
              "app/routes/attachment-upload.ts:237-247",
              "db/forum-attachment-cleanup.ts:68-80"
            ],
            "cause": "Upload allocates and writes a fresh random private object before metadata persistence. On availability/ambiguous persistence failures it retains the object, but no durable pending object record is created. Subsequent retry allocates another object. Cleanup enumerates only forum_attachments rows, so the old key is not discoverable. Compensating deletion failures are also swallowed without a retry claim.",
            "reproductions": [
              {
                "case": "Actual local adapter connect() failure ECONNRESET before metadata transaction",
                "sequence": "upload503 -> zero DB asset rows and one stored object -> same-ID retry201 -> one DB row and two objects -> actual cleanup with clock+2days deletes recorded asset only -> zero rows, one orphan; next pass claims0"
              },
              {
                "case": "Terminal operation rejected after upload; injected object delete failure",
                "sequence": "upload410 -> no asset row and one object -> delete recovers -> actual cleanup claims0; object remains"
              }
            ],
            "controls": [
              "Actual PostgreSQL COMMIT succeeds then query acknowledgement throws ECONNRESET; response503; same-ID retry201 retains original recorded object and removes duplicate; subsequent actual cleanup removes it normally.",
              "Terminal operation rejection with functioning object delete leaves no object.",
              "Actual DB-backed download returns bytes for matching owner/context/operation; other owner, wrong context, wrong operation and cancelled operation yield404."
            ],
            "evidence": "stage7-part1-orphan-evidence.json",
            "limits": "No real R2/Neon/Hyperdrive service. Actual local PostgreSQL17 and actual route, local storage adapter, repository and cleanup with in-memory object emulation. Failure injection is bounded at connect, after real COMMIT and object delete. No production frequency/cost measured; no public data exposure established."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "ATTACH-02",
      "memberIds": [
        "ATTACH-02"
      ],
      "kind": "application-code",
      "titleRu": "Корректный обычный ZIP с 65535 записями ошибочно требует ZIP64",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "ATTACH-02",
          "title": "Valid classic ZIP with exactly65535 entries is rejected because entry count0xffff unconditionally requires ZIP64",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage7-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage7-final.json",
            "/workspace/work/audit-stage0/stage7-part2.json"
          ],
          "sourceStatus": "CONFIRMED_LOCAL_ROUTE_UNFIXED",
          "sourcePriority": "P3",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "ATTACH-02",
            "priority": "P3",
            "status": "CONFIRMED_LOCAL_ROUTE_UNFIXED",
            "issue": "Valid classic ZIP with exactly65535 entries is rejected because entry count0xffff unconditionally requires ZIP64",
            "location": "app/forum/attachment-zip-validation.ts:107-119",
            "repro": "Python3.12.14 zipfile creates count-65535.zip with65535 empty named entries, size6291382bytes, no ZIP64 locator. Python testzip succeeds and independent unzip -tqq exits0. Actual validator returnsfalse and actual upload action returns422 invalid-structure/suspicious=true, deletes uploaded private object and calls security-event store.",
            "controls": "Same standard producer yields valid classic65534-entry ZIP and valid ZIP64 65536-entry ZIP; actual structural validator accepts both. Empty and one-entry ZIP and stored/deflated/bzip2/lzma ZIP controls accepted.",
            "limits": "Direct real Request/action and real stream/structural helpers with memory bucket; metadata/event persistence stubbed for this binary boundary. No live HTTP/browser, native DB or external service. No malicious content or security bypass claim.",
            "evidence": [
              "stage7-part2-corpus.json",
              "stage7-part2-archive-results.json",
              "work/audit-stage7-part2/archives.test.ts"
            ]
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "ATTACH-03",
      "memberIds": [
        "ATTACH-03"
      ],
      "kind": "application-code",
      "titleRu": "Корректный пустой TAR отклоняется на распознавании сигнатуры",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "ATTACH-03",
          "title": "Valid empty TAR is rejected by signature sniff despite successful TAR structural validation",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage7-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage7-final.json",
            "/workspace/work/audit-stage0/stage7-part2.json"
          ],
          "sourceStatus": "CONFIRMED_LOCAL_ROUTE_UNFIXED",
          "sourcePriority": "P3",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "ATTACH-03",
            "priority": "P3",
            "status": "CONFIRMED_LOCAL_ROUTE_UNFIXED",
            "issue": "Valid empty TAR is rejected by signature sniff despite successful TAR structural validation",
            "location": "app/forum/attachment-validation.ts:81-85",
            "repro": "Python tarfile creates standard empty USTAR archive of10240zero bytes; Python reads no entries and independent tar -tf exits0. validateTarStructure accepts its zero-block end marker, but detectAttachmentContent has no empty-TAR branch and calls it unknown. Actual upload route returns422 signature-mismatch/suspicious=true and calls security-event store before any object write.",
            "controls": "Nonempty USTAR/GNU/PAX TAR from same standard producer are accepted by structural validator and actual private stream storage with exact byte preservation.",
            "limits": "Zero-byte files remain intentionally rejected; this finding concerns a nonzero valid TAR container. No extension-only acceptance proposed. No real storage/DB/browser in this part.",
            "evidence": [
              "stage7-part2-corpus.json",
              "stage7-part2-archive-results.json",
              "work/audit-stage7-part2/archives.test.ts"
            ]
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "ATTACH-04",
      "memberIds": [
        "ATTACH-04"
      ],
      "kind": "application-code",
      "titleRu": "Загружаемый файл нельзя удалить отдельно; до завершения загрузки публикация блокируется",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "ATTACH-04",
          "title": "An actively uploading attachment cannot be removed individually and blocks publication until it settles",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage7-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage7-final.json",
            "/workspace/work/audit-stage0/stage7-part3.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "ATTACH-04",
            "priority": "P2",
            "status": "CONFIRMED_COMPONENT_UNFIXED",
            "issue": "An actively uploading attachment cannot be removed individually and blocks publication until it settles",
            "location": [
              "app/forum/editor-attachments.tsx:248-249",
              "app/forum/editor-attachments.tsx:312-316"
            ],
            "requirement": "docs/EDITOR.md §6: before publication an attachment can be removed or replaced; only uploads left in the selection should block publication. UI blocked message also says finish or remove uploads.",
            "repro": "Actual MarkdownEditor with nonempty typed text and one acknowledged file. Add a second pending file: Publish disabled, that file row has no action button; writing more text does not release barrier. The available whole-operation Cancel aborts the pending XHR but resets body to default and clears both selected files.",
            "controls": [
              "After an upload error, per-file Remove is available; it releases the publication barrier while preserving typed text and the other selected file.",
              "Normal acknowledgement releases the barrier and keeps exact selected IDs and text.",
              "Picker/drop/image paste share one operation and three distinct stable IDs with selected success preserved."
            ],
            "cause": "Remove button is omitted for uploading status and remove() returns early for uploading. No per-file abort control is exposed. Whole-operation cancel calls MarkdownEditor cancelEditing(), which intentionally resets body/history and all selections.",
            "limits": "Deterministic actual React components in jsdom with controlled XHR progress/completion, not a real browser/network stall. No duration or infinite-stall claim; affected period lasts while upload is pending. Whole Cancel behavior is deliberate, not an automatic text-loss claim. Existing test explicitly expects absent Remove during uploading; it does not resolve the broader contract inconsistency.",
            "evidence": [
              "work/audit-stage7-part3/client.test.tsx",
              "stage7-part3.json"
            ]
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "AUTH-01",
      "memberIds": [
        "AUTH-01"
      ],
      "kind": "application-code",
      "titleRu": "Удаляющий cookie старой сессии перезаписывает cookie успешного нового входа",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "AUTH-01",
          "title": "stale revoked session deletion cookie appended after successful email sign-in cookie loses newly issued login",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage3-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage3-final.json",
            "/workspace/work/audit-stage0/stage3-part1.json",
            "/workspace/work/audit-stage0/stage3-part2.json"
          ],
          "sourceStatus": "CONFIRMED_UNFIXED",
          "sourcePriority": null,
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "AUTH-01",
            "status": "CONFIRMED_UNFIXED",
            "effect": "stale revoked session deletion cookie appended after successful email sign-in cookie loses newly issued login",
            "location": "app/auth/session-context.ts:29",
            "evidence": [
              "stage3-part1-cookie-repro.json",
              "stage3-part2-pg-cookie-repro.json"
            ],
            "limits": "real BetterAuth/native Postgres and modeled cookie replacement, no live browser"
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CURRENT_LOCAL_ENGINE_AND_COOKIE_RECONFIRMATION",
          "currentContinuationReports": [
            "/workspace/work/audit/repo/work/audit-code-continuation/auth/review.json"
          ],
          "currentContinuationLimit": "Actual BetterAuth email engine with memory adapter and wrapper/cookie jar; not native browser or production."
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "AUTH-02",
      "memberIds": [
        "AUTH-02"
      ],
      "kind": "application-code",
      "titleRu": "Назначение уже удалённой роли из старой формы завершается необработанной ошибкой 500",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "AUTH-02",
          "title": "assign deleted role from stale management form yields raw FK23503 and HTTP500; transaction rolled back",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage3-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage3-final.json",
            "/workspace/work/audit-stage0/stage3-part3.json"
          ],
          "sourceStatus": "CONFIRMED_UNFIXED",
          "sourcePriority": null,
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "AUTH-02",
            "status": "CONFIRMED_UNFIXED",
            "effect": "assign deleted role from stale management form yields raw FK23503 and HTTP500; transaction rolled back",
            "location": "db/authorization-repository.ts:194; app/routes/authorization-admin.tsx:58",
            "evidence": [
              "stage3-part3-stale-role.json"
            ],
            "limits": "real capability/action/Postgres/ReactRouter static handler; no live browser"
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "CORE-01",
      "memberIds": [
        "CORE-01"
      ],
      "kind": "application-code",
      "titleRu": "Встречные одновременные ответы могут вызвать взаимную блокировку при записи уведомлений",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "CORE-01",
          "title": "crossed concurrent replies deadlock on per-author FOR UPDATE versus notification recipient FK FOR KEY SHARE",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage4-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage4-final.json",
            "/workspace/work/audit-stage0/stage4-part1.json"
          ],
          "sourceStatus": "CONFIRMED_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "CORE-01",
            "priority": "P2",
            "status": "CONFIRMED_UNFIXED",
            "issue": "crossed concurrent replies deadlock on per-author FOR UPDATE versus notification recipient FK FOR KEY SHARE",
            "locations": [
              "db/forum-repository.ts:3880",
              "db/forum-repository.ts:734",
              "app/forum/mutations.server.ts:110"
            ],
            "reproduction": {
              "serialControl": "both succeeded",
              "synchronizedAfterRealUserLocks": 2,
              "postgresCodes": [
                "40P01"
              ],
              "diagnostics": [
                {
                  "code": "40P01",
                  "statement": "insert into \"forum_reply_notifications\" (\"id\", \"recipient_user_id\", \"actor_user_id\", \"topic_id\", \"post_id\", \"kind\", \"created_at\", \"read_at\") values ($1, $2, $3, $4, $5, default, $6, default) on conflict (\"recipient_user_id\",\"post_id\") do nothing",
                  "where": "while locking tuple (0,2) in relation \"user\"\nSQL statement \"SELECT 1 FROM ONLY \"audit_core_write_test\".\"user\" x WHERE \"id\" OPERATOR(pg_catalog.=) $1 FOR KEY SHARE OF x\"",
                  "detail": "Process 115 waits for ShareLock on transaction 1086; blocked by process 114.\nProcess 114 waits for ShareLock on transaction 1085; blocked by process 115."
                }
              ],
              "diagnosticControl": {
                "clientOnlyQuerySubstitution": "user FOR UPDATE -> FOR NO KEY UPDATE",
                "statuses": [
                  302,
                  302
                ],
                "postgresCodes": [],
                "implementationChanged": false
              },
              "parallelPolicy": "unaltered default 5000ms cooldown; prior posts backdated one minute",
              "httpStatuses": [
                302,
                503
              ],
              "persistedParallelReplies": 1,
              "limits": "controlled interleaving of real queries; actual action/runtime/Postgres, fake auth session, no browser"
            },
            "effect": "one action returns503 and its reply rolled back, other302 and persisted; serial control both succeed",
            "causality": "actual PG40P01 context identifies notification INSERT acquiring user FK KEY SHARE; client-only FOR NO KEY UPDATE diagnostic control yields302/302, no code changes",
            "limits": "controlled feasible query scheduling, actual action/writer/Postgres, fake auth session, no live browser; production incidence/frequency not established"
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CURRENT_LOCK_MECHANISM_CHECKED_PRIOR_NATIVE_PROOF_RETAINED",
          "currentContinuationReports": [
            "/workspace/work/audit/repo/work/audit-code-continuation/publication/review.json"
          ],
          "currentContinuationLimit": "Current SQL lock order checked; no new native concurrency run."
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "CORE-02",
      "memberIds": [
        "CORE-02"
      ],
      "kind": "application-code",
      "titleRu": "Старое непрочитанное уведомление выпадает из последних 50 при сохранении общего счётчика",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "CORE-02",
          "title": "old unread notification stranded outside latest50 inbox while global unread count includes it",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage4-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage4-final.json",
            "/workspace/work/audit-stage0/stage4-part2.json"
          ],
          "sourceStatus": "CONFIRMED_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "CORE-02",
            "priority": "P2",
            "status": "CONFIRMED_UNFIXED",
            "locations": [
              "db/forum-repository.ts:1361",
              "db/forum-repository.ts:1389",
              "app/routes/notifications.tsx:23",
              "app/forum/views.tsx:357"
            ],
            "issue": "old unread notification stranded outside latest50 inbox while global unread count includes it",
            "evidence": {
              "createdNotifications": 51,
              "defaultInboxSize": 50,
              "allVisibleOpened": true,
              "visibleUnreadAfter": 0,
              "globalUnreadAfter": 1,
              "oldestVisible": false,
              "repositoryControlLimit100Size": 51,
              "limits": "actual loader/action/repository/Postgres; fake session, no browser; view inspected separately"
            },
            "cause": "inbox limited50 irrespective readAt, no cursor/page/unread-only UI; opening rows does not remove them from newest50; count uses all unread rows",
            "limits": "actual loader/action/Pg and source view; no live browser. Bounded inbox is documented; mismatch with all-time unread count produces inaccessible remainder. A bounded history limit alone is not being classified as defect."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CURRENT_SOURCE_MECHANISM_RECONFIRMED",
          "currentContinuationReports": [
            "/workspace/work/audit/repo/work/audit-code-continuation/reads/review.json"
          ],
          "currentContinuationLimit": "Latest50 list vs all unread count confirmed in code; no claim old post is globally unfindable."
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "CORE-03",
      "memberIds": [
        "CORE-03"
      ],
      "kind": "application-code",
      "titleRu": "Отметка прочитанного может опередить фактически отданный снимок сообщений",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "CORE-03",
          "title": "mark-read target can include a concurrently committed post absent from delivered topic snapshot",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage4-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage4-final.json",
            "/workspace/work/audit-stage0/stage4-part2.json"
          ],
          "sourceStatus": "CONFIRMED_LOADER_MARK_READ_MISMATCH_BROWSER_FOLLOWUP",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "CORE-03",
            "priority": "P2",
            "status": "CONFIRMED_LOADER_MARK_READ_MISMATCH_BROWSER_FOLLOWUP",
            "locations": [
              "app/routes/topic.tsx:35",
              "app/routes/topic.tsx:92",
              "app/forum/views.tsx:2282"
            ],
            "issue": "mark-read target can include a concurrently committed post absent from delivered topic snapshot",
            "evidence": {
              "deliveredPostIds": [
                "topic-a-initial"
              ],
              "returnedLatestReadTarget": "zz-new",
              "targetInDeliveredPosts": false,
              "actualStateAfterViewEquivalentMark": {
                "topicId": "topic-a",
                "state": "read",
                "lastReadPostId": "zz-new",
                "firstUnreadPostId": null,
                "latestPostId": "zz-new"
              },
              "controlUsingDeliveredLatest": {
                "topicId": "topic-a",
                "state": "unread",
                "lastReadPostId": "topic-a-initial",
                "firstUnreadPostId": "zz-new",
                "latestPostId": "zz-new"
              },
              "limits": "actual loader/action/repository/Pg; controlled concurrent insertion; view effect modeled from source, no hydration/browser or subsequent revalidation tested"
            },
            "requirement": "PROJECT_STATE.md1067-1081: reply after rendered snapshot remains unread; marker advances only to latest delivered post",
            "cause": "independent readTopicPage and readTopicReadState queries; hydration effect uses latter latestPostId instead of delivered posts",
            "limits": "native actual loader/action/Pg with controlled insertion; effect request modeled from inspected source; browser hydration/subsequent revalidation and persistent user-visible impact pending stage11, no claim of permanent content loss"
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CURRENT_ACTUAL_LOADER_VIEW_ACTION_REPRODUCTION",
          "currentContinuationReports": [
            "/workspace/work/audit/repo/work/audit-code-continuation/reads/review.json"
          ],
          "currentContinuationLimit": "Controlled reader interleaving and writer gate; subsequent revalidation can deliver post, not permanent invisibility."
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "DB-01",
      "memberIds": [
        "DB-01"
      ],
      "kind": "application-code",
      "titleRu": "CHECK допускает неполные NULL-комбинации метаданных состояния allowance",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "DB-01",
          "title": "Allowance shape CHECK accepts partial NULL occurrence/state metadata",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage9-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage9-final.json",
            "/workspace/work/audit-stage0/stage9-part2.json"
          ],
          "sourceStatus": null,
          "sourcePriority": "P3",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "DB-01",
            "priority": "P3",
            "title": "Allowance shape CHECK accepts partial NULL occurrence/state metadata",
            "locations": [
              "db/schema.ts:288",
              "db/schema.ts:302",
              "drizzle/0019_content_provider_allowance_admission.sql:43"
            ],
            "cause": "Nullable allowance generation/attempt/state used in equality without explicit non-NULL guard; a nonempty allowance OR branch can evaluate UNKNOWN, accepted by PostgreSQL CHECK.",
            "observed": "12negative SQL variants durably accepted, though occurrence identity is incomplete; definite non-NULL mismatch rejected23514.",
            "impact": "Database integrity defense does not enforce declared all-empty-or-complete allowance envelope.",
            "bounds": "Current normal store writes complete envelope. Direct claim refuses malformed rows; allowance acquisition replaces malformed state with new valid leasing occurrence. No user-path corruption, quota bypass, provider execution, persistent outage or production incidence established.",
            "fixed": false
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "DB-02",
      "memberIds": [
        "DB-02"
      ],
      "kind": "application-code",
      "titleRu": "Верификатор схемы пропускает изменение предиката частичного индекса",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "DB-02",
          "title": "Schema manifest verifier omits partial index predicate and falsely accepts integrity-breaking index drift",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage9-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage9-final.json",
            "/workspace/work/audit-stage0/stage9-part3.json"
          ],
          "sourceStatus": null,
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "DB-02",
            "priority": "P2",
            "title": "Schema manifest verifier omits partial index predicate and falsely accepts integrity-breaking index drift",
            "locations": [
              ".github/scripts/production-schema-manifest.mjs:99",
              ".github/scripts/production-schema-manifest.mjs:218"
            ],
            "cause": "Index snapshot selects name,unique,method,key columns/order/nulls but omits pg_index.indpred. Expected JSON has same limited representation,so deepEqual cannot detect a changed WHERE predicate.",
            "observed": "In disposable DB replaced forum_help_duplicate_relationships_active_duplicate_idx WHERE removed_at IS NULL with WHERE false,keeping name/columns/uniqueness/method. Both exported reader/assertion and actual verify-production-schema-manifest.mjs CLI returned parity success(exit0). Two active relationships for the same duplicate topic with distinct originals then coexist; baseline index rejects second insert23505.",
            "controls": "Dropped index/changed uniqueness/key column detected; clean/restored schema passes.",
            "impact": "Repository schema verification can certify a schema that no longer enforces one active duplicate relationship per topic.",
            "bounds": "Current checked-in migration/snapshot index predicate is correct. No actual production drift/incidence,external service change or normal user ability to alter indexes established. This finding concerns the local verification tool,not a broken index on current clean schema.",
            "evidence": "stage9-part3-manifest-mutation-evidence.json",
            "fixed": false
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "DB-03",
      "memberIds": [
        "DB-03"
      ],
      "kind": "application-code",
      "titleRu": "Контракт прав web runtime не включает используемую таблицу отметок прочитанного",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "DB-03",
          "title": "Accepted web runtime capability omits forum_topic_read_states permissions required by current authenticated routes",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage9-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage9-final.json",
            "/workspace/work/audit-stage0/stage9-part4.json"
          ],
          "sourceStatus": null,
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "DB-03",
            "priority": "P2",
            "title": "Accepted web runtime capability omits forum_topic_read_states permissions required by current authenticated routes",
            "locations": [
              ".github/scripts/runtime-privileges.mjs:12",
              "db/forum-repository.ts:1200",
              "db/forum-repository.ts:1269",
              "db/forum-repository.ts:1325",
              "app/routes/topic.tsx:92",
              "app/routes/section.tsx:25",
              "app/routes/unread.tsx:21"
            ],
            "cause": "runtimeCapabilityContracts.web.relations has no forum_topic_read_states. Probe CLI grants/tests only listed relations,therefore accepts role missing SELECT/INSERT/UPDATE required by existing read-marker repository paths. Exact ACL assertion also rejects those necessary additional grants.",
            "observed": "Native role matching exact contract passesreader/assertion and builtCLI;three actual internal repository/capability read-marker operations fail42501. Actual ReactRouter authenticated topic/section/unread loaders500 and markTopicRead action503.",
            "control": "Guesttopic/section200;guestunread401. Grant SELECT/INSERT/UPDATEon forum_topic_read_states restores authenticated loaders200,mark-read action200,persistentmarker and subsequent state=read,while checker now rejects unexpected relation privileges. Otherpublic reads and new-topic publication under originalcontract succeed.",
            "impact": "Repository least-privilege contract is incompatible with implemented authenticated read/unread behavior;green ACL verification does not guarantee these normal flows work.",
            "bounds": "No production ACLs,service configuration,deployed routes,realcredentials or browser login inspected. Impact established for a localrole built exactly from checked-in contract. Authentication identity injected;normal forum reader/writer/route functions and PG grants real.",
            "fixed": false,
            "evidence": "stage9-part4-native-evidence.json"
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "DOC-01",
      "memberIds": [
        "DOC-01"
      ],
      "kind": "documentation",
      "titleRu": "Текущие статусы и остаточные задачи в документации устарели",
      "priority": "DOCUMENTATION",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "DOC-01",
          "title": "stale current status/remaining-work statements",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage1-part2.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage1-part2.json",
            "/workspace/work/audit-stage0/stage1-part3.json"
          ],
          "sourceStatus": null,
          "sourcePriority": null,
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "DOC-01",
            "kind": "documentation-current-state-staleness",
            "evidence": [
              "PROJECT_STATE.md:209",
              "#215 merged: c098912",
              "PROJECT_STATE.md:216",
              "#227 merged: 0fc92f9",
              "PROJECT_STATE.md:1516",
              "PROJECT_STATE.md:1063",
              "PROJECT_STATE.md:1360",
              "PROJECT_STATE.md:1923",
              "PROJECT_STATE.md:25"
            ],
            "impact": "current-status and next-step statements conflict with current baseline and same-file updates",
            "implementationDefect": false
          },
          "registerLayer": "LEGACY_DOCUMENTATION_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "DOC-02",
      "memberIds": [
        "DOC-02"
      ],
      "kind": "documentation",
      "titleRu": "Документация отстаёт от фактического номера последней миграции",
      "priority": "DOCUMENTATION",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "DOC-02",
          "title": "repository migration range 0043 vs 0044",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage1-part2.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage1-part2.json"
          ],
          "sourceStatus": null,
          "sourcePriority": null,
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "DOC-02",
            "kind": "documentation-migration-range",
            "evidence": [
              "PROJECT_STATE.md:1568",
              "drizzle/meta/_journal.json: last idx44 tag0044, total45",
              "drizzle/0044_attachment_draft_conflict_boundaries.sql"
            ],
            "impact": "repository migration range understates current baseline",
            "implementationDefect": false
          },
          "registerLayer": "LEGACY_DOCUMENTATION_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "DOC-03",
      "memberIds": [
        "DOC-03"
      ],
      "kind": "documentation",
      "titleRu": "Документация противоречиво определяет видимость отметки Disputed",
      "priority": "DOCUMENTATION",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "DOC-03",
          "title": "Disputed visibility contradictory guidance",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage1-part3.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage1-part3.json"
          ],
          "sourceStatus": "confirmed-documentation-inconsistency",
          "sourcePriority": null,
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "DOC-03",
            "status": "confirmed-documentation-inconsistency",
            "evidence": [
              "docs/UI_UX_PASS.md:439 public Disputed marker",
              "docs/UI_UX_PASS.md:442 moderator-only Disputed in both lists/topic",
              "PROJECT_STATE.md:1253 moderator-only Disputed"
            ],
            "impact": "conflicting visibility guidance can lead to incorrect future UI/privacy changes",
            "implementationDefect": false
          },
          "registerLayer": "LEGACY_DOCUMENTATION_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "DOC-04",
      "memberIds": [
        "DOC-04"
      ],
      "kind": "documentation",
      "titleRu": "Доступ к истории описан через роль и через effective permission противоречиво",
      "priority": "DOCUMENTATION",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "DOC-04",
          "title": "post history role-only vs effective-permission guidance",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage1-part4.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage1-part4.json"
          ],
          "sourceStatus": "confirmed-documentation-inconsistency",
          "sourcePriority": null,
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "DOC-04",
            "status": "confirmed-documentation-inconsistency",
            "evidence": [
              "docs/EDITOR.md:285-287",
              "docs/auth/AUTHORIZATION.md:51",
              "docs/auth/AUTHORIZATION.md:130-149"
            ],
            "impact": "role-based history restriction conflicts with dynamic effective-permission contract; grant/revoke acceptance differs",
            "implementationDefect": false
          },
          "registerLayer": "LEGACY_DOCUMENTATION_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "EDITOR-01",
      "memberIds": [
        "EDITOR-01"
      ],
      "kind": "application-code",
      "titleRu": "Нормализация HTML-вставки схлопывает пустые строки внутри программного кода",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-01",
          "title": "HTML clipboard normalization collapses code interior newlines",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part1-reproductions.json",
            "/workspace/work/audit-stage0/stage6-part1.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_REPRO_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "status": "CONFIRMED_COMPONENT_REPRO_UNFIXED",
            "limits": "Actual React components/helpers/FormData/public renderer in jsdom with synthetic clipboard events. No browser/OS clipboard/IDE/Sheets integration or native publication request executed. Production occurrence not measured.",
            "id": "EDITOR-01",
            "priority": "P2",
            "location": "app/forum/clipboard-markdown.ts:98",
            "issue": "HTML clipboard normalization collapses code interior newlines",
            "requirement": "docs/EDITOR.md §§3.1,10: preserve exact code indentation/newlines on IDE/GitHub paste.",
            "reproduction": "Simple editor paste receives text/plain plus <pre><code>first();\\n\\n\\n\\nsecond();</code></pre>.",
            "observed": "Submitted source is ```\\nfirst();\\n\\nsecond();\\n```; parsed code lost2 newlines; no warning.",
            "cause": "Global newline-run replacement runs over the fully converted source, including fenced preformatted content.",
            "control": "Unconverted Markdown with the same code payload retains all4 interior newlines when parsed."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "EDITOR-02",
      "memberIds": [
        "EDITOR-02"
      ],
      "kind": "application-code",
      "titleRu": "Обычный текст ячеек таблицы превращается в Markdown-форматирование и ссылки",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-02",
          "title": "Spreadsheet plain cell text becomes Markdown formatting and links",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part1-reproductions.json",
            "/workspace/work/audit-stage0/stage6-part1.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_REPRO_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "status": "CONFIRMED_COMPONENT_REPRO_UNFIXED",
            "limits": "Actual React components/helpers/FormData/public renderer in jsdom with synthetic clipboard events. No browser/OS clipboard/IDE/Sheets integration or native publication request executed. Production occurrence not measured.",
            "id": "EDITOR-02",
            "priority": "P2",
            "location": "app/forum/technical-markdown.ts:208-216; app/forum/clipboard-markdown.ts:44-56",
            "issue": "Spreadsheet plain cell text becomes Markdown formatting and links",
            "requirement": "docs/EDITOR.md §§3.3,10: preserve spreadsheet rows/columns/cell text or use explicit safe fallback.",
            "reproduction": "TSV or HTML table cells contain literal **literal** and [shown](https://example.com).",
            "observed": "Actual Simple paste stores unescaped Markdown cell text. Public ForumMarkdown shows literal in strong and shown as a link; original cell punctuation no longer visible, no warning.",
            "cause": "Cell serializer escapes only backslashes/pipes/newlines; literal Markdown punctuation is then interpreted by table ReactMarkdown renderer.",
            "controls": "Existing ordinary numeric/simple text tables and escaped pipe tests pass. Both HTML helper and TSV helper reproduce; actual component path uses TSV when tabbed plain flavor present."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "EDITOR-03",
      "memberIds": [
        "EDITOR-03"
      ],
      "kind": "application-code",
      "titleRu": "Очистка форматирования части жирного текста повреждает невыделенный суффикс",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-03",
          "title": "Partial clear formatting breaks unselected bold suffix at whitespace boundary",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part1-reproductions.json",
            "/workspace/work/audit-stage0/stage6-part1.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_REPRO_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "status": "CONFIRMED_COMPONENT_REPRO_UNFIXED",
            "limits": "Actual React components/helpers/FormData/public renderer in jsdom with synthetic clipboard events. No browser/OS clipboard/IDE/Sheets integration or native publication request executed. Production occurrence not measured.",
            "id": "EDITOR-03",
            "priority": "P2",
            "location": "app/forum/editor-document.ts:432-437",
            "issue": "Partial clear formatting breaks unselected bold suffix at whitespace boundary",
            "requirement": "docs/EDITOR.md §3: clear formatting applies to selected content; source helper contract explicitly preserves unselected style.",
            "reproduction": "Advanced editor source **alpha beta**; select source[2:7] (alpha) and click Clear formatting.",
            "observed": "Actual submitted source alpha** beta**; public renderer shows literal delimiter characters, no strong node for unselected beta.",
            "cause": "Reopening ** inserted before leading whitespace of unselected suffix; delimiter fails CommonMark flanking rules.",
            "controls": "Whole-range and middle-of-word clear cases pass existing tests. Actual Undo restores exact **alpha beta** source."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "EDITOR-04",
      "memberIds": [
        "EDITOR-04"
      ],
      "kind": "application-code",
      "titleRu": "Отказ преобразования сложной таблицы молча заменяется обычным текстом",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-04",
          "title": "Declined spreadsheet conversion silently falls back to plain text",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part1-reproductions.json",
            "/workspace/work/audit-stage0/stage6-part1.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_REPRO_UNFIXED",
          "sourcePriority": "P3",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "status": "CONFIRMED_COMPONENT_REPRO_UNFIXED",
            "limits": "Actual React components/helpers/FormData/public renderer in jsdom with synthetic clipboard events. No browser/OS clipboard/IDE/Sheets integration or native publication request executed. Production occurrence not measured.",
            "id": "EDITOR-04",
            "priority": "P3",
            "location": "app/forum/markdown-editor.tsx:523-528",
            "issue": "Declined spreadsheet conversion silently falls back to plain text",
            "requirement": "docs/EDITOR.md §3.3: safe fallback with explicit warning when table cannot be converted without loss.",
            "reproduction": "Simple editor pastes quoted/multiline-cell TSV A\\tB\\n\"line one\\nline two\"\\t3; spreadsheetToMarkdown returns null.",
            "observed": "All input text is preserved, but no alert appears and user is not told conversion was declined.",
            "cause": "pasteSpreadsheet null branch replaces with plain Markdown then returns without setPasteWarning.",
            "impact": "Missing required conversion warning; no text loss in tested fallback case."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "EDITOR-05",
      "memberIds": [
        "EDITOR-05"
      ],
      "kind": "application-code",
      "titleRu": "Find next не переносит выделение при уже открытом режиме записи",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-05",
          "title": "Find next does not apply selection when editor is already in write mode",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part2-reproductions.json",
            "/workspace/work/audit-stage0/stage6-part2.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "EDITOR-05",
            "priority": "P2",
            "status": "CONFIRMED_COMPONENT_UNFIXED",
            "location": "app/forum/markdown-editor.tsx:630-641",
            "issue": "Find next does not apply selection when editor is already in write mode",
            "repro": "Advanced source before one after one; caret0; open Find and replace, Find=one, click Find next.",
            "observed": "Selection stays[0,0], textarea not focused; source unchanged. Preview→Find next selects[7,10] correctly, then subsequent Find next again stays[7,10] instead of next match.",
            "cause": "findNext updates pendingSelectionRef and sets mode to write, but selection layout effect depends only on mode/value/authoringMode. Same-mode no-content operation does not execute effect.",
            "control": "Preview-to-write transition applies the pending range and focus.",
            "limits": "Actual MarkdownEditor/ForumMarkdown components in jsdom with synthetic selection/key events and userEvent button clicks. No real browser/native IME/layout/mobile/HTTP publication or production frequency measured."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "EDITOR-06",
      "memberIds": [
        "EDITOR-06"
      ],
      "kind": "application-code",
      "titleRu": "Enter внутри форматированного текста в Простом режиме повреждает разделители",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-06",
          "title": "Simple Enter inside formatted text breaks existing inline delimiters",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part2-reproductions.json",
            "/workspace/work/audit-stage0/stage6-part2.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [
            "/workspace/work/audit-resumed/part3.md"
          ],
          "currentStatus": "RECONFIRMED_WITH_EXPLICIT_BOUNDS",
          "originalRecord": {
            "id": "EDITOR-06",
            "priority": "P2",
            "status": "CONFIRMED_COMPONENT_UNFIXED",
            "location": "app/forum/markdown-editor.tsx:651-653; app/forum/visual-markdown-editor.tsx:354-367",
            "issue": "Simple Enter inside formatted text breaks existing inline delimiters",
            "repro": "Simple source **alpha beta**; native DOM caret after alpha, press Enter.",
            "observed": "FormData body becomes **alpha\\n\\n beta**. Public renderer has no strong node and exposes literal ** delimiters. Undo restores exact original.",
            "cause": "insertVisualParagraph inserts blank paragraph break directly into source without splitting/reopening enclosing inline formatting.",
            "relation": "Different action/root from EDITOR-03 partial clear formatting; same category of visible delimiter corruption, not duplicate reproduction.",
            "limits": "Actual MarkdownEditor/ForumMarkdown components in jsdom with synthetic selection/key events and userEvent button clicks. No real browser/native IME/layout/mobile/HTTP publication or production frequency measured."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "EDITOR-07",
      "memberIds": [
        "EDITOR-07"
      ],
      "kind": "application-code",
      "titleRu": "Отступ захватывает исключённую конечную строку и может повредить закрывающий fence",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-07",
          "title": "Code indentation includes exclusive end line and can invalidate closing fence",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part2-reproductions.json",
            "/workspace/work/audit-stage0/stage6-part2.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "EDITOR-07",
            "priority": "P2",
            "status": "CONFIRMED_COMPONENT_UNFIXED",
            "location": "app/forum/markdown-editor.tsx:570-583",
            "issue": "Code indentation includes exclusive end line and can invalidate closing fence",
            "repro": [
              "Advanced fenced code with three indented lines; selection starts first line and ends at start of third. Tab/Shift+Tab also changes the unselected third line.",
              "Fenced block closes with3 leading spaces, followed by After paragraph. Select code through start of closing line and pressTab."
            ],
            "observed": [
              "Both indent and outdent alter third line outside selection; Undo restores exact original.",
              "Closing fence gains2 spaces, becomes5-spaced, no longer closes code; public parser now returns one code node containing trailing After instead of code+paragraph."
            ],
            "cause": "codeKey computes next newline from exclusive selection end without subtracting boundary newline; split includes final empty line and prefixes it, moving the unselected closing fence.",
            "controls": "Existing single-line code/prose restriction tests pass; original fixture parses as code+paragraph.",
            "limits": "Actual MarkdownEditor/ForumMarkdown components in jsdom with synthetic selection/key events and userEvent button clicks. No real browser/native IME/layout/mobile/HTTP publication or production frequency measured."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "EDITOR-08",
      "memberIds": [
        "EDITOR-08",
        "RES-EDITOR-01"
      ],
      "kind": "application-code",
      "titleRu": "Заблокированный редактор допускает изменение через Find/Replace или вставку",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-08",
          "title": "Open find/replace controls can mutate a disabled editor buffer",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part2-reproductions.json",
            "/workspace/work/audit-stage0/stage6-part2.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_UNFIXED",
          "sourcePriority": "P3",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "EDITOR-08",
            "priority": "P3",
            "status": "CONFIRMED_COMPONENT_UNFIXED",
            "location": "app/forum/markdown-editor.tsx:1045-1051; replaceAllMatches at644-647",
            "issue": "Open find/replace controls can mutate a disabled editor buffer",
            "repro": "Advanced source one two; open find panel, enter Find=one, replacement=changed; rerender component disabled=true; click enabled Replace all.",
            "observed": "Source textarea is disabled, but Replace all remains enabled and changes buffer to changed two.",
            "cause": "Find panel inputs/buttons do not honor disabled and replaceAllMatches has no disabled guard.",
            "limits": "Actual MarkdownEditor/ForumMarkdown components in jsdom with synthetic selection/key events and userEvent button clicks. No real browser/native IME/layout/mobile/HTTP publication or production frequency measured. Real HTTP submission/race-related text loss was not tested; do not claim a publication bypass or persisted unauthorized mutation."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        },
        {
          "id": "RES-EDITOR-01",
          "status": "CONFIRMED_COMPONENT_AND_ROUTER_SUBMITTING_UI_DEFECT",
          "title": "Simple editor clipboard paste mutates controlled Markdown while disabled+publicationPending true",
          "severity": "Functional disabled-state defect; no elevated security severity or persisted data loss established",
          "cases": [
            {
              "name": "disabled simple retains body",
              "afterPaste": "Alpha betaPASTED",
              "events": [
                {
                  "type": "paste",
                  "trusted": true,
                  "target": "SPAN",
                  "locked": "true",
                  "contentEditable": "false"
                }
              ]
            },
            {
              "name": "disabled simple blocks pasted HTML",
              "afterPaste": "Alpha beta**BOLD**",
              "events": [
                {
                  "type": "paste",
                  "trusted": true,
                  "target": "SPAN",
                  "locked": "true",
                  "contentEditable": "false"
                }
              ]
            }
          ],
          "cause": [
            "Visual editor paste handler lacks disabled check.",
            "Parent replaceSourceRange updates history/value without disabled check."
          ],
          "limits": [
            "Actual SectionView/MarkdownEditor/React Router submitting confirmed with a fake delayed action; no real backend, session, permission or DB.",
            "No successful publication/persisted data loss established; late input retained after tested429.",
            "Other loading/revalidation/success/browser transitions not fully verified."
          ],
          "report": "/workspace/work/audit-resumed/part2.md",
          "evidence": "/workspace/work/audit/repo/work/audit-resumed-part2/evidence.json",
          "initialVerificationLimits": [
            "Actual props toggled by audit harness, not actual React Router submitting/loading transition.",
            "No publication, database write, session or permissions bypass demonstrated."
          ],
          "routerFollowup": {
            "part": 6,
            "report": "/workspace/work/audit-resumed/part6.md",
            "evidence": "/workspace/work/audit/repo/work/audit-resumed-part6/submitting-paste-evidence.json",
            "requestCapturedBody": "Body kept",
            "uiBodyDuringSubmitting": "Body keptLATE",
            "after429": "Body keptLATE",
            "deduplication": "Same finding, stronger parent/router evidence; not new issue."
          },
          "registerLayer": "OWN_RESUMED_FINDING",
          "attribution": "Own recorded resumed execution; not a blind independent audit after exposure to prior findings."
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE",
      "deduplicationReason": "Both Replace all and Simple paste call replaceSourceRange without disabled guard. Preserve two trigger-specific proofs as one disabled-buffer mutation family, not two independent groups."
    },
    {
      "id": "EDITOR-09",
      "memberIds": [
        "EDITOR-09"
      ],
      "kind": "application-code",
      "titleRu": "Выделение получателей упоминаний расходится с отображением таблиц и спойлеров",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-09",
          "title": "Mention recipient parser disagrees with actual rendered spoiler/table semantics and persists false mention notifications",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part3-reproductions.json",
            "/workspace/work/audit-stage0/stage6-part3.json"
          ],
          "sourceStatus": "CONFIRMED_NATIVE_AND_COMPONENT_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "EDITOR-09",
            "priority": "P2",
            "status": "CONFIRMED_NATIVE_AND_COMPONENT_UNFIXED",
            "location": "app/forum/mentions.ts:25-28; app/forum/markdown.tsx:355-395; db/forum-repository.ts:762-783",
            "issue": "Mention recipient parser disagrees with actual rendered spoiler/table semantics and persists false mention notifications",
            "requirement": "docs/EDITOR.md §7: recipients are profile mentions; quoted/code mentions must not notify. Internal publishedMentionRecipients contract states rendered profile links, not bare tokens/names.",
            "cause": "Recipient extraction uses plain CommonMark fromMarkdown over the whole source, while ForumMarkdown segments spoilers/tables and separately parses their body/cells. Plain metadata can become a link in extraction; a quote inside a rendered table cell is an ordinary paragraph link in whole-source parse.",
            "cases": [
              {
                "source": ":::spoiler [Meta](/en/users/recipient)\nBody\n:::",
                "render": "summary shows literal [Meta](/en/users/recipient); no anchor exists",
                "database": "recipient receives kind=mention after actual createTopicWithInitialPost commit"
              },
              {
                "source": "| A | B |\n| --- | --- |\n| > [Quoted](/en/users/recipient) | value |",
                "render": "profile anchor is inside a table-cell blockquote",
                "database": "recipient receives kind=mention despite quote exclusion requirement"
              }
            ],
            "evidenceFile": "stage6-part3-mention-semantics.json",
            "controls": "Ordinary blockquote and fenced-code sources produce no mention row; genuine repeated member link produces one row, self excluded. Existing edit/re-add/failed-CAS tests also pass.",
            "limits": "Actual transaction and localPostgreSQL17 with45 migrations; same exact strings independently checked with real ForumMarkdown component in jsdom. No live HTTP publication/browser/production frequency measured."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "EDITOR-10",
      "memberIds": [
        "EDITOR-10"
      ],
      "kind": "application-code",
      "titleRu": "HTML-сущности в имени участника декодируются и меняют подпись упоминания",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-10",
          "title": "Literal entity text in member display name is decoded in the mention label",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part3-reproductions.json",
            "/workspace/work/audit-stage0/stage6-part3.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_WITH_NATIVE_NAME_CONTROL_UNFIXED",
          "sourcePriority": "P3",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "EDITOR-10",
            "priority": "P3",
            "status": "CONFIRMED_COMPONENT_WITH_NATIVE_NAME_CONTROL_UNFIXED",
            "location": "app/forum/mentions.ts:17-20",
            "issue": "Literal entity text in member display name is decoded in the mention label",
            "repro": "Persisted member name A &copy; B; native candidate lookup returns exact name. mentionProfileLink serializes [A &copy; B](/en/users/recipient).",
            "observed": "Actual public ForumMarkdown label becomes A © B; account URL remains correct. Attributed quote serialization preserves literal A &copy; B as a positive escaping control.",
            "cause": "Mention serializer escapes Markdown delimiters but leaves ampersands, so Markdown entity decoding changes label text.",
            "limits": "Native stored-name/candidate control plus actual serializer/public renderer. Autocomplete suggestion click not executed end-to-end in this part; unchanged component chooseMention delegation was reviewed part2. No wrong-recipient/auth bypass claim."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "EDITOR-11",
      "memberIds": [
        "EDITOR-11"
      ],
      "kind": "application-code",
      "titleRu": "Публикация обрезает граничные пробелы Markdown и может превратить код в обычный текст",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "EDITOR-11",
          "title": "Initial publication trims Markdown boundary whitespace and changes indented code into prose",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage6-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage6-final.json",
            "/workspace/work/audit-stage0/stage6-part4.json"
          ],
          "sourceStatus": "CONFIRMED_NATIVE_ACTION_AND_RENDERER_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "EDITOR-11",
            "priority": "P2",
            "status": "CONFIRMED_NATIVE_ACTION_AND_RENDERER_UNFIXED",
            "location": "app/forum/actions.server.ts:161,503; shared helper app/forum/mutations.server.ts:70-72",
            "issue": "Initial publication trims Markdown boundary whitespace and changes indented code into prose",
            "source": "    const first = 1;\n    const second = 2;",
            "stored": "const first = 1;\r\n    const second = 2;",
            "cause": "sectionAction/topicAction read body through requiredFormText, whose returned value is trim(). Edit path reads raw form body instead. ForumService normalizeRevision validates without trimming.",
            "evidence": [
              "stage6-part4-publication-trim.json",
              "work/audit-stage6-part4/publication.test.ts",
              "work/audit-stage6-part4/render.test.tsx"
            ],
            "verified": "Actual editor FormData retains source; public renderer shows original as code and saved source as prose. Actual sectionAction/topicAction -> actual local adapter -> ForumService -> repository -> PostgreSQL persists altered source for topic and reply. Direct local writer control preserves source. Same-operation topic retry returns same Location.",
            "limits": "Help action line100 uses same helper but was not independently executed in this part. Multipart LF-to-CRLF normalization is separately expected transport behavior, not this defect. No live browser/production incidence measured."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "HELP-01",
      "memberIds": [
        "HELP-01"
      ],
      "kind": "application-code",
      "titleRu": "Старая форма решения апелляции может примениться к новой апелляции",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "HELP-01",
          "title": "Stale topic appeal form resolves replacement pending appeal without expected appeal identity",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage5-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage5-final.json",
            "/workspace/work/audit-stage0/stage5-part1-stale-appeal.json",
            "/workspace/work/audit-stage0/stage5-part1.json"
          ],
          "sourceStatus": "CONFIRMED_NATIVE_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "HELP-01",
            "priority": "P2",
            "status": "CONFIRMED_NATIVE_UNFIXED",
            "location": "app/forum/actions.server.ts:362-370; app/forum/views.tsx:2471-2477",
            "issue": "Stale topic appeal form resolves replacement pending appeal without expected appeal identity",
            "scenario": [
              "Moderator sees pending appeal A and its explanation on topic page.",
              "A is rejected by another completed moderation operation. Author submits new appeal B with different explanation.",
              "Submitting the original topic-page accept form returns302, accepts B and removes active duplicate relation."
            ],
            "evidence": {
              "topicActionStatus": 302,
              "oldAppealFinalStatus": "rejected",
              "replacementAppealFinalStatus": "accepted",
              "activeRelationRemoved": true,
              "queueExactOldIdControlStatus": 409,
              "queueControlLeavesReplacementPending": true,
              "runtime": "actual topic/attention actions, ForumService writer adapter and disposable local PostgreSQL17; session/current permission resolver supplied by controlled context",
              "test": "work/audit-stage5-part1/attention.test.ts: stale topic appeal form test"
            },
            "cause": "TopicView forms send only intent. Topic action omits expectedAppealId. Repository optional guard therefore selects whichever pending appeal is current under locks. Queue route passes exact expectedAppealId and rejects stale identity.",
            "limits": "Browser was not run; request payload follows actual rendered source. Native state transitions and HTTP action outcomes established. No unauthorized actor bypass; authorized moderation applies to an unseen replacement case.",
            "relatedPendingCheck": "Lifecycle timestamp behavior under transaction waits remains unverified, separate from this finding."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CURRENT_SOURCE_CHAIN_RECONFIRMED",
          "currentContinuationReports": [
            "/workspace/work/audit/repo/work/audit-code-continuation/permissions/review.json",
            "/workspace/work/audit/repo/work/audit-code-continuation/views/review.json"
          ],
          "currentContinuationLimit": "Topic forms omit expected appeal identity; queue forms have caseId. Earlier native race proof retained."
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "HELP-02",
      "memberIds": [
        "HELP-02"
      ],
      "kind": "application-code",
      "titleRu": "Время начала транзакции может нарушить CHECK при снятии дубликата",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "HELP-02",
          "title": "removeHelpDuplicate uses transaction-start now() for terminal timestamps, causing23514 and action503 when the selected active relationship or its pending appeal was created after this transaction began.",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage5-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage5-final.json",
            "/workspace/work/audit-stage0/stage5-part2-finding.json",
            "/workspace/work/audit-stage0/stage5-part2.json"
          ],
          "sourceStatus": "CONFIRMED_NATIVE_CONTROLLED_INTERLEAVING_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "HELP-02",
            "priority": "P2",
            "status": "CONFIRMED_NATIVE_CONTROLLED_INTERLEAVING_UNFIXED",
            "location": "db/forum-repository.ts:3384-3393",
            "issue": "removeHelpDuplicate uses transaction-start now() for terminal timestamps, causing23514 and action503 when the selected active relationship or its pending appeal was created after this transaction began.",
            "cause": "PostgreSQL now() stays at transaction start; READ COMMITTED later statements can observe committed records created afterwards. Removal/appeal lifecycle checks require terminal time >= creation/confirmation time.",
            "evidenceFile": "stage5-part2-timestamps.json",
            "reproduction": "Actual topic action, writer adapter, service/repository and PostgreSQL17. Pause delivery of completed BEGIN, then commit appeal creation or relationship confirmation in a different connection, resume removal. Actual DB timestamps; SQL confirms created_at/confirmed_at > transaction_timestamp.",
            "observed": {
              "laterAppeal": {
                "actionStatus": 503,
                "pgCode": "23514",
                "constraint": "forum_help_duplicate_appeals_lifecycle_check",
                "rollbackPreservesActiveRelationAndPendingAppeal": true
              },
              "laterRelationship": {
                "actionStatus": 503,
                "pgCode": "23514",
                "constraint": "forum_help_duplicate_relationships_removal_check",
                "rollbackPreservesActiveRelation": true
              }
            },
            "controls": {
              "normalFreshRetryStatus": 302,
              "sameInterleavingClientOnlyStatementClockStatus": 302
            },
            "limits": [
              "Schedule deliberately forced after BEGIN; no production frequency established.",
              "No real row-lock wait used in this timestamp reproduction; concurrency tests separately use real concurrent connections.",
              "Diagnostic query rewrite changes now() to statement_timestamp() only in one client, not application source; not a delivered fix.",
              "resolveHelpDuplicateAppeal has a similar now() site but was not separately reproduced as part of this finding.",
              "ARCH-01 generic catch contributes to503, not counted again."
            ],
            "impact": "Authorized removal returns spurious503 and must be retried; transaction rolls back, no partial removal or appeal resolution persisted."
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CURRENT_SOURCE_MECHANISM_CHECKED_PRIOR_NATIVE_PROOF_RETAINED",
          "currentContinuationReports": [
            "/workspace/work/audit/repo/work/audit-code-continuation/permissions/review.json"
          ],
          "currentContinuationLimit": "Transaction-start now race remains; no new native race run."
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "LOC-01",
      "memberIds": [
        "LOC-01"
      ],
      "kind": "application-code",
      "titleRu": "Транспортная ошибка после COMMIT пропускает сверку результата записи локали",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "LOC-01",
          "title": "Controlled locale writer skips reconciliation for transport failures after COMMIT",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage8-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage8-final.json",
            "/workspace/work/audit-stage0/stage8-part1.json"
          ],
          "sourceStatus": "CONFIRMED_LOCAL_PG_COMMIT_ACK_INJECTION_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "LOC-01",
            "priority": "P2",
            "status": "CONFIRMED_LOCAL_PG_COMMIT_ACK_INJECTION_UNFIXED",
            "issue": "Controlled locale writer skips reconciliation for transport failures after COMMIT",
            "location": "db/locale-repository.ts:153-156",
            "requirement": "docs/translation/LOCALES.md Controlled lifecycle writes: unknown COMMIT outcome must be reconciled using semantic pre-state, expected post-state and actual reloaded state; no blind retry.",
            "reproduction": "Actual local PostgreSQL COMMIT stores fr. A bounded query proxy then throws ECONNRESET, EPIPE or code-less Connection terminated unexpectedly. ControlledLocaleWriter propagates original error and never calls reconciliationRepository.readAll; independently read DB contains committed desired row. Exactly one transaction/COMMIT, no blind retry.",
            "cause": "isAmbiguousCommitError recognizes SQLSTATE08*/40003 and statement timeout, but omits transport failures already recognized by registry load classification.",
            "controls": [
              "Actual COMMIT followed by08007 performs reconciliation and resolves success for exact expected state, without retry.",
              "08007 with a subsequently committed third state yields AmbiguousCommitOutcomeError.",
              "Transport failure injected before COMMIT rolls back and leaves no row."
            ],
            "scope": "Existing controlled/test/admin registry writer. Runtime Worker registry capability is read-only; no current public locale-write endpoint or production frequency claim.",
            "evidence": [
              "stage8-part1-commit-evidence.json",
              "work/audit-stage8-part1/locale-writer.test.ts"
            ],
            "limits": "Actual disposable PostgreSQL17 with all45 SQL migrations; driver acknowledgement failure injected after real COMMIT, not a real network cut. No Neon/Hyperdrive service. No automatic duplicate writes or public mutation bypass established.",
            "originPart": 1
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "LOC-02",
      "memberIds": [
        "LOC-02"
      ],
      "kind": "application-code",
      "titleRu": "Неожиданная ошибка проверки compiled bundle может привести к удалению корректного bundle",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "LOC-02",
          "title": "Persisted bundle verifier converts unexpected runtime failures into integrity errors; reconciliation can delete a valid compiled bundle",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage8-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage8-final.json",
            "/workspace/work/audit-stage0/stage8-part2.json"
          ],
          "sourceStatus": "CONFIRMED_NATIVE_WITH_BOUNDED_HASH_FAILURE_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "LOC-02",
            "priority": "P2",
            "status": "CONFIRMED_NATIVE_WITH_BOUNDED_HASH_FAILURE_UNFIXED",
            "issue": "Persisted bundle verifier converts unexpected runtime failures into integrity errors; reconciliation can delete a valid compiled bundle",
            "location": "db/ui-translation-bundle-store.ts:149-176",
            "cause": "verifyPersistedCompiledBundle catches every exception, including TypeError from fingerprint/hash verification, and wraps PersistentBundleIntegrityError. Runtime store treats that as safe bundle miss; reconcilePersistedBundle treats it as proof to delete.",
            "reproductions": [
              "A valid French bundle is persisted and independently valid before fault injection. One crypto.subtle.digest rejection during actual reconciliation returns deleted and removes the compiled bundle row.",
              "One digest rejection after real DB connection and inside bundle verification is reported as invalid-bundle; actual resource-loader/runtime serves English heading while the valid French compiled bundle row remains."
            ],
            "controls": [
              "Healthy bundle returns current and serves French without raw-namespace read.",
              "Actual incompatible version is deleted as intended.",
              "Unknown SQL42501 query error remains visible and is not converted to deletion."
            ],
            "limits": "Local PostgreSQL17 and actual store/adapter/loader/runtime, hash error injected after successful connection. No production incidence claim, no raw translation deletion: affected persistent object is the compiled bundle.",
            "evidence": [
              "stage8-part2-bundle-evidence.json",
              "work/audit-stage8-part2/bundle-safety.test.ts"
            ],
            "originPart": 2
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "LOC-03",
      "memberIds": [
        "LOC-03"
      ],
      "kind": "application-code",
      "titleRu": "Параметризованный i18next nesting проходит мимо проверки разрешённых токенов",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "LOC-03",
          "title": "Unexpected parameterized i18next nesting bypasses controlled-token validation and is evaluated at render time",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage8-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage8-final.json",
            "/workspace/work/audit-stage0/stage8-part2.json",
            "/workspace/work/audit-stage0/stage8-part5.json"
          ],
          "sourceStatus": "CONFIRMED_VALIDATION_RAW_PG_COMPILED_RUNTIME_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "LOC-03",
            "priority": "P2",
            "status": "CONFIRMED_VALIDATION_RAW_PG_COMPILED_RUNTIME_UNFIXED",
            "issue": "Unexpected parameterized i18next nesting bypasses controlled-token validation and is evaluated at render time",
            "location": "app/localization/translation-validation.ts:134-140",
            "cause": "controlledTokens detects only $t(key) forms ending immediately after the key; valid i18next $t(key, JSON-options) syntax is omitted from token comparison.",
            "repro": "For canonical heading with no approved nesting, payload $t(common:stageSummary, {\"lng\":\"en\"}) passes validateProviderOutput. An approved machine fixture row in actual PostgreSQL is accepted by DatabaseMachineTranslationSource, compiled and persisted, then runtime heading becomes canonical English stageSummary text.",
            "controls": [
              "Simple foreign $t(common:stageSummary) is rejected with Controlled token mismatch.",
              "Ordinary French heading is preserved through bundle persistence."
            ],
            "limits": "Actual generation consumer/conditional publication path is not executed in this part; approved machine fixture is inserted directly. Actual shared validator, source, bundle compiler/store and i18next runtime executed. No XSS, code execution or private-data disclosure claim.",
            "evidence": [
              "stage8-part2-bundle-evidence.json",
              "work/audit-stage8-part2/bundle-safety.test.ts"
            ],
            "originPart": 2
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "LOC-04",
      "memberIds": [
        "LOC-04"
      ],
      "kind": "application-code",
      "titleRu": "При загрузке истории показывается сообщение о восстановлении вложений",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "LOC-04",
          "title": "Pending published-message history query displays attachment-restoration status in all three supported UI languages.",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage8-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage8-final.json",
            "/workspace/work/audit-stage0/stage8-part3.json"
          ],
          "sourceStatus": "CONFIRMED_COMPONENT_EN_RU_HE_UNFIXED",
          "sourcePriority": "P3",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "LOC-04",
            "priority": "P3",
            "status": "CONFIRMED_COMPONENT_EN_RU_HE_UNFIXED",
            "location": "app/forum/views.tsx:2861",
            "issue": "Pending published-message history query displays attachment-restoration status in all three supported UI languages.",
            "cause": "historyFetcher pending branch reuses t(editorAttachmentRestoring), whose canonical/manual values describe restoring saved attachments.",
            "reproduction": "Actual TopicView in real memory data router, actual localized resource loader/i18next; clicking Edit history sends readPostHistory/postId. Deferred action exposes wrong status; releasing action with revision data replaces status with correct history.",
            "observed": {
              "en": "Restoring saved attachments…",
              "ru": "Восстанавливаем сохранённые вложения…",
              "he": "משחזר קבצים מצורפים שמורים…"
            },
            "limits": "jsdom component test with bounded deferred route action, no real browser/server latency measurement; history response rendering works. No history authorization or data-loss claim.",
            "evidence": "work/audit-stage8-part3/history-label.test.tsx",
            "originPart": 3
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CURRENT_SOURCE_COPY_RECONFIRMED",
          "currentContinuationReports": [
            "/workspace/work/audit/repo/work/audit-code-continuation/views/review.json"
          ],
          "currentContinuationLimit": "History loading uses attachment-restoration label; old locale/component test retained. New history overflow has separate cause."
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "LOC-05",
      "memberIds": [
        "LOC-05"
      ],
      "kind": "application-code",
      "titleRu": "Быстрое переключение политики A–B–A может потерять нужное поколение задачи",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "LOC-05",
          "title": "Fresh A-B-A UI generation policy planning can lose needed work when original A is still pending, because known non-stale task is returned with superseded generation.",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage8-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage8-final.json",
            "/workspace/work/audit-stage0/stage8-part10.json",
            "/workspace/work/audit-stage0/stage8-part4.json",
            "/workspace/work/audit-stage0/stage8-part6.json",
            "/workspace/work/audit-stage0/stage8-part7.json"
          ],
          "sourceStatus": "CONFIRMED_NATIVE_PLANNER_DISPATCH_CONSUMER_EXECUTOR_RECONCILIATION_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "LOC-05",
            "priority": "P2",
            "status": "CONFIRMED_NATIVE_PLANNER_DISPATCH_CONSUMER_EXECUTOR_RECONCILIATION_UNFIXED",
            "location": "db/translation-task-store.ts:464",
            "issue": "Fresh A-B-A UI generation policy planning can lose needed work when original A is still pending, because known non-stale task is returned with superseded generation.",
            "cause": "upsertPending returns an existing row immediately whenever status is not stale; it does not record returning fresh planning occurrence as a new generation when existing A is pending and head already belongs to B.",
            "reproduction": "Actual UiTranslationService.planAndDispatch with current registered inactive fr and real canonical heading, local fixture suppressing unrelated units, actual persistent dispatcher/Drizzle store/PostgreSQL: policy-a -> policy-b -> policy-a while first A pending returns generations1,2,1. Actual executor at current policy-a drains A/B/A as stale generation-superseded, stale policy-changed, terminal. Zero provider calls/translation rows; both tasks stale and no recovery candidates remain.",
            "controls": [
              "Same returning A plan after original A has already become stale receives generation3 and consumer is eligible.",
              "Another fresh A plan after failed lifecycle drain also reactivates same id with generation3.",
              "Duplicate live claim metadata preserved; delayed old processing and completed identities cannot regain current publication rights in existing native controls."
            ],
            "expectedContract": "PROVIDERS_AND_JOBS.md requires eligible returning fresh A-B-A plan to receive a newer authoritative ordering position, while old delivery alone cannot move head.",
            "limits": "Internal foundation path, actual local PostgreSQL17 and all45 migrations; no production incidence, real Queue/service or provider behavior claim. Demonstrated with generation policy returning A, not by editing source files. Recovery requires an additional later fresh plan once A has become stale; identity is not permanently forbidden. No stale result publication demonstrated.",
            "evidence": [
              "stage8-part4-lifecycle-evidence.json",
              "work/audit-stage8-part4/lifecycle.test.ts"
            ],
            "originPart": 4
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "LOC-06",
      "memberIds": [
        "LOC-06"
      ],
      "kind": "application-code",
      "titleRu": "Запрос генерации для сообщения только с вложением завершается ошибкой 500",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "LOC-06",
          "title": "Enabled generation POST for valid attachment-only current post throws and becomes HTTP500 instead of original-safe no-work outcome.",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage8-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage8-final.json",
            "/workspace/work/audit-stage0/stage8-part7.json"
          ],
          "sourceStatus": "CONFIRMED_NATIVE_FORUM_READ_ACTION_CAPABILITY_PLANNER_FRAMEWORK_HTTP500_UNFIXED",
          "sourcePriority": "P3",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "LOC-06",
            "priority": "P3",
            "status": "CONFIRMED_NATIVE_FORUM_READ_ACTION_CAPABILITY_PLANNER_FRAMEWORK_HTTP500_UNFIXED",
            "location": "app/localization/content-post-body-planning.ts:137; app/forum/actions.server.ts:264",
            "issue": "Enabled generation POST for valid attachment-only current post throws and becomes HTTP500 instead of original-safe no-work outcome.",
            "cause": "Topic action permits existing attachment-only postId and passes empty authoritative body to automatic/explicit capability. Planner calls source resolver before any empty-unit guard. Resolver normalizeRevision rejects blank originalContent; action only catches planning-availability error, so React Router static handler returns500.",
            "reproduction": "All45 migrations; current native post body empty with linked type-checked attachment metadata. Actual DrizzleForumRepository.readTopicPage -> actual topicAction -> DefaultContentGenerationActionCapability -> real planner/resolver -> actual React Router createStaticHandler.query. Both generatePostBodyTranslation and generateExplicitPostBodyTranslation return static statusCode500 with original content must be a non-blank string. No task/budget mutation.",
            "controls": [
              "Same framework route with ordinary nonempty prose returns202 queued.",
              "Same framework route with nonempty fenced-code-only body returns200 no-op/no-translatable-content and no task/budget.",
              "Current message/revision unchanged by failed generation request."
            ],
            "limits": "Local enabled generation runtime with injected authorized actor capability; actual native forum read/action/planner/framework executed. Physical attachment object/service not accessed, metadata fixture sufficient for route. Default Worker generation is disabled and normal loader omits controls for attachment-only posts. No live server/production incidence, data loss, auth bypass or budget-loss claim.",
            "evidence": [
              "stage8-part7-body-planning-evidence.json",
              "work/audit-stage8-part7/body-planning.test.ts"
            ],
            "originPart": 7
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "LOC-07",
      "memberIds": [
        "LOC-07"
      ],
      "kind": "application-code",
      "titleRu": "Защита перевода не охватывает структуру собственных таблиц и спойлеров",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "LOC-07",
          "title": "Protected translation does not protect custom forum tables/spoilers: provider can remove or introduce structures and result is accepted as current translation.",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage8-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage8-final.json",
            "/workspace/work/audit-stage0/stage8-part8.json",
            "/workspace/work/audit-stage0/stage8-part9.json"
          ],
          "sourceStatus": "CONFIRMED_INTERNAL_EXECUTOR_PUBLICATION_READ_RENDER_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "LOC-07",
            "priority": "P2",
            "status": "CONFIRMED_INTERNAL_EXECUTOR_PUBLICATION_READ_RENDER_UNFIXED",
            "location": "app/localization/content-markdown-translation.ts:98,147,199; app/forum/markdown.tsx:378",
            "issue": "Protected translation does not protect custom forum tables/spoilers: provider can remove or introduce structures and result is accepted as current translation.",
            "cause": "Protection uses CommonMark+strikethrough AST, treating custom table/spoiler markup as text. Renderer independently segments custom structures before CommonMark. Structure signature erases translated text, thus cannot observe changes to custom markup.",
            "reproduction": "Ordinary prose provider output for valid source table/spoiler removes structures; plain source provider output containing valid table/spoiler creates structures. All4 cases consumer/executor/router/publisher returns published+ack, one fake publication, no failure, current ContentTranslationService selects translation, actual ForumMarkdown SSR changes table/details presence.",
            "controls": [
              "Both custom source structures survive identity restoration/rendering.",
              "Standard CommonMark block injection rejected and exact original preserved.",
              "No real provider/service, original revision unchanged."
            ],
            "limits": "Fake provider/task/persistence boundary, actual internal consumer/executor/publisher/read/SSR. No native DB publication in this part, browser layout or real-provider incidence. Spoiler is public presentation, no private-data disclosure or XSS claim. Default Worker generation disabled.",
            "evidence": [
              "stage8-part8-markdown-evidence.json",
              "work/audit-stage8-part8/pipeline.test.tsx"
            ],
            "originPart": 8
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "LOC-08",
      "memberIds": [
        "LOC-08"
      ],
      "kind": "application-code",
      "titleRu": "Перевод теряет явное направление абзаца либо ошибочно отклоняет экранированный текст",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "LOC-08",
          "title": "Translation restoration loses explicit paragraph/heading/list direction; escaped literal direction source can terminalize an intact valid translation.",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage8-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage8-final.json",
            "/workspace/work/audit-stage0/stage8-part8.json",
            "/workspace/work/audit-stage0/stage8-part9.json"
          ],
          "sourceStatus": "CONFIRMED_INTERNAL_EXECUTOR_PUBLICATION_READ_RENDER_UNFIXED",
          "sourcePriority": "P3",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "LOC-08",
            "priority": "P3",
            "status": "CONFIRMED_INTERNAL_EXECUTOR_PUBLICATION_READ_RENDER_UNFIXED",
            "location": "app/localization/content-markdown-translation.ts:128,196; app/markdown-syntax.ts:94,100",
            "issue": "Translation restoration loses explicit paragraph/heading/list direction; escaped literal direction source can terminalize an intact valid translation.",
            "cause": "parseForumMarkdown consumes raw direction token into data.hProperties; generic serializer emits no token. Canonical protected tree is built after metadata already lost, so final structural equality accepts loss. For escaped literal source, generic serializer removes escape and reparsing recognizes direction, causing protected-structure mismatch.",
            "reproduction": "Identity restored paragraph/heading/list rtl source renders auto. Actual pipeline Russian ltr source -> Hebrew prose preserving tokens publishes and current reader selects translated block dir auto. Escaped literal source marker with intact semantic translation terminates provider-output-invalid, no publication, original selected.",
            "controls": [
              "Normal provider text adding active direction is rejected as structural mismatch.",
              "Original revision/content remains intact."
            ],
            "limits": "SSR attributes and internal fake-provider/stores verified, actual visual bidi/browser effects not tested. No live provider/production incidence. P3 formatting/availability effect.",
            "evidence": [
              "stage8-part8-markdown-evidence.json",
              "work/audit-stage8-part8/validation.test.tsx",
              "work/audit-stage8-part8/pipeline.test.tsx"
            ],
            "originPart": 8
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "LOC-09",
      "memberIds": [
        "LOC-09"
      ],
      "kind": "application-code",
      "titleRu": "Отклонённый перевод с завершённой задачей старой политики застревает в converging",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "LOC-09",
          "title": "Rejected same-revision legacy translation with completed old-policy task gets stuck in converging presentation, suppressing both automatic and explicit recovery.",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage8-final.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage8-final.json",
            "/workspace/work/audit-stage0/stage8-part11.json"
          ],
          "sourceStatus": "CONFIRMED_NATIVE_LOADER_PLANNER_REPAIR_AND_DOM_CONTROLS_UNFIXED",
          "sourcePriority": "P2",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "LOC-09",
            "priority": "P2",
            "status": "CONFIRMED_NATIVE_LOADER_PLANNER_REPAIR_AND_DOM_CONTROLS_UNFIXED",
            "location": "app/localization/content-generation-view.ts:77; db/hyperdrive-content-generation-status.ts:185",
            "issue": "Rejected same-revision legacy translation with completed old-policy task gets stuck in converging presentation, suppressing both automatic and explicit recovery.",
            "cause": "Status reader maps current-generation completed task for matching revision irrespective of protected-policy version. View maps any completed+original pair to converging even when presentation fallbackReason invalid is persistent; automatic=false,explicitRequired=false. Manager only polls those units, so reads do not invoke repair planner.",
            "reproduction": "All45 migrations, immutable source quote Alice. Valid synthetic old-policy specification cnt04-commonmark-v1 inserted through actual planning store and marked completed; same-revision machine translation changing Alice->Mallory stored through actual translation store. Actual topic loader with native status/presentation and injected authorized actor selects original/invalid, unit converging/no-auto/no-explicit; repeat read unchanged. Current actual planner creates generation2 under cnt06-quote-attribution-v1; actual native executor repairs quote metadata and loader becomes translation/current.",
            "controls": [
              "Absent task/translation -> idle automatic=true.",
              "Valid stored translation with completed task ->current automatic=false.",
              "Current direct planner plus native execution repairs rejected legacy row.",
              "Actual DOM projection displays synchronization and no POST/button. Existing finite15poll control retained; no infinite request-loop claim."
            ],
            "limits": "Synthetic legacy rows built under current all45 schema/helpers and explicitly tagged old policy; not a byte-for-byte replay of historical provider runtime. Authorized actor/capability injected, current loader/native readers/planner/executor actual. Default Worker generation disabled. No production dataset/incidence or real provider/deployment checked. Browser controls bounded to queue fixture; full app browser still pending.",
            "evidence": [
              "stage8-part11-presentation-evidence.json",
              "work/audit-stage8-part11/presentation.test.tsx",
              "work/audit-stage8-part11/ui.test.tsx"
            ],
            "originPart": 11
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "SEC-01",
      "memberIds": [
        "SEC-01"
      ],
      "kind": "application-code",
      "titleRu": "Неожиданные ошибки профиля передают неопубликованный текст и SQL-параметры логгеру",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "SEC-01",
          "title": "Unexpected profile database errors send unpublished form text and SQL parameters to the default request logger",
          "layer": "LEGACY_RECORD_PRESERVED",
          "sourceRecord": "/workspace/work/audit-stage0/stage10-part2.json",
          "allSourceRecords": [
            "/workspace/work/audit-stage0/stage10-part2.json"
          ],
          "sourceStatus": null,
          "sourcePriority": "P3",
          "currentPriority": "NOT_AUTOMATICALLY_REAPPROVED",
          "attribution": "Earlier raw execution receipts unavailable; not reassigned wholesale to this agent or Misha. Own later verification is identified separately.",
          "currentVerificationReports": [],
          "currentStatus": "CARRIED_RECORD_NOT_NEWLY_REEXECUTED_IN_RESUMED_PARTS",
          "originalRecord": {
            "id": "SEC-01",
            "priority": "P3",
            "title": "Unexpected profile database errors send unpublished form text and SQL parameters to the default request logger",
            "locations": [
              "app/entry.server.tsx:1",
              "app/routes/profile.tsx:65",
              "workers/app.ts:23",
              "db/forum-repository.ts:520"
            ],
            "cause": "Entry module exports no request-level handleError. Current ReactRouter8.3.1 default handler console.error receives the raw error; DrizzleQueryError contains query/params. Profile action rethrows unexpected database errors,so its validated but uncommitted form fields reach that logger before SSR ErrorBoundary sanitation. reportSsrStreamError only covers after-shell stream errors.",
            "observed": "Real profile POST through production createRequestHandler,current profile module+root+SSR entry+ErrorBoundary and actual Drizzle/PostgreSQL45migrated DB. Injected temporary trigger raised23514 with fixed backend text containing no marker. Console.error received unpublished biography marker and SQL params. Stored biography stayed at prior baseline. Actual HTML500 ErrorBoundary rendered(data-status500),HTTPbody didnot contain marker.",
            "controls": [
              "Healthy save persisted then302 withno error log.",
              "Native150ms lock timeout mapped503 withoutdefaultrequestlogger call andwithout storedmutation.",
              "Validation400 andforeignOrigin403 producedno rawerrorlogs.",
              "Separate resource-route projection reproduced same logging independently from SSR."
            ],
            "impact": "Failure handling writes user-entered/unpublished form content into operational logs despite UI sanitation.",
            "bounds": "P3 privacy/logging exposure under unexpected DB failure,not public HTTP disclosure. No realcredentials/sessiontokens leaked/tested,no proof of access to logs by unauthorized people orproductionincident. Backend fault deliberately injected locally;sessionidentity injected,normal DB writer and actualdocument modules/SSR used. Handassembled server manifest,notdeployedWorker/full browser verification.",
            "fixed": false,
            "evidence": "stage10-part2-logging-evidence.json"
          },
          "registerLayer": "LEGACY_CODE_RECORD",
          "currentContinuationStatus": "CARRIED_EVIDENCE_SAME_BASELINE_NOT_NEW_EXECUTION",
          "currentContinuationReports": []
        }
      ],
      "attribution": "Legacy original authorship not reassigned; own later source/reproduction checks are named per record.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "RES-EDITOR-02",
      "memberIds": [
        "RES-EDITOR-02"
      ],
      "kind": "application-code",
      "titleRu": "Backspace в начале второго обычного абзаца не соединяет абзацы в Простом режиме",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "RES-EDITOR-02",
          "status": "CONFIRMED_COMPONENT_UI_DEFECT",
          "title": "Simple Backspace at start of ordinary second paragraph cannot remove paragraph boundary",
          "severity": "Limited editing/UI defect; no persisted loss or security severity established",
          "evidence": "/workspace/work/audit/repo/work/audit-resumed-part3/boundary-evidence.json",
          "report": "/workspace/work/audit-resumed/part3.md",
          "controls": "Caret offset0 verified; within-leaf deletion works; same source boundary removable in Advanced.",
          "limits": [
            "Isolated actual component Chromium harness; no publication/session/database.",
            "Other blocks/browsers and cross-block selection not covered."
          ],
          "registerLayer": "OWN_RESUMED_FINDING",
          "attribution": "Own recorded resumed execution; not a blind independent audit after exposure to prior findings."
        }
      ],
      "attribution": "Own recorded resumed execution; not a blind independent audit after exposure to prior findings.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "RES-UI-01",
      "memberIds": [
        "RES-UI-01"
      ],
      "kind": "application-code",
      "titleRu": "Меню дополнительных инструментов редактора расширяет страницу на 320 px",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "RES-UI-01",
          "status": "CONFIRMED_COMPONENT_PREVIEW_LAYOUT_DEFECT",
          "title": "Opening editor More tools at 320px creates page-wide horizontal overflow in English and Hebrew",
          "severity": "Responsive UI defect; controls extend beyond viewport. Inability to reach via horizontal scroll or WCAG conformance failure not established.",
          "evidence": "/workspace/work/audit/repo/work/audit-resumed-part7/diagnostic-evidence.json",
          "report": "/workspace/work/audit-resumed/part7.md",
          "reproduction": [
            "Local shared SectionView preview, section-form-error/user, viewport320x900.",
            "Open first .markdown-editor-extra-menu summary by ordinary click.",
            "Document width changes320 to410 for both en and he; visible menu buttons cross viewport boundaries."
          ],
          "cause": "Absolute popup anchored at inline-start of toolbar summary; width min(18rem,75vw) does not account for remaining viewport space. CSS app/styles.css:9288,9303.",
          "limits": [
            "One fixture and viewport in Chromium; no mobile device or publication tested.",
            "Closed-details descendants were geometric false positives and excluded.",
            "Distinct from known manager account-header overflow."
          ],
          "registerLayer": "OWN_RESUMED_FINDING",
          "attribution": "Own recorded resumed execution; not a blind independent audit after exposure to prior findings."
        }
      ],
      "attribution": "Own recorded resumed execution; not a blind independent audit after exposure to prior findings.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "RES-A11Y-01",
      "memberIds": [
        "RES-A11Y-01"
      ],
      "kind": "application-code",
      "titleRu": "Редактируемое текстовое поле Простого режима не имеет доступного имени",
      "priority": "P2",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "RES-A11Y-01",
          "status": "CONFIRMED_CHROMIUM_ACCESSIBLE_NAME_DEFECT",
          "title": "Simple editable textbox is exposed without an accessible name, including when reached by native Tab",
          "severity": "Accessibility/usability defect; no security severity or universal screen-reader verdict assigned",
          "report": "/workspace/work/audit-resumed/part14.md",
          "evidence": "/workspace/work/audit/repo/work/audit-resumed-part14/name-diagnostic.json",
          "matrixEvidence": "/workspace/work/audit/repo/work/audit-resumed-part14/browser-evidence.json",
          "reproduction": [
            "Shared editor-create-topic preview, English1280.",
            "Native Tab35 steps focuses span[role=textbox][contenteditable=true].",
            "Chromium AX focused textbox name is empty.",
            "Switch Advanced, click actual textarea: focused textbox name First message."
          ],
          "cause": "Visual Markdown editable leaf declares role=textbox but lacks aria-label/aria-labelledby or associated label. Label on ancestor section does not provide a name to this child textbox in observed AX tree.",
          "source": "app/forum/visual-markdown-editor.tsx:324",
          "limits": [
            "Unnamed textbox observed on six EN/HE fixture states; focused diagnostic only English create topic.",
            "Actual screen reader speech, other browsers, nonempty multi-paragraph variants and full WCAG conformance not tested.",
            "Outer visual section has a label, but that does not remove observed unnamed leaf; Advanced is positive control."
          ],
          "registerLayer": "OWN_RESUMED_FINDING",
          "attribution": "Own recorded resumed execution; not a blind independent audit after exposure to prior findings."
        }
      ],
      "attribution": "Own recorded resumed execution; not a blind independent audit after exposure to prior findings.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "CODE-PREVIEW-01",
      "memberIds": [
        "CODE-PREVIEW-01"
      ],
      "kind": "preview",
      "titleRu": "Сценарий подтверждения лучшего ответа открывается решённым и не показывает подтверждение",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "CODE-PREVIEW-01",
          "status": "CONFIRMED_PREVIEW_SCENARIO_DEFECT",
          "title": "Dedicated best-answer confirmation scenario routes to solved topic without author controls",
          "scope": "UI preview catalog; no claim of broken production topic decision or permission bypass",
          "source": "app/ui-preview/preview-app.tsx:1547",
          "cause": "Specific /:locale/topics/:topicId route uses PreviewTopicRoute, whose solved calculation omits topic-best-answer-unsolved and whose topicData call does not pass solutionAuthor. Correct special-case in previewElement cannot serve this matching route.",
          "observed": {
            "urlHasSolutionPrompt": true,
            "topicIsSolved": true,
            "canManageSolution": false,
            "isTopicAuthor": false,
            "confirmationPresent": false,
            "sameComponentIntendedPropsControlConfirmationPresent": true
          },
          "report": "/workspace/work/audit/repo/work/audit-code-continuation/styles-preview/review.md",
          "evidence": "/workspace/work/audit/repo/work/audit-code-continuation/styles-preview/scenario-evidence.json",
          "priority": "Preview/tooling correctness; no security severity assigned",
          "limits": [
            "jsdom actual router/component, props observed through forwarding wrapper.",
            "Positive control changes test props only; implementation unchanged.",
            "Other preview states not exhaustively exercised."
          ],
          "registerLayer": "OWN_CURRENT_CONTINUATION_FINDING",
          "attribution": "Own recorded continuation execution; not a blind independent audit after exposure to prior findings."
        }
      ],
      "attribution": "Own recorded continuation execution; not a blind independent audit after exposure to prior findings.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "CODE-PREVIEW-02",
      "memberIds": [
        "CODE-PREVIEW-02"
      ],
      "kind": "preview",
      "titleRu": "Вкладка Appeals (1) стенда показывает пустую очередь",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "CODE-PREVIEW-02",
          "status": "CONFIRMED_PREVIEW_FILTER_DEFECT",
          "title": "Appeals preview group shows count one but empty queue",
          "scope": "UI preview only; production queue not implicated",
          "source": "app/ui-preview/preview-app.tsx:1189",
          "cause": "Selected group appeals is compared directly with fixture kind appeal; no plural-group mapping.",
          "observed": {
            "appealsLabel": "Appeals (1)",
            "appealsCaseCount": 0,
            "duplicateControlCaseCount": 1
          },
          "report": "/workspace/work/audit/repo/work/audit-code-continuation/styles-preview/part2.md",
          "evidence": "/workspace/work/audit/repo/work/audit-code-continuation/styles-preview/appeals-evidence.json",
          "priority": "Preview/tooling correctness; no security severity assigned",
          "limits": [
            "Actual component/router in jsdom; no production or native-browser test."
          ],
          "registerLayer": "OWN_CURRENT_CONTINUATION_FINDING",
          "attribution": "Own recorded continuation execution; not a blind independent audit after exposure to prior findings."
        }
      ],
      "attribution": "Own recorded continuation execution; not a blind independent audit after exposure to prior findings.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "CODE-SEARCH-01",
      "memberIds": [
        "CODE-SEARCH-01"
      ],
      "kind": "application-code",
      "titleRu": "После возврата назад поле поиска не соответствует адресу и результатам",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "CODE-SEARCH-01",
          "status": "CONFIRMED_LOCAL_ROUTE_COMPONENT_DEFECT",
          "title": "Search query input remains at later value after back navigation to earlier results",
          "scope": "Application search UI",
          "source": "app/forum/views.tsx:457",
          "cause": "Uncontrolled input defaultValue changes with loaded query, but current dirty input value stays unchanged on reused route.",
          "observed": {
            "scope": "Actual search route loader and component; memory router back navigation and form submission, jsdom; fake search repository only.",
            "queries": [
              "alpha",
              "beta",
              "alpha",
              "beta"
            ],
            "afterBack": {
              "url": "/en/search?q=alpha",
              "visibleInput": "beta",
              "defaultValue": "alpha",
              "renderedResults": "Results for “alpha”1 resultResult for alphaStarted by AuthorCategory / Section1Messages"
            },
            "resubmitWithoutEditing": {
              "url": "/en/search?q=beta",
              "query": "beta"
            }
          },
          "priority": "Low — search interface correctness",
          "report": "/workspace/work/audit/repo/work/audit-code-continuation/views/review.md",
          "evidence": "/workspace/work/audit/repo/work/audit-code-continuation/views/search-navigation-evidence.json",
          "limits": [
            "jsdom and memory router; actual route loader/component, fixed fake search repository. Native browser history not separately replayed."
          ],
          "registerLayer": "OWN_CURRENT_CONTINUATION_FINDING",
          "attribution": "Own recorded continuation execution; not a blind independent audit after exposure to prior findings."
        }
      ],
      "attribution": "Own recorded continuation execution; not a blind independent audit after exposure to prior findings.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "CODE-HISTORY-01",
      "memberIds": [
        "CODE-HISTORY-01"
      ],
      "kind": "application-code",
      "titleRu": "История правок расширяет узкую страницу вместо локального размещения текста",
      "priority": "P3",
      "priorityMeaning": "P2 moderate, P3 low; existing source assessment retained where available, not evidence of deployed frequency. Documentation is separate.",
      "records": [
        {
          "id": "CODE-HISTORY-01",
          "status": "CONFIRMED_NATIVE_BROWSER_LAYOUT_DEFECT",
          "title": "Published revision history causes document overflow on narrow viewport",
          "scope": "Application post-history UI",
          "source": "app/forum/views.tsx:2872; app/styles.css:8081",
          "cause": "Raw revision pre retains white-space:pre and visible overflow; mobile display:contents/grid layout also leaves history at auto grid column.",
          "observed": [
            {
              "viewport": 320,
              "before": 320,
              "historyOpen": 789,
              "closedAgain": 320
            },
            {
              "viewport": 1280,
              "before": 1280,
              "historyOpen": 1280,
              "closedAgain": 1280
            }
          ],
          "priority": "Low — mobile history layout",
          "report": "/workspace/work/audit/repo/work/audit-code-continuation/styles/review.md",
          "evidence": "/workspace/work/audit/repo/work/audit-code-continuation/styles-preview/layout/evidence.json",
          "limits": [
            "Code review does not certify every possible viewport/content/theme/assistive technology combination.",
            "Native reproduction is EN/light with one ordinary 93-character source line, fixed local history response, no real history permission/database flow."
          ],
          "registerLayer": "OWN_CURRENT_CONTINUATION_FINDING",
          "attribution": "Own recorded continuation execution; not a blind independent audit after exposure to prior findings."
        }
      ],
      "attribution": "Own recorded continuation execution; not a blind independent audit after exposure to prior findings.",
      "currentStatus": "OPEN_UNFIXED_ON_AUDITED_BASELINE"
    },
    {
      "id": "M-M07",
      "memberIds": [
        "M-M07"
      ],
      "kind": "application-code",
      "titleRu": "Английская шапка менеджера переполняется при ширине 320 px",
      "priority": "P3",
      "currentStatus": "OPEN_UNFIXED_SELECTED_REPRODUCTION",
      "records": [
        {
          "id": "M-M07",
          "sourceSeverity": "Medium",
          "claim": "Manager-header переполняется на 320 px: около 75 px в English и 32 px в Hebrew.",
          "status": "PARTIALLY_CONFIRMED",
          "severityAssessment": "EN_OVERFLOW_CONFIRMED_ORIGINAL_METRICS_AND_HE_NOT_REPRODUCED",
          "verification": {
            "fact": "EN manager home fixture at320px documentWidth357; account content348/client302; screenshot shows clipped Sign out. HE320 has no reproduced overflow; at1280 neither document overflows.",
            "bounds": [
              "Original75pxEN/32pxHE not reproduced.",
              "Fresh built UI Preview fake identity/data; no production auth flow or exhaustive names/fonts/state matrix."
            ],
            "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/browser-evidence.json",
            "report": "/workspace/work/misha-verification/part7.md"
          }
        }
      ],
      "attribution": "Own verification of Misha statement; not claimed as blind independent discovery.",
      "claimScope": "EN manager 320px document 357px only; original Hebrew and original measurements not reproduced."
    },
    {
      "id": "M-M10",
      "memberIds": [
        "M-M10"
      ],
      "kind": "application-code",
      "titleRu": "У проверенного навигационного текста светлой темы недостаточный контраст",
      "priority": "P2",
      "currentStatus": "OPEN_UNFIXED_SELECTED_REPRODUCTION",
      "records": [
        {
          "id": "M-M10",
          "sourceSeverity": "Medium",
          "claim": "Light accent palette не соответствует WCAG AA для ряда текстов и controls.",
          "status": "CONFIRMED",
          "severityAssessment": "SELECTED_NORMAL_TEXT_WCAG_AA_CONTRAST_FAILURE",
          "verification": {
            "fact": "Rendered navigation label Unanswered and HE counterpart at1280 use253,109,41 text over248,246,243 background,13.12px. Contrast2.6322:1 below4.5:1.",
            "bounds": [
              "Light theme and selected text only; logo excluded; not universal AA audit of all controls.",
              "Shared components in fake preview, not full production runtime. Refinement-stage/merge policy not changed."
            ],
            "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/contrast-evidence.json",
            "report": "/workspace/work/misha-verification/part7.md"
          }
        }
      ],
      "attribution": "Own verification of Misha statement; not claimed as blind independent discovery.",
      "claimScope": "Selected 13.12px navigation text, light theme, 2.6322:1; not a universal palette verdict."
    }
  ],
  "counts": {
    "groups": 51,
    "application-code": 45,
    "preview": 2,
    "documentation": 4,
    "originalWorkingRecordIds": 50,
    "exactMishaAlias": "M-H01=ARCH-01",
    "disabledEditorFamily": "EDITOR-08 includes RES-EDITOR-01",
    "otherMishaStatementsKeptSeparate": 27
  },
  "otherMishaStatements": [
    {
      "id": "M-M01",
      "sourceSeverity": "Medium",
      "claim": "Документация противоречиво описывает permission model редактора и редактирования сообщений.",
      "status": "CONFIRMED",
      "severityAssessment": "DOCUMENTATION_CONFLICT_CONFIRMED_MEDIUM_NOT_ESTABLISHED",
      "verification": {
        "fact": "EDITOR.md285-286 restricts revision history to administrator/moderator roles and excludes ordinary users absolutely; AUTHORIZATION.md13-17,51 defines mutable grants/overrides and history.read as authoritative. Contradiction persists on current baseline.",
        "code": "topicAction readPostHistory branch checks forum.post.history.read, without role-name restriction. topic loader derives history visibility from same permission. edit loader and attachment guard require editOwn plus authoritative ownership, not history.read.",
        "testReport": "/workspace/work/audit/repo/work/misha-verification-part2/results.json",
        "bounds": [
          "Tests use actual post-edit loader and attachment authorization with fake session/reader/resolver: own+edit allowed, own+history only forbidden, foreign owner+edit forbidden; loader guest401 and missing404.",
          "Revision-history action behavior inspected in source, not separately executed in this part. No authorization bypass established.",
          "Do not silently rewrite requirements to resolve the two documents. This finding is a documentation conflict."
        ]
      }
    },
    {
      "id": "M-M02",
      "sourceSeverity": "Medium",
      "claim": "Граница `app ↔ db` размыта repository-specific типами и ошибками.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "COUPLING_OBSERVATION_NOT_ESTABLISHED_DEFECT",
      "verification": {
        "fact": "App request contexts reference ForumReader from repository and ForumWriter from adapter; mutations use db-defined errors. Scoped AST graph has51 app->db module edges,10 explicitly type-only.",
        "method": "AST static graph and targeted import review; modular-monolith contract read.",
        "bounds": [
          "No explicit prohibition found in inspected contract passages, not full re-audit of all architecture docs.",
          "Imports/coupling alone do not prove functional defect, client bundle leak or necessity of refactor. Medium not established.",
          "Server-side auth ORM/schema composition is expected wiring and not automatically counted as a defect."
        ],
        "graph": "/workspace/work/audit/repo/work/misha-verification-part3/graph.json",
        "report": "/workspace/work/misha-verification/part3.md"
      }
    },
    {
      "id": "M-M03",
      "sourceSeverity": "Medium",
      "claim": "Часть authoring/draft строк не имеет согласованных серверных ограничений размера.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "LIMIT_POLICY_GAP_CONFIRMED_IMPACT_NOT_ESTABLISHED",
      "verification": {
        "fact": "Current publishing actions read title/body without a length bound; ForumService normalizeRevision validates nonblank/locale but no maximum originalContent length; editPublishedPost checks body type without maximum. Revision schema uses text with no content-length check. Specific other fields do have limits; not all input is unbounded.",
        "testReport": "/workspace/work/audit/repo/work/misha-verification-part2/results.json",
        "tests": "Normal finite inputs only: title201 characters, body2090 characters pass unchanged through real service to fake repository; edit body likewise; blank title is rejected before repository.",
        "baselineCorrection": "Text draft/autosave runtime and repositories were removed in d72b27ca. Original draft portion cannot be carried forward as an active current defect. Historical draft_id field names still used for attachment operations do not imply text draft persistence.",
        "bounds": [
          "A title201 accepted does not prove a missing agreed200-character limit; 200 belongs to a different similar-question search path. No new product limit invented.",
          "No request-size stress, parser recursion probe, persistence test, actual database, production/service limit or DoS impact tested. Static code establishes lack of an explicit application maximum in selected paths; finite samples alone do not prove unbounded acceptance.",
          "Precise desired maximum and unit require a product policy before implementation; no arbitrary limit proposed here."
        ]
      }
    },
    {
      "id": "M-M04",
      "sourceSeverity": "Medium",
      "claim": "Персонализированные SSR pages не имеют явной общей `Cache-Control`/`Vary` policy.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "MEDIUM_NOT_ESTABLISHED",
      "verification": {
        "fact": "Prior own HTTP captures on identical current baseline show no Cache-Control or Vary on profile HTML/HEAD/single-fetch and authenticated notifications resource projection. Current entry, Worker wrapper and route source review show no global injection.",
        "reusedOwnEvidence": [
          "/workspace/work/audit/repo/work/audit-stage10-part5/http-evidence.json",
          "/workspace/work/audit-stage0/stage10-part5.json"
        ],
        "bounds": [
          "Prior captures reused, not counted as new test runs. Actual profile loader/component/root/SSR entry; manually assembled manifest includes synthetic root loader; locale parent absent.",
          "Notifications loader projected as resource route, not full actual notifications document. No enumeration of every personalized SSR page completed in this part.",
          "No cross-account cache disclosure established. Production cache/CDN/service behavior explicitly excluded.",
          "Local route-specific no-store policies exist, including attachments/mentions/presence and selected locale redirects. Vary alone is not a universal substitute for private/no-store."
        ]
      }
    },
    {
      "id": "M-M05",
      "sourceSeverity": "Medium",
      "claim": "Для HTML нет общей anti-framing/security-header policy.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "MEDIUM_NOT_ESTABLISHED",
      "verification": {
        "fact": "Prior actual profile HTML response has only Content-Type:text/html; no X-Frame-Options or CSP frame-ancestors. Current entry/root/Worker/locale wrapper review and targeted production-source header search show no common application HTML anti-framing policy.",
        "reusedOwnEvidence": [
          "/workspace/work/audit/repo/work/audit-stage10-part5/http-evidence.json",
          "/workspace/work/audit-stage0/stage10-part5.json"
        ],
        "bounds": [
          "No browser framing/clickjacking flow tested in this verification part; no concrete dangerous framed action established.",
          "Deployed proxy/platform headers not inspected and outside scope. No global assessment of every HTML endpoint or every possible security header.",
          "Attachment responses have their own sandbox/nosniff policies; that does not establish a policy for HTML pages.",
          "Absence of a hardening header is recorded as absence, not automatically a demonstrated exploitable vulnerability."
        ]
      }
    },
    {
      "id": "M-M06",
      "sourceSeverity": "Medium",
      "claim": "Основной CI запускается только на `pull_request`, без независимой проверки итогового `main`.",
      "status": "CONFIRMED",
      "severityAssessment": "TRIGGER_GAP_CONFIRMED_MEDIUM_NOT_ESTABLISHED",
      "verification": {
        "fact": "Primary ci.yml triggers only pull_request. Main push UI Preview workflow builds preview but does not repeat primary tests/database checks.",
        "bounds": [
          "Not equivalent to absence of every main check. PR merge-ref checks may test integration before merge.",
          "Branch protections, org-required checks, merge queue settings and actual execution history not queried."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part4/ci-evidence.json",
        "report": "/workspace/work/misha-verification/part4.md"
      }
    },
    {
      "id": "M-M08",
      "sourceSeverity": "Medium",
      "claim": "Section загружает все topics, а topic — все posts и attachments без pagination.",
      "status": "CONFIRMED",
      "severityAssessment": "PAGINATION_ABSENCE_CONFIRMED_MEDIUM_IMPACT_NOT_MEASURED",
      "verification": {
        "fact": "readSection2527 selects all topic rows in requested section, then tags. readTopicPage2574 selects all posts with revisions in requested topic, then metadata for their attachments. No page/cursor/limit/offset for these lists. Reader contracts accept ID only; actual loaders call these methods.",
        "method": "Targeted static source and route/view flow review; no SQL executed.",
        "bounds": [
          "Attachment metadata is read, not file bytes. Other repository methods have bounds; no claim all queries unpaginated.",
          "No latency, EXPLAIN, load or cost measurement. No severity Medium acceptance based on this inspection alone."
        ],
        "report": "/workspace/work/misha-verification/part3.md"
      }
    },
    {
      "id": "M-M09",
      "sourceSeverity": "Medium",
      "claim": "Section read-state получает forum-wide unread list и фильтрует его в приложении.",
      "status": "CONFIRMED",
      "severityAssessment": "QUERY_SCOPE_CONFIRMED_MEDIUM_IMPACT_NOT_MEASURED",
      "verification": {
        "fact": "Section loader passes only userId to readUnreadForUser then constructs section-only states in app. Repository query joins forum topics/posts and has no section predicate or pagination; uses grouping and array_agg for all unread topics. Internal reader delegates directly to repository.",
        "testReport": "/workspace/work/audit/repo/work/misha-verification-part2/results.json",
        "tests": "Real section loader with fake reader requests exactly(actor), receives inside/outside topics, returns only section state including read fallback. Guest does not call unread reader.",
        "bounds": [
          "No SQL executed or query plan measured in this part; repository query inspected statically.",
          "No observed production latency, bill or service problem claimed. Actual cardinality/performance impact unmeasured.",
          "Section route unchanged between old and current baseline; this issue is not removed by draft deletion."
        ]
      }
    },
    {
      "id": "M-M11",
      "sourceSeverity": "Medium",
      "claim": "Dependency governance не закрыт: advisory registry показал 8 high / 13 moderate / 4 low; audit/update gate в CI отсутствует.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "HISTORICAL_ADVISORY_COUNTS_AND_REPO_GATE_ABSENCE_CONFIRMED_APP_MEDIUM_NOT_ESTABLISHED",
      "verification": {
        "fact": "Retained raw report25 records,8High13Moderate4Low, same lock hash as current. No configured audit/update gate or repository dependabot/renovate config found.",
        "controls": "Exact dependency pins,frozen-lockfile,integrity present. Registry severity differs from application exploitability. Prior own stage10part4 condition review reused without rerunning probes.",
        "bounds": [
          "No fresh registry audit; no new dependency graph transmission or new auto-review rejection.",
          "No organization/server-side updater settings inspected. No blanket lack of governance or25 reachable forum vulnerabilities established."
        ],
        "rawAudit": "/workspace/work/audit/repo/work/audit-stage10-part1/audit-all.json",
        "rawAuditSha256": "47c4f1f881c661479764bc256bffbeda26e12dad2050f274d0e4456b6eba5fe1",
        "lockSha256": "1a8108bb9eaa6f46b3339fedb9bef8d598e5199e8a7a7d833a2a9445959cfef3",
        "priorOwnConditionAssessment": "/workspace/work/audit-stage0/stage10-part4-advisory-progress.json",
        "report": "/workspace/work/misha-verification/part8.md"
      }
    },
    {
      "id": "M-L01",
      "sourceSeverity": "Low",
      "claim": "Документация недостаточно отделяет текущее состояние от истории.",
      "status": "NOT_CONFIRMED_ON_CURRENT_BASELINE",
      "severityAssessment": "BLANKET_DOCUMENTATION_CLAIM_NOT_ESTABLISHED",
      "verification": {
        "fact": "Current PROJECT_STATE23-61 explicitly separates current drafts removal from retained historical Editor snapshots; block added after source baseline. README links separate PROJECT_HISTORY.",
        "bounds": [
          "Targeted passages only, not whole-documentation clean bill.",
          "Original report gives no exact counterexamples; retained dated history not automatically current requirements."
        ],
        "report": "/workspace/work/misha-verification/part6.md"
      }
    },
    {
      "id": "M-L02",
      "sourceSeverity": "Low",
      "claim": "Есть устаревшие UI/future claims и acceptance/archive references.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "HISTORICAL_UI_WORDING_AMBIGUOUS_ACCEPTANCE_REFERENCES_UNVERIFIED",
      "verification": {
        "fact": "UI_UX_PASS568 calls attachments/WYSIWYG future relative to old editor slice;645-646 describes future signup and Under development. Current editor and credential signup already implemented.",
        "bounds": [
          "Accumulated older slice/history context; misleading if read as current product status.",
          "Exact obsolete acceptance/archive refs not identified or verified; old owner acceptance not declared invalid.",
          "Drafts genuinely future after current removal."
        ],
        "report": "/workspace/work/misha-verification/part6.md"
      }
    },
    {
      "id": "M-L03",
      "sourceSeverity": "Low",
      "claim": "`db/forum-repository.ts`, `app/forum/views.tsx` и `app/styles.css` чрезмерно крупные.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "SOURCE_SIZE_OBSERVATION_NOT_ESTABLISHED_DEFECT",
      "verification": {
        "fact": "Measured files large, per graph fileSizes. Excessiveness criterion and concrete defect not established.",
        "sizes": [
          {
            "file": "db/forum-repository.ts",
            "lines": 3915,
            "bytes": 162943
          },
          {
            "file": "app/forum/views.tsx",
            "lines": 3079,
            "bytes": 129096
          },
          {
            "file": "app/styles.css",
            "lines": 9643,
            "bytes": 209186
          }
        ],
        "bounds": [
          "Source bytes, not compressed production bundle size.",
          "No full manual read of these three files in this part. No architectural changes or automatic split justified from line count alone."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part3/graph.json"
      }
    },
    {
      "id": "M-L04",
      "sourceSeverity": "Low",
      "claim": "Существует type-only dependency cycle.",
      "status": "CONFIRMED",
      "severityAssessment": "TYPE_DEPENDENCY_CYCLE_ONLY_RUNTIME_IMPACT_NOT_ESTABLISHED",
      "verification": {
        "fact": "profile-view.tsx5 imports type ProfileActionData from routes/profile.tsx; route imports ProfileView as value. Only nontrivial SCC in scoped static graph.",
        "method": "TypeScript AST SCC analysis plus transpileModule experiment with verbatimModuleSyntax; type import absent from emittedJS, component import retained.",
        "bounds": [
          "160 files; app/db/workers relative static imports/re-exports only; tests/declarations/ui-preview excluded. Dynamic imports, aliases, package imports and implicit uses not analyzed.",
          "Removing explicit type-only edges yields no cycles in this graph; not universal absence of runtime cycles.",
          "Compiler experiment not full typecheck/build or runtime execution. No initialization failure established."
        ],
        "graph": "/workspace/work/audit/repo/work/misha-verification-part3/graph.json",
        "compilerEvidence": "/workspace/work/audit/repo/work/misha-verification-part3/type-erasure.json"
      }
    },
    {
      "id": "M-L05",
      "sourceSeverity": "Low",
      "claim": "Есть неиспользуемые production exports.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "UNCONSUMED_EXPORT_NOT_DEAD_FUNCTION",
      "verification": {
        "fact": "normalizeForumTags exported at forum-service364; tracked word search finds only definition and internal call379, no external consumer.",
        "bounds": [
          "Function needed internally; exported surface unused, not dead function.",
          "No exhaustive export inventory or bundle-size benefit established; no removal proposed."
        ],
        "report": "/workspace/work/misha-verification/part6.md"
      }
    },
    {
      "id": "M-L06",
      "sourceSeverity": "Low",
      "claim": "Несколько domain constraints обеспечиваются только приложением.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "SPECIFIC_APP_ONLY_RULES_CONFIRMED_DEFECT_NOT_ESTABLISHED",
      "verification": {
        "fact": "Tag normalized name max64 and slash exclusion enforced by normalizeForumTags but absent from forum_tags declared CHECK/migration0021. Concrete instances of app-only rules.",
        "controls": "Posts have same-topic parent FK and parent-not-self CHECK. Empty-body CHECK removal is explicitly intentional in0039 for attachment-only publication.",
        "bounds": [
          "Original report does not identify exact constraints; cannot claim exhaustive match.",
          "No demonstrated invalid write through user flow, no requirement all service rules must be DB-enforced.",
          "Declared metadata and SQL read, no database execution."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part5/evidence.json",
        "report": "/workspace/work/misha-verification/part5.md"
      }
    },
    {
      "id": "M-L07",
      "sourceSeverity": "Low",
      "claim": "Publication receipts не имеют topic/post foreign keys.",
      "status": "CONFIRMED",
      "severityAssessment": "FK_ABSENCE_CONFIRMED_LIFECYCLE_DEFECT_NOT_ESTABLISHED",
      "verification": {
        "fact": "Receipt schema and migration0039 have owner FK only, no topic/post FK. No later migration reference adds such FKs.",
        "sourceFlow": "Writes receipt with fingerprint/IDs; replay validates fingerprint; topic/reply replay returns storedIDs before normal content checks.",
        "bounds": [
          "Deletion+replay not reproduced; no proven broken operation, orphan acceptance in liveDB or loss.",
          "Adding cascade FK without lifecycle/idempotency contract not justified.",
          "No actual PostgreSQL or external schema inspected."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part5/evidence.json",
        "report": "/workspace/work/misha-verification/part5.md"
      }
    },
    {
      "id": "M-L08",
      "sourceSeverity": "Low",
      "claim": "Три database tests параллельно используют один PostgreSQL client.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "DEPRECATED_QUEUE_USAGE_CONFIRMED_COUNT_THREE_NOT_REPRODUCED",
      "verification": {
        "fact": "Four direct Promise.all groups ofthree client.query on one client in two test files, four different test cases. Each is SELECT count assertions after tested operation.",
        "groups": [
          {
            "file": "tests/database/content-post-body-task-planning.test.ts",
            "line": 271,
            "queryCalls": 3,
            "testCall": "\"rechecks a serialized body translation before admission and rolls back planning metadata\"",
            "queries": [
              "\"select count(*)::int as count from content_translation_request_budget_counters\"",
              "\"select count(*)::int as count from translation_task_generation_heads where translation_kind = 'content-post-body'\"",
              "\"select count(*)::int as count from translation_tasks where translation_kind = 'content-post-body'\""
            ]
          },
          {
            "file": "tests/database/content-post-body-task-planning.test.ts",
            "line": 693,
            "queryCalls": 3,
            "testCall": "\"rolls back body budget counters when task metadata insertion fails\"",
            "queries": [
              "\"select count(*)::int as count from content_translation_request_budget_counters\"",
              "\"select count(*)::int as count from translation_tasks where translation_kind = 'content-post-body'\"",
              "\"select count(*)::int as count from translation_task_generation_heads where translation_kind = 'content-post-body'\""
            ]
          },
          {
            "file": "tests/database/content-topic-title-task-planning.test.ts",
            "line": 205,
            "queryCalls": 3,
            "testCall": "\"rechecks a serialized translation before admission and rolls back planning metadata\"",
            "queries": [
              "\"select count(*)::int as count from content_translation_request_budget_counters\"",
              "\"select count(*)::int as count from translation_task_generation_heads where translation_kind = 'content-topic-title'\"",
              "\"select count(*)::int as count from translation_tasks where translation_kind = 'content-topic-title'\""
            ]
          },
          {
            "file": "tests/database/content-topic-title-task-planning.test.ts",
            "line": 597,
            "queryCalls": 3,
            "testCall": "\"rolls back both budget counters when task metadata insertion fails\"",
            "queries": [
              "\"select count(*)::int as count from content_translation_request_budget_counters\"",
              "\"select count(*)::int as count from translation_tasks where translation_kind = 'content-topic-title'\"",
              "\"select count(*)::int as count from translation_task_generation_heads where translation_kind = 'content-topic-title'\""
            ]
          }
        ],
        "baseline": "All four blocks also present in21386887; numerical discrepancy is not current baseline change.",
        "driver": "Installed pg8.23.0 has non-pipeline query queue and deprecation notice for concurrent queued client.query usage, warning of removal inpg9. Driver source inspected, no protocol/database experiment.",
        "bounds": [
          "Original exactthree not identified, not verified. Narrow AST query is not exhaustive for aliases/callbacks/indirect calls.",
          "No claim current pinned driver misexecutes SELECTs or concurrency transaction tests universally invalid.",
          "Database tests not rerun; no new Vitest executions."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part5/evidence.json",
        "report": "/workspace/work/misha-verification/part5.md"
      }
    },
    {
      "id": "M-L09",
      "sourceSeverity": "Low",
      "claim": "Compiled UI bundle convergence зависит от ручной localhost reconciliation.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "MANUAL_CLEANUP_CONFIRMED_RUNTIME_DEPENDENCE_OVERSTATED",
      "verification": {
        "fact": "Reconciliation script limited to localhost/127.0.0.1 disposable *_test DB; locked reverify/delete. Only production-source caller found is local script.",
        "controls": "Adapter integrity failure becomes miss; loader compiles fallback in memory; successful conditional machine publication atomically writes namespace bundle.",
        "bounds": [
          "Does not establish all translations require manual cleanup.",
          "Request path remains read-only; local-only cleanup explicitly accepted in current Stage5. No external automation assessed.",
          "Five loader tests use fake sources/stores; no invalid realDB row/database test."
        ],
        "testReport": "/workspace/work/audit/repo/work/misha-verification-part6/results.json",
        "report": "/workspace/work/misha-verification/part6.md"
      }
    },
    {
      "id": "M-L10",
      "sourceSeverity": "Low",
      "claim": "Нет coverage report и threshold.",
      "status": "CONFIRMED",
      "severityAssessment": "COVERAGE_MEASUREMENT_ABSENCE_NOT_ESTABLISHED_FUNCTIONAL_DEFECT",
      "verification": {
        "fact": "Neither tracked Vitest configuration nor package scripts/primary workflow enables coverage reporting or threshold; no separate tracked coverage configuration found.",
        "bounds": [
          "No claim actual coverage low or existing tests inadequate from absence alone.",
          "External env/config not inspected; no arbitrary threshold required."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part4/ci-evidence.json",
        "report": "/workspace/work/misha-verification/part4.md"
      }
    },
    {
      "id": "M-L11",
      "sourceSeverity": "Low",
      "claim": "Protected post-edit loader не имеет отдельного route test.",
      "status": "CONFIRMED",
      "severityAssessment": "TRACKED_LOADER_TEST_GAP_NO_AUTH_BYPASS_ESTABLISHED",
      "verification": {
        "fact": "Tracked test/spec reference search across137 files finds route registration and attachment-upload tests, not direct post-edit loader execution.",
        "bounds": [
          "Five own direct loader tests already executed in part2 remain untracked audit scratch, not shipped suite. No rerun/recount here.",
          "No claim missing auth guard; source checks session, existence, authoritative owner and editOwn.",
          "Reference search not full manual read of137 test files."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part4/ci-evidence.json",
        "ownPriorTestReport": "/workspace/work/audit/repo/work/misha-verification-part2/results.json",
        "report": "/workspace/work/misha-verification/part4.md"
      }
    },
    {
      "id": "M-L12",
      "sourceSeverity": "Low",
      "claim": "ESLint/TypeScript не обеспечивают строгие browser/node/worker boundaries.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "ESLINT_BOUNDARY_GAP_CONFIRMED_FULL_TOOLCHAIN_NOT_TESTED",
      "verification": {
        "fact": "Merged browser/node/worker globals; effective ESLint config permits document/process/self in virtual app,db,workers TS paths with0 errors/warnings. Restricted globals/import rules absent.",
        "bounds": [
          "Partial scope: TypeScript configs read, but no dedicated TypeScript rejection/acceptance experiment or bundler test.",
          "No conclusion all framework/server-only protections absent; no client secret/DB bundle leak claimed.",
          "Probe text linted only; source not executed."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part4/lint-boundaries.json",
        "report": "/workspace/work/misha-verification/part4.md"
      }
    },
    {
      "id": "M-L13",
      "sourceSeverity": "Low",
      "claim": "У основных CI jobs нет timeouts.",
      "status": "CONFIRMED",
      "severityAssessment": "EXPLICIT_TIMEOUT_ABSENCE_NO_OBSERVED_HANG",
      "verification": {
        "fact": "Main checks/database jobs have no job timeout-minutes or step timeouts.",
        "bounds": [
          "Platform default limits still apply, not infinite execution.",
          "Actual runs, hangs, costs and suitable timeout duration not measured."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part4/ci-evidence.json",
        "report": "/workspace/work/misha-verification/part4.md"
      }
    },
    {
      "id": "M-L14",
      "sourceSeverity": "Low",
      "claim": "На homepage нет `h1`; UGC Markdown может добавлять дополнительные `h1` в topic.",
      "status": "CONFIRMED",
      "severityAssessment": "HEADING_FACTS_CONFIRMED_NOT_AUTOMATIC_WCAG_VIOLATION",
      "verification": {
        "fact": "Home has0h1 in all4browser loads; renderer explicitly supports h1 from Markdown.",
        "bounds": [
          "Multiple h1 topic document not built in this part; static capability checked.",
          "No universal WCAG failure inferred from h1 count alone."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/browser-evidence.json",
        "report": "/workspace/work/misha-verification/part7.md"
      }
    },
    {
      "id": "M-L15",
      "sourceSeverity": "Low",
      "claim": "`ui-preview:build` создаёт неигнорируемый `dist/`.",
      "status": "CONFIRMED",
      "severityAssessment": "UNIGNORED_BUILD_OUTPUT_HYGIENE",
      "verification": {
        "fact": "Fresh UI Preview build succeeds and creates dist/ui-preview per config; git check-ignore says not ignored, git status ??dist/.",
        "bounds": [
          "Dist existed untracked before this part and was rebuilt, not deleted. Not tracked artifacts or secret leak."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/repository-evidence.json",
        "report": "/workspace/work/misha-verification/part7.md"
      }
    },
    {
      "id": "M-L16",
      "sourceSeverity": "Low",
      "claim": "Нет favicon, `robots.txt`, sitemap и manifest.",
      "status": "CONFIRMED",
      "severityAssessment": "WEB_ASSET_ABSENCE_NOT_ALL_MANDATORY_FEATURES",
      "verification": {
        "fact": "Tracked inventory and route/root review show no favicon,robots.txt,sitemap,web manifest.",
        "bounds": [
          "No external hosting/runtime content checked.",
          "Preview robots meta noindex exists; not production robots.txt. PWA manifest and sitemap are not universal requirements."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/repository-evidence.json",
        "report": "/workspace/work/misha-verification/part7.md"
      }
    },
    {
      "id": "M-L17",
      "sourceSeverity": "Low",
      "claim": "Category/section/topic не формируют dynamic title, description и canonical metadata.",
      "status": "CONFIRMED",
      "severityAssessment": "SOURCE_METADATA_ABSENCE_NO_SEARCH_IMPACT_MEASURED",
      "verification": {
        "fact": "Category/section/topic lack meta exports; root has Meta outlet but no default title/description/canonical; selected route/locale files lack dynamic metadata.",
        "bounds": [
          "Static source review; actual selected route SSR not run in this part, no indexing/traffic impact measured."
        ],
        "evidence": "/workspace/work/audit/repo/work/misha-verification-part7/repository-evidence.json",
        "report": "/workspace/work/misha-verification/part7.md"
      }
    },
    {
      "id": "M-L18",
      "sourceSeverity": "Low",
      "claim": "Initial production/UI Preview payload крупный, performance/bundle budget gate отсутствует.",
      "status": "PARTIALLY_CONFIRMED",
      "severityAssessment": "CURRENT_ASSET_SIZES_AND_NO_BLOCKING_GATE_CONFIRMED_USER_PERFORMANCE_NOT_MEASURED",
      "verification": {
        "fact": "Fresh production build plus previous part7 preview build. Home entry/root/locale/home static closure888944 bytes239706gzip; sharedviews272980/72539; previewJS941893/277241. No blocking bundle/performance gate in checked config/CI.",
        "bounds": [
          "Static closure excludes dynamic imports,manifestJS,HTML/hydration,images,headers/runtime requests. Not actual Network transfer.",
          "Independent per-file gzip9,not deployed encoding.",
          "Old Misha SSR/HE/hydration/initial measurements not reproduced or refuted on different baseline/method.",
          "Vite chunk warning exists but not blockinggate; large relative to no agreed budget not automatically functional defect. No LCP/INP/target-network measurement."
        ],
        "metrics": "/workspace/work/audit/repo/work/misha-verification-part8/payload.json",
        "report": "/workspace/work/misha-verification/part8.md"
      }
    }
  ],
  "countMeaning": "45 application-code groups include earlier preserved evidence and selected later confirmations, not 45 newly executed independent discoveries. Two preview and four documentation groups are separate.",
  "evidencePolicy": "Preserve original source reports, resolved proof files, scoped later reproduction results and authorship limits. No synthetic test result treated as production acceptance.",
  "coverageReport": "/workspace/work/audit/repo/work/audit-code-continuation/reconciliation/coverage-review.json",
  "subjectResolution": "/workspace/work/audit/repo/work/audit-code-continuation/reconciliation/subject-resolution.json",
  "unconfirmedNotCounted": [
    "Isolated recursive/resource renderer observation: application reachability and deployed impact unestablished; further probes stopped.",
    "No fresh dependency registry audit or deployed exploitability verdict.",
    "Native details Escape behavior is observation, not automatic WCAG violation.",
    "No formal all-browser/screen-reader/OS IME/zoom acceptance."
  ],
  "fixes": 0,
  "remoteWrites": false,
  "realExcludedServicesUsed": false
}
```

</details>


---

## Предыдущее состояние личного файла

<details>
<summary>Сохранённая запись до публикации</summary>

# Лёва — Codex-6.1 Sol

Активной задачи нет.

Этот файл используется для собственных рабочих результатов, выводов и технического контекста Лёвы в рамках текущего служебного PR.

</details>
