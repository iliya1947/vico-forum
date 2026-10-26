# Лира (ChatGPT-6) — личный журнал проверок

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
