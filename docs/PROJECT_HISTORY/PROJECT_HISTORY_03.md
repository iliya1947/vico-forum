# PROJECT_HISTORY_03.md

> [Индекс истории](./PROJECT_HISTORY.md)> · [Предыдущий том](./PROJECT_HISTORY_02.md)> · [Следующий том](./PROJECT_HISTORY_04.md)

Период: **2026-10-10 — 2026-10-19**.

Этот том сохраняет историю Attention и основного цикла Editor 2.0: staged implementation, аудиты, corrections, publication/edit lifecycle и завершение реализации. Исходные записи перенесены без изменения технического смысла.

## Attention и Editor 2.0 — датированные срезы

- PR #227 (merged 2026-10-16) исправляет подтверждённый test-suite audit reliability defect
  controlled locale writer без schema/migration/public-contract изменений. Graph-wide
  desired-state mutations теперь в существующей короткой `SERIALIZABLE` transaction берут
  `LOCK TABLE locales IN SHARE ROW EXCLUSIVE MODE` после transaction-local deadlines и до
  первого registry read/DML, поэтому concurrent writers сериализуются до построения proposed
  graph. Прежний probabilistic locale-concurrency test заменён deterministic two-client
  PostgreSQL 17 regression: второй writer с retry budget `0` блокируется на lock до commit
  первого writer, не выполняет ранний `SELECT`, затем видит committed dependency и сохраняет
  валидный graph. Code/test head `b161a406` прошёл PR CI #38823419790 (`checks` +
  `database` success). Independent Codex review не нашёл implementation/test defects и
  подтвердил только docs/source-of-truth correction, выполняемую в том же PR. Исторические
  упоминания прежних CI rerun сохраняются как история наблюдавшегося flake.

- Merged PR #217 delivers an independently routed,
  permission-protected moderation attention center at `/:locale/attention`,
  linked beside the ordinary header notification bell. Owner revision 2026-10-10
  moved it out of Help & solutions (the obsolete Help `?mode=attention` URL
  redirects). The center has three isolated modes `Signals`, `Complaints` and
  `Security`, switched to the right of the page heading; groups for the active
  mode appear in a separate toolbar directly below the heading. Signals show six individually selectable groups:
  Needs details, Needs review, Solution outdated, Duplicate, Appeals, Mixed.
  The backed queue selects only persisted pending signal/appeal cases and current
  best-answer Needs review status; Mixed (2+ pending visible signals) duplicates
  items in their category groups. Guests/users without effective moderation
  permission are rejected. Complaints remains a placeholder with Group 1–3.
  In Editor 2.0 PR #215, Security first group is renamed **Attachments**
  (`mode=security&group=attachments`), followed by placeholder Group 2–3.
  The group is reserved for persisted suspicious-upload system events,
  not Help signals or user complaints. Editor 2.0 PR #215 now connects durable
  suspicious-attachment event ingestion and a read-only Security/Attachments queue;
  no synthetic data or invented accept/reject/close workflow is used. Notification-bell
  semantics, complaint processing and Stage 6 external R2 provisioning remain unchanged. The revised implementation head `ebb72df8` passed CI
  #38082349666: 702 application tests, 217 native PostgreSQL 17 tests,
  lint/typecheck and builds. A single unrelated transaction-serialization
  concurrency test needed one successful failed-DB-job rerun with no code
  changes. Pages #38082518153 built and deployed the same revision.
  User review rejected the topic-list presentation as not actionable. In the first
  implementation subtask, PR #217 now adds a separate permission-filtered
  readHelpAttentionCases server reader for individual pending signals and appeals
  (author, explanation, target answer, proposed/confirmed original, submission
  date and stable case ID); Needs review includes a distinct authoritative
  answer-status task instead of pretending it is a user report. Group-specific
  database selection occurs before pagination (50 cases/page; Mixed paginates
  topics with 2+ pending visible signals and projects their individual cases).
  The second subtask replaces topic-only cards with case-specific records,
  explanations, submitter/context links and protected Accept/Reject actions on
  `/:locale/attention`. The handler validates Origin, session, current permission
  and authoritative case-topic identity, returning to the selected group after
  success; appeal mutation additionally verifies exact case ID under DB locks.
  Existing Needs-review moderator statuses remain separate tasks linking to
  the specific answer's moderation controls rather than fabricated user signals.
  The final whole-PR pass restored group totals from all pending case sources:
  each category shows the number of visible unresolved actions, including
  answer-review status tasks; Mixed counts topics with 2+ visible pending signals.
  Counts apply effective permission filtering before aggregation and do not inherit
  any 100-topic cap or page-bound truncation.
  GitHub Pages fixtures now preview realistic independent requests. Mode switches
  sit beside the page heading and group switches below; redundant Moderation
  eyebrow is removed. The aggregate topic reader remains available but is no
  longer used by the attention route; no migrations or complaint/security
  mechanics were introduced. CI #38100711549 passed on implementation code
  head 492efd6 (checks + database). A Pages push from the implementation branch
  built successfully but its deploy job failed before runner steps
  (#38100709642): this branch cannot publish through the protected Pages
  environment. The same code head 492efd6 published successfully through
  the preview-only `chatgpt/ui-pr217-case-preview` branch
  (Pages #38101437497, build + deploy success). The implementation workflow
  therefore no longer pretends `chatgpt/help-attention-*` can deploy; preview
  mirroring must use the allowed `chatgpt/ui-*` branch. The implementation
  head `7351170` passed both CI jobs in #38101530150; the exact same revision
  was built and published successfully to GitHub Pages in #38101534292 from
  `chatgpt/ui-pr217-case-preview`.
  Owner visual acceptance was granted on 2026-10-11 for the current usable MVP
  presentation ("сойдёт"), explicitly with future UX/visual refinement deferred.
  Keep separate post-MVP work to improve the moderation case-card layout,
  readability, hierarchy, information density and moderator workflow usability;
  this polish does not block PR #217 or require changes to its current mechanism.
  Independent Codex review completed on implementation head `3480fc2` with
  two documentation findings. Both were corrected and resolved without modifying
  application code; subsequent exact-head CI #38121847206 passed `checks` and
  `database` on `eec38b0`. PR #217 merged 2026-10-11.

- Editor 2.0 Stage 5 attachment/draft integration corrections (2026-10-14, PR #215):
  The authoring branch now durably retires a genuinely expired *unsaved*
  attachment generation before cleanup of its last old ref, under the existing
  owner/context scope lock, without forcing an early text-draft save or retiring
  a live redirect/recent-generation ref. Private draft download also checks
  authoritative server text-draft TTL on each direct read without prolonging it.
  Published topic reads preserve verified attachment detectedType from PostgreSQL
  to presentation rather than reconstructing a security/display type from the
  filename, so supported inert text/source preview remains available.
  Image paste/drop/picker inserts an opaque stable `vico-attachment:<UUID>`
  Markdown image reference through shared editor source/Undo history immediately,
  and authorized draft/post presentation resolves that identity only through
  current verified raster refs and the existing controlled download route.
  Rejected/removed/other-user refs cannot render active inline image bytes;
  image original-view and download now have distinct actions.
  Focused PostgreSQL regressions cover expiry/retry, mixed-age unsaved refs,
  direct draft TTL and published metadata. Editor composition, parser/route
  rendering, Undo/Redo and original-link tests were added.
  These corrections do NOT implement the remaining Editor 2.0 features
  (mentions, edit-published, quoted source attribution/expansion and
  direction/spellcheck/preferences/UX settings). Real-browser test-bucket, mobile/RTL and owner
  acceptance remain unverified; external storage/scheduler/production rollout
  remain deferred. CI evidence must be recorded against the final exact head
  rather than inferred from preceding commits.

- Editor 2.0 final bounded Stage 5 correction (2026-10-17, PR #215): attachment
  membership now travels with each current draft payload in a distinct optional
  `draftAttachmentIds` JSONB field. Absent and authoritative empty remain distinct;
  existing `retainedAttachmentIds` post-edit snapshot semantics are unchanged.
  Successful draft CAS reconciles refs under the existing owner/context lock, while
  version-fenced POST/DELETE accepts an older in-flight operation only when its result
  matches the winning manifest. Migration `0044_attachment_draft_conflict_boundaries`
  preserves durable owner/context provenance and the pre-mutation membership of an
  active text version. Explicit conflict resolution establishes that snapshot as a new
  authoritative CAS version before dismissing the choice, so same-version POST/DELETE
  and DELETE-before-CAS can be reversed without cross-context UUID reuse. Rebind moves only selected refs and
  removes losing source refs. The normal 60-second sync,
  stable upload retry, terminal generations and publication boundary remain unchanged.
  Simple-mode Enter now uses the actual caret/selection; paste across Markdown leaves
  is resolved at the visual surface; explicit plain tabbed paste bypasses table conversion;
  failed TSV conversion inserts the original plain text. Focused UI/route tests and
  PostgreSQL races cover these cases. External infrastructure and later-stage features
  remain outside this correction.

- Editor 2.0 publication package (2026-10-14, PR #215): new topic, Help question
  and reply actions now accept a blank body **only** with a selected, verified
  and transactionally promoted attachment set; title, permissions, generation
  CAS and rejection of empty/unsettled selection remain. The shared editor
  computes submission readiness from meaningful body or settled files,
  blocks pending/error uploads and prevents keyboard bypass via Ctrl+Enter.
  UI creates no attachment-only placeholder text.
  A first accepted publication durably records its request fingerprint and
  created topic/post IDs keyed by (owner, context, draft ID), in the same
  PostgreSQL transaction as the post, draft retirement, attachments and reply
  notifications. An identical lost-response retry under the existing scope
  lock returns the *same* ID without a second post or notifications; a different
  payload for that draft ID is a conflict. The writer returns stored receipt IDs
  rather than newly generated provisional IDs on replay. New forward migration
  `0039_forum_publication_receipts` adds receipts and removes the former
  post-body NOT BLANK database constraint; the service preserves the stricter
  text-only contract and the repository validates actual file references
  transactionally. Drizzle snapshot, manifest and runtime web-role grants
  include the new table. Integration regression tests exercise all three
  real action→writer→PostgreSQL paths, exact replay and altered retries.
  At that interim package checkpoint, browser/test-bucket and owner visual acceptance
  were not recorded; infrastructure rollout, merge and Codex Code Review had not
  occurred. Whole Editor 2.0 was still incomplete at that time.

- Editor 2.0 published-post editing package (2026-10-14, PR #215):
  post authors with effective `forum.post.editOwn` can open the same Simple/Advanced
  Markdown editor using distinct `post:<postId>:edit` local/remote drafts;
  Cancel leaves the published revision unchanged and the edit draft recoverable
  via the drafts page, while explicit Save runs a version-fenced transaction.
  New published revisions retain prior immutable versions and editor identities,
  set `forum_posts.edited_at`, and expose a public "Edited" timestamp only.
  Revision history body/author/time is fetched only via a separate server
  action requiring effective `forum.post.history.read`; default grants are
  moderator/admin, with no public/own-message history disclosure.
  Migration `0040_post_edit_history_permissions` adds the timestamp and the two
  code-backed dynamic permissions; catalog, grants, schema snapshot and schema
  manifest are updated. The transaction validates post author and current
  revision, completes only the edit-generation draft, promotes newly selected
  verified references, and records a replay fingerprint/receipt atomically:
  identical lost-response Save is idempotent and modified replay conflicts.
  Existing published attachments survive content edits, including removal
  of all text from attachment-bearing posts.
  Unit/route/PostgreSQL regression tests exercise authorization, separate
  drafts, history, CAS/stale edit, attached and text-only revisions and retry.
  At that interim package checkpoint, browser/visual acceptance, final whole-Editor
  review and subsequent packages were still outstanding; no merge, production migrations
  or rollout had occurred. Final-head CI still needed independent verification then.

- Editor 2.0: на момент этого раннего среза PR #215 был открыт и ещё
  не готов к merge; позже merged 2026-10-18. После merge #217 в `main`
  в первом foundation-срезе добавлены lossless Markdown document/history utilities,
  ограниченное текстовыми AST-диапазонами безопасное visual-edit API (без пересериализации
  исходника и без изменения сложных блоков) и единая Undo/Redo история к существующему
  shared Markdown editor, включая клавиатурные сочетания и обработку Reply/Quote insertion.
  Первый CI первого этапа (checks/database) был успешен. Последующий visual-authoring срез
  реализовал source-positioned визуальные редактируемые plain-text leaf spans, read-only
  technical/unsupported constructs с переходом в Advanced Markdown, common exact-source
  undo/redo, localized Simple/Advanced controls, Preview menu (Markdown/Preview/Split),
  синхронный Split-scroll и Fullscreen, account-scoped local mode preference, RU/EN/HE,
  responsive toolbar. Markdown body остаётся единственным FormData/source-of-truth.
  Тесты визуальных правок, формы, account isolation и round-trip добавлены.
  Третий технический срез добавляет общий безопасный рендеринг/создание
  обычных Markdown-таблиц и spoiler disclosure, визуальное редактирование
  ячеек с source spans, строки/колонки, spreadsheet TSV и ограниченный
  HTML clipboard import с явной защитой от неподдерживаемых структур,
  code-only Tab/indent/pairs, literal search/replace, plain/code paste,
  Diff highlighting, filename metadata и локальные code display preferences.
  RU/EN/HE, RTL/responsive стили и регрессионные тесты добавлены.
  Кодовый head `f63b364` прошёл CI #38129324769: lint, typecheck,
  application tests, builds и native PostgreSQL DB проверки успешны.
  Pages/owner visual acceptance этапа и финальное whole-PR review тогда ещё предстояли.
  Сложные/нестандартные таблицы остаются защищёнными для Markdown-редактирования;
  четвёртый срез реализует account/context-scoped локальное сохранение после
  Space/Enter/paste/форматирования/ухода со страницы, 60-секундную синхронизацию
  только локально сохранённого, metadata-first recovery по аккаунту и контексту,
  страницу «Мои черновики», конфликт выбора версий side-by-side и локальную очистку.
  Добавлены PostgreSQL-таблица миграции 0034, owner-only API и CAS-version+draft-ID
  с tombstones для опубликованных/удалённых/истёкших черновиков. Публикация
  темы/ответа отмечает соответствующий черновик завершённым в той же DB-транзакции.
  30-дневный срок, RU/EN/HE, тесты PostgreSQL и локального кэша включены.
  После отдельной проверки Stage 4 исправлена корневая ошибка жизненного цикла:
  старые React effect-замыкания удерживали ID/версию черновика и не всегда
  сохраняли несинхронизированную правку при переключении аккаунта. Синхронизация
  переписана на один изменяемый runtime per account/context с проверкой принадлежности
  асинхронных результатов текущей форме; решение о разных поколениях черновика
  больше не основано на часах устройств — неоднозначные поколения требуют
  явного выбора пользователя. Добавлены React regressions для двух последовательных
  60-секундных сохранений, публикации на другом устройстве, выбора локальной
  конфликтной версии, межвкладочной записи и смены аккаунта при запоздалом GET.
  Исправленный lifecycle прошёл exact-head CI #38133982302
  (`checks` и `database`) на `49fa127f`; тесты PostgreSQL, TypeScript,
  прикладные регрессии и сборки успешны. Pages/browser review не подтверждён.
  Дополнительный clean-up Stage 4 проверил цепочку ввод → локальный cache →
  серверная CAS-запись → recovery/conflict → публикация. Убраны устаревшее поле
  startedAt, дублированное изменяемое состояние CAS версии, fake terminal payload,
  client timestamp validation/expiry на сервере, неиспользуемые поля draft-list и
  UI-сравнение локальных/серверных часов. Серверное editedAt задаётся только
  сервером, expiration purge ограничен владельцем и применяется при content GET,
  metadata и save. API больше не принимает client-only 'finish': published
  marking остаётся исключительно в транзакции публикации.
  Исправлено восстановление parentPostId в Reply composer и очистка local settings
  вместе с черновиками выбранного аккаунта, включая другую открытую вкладку.
  Добавлены тесты owner/Origin/API, Reply, TTL, конфликтов, clock skew и
  удаления локальных данных. Кодовая версия a3a6e46 прошла CI #38136595010
  (checks + database); итоговый exact-head CI #38136726761 на `a36284e`
  также прошёл `checks` и `database`.
  Pages/browser и owner visual acceptance ещё не подтверждены; полный review PR
  намеренно не запущен до завершения редактора.
  Аудит-коррекция draft lifecycle 2026-10-11 закрыла первый пакет найденных
  дефектов без перехода к следующим пакетам: публикация теперь передаёт
  draft ID + CAS-версию и в той же транзакции либо завершает именно ожидаемое
  поколение, либо откатывает topic/reply с conflict при stale/newer/competing
  server draft. Client runtime после подтверждённой reply-публикации начинает
  новое поколение с terminal version, а старые async metadata/save результаты
  отсекаются generation epoch и не могут очистить новый ввод. Смена
  account/context сбрасывает body/history/selection, section form remount-ится
  по section ID, а reply parent используется только если он принадлежит
  текущей теме. Terminal metadata на следующей навигации очищает совпадающую
  локальную копию опубликованного draft. PostgreSQL regression подтверждает,
  что stale publication возвращает conflict и весь новый post transaction
  откатывается. Кодовый head `893b24d` прошёл CI #38153542321
  (`checks` + `database`). Остальные findings полного аудита Editor 2.0
  остаются открыты и исправляются отдельными пакетами.
  Второй пакет audit-коррекции draft storage/API (2026-10-11) закрывает
  подтверждённые server/API defects без перехода к другим findings. Draft
  context keys теперь разбирают forum IDs как opaque text, а создание нового
  server draft проверяет реальное существование section/topic/post; save
  дополнительно требует актуальную dynamic capability для соответствующего
  authoring context. HTTP action ограничивает фактически прочитанный request
  body, поэтому missing/ложный Content-Length не обходит 150000-byte guard.
  Metadata discovery больше не ограничивает active drafts общей выборкой с
  tombstones: все active rows возвращаются, terminal markers включаются только
  в 30-day local-cache reconciliation window. My Drafts при divergent
  local/server поколениях удаляет authoritative active server generation по
  draft ID + CAS-version и затем local copy; local-only copy не создаёт
  искусственный server tombstone. Storage availability классифицируется
  отдельно: только известные transport/timeout failures дают controlled 503,
  programming/schema failures не маскируются. Runtime web ACL для
  forum_editor_drafts сокращён до реально используемых INSERT/SELECT/UPDATE,
  без DELETE. Добавлены route/browser/PostgreSQL regressions на opaque IDs,
  fabricated contexts, реальный byte limit, typed failures, CAS-delete и
  >200 terminal markers без вытеснения active draft. Кодовый head `6836276`
  прошёл CI #38155174105 (`checks` + `database`); единичный unrelated
  transient feedback test `Copied` на первом checks-attempt не
  воспроизвёлся при повторном запуске того же exact head. Остальные findings
  полного аудита остаются открытыми.
  Третий пакет audit-коррекции ядра Simple/Advanced editor (2026-10-11)
  закрывает visual/source selection, imperative Reply/Quote focus,
  восстановление caret/selection Undo/Redo и exact-source CRLF/LF. Simple
  selection теперь отображается в authoritative Markdown offsets для
  escaped text, split DOM nodes и безопасных multi-leaf inline ranges;
  fully-selected strong/emphasis включают невидимые Markdown markers, а
  selection через protected content считается недостоверным и toolbar не
  применяет команду к концу сообщения. Reply/Quote остаются в текущем
  authoring mode и возвращают visual caret в Simple. История хранит source
  selection и восстанавливает её в соответствующей поверхности после
  Undo/Redo и mode switch. DOM textarea показывает browser-normalized LF,
  но отдельное exact Markdown form field остаётся authoritative; Advanced
  edit применяет diff только к изменённому normalized span, сохраняя
  нетронутые CRLF/CR bytes. Добавлены regressions на escaped/multi-leaf/
  protected selections, Simple imperative insertion, visual Undo/Redo и
  CRLF round-trip/edit. Кодовый head `820d050` прошёл CI #38157088641:
  `checks` и `database` successful, включая 800 application tests,
  builds и schema parity. Local-save triggers впоследствии закрыты пятым
  audit-пакетом, Clear formatting — шестым; attachment type-gate остаётся отдельным пакетом.
  Четвёртый пакет audit-коррекции Stage 3 tooling/rendering (2026-10-11)
  закрывает подтверждённые defects strikethrough, общего highlight budget,
  block insertion/caret и code-only keyboard boundary. Согласованный
  `~~text~~` теперь разбирается одной общей narrow GFM-strikethrough
  границей в Simple AST, preview/public renderer и content-translation
  pipeline; полный GFM не включён. Версия защиты переводимого Markdown
  поднята до `cnt05-strikethrough-v1`, поэтому старые translation tasks
  корректно считаются устаревшими относительно новой AST-семантики.
  Highlight budget вычисляется один раз по полному сообщению и наследуется
  внутри spoiler, не сбрасываясь на его коротком body. Toolbar-команды
  Spoiler/Table/горизонтального разделителя вставляют блок после selection,
  не удаляют выделенный текст; divider оставляет caret после блока.
  Обычный Advanced keydown больше не парсит весь Markdown: parser вызывается
  только для Tab/Enter/pairing, а fenced opening/info/closing lines исключены
  из code-only range. Добавлены regressions на renderer/Simple/translation,
  nested spoiler budget, block insertion и fenced boundaries. Кодовый head
  `cf9dc10` прошёл CI #38160773816: `checks` и `database` successful,
  включая 809 application tests, builds и schema parity.
  Пятый пакет audit-коррекции Stage 4 local-save triggers (2026-10-11)
  закрывает оставшийся дефект локального сохранения черновика на явных
  пользовательских событиях. Причина была в том, что Simple-mode input
  определял Space по последнему символу всего body, поэтому пробел в середине
  документа не давал немедленного local capture; однострочный Simple paste
  также не имел собственного save-trigger, а toolbar focusout мог сохранить
  состояние до самой formatting mutation. Теперь Simple передаёт явный
  local-save trigger для фактического Space и однострочного paste, а все
  discrete editor actions через общий commitSource (включая Enter, toolbar
  formatting и imperative Reply/Quote insertion) выполняют local capture
  после mutation. Серверный 60-секундный sync, CAS/conflict lifecycle и API
  не менялись. Добавлены regressions для mid-document Space/Enter,
  one-line paste и toolbar formatting. Кодовый head `a6af6a0` прошёл
  CI #38161772563: `checks` и `database` successful, включая
  813 application tests, builds и schema parity.
  Шестой пакет audit-коррекции Clear formatting (2026-10-11) заменяет
  прежнюю обработку только непосредственных `**` / `_` / `~~` wrappers общим source-aware
  преобразованием поддерживаемого inline-оформления и explicit Markdown links.
  Команда действует ровно на выделенный диапазон, безопасно разделяет crossing
  wrappers и сохраняет форматирование невыделенного текста; при пустом выделении
  применяется ко всему содержимому редактора. Structural Markdown и protected
  technical content не flatten-ятся. Pure/component regressions покрывают partial
  strong/link selection и whole-document clear. Кодовый head `d2266f6` прошёл
  CI #38165900249: `checks` и `database` successful, включая 817 application
  tests и 229 native PostgreSQL 17 tests.
  Седьмой пакет audit-коррекции attachment type-gate (2026-10-11) закрывает
  последние подтверждённые defects уже реализованной части Stage 5 verification:
  технические text/source/config файлы больше не ограничены коротким extension
  allowlist и принимаются по фактически валидному text-content при отсутствии
  запрещённого extension/MIME; распознанные binary форматы сохраняют строгую
  extension/signature consistency. Все invalid filename anomalies теперь имеют
  suspicious=true для будущего Security/Attachments ingestion. Добавлены regressions
  для Lua/Dart/Scala/Proto/GraphQL/HCL, extensionless/custom source names и
  malformed filenames. DB refs/upload-download routes/security-event ingestion,
  cleanup и UI остаются последующими частями Editor 2.0, а не defects уже
  реализованного type-gate.
  Повторный поэтапный аудит Stage 1 (2026-10-11) выявил current-scope
  regression в imperative focus редактора: `MarkdownEditorHandle.focus()` при уже
  активном write-state не выполнял DOM focus напрямую, а только записывал pending
  selection и повторно устанавливал тот же mode, поэтому layout-effect не срабатывал.
  Reply flow вызывает именно этот API; прокрутка к форме могла происходить без переноса
  курсора в редактор. Исправлено 2026-10-12 локально в imperative boundary: уже открытый
  Advanced write-mode немедленно фокусирует textarea и восстанавливает source selection,
  а Simple write-mode немедленно восстанавливает visual DOM selection. Переход из preview
  сохраняет существующий pending-selection lifecycle. Regression покрывает оба authoring
  mode без принудительного переключения режима.
  Повторный поэтапный аудит Stage 2 (2026-10-11) выявил current-scope
  defect protected-content boundary: ручное Simple-selection безопасно отклонялось
  при пересечении data-visual-protected, но restoreVisualDomSelection() мог
  восстановить через protected block диапазон из Advanced/history и затем пометить
  его authoritative для toolbar mutation. Исправлено 2026-10-12 на общей restore
  boundary: восстановленный DOM Range проверяется на data-visual-protected тем же
  fail-closed принципом, а неуспешное восстановление очищает pending selection и
  явно фиксирует отсутствие authoritative visual selection. Поэтому toolbar не
  получает fallback range и не может изменить fenced code/другой protected Markdown.
  Тот же fail-closed helper используется direct imperative Simple focus path.
  Regression воспроизводит Advanced → Simple selection через fenced code и проверяет,
  что последующая Bold-команда не изменяет source.
  Повторный поэтапный аудит Stage 3 (2026-10-11) выявил три current-scope
  defects. Finding №1 исправлен 2026-10-12 на существующей authoring-selection
  boundary: protected fenced-code node теперь передаёт собственный exact source span
  в общий переход Simple → Advanced, а тот использует уже существующий
  pendingSelectionRef lifecycle для focus/selection textarea. Поэтому «Edit in Markdown»
  открывает именно выбранный code block вместо восстановления предыдущего caret/selection;
  отдельная scroll-механика или новый state не добавлялись. Regression с двумя code blocks
  проверяет, что кнопка второго блока переводит Advanced textarea и выделяет ровно его
  Markdown source. HTML clipboard conversion для inline <code> ранее не применял необходимые
  delimiter-padding правила для текста, начинающегося/заканчивающегося backtick
  или пробелами; Stage 3 finding №2 исправлен 2026-10-12 на общей Markdown
  serialization boundary: существующее корректное правило выбора backtick
  delimiter/padding вынесено из MarkdownEditor в общий editor-document helper и
  используется также HTML clipboard converter. Поэтому paste больше не имеет отдельной
  расходящейся сериализации для `<code>`, а граничные backticks и симметричные пробелы
  сохраняются по тем же правилам, что inline-code toolbar. Stage 3 finding №3
  (oversized Markdown table) исправлен отдельно 2026-10-12 на parser boundary:
  лимит 200 больше не завершает распознавание таблицы преждевременно. Parser проверяет
  следующую строку и при 201-й валидной data row отказывается от visual-table
  representation, после чего существующий protected-table path сохраняет весь
  contiguous Markdown-table одним read-only блоком. Ранее найденный code/spec conflict
  по созданию таблиц разрешён владельцем 2026-10-12 в пользу последовательного Simple UX:
  обычную Markdown-таблицу можно создать визуальной командой в Simple, затем редактировать
  там же; Advanced используется для ручного Markdown и сложных/нестандартных таблиц.
  Текущий UI с Table в Simple корректен.
  Повторный поэтапный аудит Stage 4 (2026-10-11) выявил пять current-scope
  defects. Draft runtime authoritative хранит только body, а title/tags/parentPostId
  берёт из live DOM при capture; final cleanup после React commit и same-event
  Reply/Quote capture могут поэтому сохранить пустые/stale non-body поля. Save-trigger
  для title/tags также ошибочно зависит от body: при пустом body почти каждый input
  становится immediate save, а paste в title/tags при непустом body не имеет
  обязательного немедленного capture. In-flight 60s autosave способен увеличить
  server CAS version между FormData snapshot и publication transaction той же вкладки,
  создавая ложный 409 publication conflict без внешнего конкурента. Conflict UI
  сравнивает полный payload, но показывает только body, поэтому title/tags/parent
  conflicts нельзя осмысленно сравнить перед окончательным выбором. Наконец,
  server draft payload ограничен 100000 JS-символов body и request 150000 bytes,
  тогда как publication boundary такого лимита не имеет; большой/Unicode draft
  может бесконечно оставаться в состоянии pending с повторными 400/413 sync.
  Lazy 30-day purge перед metadata/get/save проверен отдельно и в текущей
  pre-release фазе не классифицирован как defect: просроченный payload не
  возвращается при следующем обращении, а глобальный physical retention cleanup
  относится к будущему release/operational path. Код Stage 4 не исправлялся.
  Stage 4 finding №1 исправлен отдельно 2026-10-12 на уровне первопричины:
  owner/context draft runtime authoritative хранит полный payload
  (body/title/tags/parentPostId), final cleanup больше не перечитывает live DOM,
  а Reply/Quote фиксируют parent в draft boundary до same-event insertion.
  Stage 4 finding №2 исправлен отдельно 2026-10-12: момент local capture для
  title/tags определяется фактическим input event этого поля, а не состоянием body.
  Space и paste сохраняют немедленно, focusout сохраняет накопленные правки;
  обычный ввод при пустом body больше не становится ложным immediate trigger.
  Stage 4 finding №4 исправлен отдельно 2026-10-12 только на presentation boundary:
  conflict detection и выбор версии уже работали с полным authoritative payload, но UI
  показывал только body. Side-by-side comparison теперь также показывает title, tags и
  parent reply target, когда эти поля присутствуют хотя бы в одной версии, поэтому
  non-body conflict визуально различим до выбора. Draft lifecycle/CAS/sync не менялись.
  Stage 4 finding №5 исправлен отдельно 2026-10-12 через восстановление общей authoring
  boundary: draft foundation больше не вводит собственные caps 100000/500/2000 символов
  и 150 KB request, которых нет у действующей публикации. Payload по-прежнему проверяется
  по структуре/типам, а transport использует обычный request JSON path, как publication
  использует обычный FormData path в том же Worker boundary. Client отдельно различает
  постоянный 4xx mutation rejection от временной unavailable/network ошибки: один и тот
  же отклонённый local snapshot не отправляется каждые 60 секунд, но следующая локальная
  версия получает новую попытку.
  Stage 4 finding №3 исправлен отдельно 2026-10-12 без ослабления server CAS:
  publication boundary блокирует запуск нового 60-секундного autosave, дожидается
  уже начатого server sync/reconciliation cycle и только после него повторяет
  публикацию с фактическими актуальными draft ID/version. Блокировка сохраняется
  на время publication request и снимается после завершения неуспешной same-page
  попытки; успешная навигация/ack завершает runtime обычным lifecycle. Поэтому
  собственный autosave больше не может сделать FormData fence устаревшим между
  submit и publication transaction, а реальный concurrent device/tab change
  по-прежнему остаётся защищён exact server CAS/conflict. Добавлен regression,
  который запускает submit во время незавершённого 60-секундного save, проверяет
  ожидание версии N+1 и отсутствие следующего autosave до завершения publication.
  Повторный поэтапный аудит Stage 5 (2026-10-11) для уже реализованного
  file-verification/private-R2 slice выявил четыре current-scope defects.
  Stage 5 finding №1 исправлен отдельно 2026-10-12 на filename anomaly boundary:
  Unicode General_Category=Format (Cf), включая bidi override/isolate и zero-width
  format controls, теперь отклоняется как invalid-name с suspicious=true; обычные
  Unicode filenames не запрещаются. Это сохраняет будущий Security/Attachments
  сигнал о признаках маскировки без расширения текущего attachment lifecycle.
  Stage 5 finding №2 исправлен отдельно 2026-10-12 без изменения content detector:
  declared MIME теперь имеет отдельную semantic consistency boundary поверх coarse
  text/ZIP/OLE detection. Конкретные MIME DOC/DOCX/XLS/XLSX/PPT/PPTX/ODF и
  JSON/HTML/XML/SVG/CSS/CSV/JavaScript сверяются с известной семантикой расширения;
  generic application/octet-stream, text/plain и application/zip не считаются
  доказательством более специфичного типа. Неизвестный non-generic MIME больше не
  игнорируется для известного semantic extension, при этом custom text/source name
  без известной семантики сохраняет broad-support path.
  Stage 5 finding №3 исправлен отдельно 2026-10-12 на UTF-8 sniff boundary:
  4096-byte sample теперь проверяется целиком fatal decoder-ом. Streaming decode
  включается только когда sample является реальным prefix более длинного файла,
  поэтому допускается лишь незавершённый UTF-8 code point на самой границе;
  malformed bytes внутри sample больше не скрываются. Если 4096 bytes — весь файл,
  незавершённый trailing code point отклоняется. Остался finding №4:
  Recognized binary verification ограничен magic prefix: заведомо обрезанные JPEG/GIF/PDF/ZIP
  payloads и произвольный ZIP под Office container name могут получить
  type-checked acceptance без минимальной structural sanity. Актуальный Cloudflare
  Workers R2 contract отдельно проверен: ReadableStream put, returned object size
  и single PUT для текущего 50 MB лимита соответствуют API; подтверждённого
  defect в one-pass R2 streaming/length fencing не найдено. HTTP upload route,
  DB attachment lifecycle/references, download/UI, durable Security/Attachments
  events, antivirus provider и orphan cleanup остаются будущей реализацией и не
  классифицированы как defects этого уже существующего slice. Finding №4 после независимого технического разбора Codex подтверждён на том же root cause:
  prefix-classifier нельзя использовать как окончательное доказательство структуры. Реализация
  начата поэтапно. Первый bounded subtask 2026-10-12 добавляет отдельный streaming structural
  validator contract для non-container image/PDF families (PNG/JPEG/GIF/WebP/PDF) без
  подключения его к R2 store path: PNG проверяет datastream order IHDR→IDAT→IEND и IHDR
  semantics, JPEG требует frame/scan/end markers, GIF — logical-screen minimum и trailer,
  WebP — RIFF/WEBP size+first image chunk, PDF — startxref + %%EOF tail. Validator хранит
  только bounded head/tail либо небольшой parser state и работает при произвольных chunk
  boundaries. Второй bounded subtask 2026-10-12 добавляет отдельный random-access ZIP
  finalizer без подключения к R2 store path. EOCD/ZIP64 EOCD определяют authoritative central
  directory; parser проверяет single-disk offsets/count/size, central records, optional directory
  signature, связь каждого central entry с local header и границу его compressed data до central
  directory, не буферизуя весь архив. Для
  DOCX/XLSX/PPTX проверяются package metadata + соответствующий main part; для ODT/ODS —
  нормативный первый uncompressed `mimetype`, exact media type, `META-INF/manifest.xml` и
  document content/styles presence, а ODF entries ограничены STORE/DEFLATE. Storage read failures
  не маскируются как invalid content. Третий bounded subtask 2026-10-12 добавляет random-access
  structural sanity для остальных уже поддерживаемых container families без подключения к R2
  writer: 7z проверяет signature/version, StartHeader CRC и bounded NextHeader range+CRC; gzip —
  RFC member header/flags/optional fields/FHCRC и наличие payload+trailer без распаковки DEFLATE;
  tar — 512-byte ustar headers, checksum, octal/GNU positive base-256 size и data-block boundaries;
  OLE/CFB — header/version/sector invariants, DIFAT/FAT allocation, directory FAT chain и Root Entry,
  включая v4 header padding. Все чтения bounded, а storage errors пробрасываются. Архивы не
  распаковываются и эта проверка не выдаётся за антивирус. Все format validators теперь имеют
  finalization boundary. Финальный bounded subtask 2026-10-12 подключает эти validators к
  authoritative private-R2 store path: PNG/JPEG/GIF/WebP/PDF проверяются на том же streaming
  upload, ZIP/Office/ODF и 7z/gzip/tar/OLE после private write читаются только bounded R2 ranges.
  `stored` возвращается только после structural success; structural rejection получает
  `invalid-structure`, private object best-effort удаляется и его key не возвращается.
  Storage/range-read failures остаются dependency errors и также не выдают key. Полный файл
  в память не собирается, архивы не распаковываются. Finding №4 закрыт на code-head
  `d038ad8`; exact-head CI #38292243315 (`checks` + `database`) прошёл успешно.
  Проверка уже реализованных этапов Editor 2.0 1–3 (2026-10-11)
  подтвердила и исправила текущие функциональные дефекты: двойной
  requestSubmit по Ctrl+Enter в Advanced; ошибочные смещения выделения в
  Simple при нескольких DOM text nodes (теперь абсолютные UTF-16 позиции
  выводятся из DOM Range для paste и toolbar); превращение введённого
  обычного текста с '#' / list marker в неявную Markdown-разметку
  (используются те же literal escape правила, что у plain-text paste);
  преждевременное закрытие :::spoiler по ':::' внутри fenced code.
  Добавлены регрессионные тесты на эти переходы и сохранение Markdown.
  Кодовый head a29197b прошёл CI #38137784787 (checks + database);
  Pages/browser acceptance и полный PR review по-прежнему впереди.
  Editor 2.0 Stage 5 — первый ограниченный срез (2026-10-11): в PR #215
  добавлены реальные внутренние границы file verification и private Cloudflare R2
  streaming store без создания внешних ресурсов. Проверка строится по фактическим
  начальным байтам/длине файла, сравнивает расширение, заявленный MIME и
  характерные бинарные сигнатуры, блокирует известные исполняемые форматы и
  подмены типа, применяет настраиваемый лимит 50 000 000 байт на файл.
  HTML/SVG/исходники не сохраняют активный Content-Type в R2; статус
  'type-checked' не выдаётся за антивирусную проверку, архивы не распаковываются.
  Сохранение использует private/random R2 object key, stream и fail-closed
  при неуспешной/несогласованной записи. Дополнительный текущий срез
  переводит writer на единый однопроходный ReadableStream: фактические первые
  4096 байт проверяются до записи, оставшаяся часть не буферизуется целиком,
  объём потока сверяется с объявленной длиной, превышение/обрыв отменяют
  выдачу object key и вызывают best-effort удаление объекта. Это подготавливает
  безопасный Workers request-body transport без использования formData() для
  файлов до 50 МБ. Проверки fragmented/changing-length/R2 interruption
  добавлены, результат CI фиксируется отдельно. Внешний бакет, binding и live R2
  проверка остаются Stage 6.
  Следующий bounded Stage 5 subtask 2026-10-12 добавляет только DB lifecycle/reference
  foundation для вложений через migration `0035_forum_attachments_foundation`: отдельный private
  asset хранит server-owned metadata/object key, а независимые draft-generation и published-post
  refs позволяют одному asset оставаться живым, пока существует хотя бы одна действующая связь.
  Draft ref содержит owner/context/draft ID, но намеренно не имеет FK на `forum_editor_drafts`:
  немедленная загрузка файла не создаёт и не ускоряет 60-second server draft sync. Composite
  attachment+owner FK запрещает чужие draft refs; post deletion удаляет только соответствующую
  post-ref, а RESTRICT на asset refs не даёт удалить общий asset до снятия всех связей.
  Repository boundary пока умеет только atomically создать asset+draft ref, owner-scoped list и
  точное удаление draft-ref. Новые relations не получают web runtime grants, потому что HTTP
  upload/download boundary ещё отсутствует. Code-head `fb9f2f3` прошёл CI #38302897708:
  `checks` и `database` green, включая clean PostgreSQL 17, schema manifest/parity,
  runtime privilege probes и Workers smoke. Первоначальный DB run упал только из-за неверного
  test assertion на wrapped Drizzle FK error; production code не менялся для исправления.
  Следующий bounded Stage 5 subtask 2026-10-12 подключает реальный private upload HTTP
  boundary к уже существующим verification/R2 helpers и DB refs. POST `/api/attachments`
  требует сессию, same-origin, текущую authoring permission и существующий editor context до
  storage write; тело идёт streaming, private object key наружу не возвращается, а DB failure
  после R2 write вызывает best-effort cleanup. Runtime R2 binding остаётся optional/fail-closed:
  без `ATTACHMENT_R2` route отвечает 503, внешний bucket/binding не создавался.
  Migration `0036_forum_attachment_security_events` хранит независимое durable событие
  подозрительной загрузки с уникальным upload ID, uploader/context/draft metadata, reason,
  declared/detected type и именно заявленным клиентом размером. Rejected object не нужен для
  сохранения события. Security → Attachments читает эту таблицу как read-only очередь;
  имена с control/bidi символами выводятся escaped, ссылок на R2/контент и synthetic events нет.
  Group 2/3 остаются заглушками. Web runtime получает только необходимые INSERT/SELECT grants.
  После отката первого ошибочного editor/upload UI slice отдельным bounded шагом подготовлен
  только draft-generation identity boundary: attachment generation становится доступна после
  успешной сверки метаданных/контента, не при сетевой ошибке или неразрешённом конфликте.
  Первая операция с вложением сначала локально фиксирует draft ID и при отсутствии
  прежнего локального черновика отмечает этот snapshot ожидающим штатной 60-секундной
  серверной синхронизации: немедленного POST нет, после успешного сохранения без новых
  правок повторной отправки нет. Это не объявляет текст изменённым и не меняет таймер.
  При смене draft ID прежний attachmentDraftId остаётся в локальных данных, а новые
  attachment operations закрываются,
  пока серверный перенос/разрешение ссылки не выполнен. Следующий bounded server API slice
  восстанавливает owner/context/generation-scoped GET list через React Router loader,
  DELETE exact draft ref и PATCH rebind retained refs между draft generations. Rebind
  выполняется транзакционно: сначала фиксируется исходный набор refs, destination insert
  идемпотентен, затем удаляются только зафиксированные source refs, поэтому конкурентная
  новая ссылка не теряется. HTTP boundary использует ту же canonical UUID semantics, что
  repository; private object key наружу не возвращается. Runtime draft-ref capability
  ограничена DELETE/INSERT/SELECT.
  Следующий bounded editor/upload UI slice заново подключает вложения поверх этих границ:
  picker, drag/drop и image paste доступны только после успешной draft reconciliation,
  generation rebind (если нужен) и полного GET restore exact generation. Поэтому stale restore
  не может затереть уже начатую загрузку. Image paste останавливает дальнейший text/HTML paste
  path. Upload использует XHR только ради byte progress, но получает устойчивый client UUID:
  повтор после неоднозначной transport-ошибки идемпотентно сходится к уже сохранённому asset/ref,
  а новый duplicate R2 object удаляется. In-flight upload не удаляется и не abort-ится при
  смене editor scope; поздний результат относится к исходной generation и восстанавливается
  при возврате. После determinate rejection Remove делает exact DELETE по стабильному upload ID;
  transport failure считается неоднозначным и остаётся retry-only, пока idempotent Retry тем же
  UUID не установит определённое состояние. Пока attachmentDraftId переносится на выбранную draft generation,
  новые вложения закрыты, но штатный 60-second text sync сохраняет выбранный текст.
  Rebind использует CAS-version уже сохранённого active target; новые remote changes
  проходят обычную reconciliation/conflict проверку.
  До следующего Stage 5 publication/download slice любой сохранённый attachment намеренно
  блокирует publication, чтобы файл не был молча потерян при существующем text-only publish
  path. Editor UI не выдаёт private object key и не скачивает file content при restore.
  Следующие части Stage 5: publication/download integration и orphan cleanup.
  Реальное R2 provisioning/binding/live acceptance остаётся Stage 6.

- Editor Stage 5 package 1 — исторический in-progress срез (2026-10-14, PR #215):
  Existing topic/Help/reply publication transactions now validate an explicit snapshot
  of selected draft attachment IDs against authoritative owner/context/canonical generation
  refs under the existing scope lock; the same transaction moves confirmed refs to
  forum_post_attachments, removes promoted draft refs, and finishes the CAS draft.
  Missing/mismatched refs cause a rollback, preserving the text-only safety guard
  for legacy callers. A controlled /api/attachments/file/:attachmentId read route
  checks current draft-owner or published post-reference authority before streaming
  private bytes with no-store/nosniff/download headers. Topic rendering attaches
  filename/size/download metadata through a batch read; editor only permits submit
  when uploads/deletions are settled. No external bucket provisioned and no
  publication/idempotency, inline-image or cleanup scope expanded. This is an
  implementation-progress record, NOT an acceptance claim.
  Code and integration checks on head 8ce041b (CI #38485636560): checks + database
  successful; 939 application tests / 92 files and 276 PostgreSQL tests / 27 files,
  with lint/typecheck, application/UI-preview builds and schema/grants guards green.
  Sol's independent review of previous code head 8c47966 found no code defect,
  but identified missing package-1 evidence: rebind/publication orderings and real
  action→writer→service→DB tests are now covered by the additional regressions.
  Real-browser upload→publication→download and failure-preservation with fake
  storage has NOT been executed; package acceptance remains pending.

- Editor 2.0 Stage 5 packages 2 and 3 — implementation (2026-10-14, PR #215):
  Shared attachment presentation now displays published verified raster images through
  the authorized inline stream and offers on-demand image previews for saved editor
  files; text/source previews use inert text/plain, while SVG, HTML, archives and
  other files remain download-only. RTL-safe file labels and responsive presentation
  have focused tests. The download route checks the live owner-draft/post reference
  before private bucket access and does not expose object keys.
  Cleanup is implemented as a bounded, repeatable ForumAttachmentCleanup processor
  behind the existing private storage adapter. Forward migration 0038 records durable
  delete claims and DB reference-insertion gates; stale/terminal draft refs can be
  pruned, truly unreferenced assets are leased/claimed before physical deletion,
  and ambiguous delete outcomes remain recoverable. Tests exercise concurrent
  processors, ref races, shared assets, terminal aliases, lease recovery and lost ACK.
  Production scheduling/Queue, external R2/Neon provisioning and real deployed
  acceptance are NOT implemented and remain outside this local/CI slice.
  The production schema manifest now matches migration 0038 including its checks,
  indexes, definer trigger function and draft/post insertion triggers. Exact code
  head 0af5d76, CI #38547127273: checks and database SUCCESS (943 app tests,
  282 PostgreSQL tests, lint, TypeScript, app and UI-preview builds, schema/grants).
  All three package implementation changes are present in PR #215; this is NOT an
  independent whole-Editor/owner browser acceptance. The real browser upload→publish
  →navigate→download and failure-preservation path with a test bucket is still
  unverified. Editor 2.0 PR was open and unmerged at this checkpoint; it later merged 2026-10-18.

- Stage 5 attachment/draft concurrency correction (2026-10-13): Codex выполняет реализацию
  по прямому назначению владельца. Stale GET restore отсекается cleanup fence; выполняющиеся
  upload/retry/remove сохраняют исходную identity при retained переходах A→B→C.
  Изменение вложений обновляет local editedAt/dirty snapshot и попадает только в очередной
  штатный 60-second CAS save. Выбранный local текст сначала сохраняется этим же циклом,
  затем PATCH проверяет active target ID/version под общей owner/context transaction lock.
  Migration `0037_forum_attachment_draft_generations` хранит durable redirects и NULL terminal
  markers: поздний POST и retry/DELETE по прежнему ID следуют переносу; завершённое поколение
  не оживает после появления нового text head. Publish/delete/expiry закрывают generation
  атомарно, save отклоняет retired/redirected ID. Metadata координации каскадно удаляется
  вместе с owner, как text drafts; private asset lifetime не меняется.
  Существующий Stage 5 text-only publication guard теперь проверяется на сервере и откатывает
  публикацию при действующих attachment refs. Scope lock берётся до topic/user locks,
  чтобы first-save/upload/publication не образовали lock-order cycle. Runtime capability
  новой таблицы ограничена INSERT/SELECT; attachment row locks с лишним UPDATE требованием
  удалены. Client различает CAS conflict (409) и retired generation (410), сохраняя выбранный
  текст и очищая только завершённые attachment bindings. После неопределённого DB commit
  приватный объект сохраняется до установления ownership; stable-ID retry не получает ссылку
  на уже удалённый объект. Подтверждённый logical reject очищает новую private write.
  Полный локальный прогон прошёл: 904 application tests (maxWorkers=2), 257 PostgreSQL 17
  tests; typecheck, lint и обе сборки успешны. Предшествующий parallel local run имел один
  5-second timeout public-read; отдельный повтор всех 50 public-read tests и полный повтор
  успешны. Статус exact-head CI фиксируется в checks PR, независимые GPT-5.6 Sol/GPT-6
  проверки и merge не выполнены. Publication promotion/download,
  orphan cleanup, AV и external R2 provisioning не реализуются этим исправлением.

- Дополнительная коррекция Stage 5 attachment/draft lifecycle (2026-10-13): по прямому
  назначению владельца Codex переносит проверенную основу GPT-6 из соревновательного
  PR #222 (d6495c0) в основной PR #215. Explicit Keep-server успешно сохраняет выбранный
  snapshot без проигравшего attachment provenance и меняет отдельный selection epoch,
  в том числе при прежнем text draft ID. Ошибка localStorage сохраняет конфликт и текст.
  Clean refresh/Keep-local сохраняют текущие загрузки, исходные IDs и штатный 60-second CAS.
  Устаревшие upload/GET/PATCH/DELETE callbacks не применяются к новому выбору; позднее
  завершение upload/DELETE, включая потерю подтверждения, уведомляет только owner/context
  и инициирует authoritative GET текущего поколения, а не прямое изменение нового UI.
  Suspicious retries используют versioned server-derived SHA-256 key по authenticated
  owner, stable upload UUID, original context/draft и bounded rejection evidence поверх
  существующего UNIQUE upload_id. Primary event ID остаётся серверным, исторические UUID
  keys читаются; новая схема, discard endpoint и внешние зависимости не добавлены.
  Регрессии используют настоящий MarkdownEditor с обоими hooks, управляемые transport/R2
  заглушки и actual upload route → pooled native PostgreSQL. Новый exact-head CI и
  независимая проверка фиксируются в checks и служебном канале по факту; результаты
  предыдущих heads не считаются доказательством новых проверок. После восстановления
  рабочей среды прошли 933 application tests / 90 files (maxWorkers=2) и 261 PostgreSQL 17
  tests / 27 files; typecheck и обе сборки успешны. Native route imports явно включены
  в Node TypeScript project без ослабления compiler/CI. Cache snapshot другой вкладки
  сохраняет свои attachment bindings, остаётся dirty и проходит metadata verification
  и штатный CAS до rebind. Ошибка обоих вариантов выбора сохраняет конфликт; runtime
  epoch отсекает старые draft GET/save ответы и освобождает следующий regular cycle.
  Real R2 provisioning, bindings/live acceptance и Stage 6 остаются отложенными.

## Завершение Editor 2.0 и follow-up

## Editor 2.0 — завершение реализации в PR #215 (2026-10-15)

Впоследствии PR #232 исправил четыре подтверждённых тогда current-Stage
boundary-дефекта поверх Editor 2.0. Cleanup теперь учитывает unresolved attachment-version membership и
не claim/delete-ит объект до завершения conflict resolution; после снятия boundary обычная
очистка сохраняется. Simple table input оставляет native paste внутри выбранной ячейки, а
surface paste продолжает обслуживать body/cross-leaf сценарии. Межвкладочный выбор cached
candidate повторно читает authoritative server head: active draft проходит explicit resolve,
а две version-0 вкладки либо новая generation поверх terminal head проходят обычный CAS save;
conflict UI закрывается только после успешного ответа сервера. Simple Enter использует общий
surface Range для selection между соседними leaves/blocks вместо leaf-local fallback.
Targeted application regressions (118 tests), полный application suite (1064 tests), полный
attachment PostgreSQL 17 suite (58 tests), TypeScript, production build и changed-files ESLint
локально проходят. Exact code/test head `36e1306832e1910a5ed9e0bf9e5400d39abf45b6`
прошёл GitHub Actions #39135879866: `checks` SUCCESS (1064 application tests, lint,
typecheck, application/UI-preview builds и guards) и `database` SUCCESS (313 PostgreSQL 17
tests, migration/schema/privilege checks и Workers smoke). После первого независимого
review Миры и Лиры были подтверждены два дополнительных draft/attachment lifecycle defect;
их bounded correction внесён следующим набором изменений.

Bounded follow-up correction PR #232 (2026-10-19): после согласованного review добавлены
защита от indefinite retention attachment boundary после 30-day expiry (включая отсутствие
live refs) и server-fenced новый draft при скрытом >30d terminal tombstone и baseVersion=0.
Добавлены отдельные PostgreSQL regression scenarios для обоих случаев.
Exact code/test head `0c6c7c58afbdcd65d486e1462e6eca24dc653b70` прошёл
GitHub Actions #39176074057: `checks` SUCCESS (1064 application tests / 96 files,
typecheck, lint, build/guards) и `database` SUCCESS (315 PostgreSQL 17 tests /
27 files, schema/privilege/Workers checks). На этом промежуточном head повторный independent whole-PR review ещё не выполнялся;
новых browser/runtime прогонов для двух follow-up коррекций эта запись не заявляет.

По прямому назначению владельца Codex принимает implementation ownership;
обычная схема Codex → Sol → GPT-6 для этого пакета заменяется реализацией Codex
с независимой проверкой Sol/GPT-6. Merge выполняет только владелец.
Постоянные требования перенесены в `docs/EDITOR.md`; временный `EDITOR_SPEC.md` удалён.
Исторические записи ниже описывают предшествующие ограниченные срезы, а не текущий
перечень незавершённых функций.

Завершены общий footer Attach/status/Cancel/Publish во всех четырёх authoring flows
и fullscreen, доступное More-меню без clipping, компактная панель с основными
инструментами на виду и сенсорными Indent/Outdent для Advanced, Advanced B/I/K
shortcuts и полная очистка account-scoped spellcheck preference. Формы сохраняют
publication lock через loading. Native publication replay вынесен в следующую
event-loop task: браузер больше не игнорирует повторный requestSubmit при ещё
выполняющемся исходном submit. Новый task сохраняет native validation и submitter.

Post-edit server draft/upload authorization теперь использует актуальную
`forum.post.editOwn` и authoritative author identity. При открытии правки явная
attachment-операция закрепляет published files обычными private draft refs до первого
60-second text save. Миграция `0042_attachment_edit_snapshots` хранит однократную
инициализацию поколения, включая пустую выборку; marker переносится при rebind.
Прежние и новые файлы используют один lifecycle, Remove и exact publication manifest;
восстановление не пересекает выбранные IDs с изменившимися post attachments.
Remove/Cancel не меняют публичные ссылки. Save атомарно заменяет post refs выбранными
draft refs, сохраняет shared assets, CAS/rollback и idempotent receipt identity.
Runtime web contract добавляет INSERT/SELECT на snapshot markers и необходимый
DELETE на forum_post_attachments; внешние grants
не применялись. Снятие inline images использует Markdown AST ranges и сохраняет
буквальные примеры внутри кода/escaped syntax.

Настоящий local Worker/R2 emulator выявил несовместимость arbitrary inspected
ReadableStream с native R2 put: требуется известная длина. Исправлено Workers
адаптером с FixedLengthStream, потоковой передачей и отменой upstream при отказе.
Private interface передаёт byteLength отдельно от R2 HTTP metadata. Внешний R2
bucket/binding, миграции production и infrastructure Stage 6 не подключались.

Фактически выполнены Chromium 154.0.8037.57 на реальном React Router/Workers app
и disposable PostgreSQL 17: concurrent text/image upload; lost response после
реального commit + same-ID retry; local reload/recovery; guest draft denial;
fullscreen create-topic + durable replay; public download; published attachment
removal через Cancel/reload/Save. EN/RU/HE geometry прошла при 1365/768/390/320 px.
Отдельные два browser contexts прошли 60-second sync, automatic remote recovery,
explicit divergent conflict choice и remote publication retirement без resurrection.
Для этого теста Playwright clock продвигал существующие 60000-ms browser intervals;
HTTP, R2 и PostgreSQL не подменялись. Это проверка локального runtime, не внешний rollout.

Последующий causal regression проверяет независимый unsynced A, публикацию B со
снятием последней public ref, явный выбор A, regular CAS нового поколения, rebind,
revision rebase и cleanup. Реальные PostgreSQL tests проверяют обе очередности
snapshot/publication locks и отсутствие повторного добавления последнего удалённого
файла при reopen/rebind. Полный DB run: 304 tests PASS, schema manifest parity и
positive/negative runtime privilege probes PASS. Неизменённый опубликованный source
больше не захватывается как input при StrictMode cleanup до metadata/CAS discovery.
Полный application run первого исправления: 1021 tests PASS; exact-head CI первого
исправления прошёл checks/database. Финальные whole-Editor checks ещё не завершены.
Дополнительный Chromium flow воспроизвёл обе независимые edit generations: B сняло
последнюю public ref, A выбрало свою версию, прошло штатный 60-second interval
(Playwright fastForward), CAS/rebind и reload; файл читался через private draft ref
и вновь публиковался после явного revision rebase. Ни HTTP, ни DB/R2 не подменялись.

Второй bounded шаг установил причину сбоя Help attachment-only publication: native
Ctrl+Enter публиковал вопрос, но последующий topic loader передавал пустой body в
текстовый translation service и возвращал 500 (`original content must be a non-blank
string`). Loader теперь исключает пустые post bodies из translation/generation units,
сохраняя original presentation, порядок соседних сообщений и файлы. Текстовая validation
service не ослаблена. Две регрессии проверяют empty/whitespace body, перевод соседнего
сообщения, отсутствие generation unit для пустого body и отображение attachment.
Целевой public-read run: 63 tests PASS. В Chromium Help прошёл Drop, clipboard PNG,
preview/Remove, similar-question check, attachment-only Ctrl+Enter, загрузку темы и
отказ обычному автору в чтении history. CI Codex head `e805c41` прошёл
(1023 application / 304 database); независимая полная приёмка пока не завершена.

По независимой проверке Sol исправлен compact/mobile контракт: основные команды
доступны непосредственно на панели, кодовые Indent/Outdent в Advanced используют
существующую fenced-code Tab/Shift+Tab семантику. Добавлены compact-mode регрессии,
а accessible name оригинального файла проверяется через реальную English локализацию,
включая имя файла. Code/test exact head `7a862a365209c0d531eda2aed1e37bb97e658c14`
прошёл GitHub Actions #38805981677: 1025 application tests / 96 files и 304
PostgreSQL tests / 27 files, оба jobs SUCCESS. Проверка реальной мобильной геометрии
на этом head GPT-6 не выполнена; независимый gate Sol и owner visual acceptance
остаются открытыми.

Независимый whole-PR review Sol выявил отсутствие независимого права чтения
«Безопасность → Вложения». В correction добавлены `forum.attachmentSecurity.read`,
permission gate перед security event store, начальные grants moderator/admin,
forward migration, актуальный каталог и точечные регрессии.
Exact code/test head `f356e31097ef851f23707b2728bdfdb1d8aeb8ae` прошёл CI
#38814080748: 1026 application tests / 96 files, 304 PostgreSQL tests / 27 files,
оба jobs SUCCESS, включая schema-manifest parity. Решение Sol по correction gate
и самостоятельная browser/owner visual acceptance ещё ожидаются.

После финальной source/browser сверки Sol и Codex выявлены две current-scope проблемы:
перекрытие интерактивных инструментов compact in-page toolbar при узкой LTR/RTL
ширине и пустой default URL `/:locale/attention`, дававший security-only
пользователю 403 при видимой ссылке в header. Текущий bounded correction-пакет
разрешает адаптивный перенос существующих групп toolbar и использует security
как default mode при независимом security-only разрешении. Правки source,
регрессионные тесты и документация подготовлены. Code/test head
`1fed72195536bc3e51967a68a4248c2acb7d21a5` прошёл GitHub Actions
#38827692880: checks SUCCESS (1026 application tests / 96 files, typecheck/lint/build)
и database SUCCESS (304 PostgreSQL tests / 27 files, schema/evidence gates).
Исправленная mobile toolbar geometry перепроверена на реальном React/Chromium runtime:
EN/LTR и HE/RTL, 320/390px, Simple/Advanced прошли native geometry и hit-testing без
overlap/interception; обязательные direct controls, More, mode switch, Preview и Fullscreen
доступны, fenced-code pointer Indent/Outdent работает, обычный prose не изменяется.
Новых browser-observable дефектов в этом bounded correction path не выявлено.

Owner visual acceptance текущего Editor 2.0 состояния подтверждён 2026-10-16 как достаточный
для закрытия тогдашнего implementation PR без дальнейшей косметической полировки.
На тот момент оставалось пройти назначенный review-цикл и исправить только
подтверждённые дефекты без расширения Editor 2.0.

Отдельная визуальная/UX-доработка Editor 2.0 перенесена решением владельца на финальный
общепроектный refinement-pass после завершения основной функциональной работы и external
integration, перед первым публичным production-релизом. Этот будущий pass не блокировал
завершение и merge PR #215.

На дату этого среза PR #215 ещё был открыт и ожидал назначенный review-цикл;
отдельный GitHub Codex Code Review был запрещён владельцем.
PR #215 впоследствии merged в `main` 2026-10-18.

## Editor 2.0 — дополнительные исторические checkpoints

### Editor 2.0 edit lifecycle E1 — исторический in-progress checkpoint 2026-10-14

PR #215: targeted change at `f6539ff` keeps the published-post edit controls and draft publication barrier pending during React Router `loading` after an `editPost` submission, rather than unlocking immediately after `submitting`. Independent Codex diagnosis records the underlying loss-of-late-input scenario in shared service PR #147. The gated `submitting → loading → idle` success regression passed in CI #38609692082, while the failed-save regression exposed a separately confirmed owner-subtree remount on same-topic POST. A structural correction at `fd7eb7e` retains same-page editor/draft runtime and resets the translation manager's own navigation lifecycle; the status-bearing 400/storage-failure/retry regression was added at `961c730`. The exact code+test head `619105a` passed both `checks` (955 application tests / 93 files; lint, typecheck, builds, schema checks) and `database` (293 native PostgreSQL tests / 27 files) in CI #38619373836. The E1 current-scope published-edit lock/failed-save/runtime-retention correction is verified within repository CI; standalone live-browser acceptance and whole-Editor final review remained outstanding
at that checkpoint; E2/E3 findings were still open then, not current unmerged PR #215 gates.


### Editor 2.0 E2 — edit-resume URL consumption (2026-10-14)

PR #215: fixed confirmed re-opening of a cancelled published-message editor after same-topic revalidation. Cancel and acknowledged successful Save now consume only the `editPost` URL command via same-path `replace` navigation, preserving other query parameters and hash; this does not delete or auto-publish the recoverable edit draft. A fresh explicit resume URL can still open the authorized form. Added actual TopicRoute/router regressions for Cancel → revalidate → remain closed → explicit resume and for Save completion consuming the resume parameter. Code commit `bac86a7`, tests `c89f38c`. The exact code/test head `c89f38c` passed both `checks` and `database` in CI #38623649760; documentation-only follow-up heads do not change runtime behavior. At this checkpoint E3 and whole-Editor acceptance were still open.


### Editor 2.0 E3 — published revision fence bound to recoverable edit draft (2026-10-14)

PR #215 addresses the confirmed current-scope E3 stale-edit overwrite scenario: the previously mutable hidden `expectedRevisionId` tracked the latest loader post even when a locally or remotely restored edit draft belonged to an older published revision. A post-edit draft now retains its `publishedRevisionId` in the existing JSONB/local draft payload (optional for backward compatibility; no schema migration), and the live edit form submits that draft-owned fence, not the latest loader revision. The editor is not remounted solely by a changed published revision. When a published revision differs or a legacy draft lacks a recorded baseline, Save is blocked and the existing working text remains available until the author explicitly reconciles with the current published revision. Server post revision CAS is unchanged. TopicRoute/MarkdownEditor regressions cover R1→R2 revalidation, local versioned/legacy recovery, and restoration of a server-synced draft on another device. Exact code+test head `d607bd7` passed `checks` (960 application tests, 93 files; lint/typecheck/build and validation) and `database` (293 native PostgreSQL tests, 27 files) in CI #38626401557. The E3 client overwrite cause is corrected and repository-CI verified; independent final whole-Editor/browser acceptance is not implied. E1/E2 were previously corrected; whole-Editor acceptance and merge remained
outstanding at that checkpoint (PR #215 later merged 2026-10-18).


### Editor 2.0 — @mentions authoring suggestions (2026-10-14)

PR #215 now supports an initial, bounded user-facing @mention authoring slice. After typing `@` and a name fragment, authenticated authors receive up to eight matching registered users and can insert a Markdown profile link resolved by immutable account ID in both Simple and Advanced editor modes. `/:locale/mentions` returns only member ID and public display name, with session protection, length-limited/LIKE-escaped input, no email projection and private/no-store responses. The new editor suggestion surface uses existing source-edit/history/local-save primitives; no new database table, migration or dependency was added. English, Russian and Hebrew UI label catalogs/fingerprints were updated.

Exact implementation/test head `22c3d3b4123960ef22bf2be097813dcaef1489be` passed `checks` (968 application tests across 95 files; lint/typecheck/build/standard guards) and `database` (294 native PostgreSQL tests across 27 files) in CI #38629891041. Unit/integration tests cover literal-name search and API authorization, escaping and private data; Unicode mention fragment detection; and stable profile-link insertion in both editor modes.

**Remaining Editor 2.0 scope at the 2026-10-14 authoring checkpoint (historical):** durable mention-notification generation on successful publish/edit, duplicate suppression against reply notifications, quoted/code exclusions, edit-history notified-set semantics, plus other approved editor completion/acceptance work. This authoring slice does **not** claim those behaviors are implemented. No live browser/owner visual acceptance, final whole-Editor independent review or merge
was claimed for that checkpoint.


### Editor 2.0 — published @mention notifications (2026-10-14)

PR #215 extends the already-verified @mention authoring UI with publication-time recipient extraction and durable notifications. `publishedMentionRecipients` parses Markdown AST and collects unique stable profile account IDs, excluding block quotes, inline/fenced code, image URLs and plain `@` words. The successful create-topic/initial-post, reply, and published-post-edit transactions insert mention notifications alongside publication, not during draft/autosave. Existing recipient+post uniqueness doubles as the lifetime notified-set across edits and prevents duplication with reply notifications (which are inserted first); unknown IDs and author self-mentions are filtered. A `kind` field with `reply` default, constraint and migration `0041_published_mentions` distinguishes inbox presentation without changing established notification IDs and read semantics. Existing persistence/CAS and transactional replay remain in force. Tests cover Markdown parsing/exclusions and native PostgreSQL delivery, reply deduplication, edited mention removal/re-addition and failed edit rollback. Source manifests, snapshots, runtime schema and localized UI resources were updated as part of this slice. Exact code/localization head `53e3009e58aef6370ded49b389f60b6ff1e74764` passed `checks` (971 application tests in 95 files; lint/typecheck/build and schema guards) and `database` (297 native PostgreSQL tests in 27 files) in GitHub Actions #38635537460. No live external deployment, owner acceptance, whole-Editor review or merge is claimed.


### Editor 2.0 — browser spellcheck slice (2026-10-14)

PR #215: native browser spellcheck now follows agreed mode defaults (enabled in Simple, disabled in Advanced) and supports a user-controlled checkbox in the editor extra tools. An explicit choice persists only in localStorage by authenticated account ID; guest/no-storage mode uses defaults and account switching cannot import another user's setting. The checkbox affects both the advanced Markdown textarea and nested editable Simple-mode text leaves without altering stored Markdown, publication bodies or draft payloads. English/Russian/Hebrew labels and catalog source fingerprints use existing localization flow. Exact implementation/test head `6a26e7a` passed `checks` (972 application tests / 95 files, lint/typecheck/build/schema validation) and `database` (297 native PostgreSQL tests / 27 files) in CI #38638256953. This is the native spellcheck/preferences *slice*, not completion of code wrap/line-number preferences, full RTL/paragraph-direction UX, live-browser acceptance or whole Editor 2.0 review. No third-party dictionary engine or external resource was added.


### Editor 2.0 — code block wrapping and line-number preferences (2026-10-14)

PR #215 completes the agreed code-block presentation slice using the existing Wrap/No wrap and Line numbers toolbar actions. Rendered code is segmented by source lines with a line-aligned optional number gutter (including blank lines); wrapping is presentation-only, default remains no-wrap with horizontal scrolling, and code remains LTR in RTL contexts. The source newlines remain in the rendered DOM for existing editor consumers, and Copy code still uses the original source string, never gutter labels. The existing per-account localStorage keys are reused; account preferences propagate to other mounted code blocks and across tabs via browser storage events. No Markdown, draft data, publication body, database schema or server API is changed. A rendered-code regression checks gutter rows, blank lines and exact clipboard source; existing Markdown-editor multiline-code regression remains green. The exact code/test head `db8b0f2bf54f22e518705d017a7e452eacad3b8f` passed both `checks` (973 application tests / 95 files, lint/typecheck/build/validations) and `database` (297 native PostgreSQL tests / 27 files) in GitHub Actions #38640925057. Browser/owner visual acceptance, further editor requirements and final whole-Editor reviews remain pending; no merge or external deployment occurred.

### Editor 2.0 — code block correction following independent diagnosis (2026-10-15)

PR #215 repairs three current-scope regressions identified by Codex in the code-block presentation slice and compared by GPT-5.6 Sol. The renderer retains per-source-line layout so wrapped line numbers remain aligned, but uses ordinary in-flow source newlines instead of zero-size absolutely positioned newline spans, preserving native selection/Ctrl+C blank lines; all rows share a gutter width based on the maximum source line-number digits, including 9→10 and 99→100 boundaries; and Diff row highlighting again obeys the existing 20,000-character per-block safety limit. The existing post-wide syntax highlighting budget also gates Diff rows. No source Markdown, database, API, dependencies or account-scoped preference keys are modified. Focused automated regressions cover source newlines/multiline highlighting, gutter digit transitions, oversized Diff and the full-post budget. A separate isolated Chromium browser copy/paste control reproduced the hidden-newline loss and demonstrated ordinary newlines restore blank lines. Exact-head CI, production-layout browser geometry and owner visual acceptance must be recorded independently when actually completed; none is asserted by this note. No merge, Stage 6 rollout or final whole-PR Code Review.

### Editor 2.0 — automatic prose-block direction (2026-10-15)

PR #215 adds source-preserving per-block `dir="auto"` to published Markdown and the Simple visual authoring tree for paragraphs, headings and list items (including nested quoted/technical-content paragraphs), independent of the surrounding UI locale. Inline technical code and fenced code are explicitly LTR. The preview uses the same public Markdown renderer; no Markdown serialization or draft/published content changes are introduced by switching Simple/Advanced or Preview/Split. Added regressions for mixed English/Hebrew/Arabic prose, technical code inside RTL context and editor view/mode round trip with exact form source. The HTML-standard first-strong-direction behavior was independently checked in an isolated Chromium rendering fixture at mobile width. This slice covers automatic direction only: the separately approved manual per-paragraph direction control and any persistent authored representation for that override are **not implemented**. No undocumented control syntax, invisible direction characters or new storage have been introduced. Exact-head CI/checks, full deployed browser matrix, owner visual acceptance and whole-Editor review must be recorded when verified; not claimed here. No merge or production rollout.

### Editor 2.0 — manual per-paragraph LTR/RTL direction (2026-10-15)

PR #215 implements the remaining agreed §9 manual direction override on an existing selected prose paragraph/heading/list item in both Simple and Advanced modes. The extra-tools menu offers Auto / Left to right / Right to left with EN/RU/HE UI labels. An explicit choice is stored inside authoritative Markdown as a source-visible trailing `{:vico-dir=ltr}` / `{:vico-dir=rtl}` marker; Auto removes it, leaving all other source bytes unchanged. A shared narrowly-scoped mdast transformation turns only unescaped, supported terminal markers into a safe HTML `dir` attribute, excluding the marker from Simple/Preview/published display. The position of preceding text remains intact for visual selection and editing, and technical code retains LTR. History Undo/Redo, mode switching and published post revisions use the existing source and data boundaries; no new persistence/DB/API or client-only settings. Unsupported and escaped tokens remain literal source. Regression tests cover lossless direction edits, mixed-language and protected code, hidden/escaped marker rendering, UI control, preview, Undo/Redo and unchanged source across mode changes. Verified exact code head `3b515a5625d57eaaecae68024fc12d23474e1dbe` passed [CI #38659882047](https://github.com/iliya1947/vico-forum/actions/runs/38659882047): checks success (982 application tests / 95 files, lint/typecheck/build/guards) and database success (297 PostgreSQL tests / 27 files). This is repository CI acceptance; real integrated browser/owner visual acceptance, whole-Editor reviews and external rollout are not claimed. No merge.

### Editor 2.0 — manual direction heading regression correction (2026-10-15)

GPT-5.6 Sol's independent review of PR #215 head `0235a898` confirmed a current-scope Markdown semantic regression: applying a manual paragraph direction to Setext headings appended `{:vico-dir=...}` after the underline, invalidating the heading; for ATX headings with optional closing hashes, it appended after the hashes and turned them into visible text. GPT-6's bounded correction changes `setParagraphDirection` to insert/replace/remove the marker at the last positioned heading child before closing heading syntax, while retaining the existing paragraph/list path. The shared Markdown direction transformer recognizes the marker at the end of the original last text child's source span rather than at the end of the whole heading source, without treating escaped tokens as formatting. Untouched content and line endings remain unchanged, and Auto removes only the explicit marker. Focused source and rendered-output regressions exercise Setext H1/H2 (including CRLF), ATX closing hashes (including inline formatting), and plain ATX with RTL/LTR/Auto round trips. Exact implementation code/test head `1deb4a516719126cce4bcbab207c2d2d0c271d2b` passed [CI #38718058956](https://github.com/iliya1947/vico-forum/actions/runs/38718058956): checks SUCCESS (993 application tests / 95 files, including lint/typecheck/build guards) and database SUCCESS (297 PostgreSQL tests / 27 files). This is the bounded correction submitted for Sol's independent re-check; it is not whole-Editor acceptance, deployed/browser validation, Codex Code Review or merge.

### Editor 2.0 — attributed quote correction (исторический checkpoint 2026-10-15; verification тогда pending)

PR #215 implements a bounded correction after Sol/Codex diagnosis of the attributed-quote renderer. The ReactMarkdown HAST blockquote attribution recognizer now skips incidental whitespace and identifies only the first semantic quote-header paragraph/link. Generated Markdown quote labels entity-escape ampersands so author spellings such as `&copy;` and `&amp;` survive visible rendering. The existing ordinary Markdown source representation, reply relationship and Range/ResizeObserver presentation remain unchanged.

CNT-04 now omits only recognized attribution-label text nodes from machine-translation segments while leaving quoted body text and other link labels translatable. The shared post-body current-translation selector rejects same-revision translated content when its recognized quote-author/number/permalink sequence differs from the source. Post-body task preflight and serialized PostgreSQL planning apply that selector rather than treating every stored row as valid; conditional publication replaces invalid quote-attribution rows atomically while preserving valid manual-translation precedence. The protection policy advances to `cnt06-quote-attribution-v1` for new task identity/policy checks. Focused source/renderer, selection/presentation, planner and native PostgreSQL regressions were added.

At this initial checkpoint exact-head CI and applicable acceptance required verification;
no CI pass, browser matrix, final whole-Editor review, formal Codex Code Review, merge
or external rollout was claimed for this intermediate revision.

### Editor 2.0 attributed quote correction — exact-head repository CI (2026-10-15)

Code/test head `4122e089bcb387ac4b3bcf976801e9e37ba32359` passed [GitHub Actions CI #38741751698](https://github.com/iliya1947/vico-forum/actions/runs/38741751698): `checks` SUCCESS (1003 application tests / 95 files, lint, typecheck, builds and validations) and `database` SUCCESS (298 native PostgreSQL tests / 27 files, migration/privilege/Workers smoke). Two earlier CI heads failed due to test harness/TypeScript project listing rather than a confirmed production regression; the corrections are included in this exact code/test head. An unrelated locale serialization failure (`40001`) seen in the first run did not reproduce on the next exact-head database run; no locale implementation change was made. Real integrated browser behavior, published/editor parity across modes and owner visual acceptance of this exact change remain unverified. This is a code/test gate only, not Sol's independent acceptance, whole-Editor acceptance, formal Codex review, infrastructure change or merge.
