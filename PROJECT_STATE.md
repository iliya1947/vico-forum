# PROJECT_STATE.md

Последнее обновление: 2026-10-18

## Назначение

Этот файл фиксирует только текущее фактическое состояние репозитория, известные текущие
ограничения и ближайший маршрут разработки.

Постоянные продуктовые и архитектурные решения находятся в соответствующих source-of-truth
документах:

- `PROJECT.md` — продуктовый и технический baseline;
- `PROJECT_HISTORY.md` — значимая история решений, регрессий и последующих corrections;
- `ROADMAP.md` — последовательность этапов;
- `TRANSLATION_ARCHITECTURE.md` и `docs/translation/*` — мультиязычность и переводы;
- `docs/auth/AUTHORIZATION.md` — application authorization;
- `docs/database/*` — migrations, Hyperdrive и external rollout.

История отдельных PR, commit SHA и CI run не дублируется здесь; значимые historical/corrective
цепочки фиксируются в `PROJECT_HISTORY.md`.

## Editor 2.0 — завершение реализации в PR #215 (2026-10-15)

Follow-up PR #232 исправляет четыре подтверждённых current-Stage boundary-дефекта поверх
смёрженного Editor 2.0. Cleanup теперь учитывает unresolved attachment-version membership и
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
tests, migration/schema/privilege checks и Workers smoke). Последующий review-cycle ещё не выполнен.

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
для закрытия текущего implementation PR без дальнейшей косметической полировки. Цель теперь —
завершить Editor 2.0 без расширения scope: пройти обязательный последовательный
четырёхагентный review-цикл и исправлять только подтверждённые дефекты текущего Stage.

Отдельная визуальная/UX-доработка Editor 2.0 перенесена решением владельца на финальный
общепроектный refinement-pass после завершения основной функциональной работы и external
integration, перед первым публичным production-релизом. Этот будущий pass не блокирует
завершение и merge PR #215.

PR #215 остаётся открыт. Перед merge требуется последовательный четырёхагентный review-цикл
по актуальному `AGENTS.md`; отдельный GitHub Codex Code Review для #215 владельцем запрещён.

## Текущая фаза

Vico Forum находится в ранней pre-release разработке.

- PR #227 (in progress) исправляет подтверждённый test-suite audit reliability defect
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

- Registration/email login merged by owner in PR #214 (2026-10-10): existing Better Auth 1.7.4
  enables sign-up and sign-in with email/password, default auto-session and 8–128 character
  password validation without mandatory email verification. Locale-prefixed guest routes
  `sign-in` and `sign-up` preserve an origin-safe forum-local returnTo, leave Google OAuth
  available and reuse Better Auth user/account/session/rate-limit tables and dynamic
  forum authorizations. The email sender, verification and password reset are deliberately
  deferred by owner decision 2026-10-10; no email provider or new DB schema introduced.
  Exact implementation-head CI succeeded on `2dbea7c`: 671 application tests,
  211 native PostgreSQL 17 tests including a real Better Auth HTTP registration/login
  round-trip, all migrations/schema/privilege/Workers smoke, lint/typecheck/build.
  GitHub Pages preview build/deploy succeeded. Full deployed browser screenshot and
  owner-specific visual acceptance were not independently verified; static mock Pages
  does not demonstrate external OAuth or production runtime. Independent Codex review
  completed on `c94382f` on 2026-10-10 without new findings. Main later merged
  editor PR #210, and registration PR #214 integrated that main revision on `a2d9816`.
  Combined-head CI passed with 696 application tests, 211 native PostgreSQL 17
  database tests and local Worker/schema/privilege checks; Pages preview also passed.
  Independent review of the combined head identified three current-scope corrections:
  reconcile PROJECT.md auth baseline, preserve message URL fragments during
  credential redirects, and isolate the email input as LTR in RTL locales. This
  follow-up revision includes those bounded corrections and regression tests.
  Corrected-head CI passed on `0555d39` (698 application tests, 211 PostgreSQL
  17 tests, schema/privileges/Workers checks); Pages preview passed. A further
  independent Codex review identified three current-MVP auth issues: stale shared
  header/presence state after email authentication, absent server-side sign-up
  name validation, and misleading credential-specific feedback for Google errors.
  This follow-up implements explicit post-auth session-loader revalidation, a
  sign-up-only Better Auth before-hook that trims and validates names (1–100
  characters), and a generic Google failure message; regression tests cover
  both credential forms, OAuth error handling, and native PostgreSQL 17 rejection
  of invalid names. Exact combined implementation head `d76db99` passed CI with
  702 application tests, 214 native PostgreSQL 17 tests, lint/typecheck,
  migration/schema/privilege checks, Worker smoke and application/preview builds.
  Pages deployment succeeded. The final independent Codex review of `d76db99`
  completed 2026-10-10 with no further findings. ChatGPT whole-PR review found
  no confirmed outstanding defects in the current MVP scope. PR #214 is merged
  into main; production/runtime acceptance and email verification/password recovery
  remain deferred. No production rollout occurred.

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
  Browser/test-bucket and owner visual acceptance are not yet recorded;
  no infrastructure rollout, merge or Codex Code Review occurred.
  Whole Editor 2.0 remains incomplete.

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
  Browser/visual acceptance, final whole-Editor review and subsequent Editor
  packages are still outstanding; no merge, production migrations or rollout.
  CI for the final exact head must be verified independently.

- Editor 2.0: PR #215 открыт в обычном режиме и ещё не готов к merge. После merge #217 в `main`
  в первом foundation-срезе добавлены lossless Markdown document/history utilities,
  ограниченное текстовыми AST-диапазонами безопасное visual-edit API (без пересериализации
  исходника и без изменения сложных блоков) и единая Undo/Redo история к существующему
  shared Markdown editor, включая клавиатурные сочетания и обработку Reply/Quote insertion.
  Первый CI первого этапа (checks/database) успешен. Следующий visual-authoring срез
  реализует source-positioned визуальные редактируемые plain-text leaf spans, read-only
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
  Pages/owner visual acceptance этапа и финальное whole-PR review ещё предстоят.
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
- Editor Stage 5 package 1 — implementation in progress (2026-10-14, PR #215):
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
  unverified. Editor 2.0 PR is open and unmerged.
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
- Решение владельца 2026-10-10: приоритет — довести весь форум до работающего MVP,
  не блокируя functional slices дальнейшей косметической полировкой. Достаточно usable
  интерфейса и корректных механизмов; подтверждённые functional/security/data/authz
  defects исправляются в текущем scope. Переработка и детальный UX/visual polish
  существующих экранов, включая профиль, — отдельный последующий проход, не критерий
  готовности отдельных MVP-срезов. Финальная real-runtime acceptance перед публичным
  выпуском по-прежнему обязательна.
- Online presence («Кто сейчас на форуме») реализован в текущем bounded
  MVP implementation PR #213: вошедший пользователь с видимой вкладкой посылает
  same-origin POST heartbeat; сервер идентифицирует участника только по текущей
  сессии, не доверяя ID из формы. Отдельная таблица хранит последний heartbeat
  без IP/session token, максимум одну строку на пользователя; окно активности
  5 минут. Публичная главная показывает действительный счётчик и до 12
  зарегистрированных участников со ссылками на их профили; гости не
  отслеживаются и не считаются. EN/RU/HE, RTL и GitHub Pages mock fixture
  подключены. На implementation head d7931cd зелёные CI (lint/typecheck,
  presentation/route tests и сборки), native PostgreSQL 17 DB tests,
  миграция 0033, schema/privileges/Workers smoke и Pages deployment.
  Собственная whole-PR проверка выполнена. Browser review опубликованного
  Pages-preview недоступен в текущем окружении и не заявляется выполненным.
  Независимое Codex review на c65d914 выявило четыре текущих MVP-дефекта:
  частые DB writes при спаме heartbeat, race счётчика/списка, full-page
  failure при transient presence outage и повторный polling после 401.
  Исправление текущих defects завершено одним пакетом: server-side 45s write
  cooldown, согласованный single-query read snapshot, честный unavailable UI
  без отказа всего Home и остановка heartbeat после 401 с revalidation сессии.
  На code head `42c06d8` exact-head CI успешно завершён (661 application tests,
  208 native PostgreSQL 17 tests, migrations, schema parity, privileges, Worker smoke),
  Pages build/deploy успешен. Повторное независимое Codex review
  исправленного code head завершилось без новых findings 2026-10-10.
  Подтверждённых незакрытых дефектов текущего MVP scope не осталось.
  Production rollout evidence для миграции 0033 остаётся задачей Stage 6:
  внешняя выкладка не разрешена и не выполнялась. Browser screenshot и
  явная owner visual acceptance Pages в этом контексте не подтверждены;
  Pages mock preview не заменяет real-runtime acceptance перед релизом.
- Bounded блок форумных профилей реализован в текущем implementation set: public
  `/:locale/users/:userId`, данные имени/аватара/даты регистрации из authoritative identity,
  актуальная роль из DB, независимые persisted-message/current-best-answer счётчики,
  optional bio/GitHub/site и owner-only same-origin сохранение. Header и авторы сообщений
  ведут на реальные профили; EN/RU/HE и representative public/own/edit/error/empty Pages states
  подключены. Forward migration `0032_forum_profiles` и schema/runtime privilege contracts
  добавлены только для repository/local-CI path. Локально прошли lint, typecheck, 649 tests,
  обе сборки и metadata checks на Node 24.21.0 / pnpm 12.3.4; все 33 migrations и full schema
  manifest parity дополнительно проверены на PGlite PostgreSQL 17.5. Native PostgreSQL 17 CI
  (205 database tests, schema/privilege verification и Worker smoke) и Pages build прошли.
  Собственная browser проверка public/own/edit/error/empty/long-text states, EN/RU/HE,
  светлой/тёмной темы и Desktop/Tablet/Mobile завершена. Owner review выявил смещение
  латинского имени от аватара в RTL: heading теперь наследует направление страницы, а
  bidi-изоляция применяется только к самому имени. Новый visual preview Pages успешен.
  Владелец принял текущий вид профиля как достаточный для MVP 2026-10-10;
  дальнейший UI polish отложен. На head `2faad98` exact-head CI
  (включая PostgreSQL 17, 650 unit/presentation/route tests, migration/schema/ACL
  и Worker smoke) и Pages прошли после восстановленного Docker Hub image pull.
  Первое независимое Codex review выявило регрессию author-grid из-за нового profile link;
  исправлено в `3264828`: вложенная двухколоночная ссылка сохраняет расположение аватара
  и имени на desktop/mobile, EN/HE; DOM regression checks добавлены. На `3264828`
  успешно прошли точный CI (checks + PostgreSQL 17/schema/ACL/Worker smoke, после
  повторения ранее нестабильного неизменённого теста locale concurrency) и Pages.
  Повторное независимое Codex review завершено на `3264828` без новых findings;
  подтверждённых незакрытых defects текущего MVP scope не выявлено. Индекс для
  best-answer count остаётся отложенной оптимизацией: текущий масштаб/latency
  regression не подтверждены. Визуальная проверка browser-profile states ранее
  выполнена, а после correction author-grid подтверждены DOM/CSS review и Pages build,
  не новая browser screenshot. PR подготовлен к merge владельцем; production migration,
  deploy и real-runtime acceptance не выполнялись.
  Профили не включают социальные функции, смену имени/аватара аккаунта или загрузку файлов.
- Stage 0–3 foundation завершён.
- Stage 4 forum core завершён в local/CI path.
- Stage 5 translations/background jobs завершён в repository/local-CI path.
- Отдельная задача **UI/UX product pass** сейчас является активным продуктовым приоритетом;
  актуальный target-product contract, порядок реализации и обязательная browser acceptance matrix
  зафиксированы в `docs/UI_UX_PASS.md`.
- Для общего служебного PR #147 repository содержит bounded GitHub Actions bridge: только новый
  комментарий `chatgpt-codex-connector[bot]` в открытом PR #147 может быть append-нут в
  `.github/ui-ux-service-channel.md` ветки `chatgpt/ui-ux-product-pass`. Workflow использует только
  repository-scoped `GITHUB_TOKEN` с `contents: write`, не требует PAT/OpenAI API key, помечает
  записанный GitHub comment ID для idempotent rerun и bounded повторяет refresh/append/push при
  concurrent direct update service-ветки.
- Первый bounded UI/UX slice уже merged: deterministic representative baseline, client-safe
  presentation boundaries и GitHub Pages visual-progress preview.
  Preview controller в текущем implementation state отделяет identity от page state: над `State`
  используются отдельные `Guest / User / Manager` controls, а role-specific варианты не дублируются
  в названиях State; theme/locale по-прежнему переключаются внутри самого forum UI. Preview iframe
  показывается без искусственной светлой внешней подложки/рамки, чтобы визуальные границы страницы
  не искажались. Текущий correction branch
  дополнительно cache-bust-ит embedded iframe по hash текущего preview bundle, чтобы новый Pages
  deploy не мог оставить iframe на stale HTML со ссылкой на удалённый hashed asset. Pages workflow
  явно исключает общий service branch `chatgpt/ui-ux-product-pass`, чтобы технические updates
  communication-файла не могли перезаписать visual preview артефактом из отставшей служебной ветки.
  Это не заменяет будущую real-runtime acceptance.
- В текущем UI/UX slice реализованы и repository-CI/Pages-проверены semantic visual tokens,
  Light/Dark с first-use `prefers-color-scheme` и persisted manual choice, two-zone shell/header,
  approved shell/homepage foundation и общая локализованная страница `Under development`.
  Merged PR #182 перенёс rich `Pinned / Latest topics / statistics` presentation с homepage на
  category pages: runtime homepage читает реальные categories + sections + aggregate counts, а
  category reader — bounded latest-topic activity по каждому section. Текущий PR #181 добавляет к
  этому же category-reader boundary persisted pins, bounded DB-side rank/limit по section и
  pin/unpin management; online-presence capability по-прежнему не имитируется real data. Exact-head
  CI/Pages проходят, а owner visual acceptance PR #181 подтверждён 2026-10-06. Это не означает
  финальную browser/real-runtime acceptance всего UI/UX pass.
- Homepage correction slice прошёл owner visual acceptance в GitHub Pages. Приняты текущая
  композиция homepage, icon-led discovery navigation `Unanswered · Tags · Popular` и
  authenticated-only `Unread` без дублирующего `Home`, orange labels/icons и понятный
  trending-up symbol для `Popular`, theme-aware owner-provided Light/Dark logo marks,
  `Vico` orange / `Forum` neutral по теме, compact stats и отдельная full-height orange entry
  rail. После принятого redesign Category/Section homepage rail ведёт напрямую в реальную
  locale-aware category page; временный `forum-discovery` entry удалён из `Under development`. Bounded реализация `Popular` merged через
  PR #168: locale-aware public route показывает три одновременных activity-period колонки
  `24 hours / 7 days / 30 days`, ранжируя темы по числу существующих forum messages внутри
  периода с latest-activity tie-break; targeted repository CI/Pages прошли, owner visual acceptance
  подтверждён 2026-10-02. Следующая bounded discovery-функция `Unanswered` реализован в PR #169:
  forum-wide public route выбирает только unsolved темы с ровно одним persisted post (initial post),
  то есть без единого ответа; список показывает author и category/section context, сортируется по
  новым темам первым и удаляет `Unanswered` из unfinished checklist. Migration/dependency/auth/
  permission/Stage 6 изменений нет; targeted repository CI и GitHub Pages preview проходят,
  owner visual acceptance подтверждён 2026-10-02. Tags реализован и merged через PR #170:
  свободные topic-level technology tags нормализуются и переиспользуются, создаются атомарно
  вместе с темой, доступны через public locale-aware `/:locale/tags` и
  `/:locale/tags/:tagKey`, показываются в section/topic/tag presentation; forward migration
  `0021_forum_tags` добавлена без Stage 6 rollout. Repository CI и GitHub Pages preview прошли,
  owner visual acceptance подтверждён 2026-10-02. По выбору владельца следующая bounded
  product-функция — global Search: текущая implementation-ветка добавляет public
  `/:locale/search?q=...` поверх current topic-title/post revisions и topic tags без новой
  migration/search-index subsystem. Repository CI и GitHub Pages preview прошли; owner visual acceptance подтверждён 2026-10-03. Search merged через PR #171. Message links реализован и merged через PR #172: public permanent post anchors + copy-link UI работают без DB/backend изменений; GitHub Pages preview пройден, owner visual acceptance подтверждён 2026-10-03. Reply/Quote реализован: migration `0022_forum_reply_relationships` добавляет nullable same-topic parent relation для forum posts; обсуждение остаётся линейным, Reply привязывает новый post к конкретному parent, Quote вставляет только выделенный текст как Markdown blockquote, а parent/child сообщения связываются стабильными anchors. Existing permissions/rate-limit semantics не меняются; repository CI и GitHub Pages preview проходят, owner visual acceptance подтверждён 2026-10-03. Последующая hierarchy correction в PR #182
  заменяет topic-oriented homepage blocks на category → section map и переносит прежнюю rich
  section presentation на category pages. Owner visual acceptance реализации подтверждён
  2026-10-05; schema/migration/auth/permission/Stage 6 изменений нет.
- Текущий Unread/new slice подключает repository/database foundation к runtime/UI:
  forward migration `0023_forum_topic_read_states` хранит один last-read cursor на пару
  authenticated user + topic и same-topic FK не позволяет ссылаться на post другой темы.
  Repository semantics выводят `new / unread / read`, deterministic first-unread по authoritative
  `createdAt + id` order, forum-wide set-based unread listing и monotonic cursor advancement:
  stale/concurrent marker не может сдвинуть cursor назад, а reply после rendered snapshot остаётся
  unread. Authenticated `/:locale/unread` показывает реальные unread и new topics отдельными
  группами, без отдельной текстовой status-колонки: unread count вынесен в расширенный orange
  entry action, который ведёт прямо к `#post-<firstUnreadPostId>`; section topic list получает
  `new / unread / read` одним set-based
  read-state snapshot без per-topic N+1. При открытии authenticated topic loader получает текущий
  read snapshot, а после hydration отдельный same-origin POST продвигает marker до latest post
  фактически отданного snapshot; monotonic repository update не позволяет stale/concurrent request
  откатить cursor. Classified read-state storage failure не ломает публичное чтение topic/section,
  тогда как authenticated Unread route возвращает controlled unavailable. External migration/rollout
  для `0023` не выполнялся.
- Persisted Pinned topics bounded slice реализуется в PR #181 поверх принятой hierarchy correction
  PR #182: migration `0025_forum_topic_pins` хранит максимум один active pin на topic с DB-owned
  `pinnedAt`, topic-delete cascade и actor reference `RESTRICT`. Code-backed
  `forum.topic.pin` входит в initial grants moderator/admin, но не user; авторство темы само по
  себе право не даёт. Pin/unpin остаются authenticated same-origin mutations с повторной
  server-side effective-permission проверкой. Category reader выдаёт bounded deterministic pins
  по section в порядке `pinnedAt DESC, topicId DESC`; Home остаётся category → section map.
  Section/topic presentation показывает persisted pin state, а пустой category-page Pinned block
  становится truthful non-link state. Exact-head CI/Pages и owner visual acceptance подтверждены
  2026-10-06; External migration/Stage 6 rollout не выполнялись.
- Merged PR #186 solution-model slice для будущей категории **Help & solutions** разводит выбранный
  best answer и solved state: forward migration `0026_best_answer_independent_from_solved`
  удаляет только прежний check `best_answer_post_id → is_solved`, сохраняя same-topic
  deferred best-answer FK. Best answer теперь можно выбрать у нерешённой темы; после выбора
  автор собственной нерешённой темы получает отдельное подтверждение `Problem solved?`,
  где подтверждение использует существующий protected `markSolved`, а отказ оставляет
  выбранный best answer без изменения solved state. Full repository CI, clean PostgreSQL 17,
  schema/manifest parity, runtime privilege probes, Workers smoke и UI preview build проходят на
  exact implementation head; external migration/Stage 6 rollout не выполнялся.
- Merged PR #187 **Help & solutions foundation** добавил migration
  `0027_help_solutions_foundation`: она создаёт reserved category `help-solutions` и
  внутренний service section `help-solutions-questions` для хранения вопросов в существующей
  topic/post model. Generic Home/category discovery, прямой section route и обычный create-topic
  action этот service section не показывают/не используют; Home при этом сохраняет реальные
  aggregate topic/message counts категории. External migration/Stage 6 rollout не выполнялся.
- Merged PR #188 добавил первый реальный Q&A-режим **All / Все** на
  `/:locale/categories/help-solutions`: dedicated reader читает вопросы только из internal
  service section и возвращает current title/author, technology tags, число последующих сообщений
  (`replies`) после original question, independent solved/best-answer state и latest activity.
  Generic category UI для reserved category заменён специальным public Q&A list view; topic
  breadcrumb больше не ведёт на скрытый service-section route.
- Merged PR #190 добавил режим **Solutions / Решения** поверх существующего final
  `isSolved = true`: query `?mode=solutions` фильтруется на DB boundary и использует тот же
  Q&A list presentation; default URL без query остаётся `All`.
- Merged PR #191 добавил dedicated создание вопроса прямо из
  `/:locale/categories/help-solutions`. Presentation permission использует существующий
  `forum.topic.create`; compact action в category heading раскрывает форму только по явному
  действию пользователя, поэтому default Q&A view сохраняет modes/list выше authoring panel.
  POST action повторно проверяет session/origin/permission и сервер сам фиксирует destination как
  internal `help-solutions-questions`, поэтому browser не выбирает и не передаёт hidden section
  identity. Запись переиспользует существующий
  `writer.createTopic()` transaction для topic/initial post/revisions/tags. Exact-head repository
  CI и GitHub Pages прошли; owner visual acceptance corrected authoring/list presentation
  подтверждён 2026-10-07. External migration/Stage 6 rollout не выполнялся.
- Merged PR #193 добавил режим **Needs help / Нужна помощь** через `?mode=open`: persisted
  Help & solutions questions фильтруются на repository/DB boundary по существующему final
  `isSolved = false`, сохраняя `All` canonical default и `Solutions` по
  `isSolved = true`. Projection, ordering, карточки, topic destinations, authoring и hidden
  service-section boundary переиспользуются без новой schema, migrations или permissions.
- Merged PR #194 добавил необязательную проверку похожих вопросов перед публикацией. Проверка
  использует persisted current title/body/tags только внутреннего `help-solutions-questions`,
  возвращает bounded deterministic список с текущими solved/open состояниями и reply count и не
  блокирует создание нового вопроса. Введённые title/body/tags сохраняются между
  populated/empty/invalid/unavailable состояниями проверки; переход к найденному вопросу остаётся
  обычной locale-aware ссылкой без mutation.
- Merged PR #195 добавил authenticated режим **My questions / Мои** через `?mode=mine`.
  Authoritative user identity берётся только из server-side session, а repository фильтрует
  persisted вопросы по `forum_topics.author_id` внутри internal `help-solutions-questions`;
  client не передаёт и не выбирает author identity. Режим виден в Q&A navigation только
  authenticated пользователю, прямой guest-доступ fail-closed с unauthenticated route state.
- Merged PR #196 добавил public режим **Active / Активные** через `?mode=active`: persisted
  Help & solutions вопросы с хотя бы одним ответом выбираются server-side только из
  `help-solutions-questions`, включают open и solved состояния, сортируются по existing
  latest-activity projection и ограничены первыми 100 вопросами.
- Merged PR #197 добавил permission-gated режим **Needs attention / Требуют внимания** через
  `?mode=attention`: server-side выборка ограничена нерешёнными вопросами без ответов внутри
  `help-solutions-questions`, а доступ использует существующую capability
  `forum.solution.manageAny`. Guest и ordinary authenticated users не видят режим и не проходят
  direct-route boundary; schema/migrations и новые permissions не добавлялись.
- Merged PR #198 добавил authenticated режим **Want to help / Хочу помочь** через `?mode=help`.
  Authoritative current user берётся только из server-side session, а repository/DB boundary
  возвращает только нерешённые persisted Help & solutions вопросы других авторов внутри
  `help-solutions-questions`; собственные и solved вопросы исключаются. Запрос использует
  существующие deterministic activity tie-breaks и ограничен первыми 100 вопросами. Режим виден
  только authenticated users; direct guest access возвращает 401. Сам режим не предоставляет reply
  capability и не меняет существующие authentication/origin/validation/rate-limit/
  effective-permission boundaries ответа. Existing cards, tags, statuses, authoring,
  similar-question check и остальные Q&A modes переиспользуются без schema/migrations, новых
  permissions, recommendation scoring, interests/subscriptions, notifications, visual polish или
  Stage 6 работы. Owner visual acceptance populated/empty Pages presentation подтверждён
  2026-10-07 для Guest/User/Manager identity switching.
- Merged PR #199 добавил authenticated режим **For me / Для меня** через
  `?mode=for-me`. Authoritative current user берётся только из server-side session. Repository
  выводит interest tags из существующего persisted участия пользователя только внутри
  `help-solutions-questions`: вопросов, созданных этим пользователем, и тем, где он оставлял
  сообщения. Кандидаты ограничены нерешёнными вопросами других авторов с пересечением по этим
  тегам; ranking прозрачно идёт по числу совпавших тегов, затем existing latest activity и
  stable topic-id tie-break. Interest tag set ограничен 100 distinct tag keys, result — первыми
  100 вопросами; no-signal/no-match возвращают честный empty state. Режим не создаёт новые
  profile interests/subscriptions/tracking signals и не предоставляет reply capability. Existing
  cards, tags, statuses и reply boundaries переиспользуются без schema/migrations, новых
  permissions, opaque/AI scoring, notifications, visual polish, similar-search refinement или
  Stage 6 работы. Owner visual acceptance populated/empty Pages presentation и Guest/User/Manager
  identity switching подтверждён 2026-10-07.
- PR #200 реализует первый шаг зафиксированной Help & solutions moderation/filter sequence:
  migration `0028_help_solution_moderation` хранит persisted состояние решения
  `needs-review | outdated` на конкретном answer post, а не на topic. `isSolved` остаётся
  независимым final state и не сбрасывается этими пометками. Ручная moderation mutation применяется
  к текущему выбранному best answer решённого вопроса внутреннего `help-solutions-questions`;
  ручной `outdated` требует непустую persisted причину длиной до 1000 символов. При выборе другого
  best answer прежний выбранный ответ атомарно получает `outdated` с системной reason-kind
  `best-answer-replaced` (UI локализует её как «Выбран новый лучший ответ»), а новый best answer
  начинает с очищенного moderation state и не наследует пометку прежнего решения. Protected
  mutations повторно проверяют существующую effective capability `forum.solution.manageAny`;
  новая permission не вводится. Public Help cards проецируют marker только текущего best answer;
  topic page сохраняет marker и explanation у конкретного ответа, включая исторический заменённый
  best answer, а explanation находится в самом низу соответствующего сообщения. Topic title/tags и
  original question теперь составляют одну message-card композицию вместо двух соседних карточек;
  выбранный best answer по-прежнему поднимается сразу следом с сохранением permanent номера/anchor.
  Справа в строке breadcrumbs для actor с существующими moderator-level capabilities
  `forum.solution.manageAny`, `forum.sourceLocale.correctAny` или `forum.topic.pin` показывается
  общий `Admin panel`; каждое действие внутри сохраняет собственную server-side permission
  проверку, а Help-specific solution moderation по-прежнему доступна только через
  `forum.solution.manageAny` для применимого solved Help question. Выбор best answer больше не
  находится в message-level `Message tools`: для actor с `forum.solution.manageOwn/manageAny`
  отдельный compact selector стоит в той же breadcrumb action-zone, а при наличии admin panel —
  непосредственно слева от неё; варианты внутри selector обозначены permanent message numbers.
  Message-level source-locale correction UI на этом этапе скрыт вместе с `Message tools`;
  существующая protected mutation/permission boundary сохранена для последующего включения в
  спроектированную admin-panel систему по номеру сообщения. Own-only topic tools автора для
  topic-level действий остаются отдельными. После независимого review подтверждён stale-form
  дефект: uncontrolled причина `outdated` могла пережить same-route revalidation после смены
  текущего best answer и затем быть отправлена уже для нового решения. Исправление remount-ит
  только эту moderation-form при изменении authoritative best-answer/status/persisted-reason
  identity; focused regression coverage проверяет reset после revalidation. Повторный independent
  review также выявил SQL NULL-semantics defect в `forum_posts_solution_outdated_reason_check`:
  orphan reason при `status = NULL` мог дать UNKNOWN и пройти PostgreSQL CHECK. Constraint
  переведён на null-safe status comparison, а DB regression явно проверяет комбинацию
  `status = NULL + reason != NULL + reason_kind = NULL`. Help Pages fixtures
  выбирают best answer с более поздним исходным номером и визуально проверяют его promotion сразу
  под original question.
  User signals, duplicate/appeal workflow, расширение `Needs attention` и комбинируемые
  фильтры остаются следующими отдельными шагами; external migration/Stage 6 rollout не выполняется.
- PR #204 реализует второй шаг зафиксированной Help & solutions moderation/filter sequence
  как минимальную persisted system-label foundation: migration
  `0029_help_question_needs_details` добавляет на `forum_topics` только boolean
  `needs_details NOT NULL DEFAULT false`. Отдельной оси `quality`, состояния `normal`,
  Help-only CHECK и обязательного backfill нет: метка отсутствует при `false` и присутствует
  при `true`. Help list projections и topic-page read model возвращают `needsDetails` для
  последующих workflow/filter steps. Existing и previous writers, которые не передают это поле,
  остаются совместимы через database default `false`. В этот slice не входят user
  signals/moderator confirmation (step 4), расширение `Needs attention` (step 5), combined
  filters (step 6), duplicate workflow (step 3), новая permission/mutation, admin-panel redesign,
  similar-search refinement или drafts/autosave. Предыдущий Codex rollout finding относился к
  superseded обязательному `help_question_quality` CHECK; после упрощения модели его причинная
  цепочка устранена в самом незамерженном `0029`. Исправленная implementation revision прошла
  repository `checks` и `database`, включая migration metadata, Drizzle schema parity и clean
  PostgreSQL 17 suite. Fresh whole-PR review исправленной модели не оставляет подтверждённых
  дефектов текущего scope: writer omits `needs_details` and receives database default `false`,
  snapshot changes only `forum_topics`, and Help projections expose the persisted flag without
  adding moderation/filter behavior early. GitHub Pages preview build/deploy for the same reviewed
  implementation revision succeeds; separate owner visual acceptance is not required because this
  foundation slice adds no visible label/workflow presentation. Final exact-head Codex review
  завершён без findings, PR #204 merged.
- PR #205 реализует третий шаг зафиксированной Help & solutions moderation/filter sequence:
  persisted Help-specific duplicate → canonical-original relationship и отдельный durable
  appeal lifecycle. Active relation не допускает self-link, цепочки/циклы и превращение canonical
  original в duplicate через штатный server-side repository path; confirm/remove/appeal/resolve
  сериализуются транзакционно. Новая code-backed capability `forum.helpDuplicate.manage`
  выдаётся initial built-in moderator/admin и защищает authoritative confirm/remove/resolve;
  обычный author подтверждённого duplicate-вопроса может отдельно подать appeal с обязательным
  explanation. Pending appeal не снимает authoritative duplicate status: на topic page публично
  видна нейтральная метка `Disputed`, explanation доступен только author duplicate и actor с
  duplicate-management capability. Reject сохраняет relation; accept или manual removal снимает
  active duplicate relation. В штатном workflow подтверждённый duplicate и собственное решение
  взаимоисключаемы: question с `isSolved=true` или выбранным best answer нельзя подтвердить как
  duplicate; пока active duplicate relation существует, нельзя выбрать ему best answer,
  пометить его solved или добавить новый reply. При pending appeal duplicate-manager видит
  explanation автора прямо в duplicate notice на topic page; accept/reject остаются в admin panel. В Help question list публично остаются `Solved` и `Duplicate`;
  отдельный `Best answer` badge там не показывается. `Solution outdated` публичен;
  `Needs review` и pending `Disputed` badges видны только соответствующим moderation actors
  и в списке, и на topic page; author pending appeal при этом видит собственное appeal-сообщение
  без moderator-only badge. Topic page показывает locale-aware ссылку на canonical
  original без раскрытия internal service section.
  General user moderation signals остаются step 4, расширение `Needs attention` — step 5,
  combined filters — step 6; admin-panel redesign, similar-search refinement и Stage 6 rollout
  в этот slice не входят. Forward migration `0030_help_duplicate_workflow`, runtime ACL
  contract, schema manifest, RU/HE localization, focused route/privacy/database coverage и Pages
  fixtures добавлены. Owner visual acceptance representative Pages states была подтверждена
  2026-10-09 после corrections duplicate-list statuses, solved-vs-duplicate exclusivity,
  pending-appeal message visibility и блокировки новых replies у active duplicate. Последующий
  whole-PR review уточнил moderator-only visibility для `Needs review` / pending `Disputed`
  badges и на topic page. Короткий owner visual re-test этой последней correction подтверждён
  2026-10-09: Guest не видит moderator-only badges, author pending appeal видит своё appeal-сообщение
  без moderator-only badge, Manager видит moderation badges и explanation автора.
  Final independent Codex review exact implementation head `6aa3115953cbddbdfb8e09f8c193ddc1f242f7fb`
  завершён 2026-10-09 без major findings.
- PR #206 реализует bounded backend/domain foundation четвёртого шага **user moderation signals** без
  преждевременного step 5/6 UI/filter behavior. Forward migration
  `0031_help_user_moderation_signals` добавляет durable signals для `Needs details`,
  `Needs review`, `Solution outdated` и `Duplicate` с lifecycle
  `pending → accepted | rejected | withdrawn | superseded`. Ordinary user submission не меняет
  authoritative state; `Needs details`, `Needs review` и `Solution outdated` требуют
  explanation, а `Duplicate` допускает optional explanation, но требует proposed canonical
  original. Solution signals server-side фиксируют concrete current best-answer post; duplicate
  signal фиксирует question + proposed original. Submission использует тот же bounded 5-second
  ForumWritePolicy через отдельный per-user signal cooldown: topic row(s) блокируются перед
  user-row mutex, то есть в том же порядке, что reply writes, чтобы concurrent reply + signal
  одного actor не создавали lock-order cycle. Предыдущий signal независимо от
  kind/target/terminal state предотвращает немедленное создание следующего. Это не вводит
  lifetime-ограничение на тему и не связывает signal cooldown с обычным topic/reply cooldown.
  Withdrawal принимает expected topic identity до repository и под lock проверяет, что signal
  принадлежит именно текущей route-topic; stale/malformed form не может отозвать сигнал другой
  темы. Help-signal lifecycle timestamps database-owned: creation и terminal/supersede transitions
  используют PostgreSQL statement time, поэтому ожидание row lock не может сделать
  `resolved_at < created_at` и сорвать authoritative mutation на lifecycle CHECK.
  Accept повторно проверяет current applicability
  под transaction locks и в той же transaction применяет уже существующий authoritative
  Needs-details flag, solution moderation state или duplicate relationship; stale signals не
  применяются и становятся `superseded`. Author может отозвать только собственный pending signal.
  Новые code-backed capabilities: `forum.helpSignal.create` для submission и
  `forum.helpNeedsDetails.manage` для authoritative рассмотрения Needs-details requests;
  solution/duplicate review переиспользуют `forum.solution.manageAny` и
  `forum.helpDuplicate.manage`. Server actions существуют уже в этом foundation slice и выбирают
  review permission по persisted signal kind, а не client input. Visible submission/review
  presentation, private moderation queue/author pending presentation и Pages states остаются
  следующей bounded подзадачей step 4; расширение `Needs attention` остаётся step 5, combined
  filters — step 6. Runtime ACL даёт web capability только `SELECT / INSERT / UPDATE` на новую
  relation; external migration/Stage 6 rollout не выполняется.
- PR #208 реализует независимый step-6 slice **combined filters** для Help & solutions поверх уже
  существующих authoritative состояний, не дожидаясь отдельно проектируемых signals/reports и
  admin-panel систем. Четыре optional query dimensions комбинируются поверх любого текущего Help
  mode и применяются в repository/DB query до mode-specific ordering/limits:
  `solution=open|solved|needs-review|outdated`, `answers=none|has`,
  `quality=normal|needs-details`, `relation=standalone|duplicate`. `Needs review` остаётся
  moderator-only: option показывается только actor с `forum.solution.manageAny`, guest direct
  request получает 401, authenticated actor без capability — 403, classified authorization
  unavailable — controlled 503. Остальные filter states используют уже публичные authoritative
  данные. Mode navigation сохраняет активные filters, Reset очищает только filters и сохраняет mode;
  persisted `Needs details` показывается public badge в Help list, чтобы quality-filter result был
  объясним прямо в карточке.
  Slice не меняет schema/migrations/permissions, не читает pending signals, не расширяет
  `Needs attention` и не меняет signal/reports или admin-panel UI. EN/RU/HE presentation,
  responsive Pages states и focused repository/route tests добавлены. Exact-head CI и Pages
  проходят; owner visual acceptance подтверждён 2026-10-09 как достаточный для текущего
  функционального прохода. Владелец отдельно зафиксировал, что текущая presentation комбинированного
  фильтра временная и после завершения основного функционального прохода её нужно дополнительно
  доработать/отполировать; это future polish, а не дефект текущего PR #208.
- PR #209 уточняет ранее отложенную **similar-question search relevance/UX** для
  Help & solutions без новой поисковой подсистемы. Optional pre-publish check использует bounded
  Unicode-normalized terms из текущих draft title/body/tags и ищет только current persisted
  title/post revisions и tags внутреннего `help-solutions-questions`. Ranking source-aware и
  deterministic: exact title и exact draft-tag получают отдельный сильный приоритет, meaningful
  multi-term title coverage идёт выше обычных tag/body/weak-title совпадений, а common question
  scaffolding/stop words не участвуют в title coverage. Короткие технические title-токены
  (включая `Go`, `AI`, `JS`, `DB`, `R`) сохраняются для boundary-aware title matching, но
  не превращаются в широкие substring-поиски по body/tags. Title, tag и body используют отдельные
  bounded term budgets, поэтому один источник не может вытеснить body полностью; общий query budget
  остаётся ограниченным. Post и tag matching выполняются отдельными bounded `EXISTS`-проверками,
  без post×tag Cartesian aggregation. Activity и stable topic-id используются как последующие
  tie-breaks. Action path
  сохраняет result limit 5. Result projection сообщает strongest match source и existing tags,
  чтобы presentation могла кратко объяснить, почему вопрос предложен. Draft остаётся только request
  input: проверка read-only, optional и не блокирует публикацию; existing
  session/origin/permission/validation/write boundaries не меняются. Stale revisions и ordinary
  forum sections не участвуют. Schema/migrations, search index, fuzzy/vector/AI search, duplicate
  automation, signals/admin, `Needs attention` aggregation, combined-filter polish и Stage 6 в
  slice не входят. Владелец подтвердил 2026-10-09, что acceptance boundary этого slice —
  работающий механизм и пригодный для дальнейшего развития фундамент; текущая presentation
  намеренно provisional и позже должна получить отдельную UX/визуальную доработку. Это deferred
  polish, а не дефект текущего PR #209.
- PR #210: после review на `e30a988` исправлены RTL-isolation для технических language IDs (в текущем head) и inline margins у figure blocks. Дальнейшие exact-head CI, Pages и Codex review требуют подтверждения.
- PR #210: после Codex review устранены пять текущих editor/code findings: ограничение подсветки больших/токеноёмких блоков, корректные границы выделенных строк, исключение скрытого textarea из Tab-порядка Preview, локализованная подпись ссылки и LTR только для кода при RTL интерфейсе. Добавлены регрессионные тесты. Новые замечания повторного Codex review на `f72af07` касались позиции 0 при форматировании первой пустой строки, языка блока кода с `#` и сохранения состояния кнопок code preview в Split. Исправления и регрессионные тесты добавлены; CI и Pages на `29af5e7` прошли. Последующий Codex review обнаружил реальный дополнительный дефект: per-block ограничение подсветки допускает суммарно неограниченную подсветку множества блоков. Введено ограничение подсветки по размеру всего Markdown-сообщения с безопасным отображением кода без подсветки сверх порога; добавлен тест. CI на `e30a988` прошёл со второй попытки после несвязанного нестабильного теста навигации переводов; Pages успешен. Codex review выявил P2-дефект направления технических идентификаторов `c#`/`f#` в RTL — исправлена изоляция подписи языка и поля его ввода с регрессионными тестами. Отступы figure являются отложенной косметической доработкой редактора, а не блокером текущего Stage. Проверки и review после исправления RTL ещё не завершены.
- PR #210 реализует ранее отложенный **full editor/code tooling** поверх текущих authoring
  boundaries без изменения server mutation contracts. Один shared Markdown editor используется
  обычным create-topic, reply и Help & solutions question authoring; Write / Preview / Split и
  formatting controls работают поверх того же native `body` field. Inline/fenced code insertion
  безопасен для уже выделенных backtick runs; fenced code поддерживает optional language.
  Preview использует существующий safe `ForumMarkdown`, а rendered code показывает language,
  copy feedback, wrap/no-wrap, bounded dependency-free syntax presentation и остаётся LTR внутри
  RTL UI. Reply/Quote вставляет текст через editor boundary и при необходимости возвращает Preview
  в Write; native required validation также раскрывает редактируемое поле. Help
  `Check similar questions` и финальная публикация используют один и тот же editor-backed draft
  body. Drafts/autosave, attachments, WYSIWYG, profiles, signals/reports/admin integration,
  schema/migrations и Stage 6 не входят. Representative Pages states выделены отдельно для
  create-topic, reply и Help draft; `editor` удалён из runtime `Under development`.
- In-app reply notifications slice реализован в PR #180:
  forward migration `0024_forum_reply_notifications` хранит только stable recipient/actor/topic/post
  references, `createdAt` и nullable `readAt`; unique recipient + reply identity предотвращает
  дубли одного события, а recipient-scoped indexes обслуживают bounded inbox/unread queries.
  Успешный reply в той же transaction создаёт deduplicated notifications для topic author и
  direct-parent author, исключая самого actor; failure notification insert откатывает и reply.
  Authenticated `/:locale/notifications` читает только inbox текущего пользователя; header bell
  показывает best-effort unread count, а открытие notification атомарно ставит `readAt` и
  перенаправляет на permanent `#post-<id>` anchor. Runtime role имеет только необходимые
  `INSERT / SELECT / UPDATE` на notification relation, без `DELETE`. RU/HE copy, responsive/RTL
  presentation и representative mixed/empty Pages states добавлены; notifications удалены из
  Under development. Clean PostgreSQL 17 tests, schema/manifest parity, runtime privilege probes и
  полный repository CI проходят. External migration/Stage 6 rollout не выполнялись.
- Category-page discovery baseline в PR #159 прошёл owner visual acceptance в GitHub Pages:
  owner-approved header/logo/discovery nav, derived section/topic/message totals и
  responsive/RTL/empty-category states сохранены. PR #182 supersede-ит только section-card
  composition: category page теперь переиспользует прежний rich section block с
  `Pinned / Latest topics / statistics / entry`; bounded latest-topic data читается реально по
  каждому section, а текущий PR #181 подключает к той же section-card surface persisted pins.
  Homepage остаётся прямым category → section map. Owner visual acceptance hierarchy correction
  подтверждён 2026-10-05; persisted-pinning slice owner visual acceptance подтверждён 2026-10-06.
- Section-page discovery slice в PR #160 прошёл owner visual acceptance в GitHub Pages:
  approved header/logo/discovery nav переиспользованы без backend/DB изменений; heading показывает
  только derived topic/message totals, topic rows стали full-card links с реальными author/message
  данными и orange entry rail, create-topic остаётся существующим section-local write flow с
  компактным in-page entry point, добавлены responsive/RTL/empty-section presentation states.
  Repository CI и Pages для принятой реализации проходят. Следующая bounded UI/UX подзадача после
  merge — Topics/messages/participation.
- Topic-reading/messages slice в PR #161 прошёл owner visual acceptance в GitHub Pages:
  принятый shell/header переиспользован без backend/DB изменений; original question остаётся
  первой, selected best answer визуально переносится сразу после неё без изменения исходного
  message number/permanent anchor, остальные сообщения сохраняют линейный repository order.
  Message cards используют существующие author/content data, safe Markdown/code rendering,
  translation provenance/original disclosure и текущие protected controls; добавлены
  responsive/RTL-safe geometry и solved/unsolved/translated preview states. Repository CI и Pages
  для принятой реализации проходят. Full authoring-form redesign и secondary-control cleanup
  остаются отдельными следующими slices.
- Reply/Create-topic authoring slice в PR #162 прошёл owner visual acceptance в GitHub Pages:
  существующие section/topic write boundaries сохранены без backend/DB изменений, формы получили
  компактную panel hierarchy, локализованную guidance/help copy, explicit required-field
  presentation, touch-friendly actions и responsive/RTL geometry. Non-fetcher React Router
  `Form` submissions используют `useNavigation` pending state: только отправляемая
  create-topic/reply form получает `aria-busy`, disabled fields/action и локализованный pending
  label. Existing server validation, permissions, origin protection и rate-limit semantics не
  менялись; полноценный editor, drafts/autosave и reply/quote relationships остаются будущими
  bounded tasks. Repository CI и Pages для принятой реализации проходят. Следующая bounded
  UI/UX подзадача — secondary translation/source-locale/solution control cleanup.
- Secondary topic-controls slice реализован в PR #163 без backend/DB/permission изменений:
  translation-generation feedback остаётся видимым, но получает compact secondary presentation;
  source-locale correction и solution-management mutations перемещены под native `details`
  progressive disclosure на уровне topic/message, тогда как `Go to solution` остаётся прямым
  reading action. По решению владельца перед visual acceptance этот же review branch дополнен
  полными code-owned manual UI packs для `ru` и `he`: оба содержат значения для всех 170
  текущих canonical `common` keys, используют отдельный fixed reviewed-fingerprint manifest и
  остаются обычными `LocalTranslationSource` overrides без изменения generic LocaleRegistry.
  Pages preview теперь читает те же manual packs вместо отдельного partial Hebrew dictionary.
  Перед owner visual acceptance branch также получил compact header language selector, который
  берёт варианты из active LocaleRegistry и сохраняет текущий route remainder/query/hash при смене
  locale. По owner feedback preview `State` больше не дублирует EN/RU/HE/RTL варианты: он
  выбирает только representative scenario/identity, а язык меняется внутри самого форума и
  сохраняется между сменой preview state/viewport в session storage. Верхняя строка оставляет
  только language/theme controls, а notifications + account identity + auth action вынесены в
  правую часть второй строки рядом с discovery navigation.
  Owner review также выявил desktop truncation forum tagline; current branch снимает искусственный
  max-width/ellipsis на desktop и оставляет wrapping для узких viewport. RTL review дополнительно
  выявил, что brand identity наследовал page direction и визуально превращался в `ForumVico`;
  brand link теперь явно изолирован как LTR, при этом весь остальной Hebrew UI остаётся RTL.
  Existing mutation intents, same-origin/authz/validation и immutable revision semantics сохранены.
  Repository CI и Pages для locale-independent preview State correction проходят. Owner visual
  acceptance PR #163 в GitHub Pages подтверждён 2026-10-01, включая RU/HE локализацию, header
  language selector, LTR brand isolation внутри RTL UI, tagline/header corrections и
  locale-independent preview State.
- Auth presentation slice в PR #164 прошёл owner visual acceptance в GitHub Pages 2026-10-01:
  guest sign-in, signed-in identity/sign-out, pending state и safe failed-auth feedback приведены
  к compact header presentation без изменения Better Auth/session/callback behavior. Pages fixture
  содержит deterministic pending/failed auth states, а существующие Home guest/user states остаются
  representative normal identity states. В Pages auth-клики намеренно блокируются и используются
  только для visual-state review; это не является real OAuth smoke. Backend/DB/permissions/OAuth
  configuration не менялись. Repository CI и Pages для принятой реализации проходят.
- Authorization-management presentation в PR #165 прошёл owner visual acceptance в GitHub Pages
  2026-10-01: существующий protected admin flow переиспользует accepted forum shell/header, роли и
  пользователи организованы в compact management cards, role grants/user assignment/per-user
  overrides/effective permissions сгруппированы без изменения intent/field contracts. Custom-role
  deletion визуально отделён как destructive action; Pages fixture включает custom Reviewer
  role/user и saved/conflict states. Server-side permission checks, same-origin boundary, dynamic
  permission model и lockout safeguards не менялись. Владелец отдельно отметил, что более глубокая
  переработка самой модели/workflow управления ролями и permissions может потребоваться позже; это
  не считается дефектом текущего visual slice и не меняет действующий authorization contract.
  Repository CI и Pages для принятой реализации проходят.
- System/error-state presentation в PR #166 прошёл owner visual acceptance в GitHub Pages
  2026-10-01: route-level `401`, `403`, `404`, controlled `503` и unexpected failures используют
  единый accepted forum shell и safe localized recovery action без показа internal error details.
  Protected authorization route использует общий `ForumRouteError`; existing mutation-level
  `409`/`429` feedback contracts не меняются. Pages fixture содержит locale-independent
  representative states для каждого route failure. Repository CI и Pages для принятой реализации
  проходят.
- Первый responsive/RTL/accessibility hardening slice открыт в PR #167: shared shell получил
  localized keyboard skip link к focusable forum content region, visible `focus-within` treatment
  для language selector, unclipped header focus rings и min/max-width guards для zoom/reflow
  pressure. Preview дополнен `Home · manager` для плотного account/header состояния; существующая
  logical-direction/RTL geometry сохранена. Owner review выявил и подтвердил исправление mobile-only
  homepage defects ниже `30rem`: browser-default section-enter SVG и первоначальный порядок
  secondary content/footer action. Последний owner feedback заменяет прежнюю mobile-card
  композицию более компактной: identity/description остаются видимыми, `Pinned` + `Latest topics`
  + statistics по умолчанию скрыты за circular expand control, а orange section-entry action
  перенесён из full-width footer в компактный inline-end rail рядом с identity. Эта latest
  mobile-card correction реализована в текущей ветке; repository CI и Pages для неё проходят.
  Следующий owner feedback по этой же карточке потребовал сделать section icons явно Vico Orange и
  смягчить слишком тёмный circular expand control; эта correction прошла repository CI/Pages и
  получила owner visual acceptance 2026-10-02. После acceptance владелец попросил тем же способом
  смягчить narrow-mobile discovery pills и orange section-entry rail, но оставить их оттенок немного
  насыщеннее circular expand control; после следующего visual review владелец отклонил этот оттенок
  и дал отдельный reference-orange. После следующего visual review владелец попросил попробовать
  yellow-orange `#ED760E` для narrow-mobile discovery pills, section-entry rail и `Sign in`;
  circular expand control остаётся более светлым. Следующий owner visual review отклонил этот
  вариант как слишком резкий для Light theme и запросил одновременное сравнение трёх более мягких
  оттенков на одном mobile экране: `Sign in` — `#E8873A`, discovery pills — `#E27A32`,
  section-entry rail — `#E9964A`. После comparison владелец выбрал единый muted-orange
  `#D97838` для всех трёх групп: `Sign in`, narrow-mobile discovery pills и section-entry rail;
  circular expand control остаётся без изменений. Следующий owner visual review предпочёл более
  мягкий `#E9964A`; owner visual review принял этот оттенок для Light theme, но выявил, что
  hard-coded mobile color также попал в Dark theme. После отдельного Dark review владелец отклонил
  `#D25E28` как слишком резкий и запросил comparison трёх более мягких оттенков на одном экране.
  Первый comparison также не прошёл visual acceptance; следующий промежуточный comparison использует:
  `Sign in` — `#C56538`, narrow-mobile discovery pills — `#C76032`, section-entry rail —
  `#C35F31`. После comparison владелец выбрал единый Dark оттенок `#C56538` для всех трёх
  групп. Light theme сохраняет принятый `#E9964A`, circular expand control остаётся без изменений.
  Repository CI и Pages для этой latest Dark color correction проходят; owner visual acceptance
  подтверждён 2026-10-02. Предыдущий owner mobile review также выявил
  переполнение discovery navigation; на narrow mobile эти destinations переключаются на centered
  orange pill icon-only controls с enlarged icons и локализованными accessible labels, сохраняя
  text labels на wider layouts.
  Owner visual acceptance этого mobile-nav correction подтверждена 2026-10-02. Следующий owner
  review того же narrow-mobile header потребовал compact theme/locale controls: language показывает
  current primary locale code (`EN/RU/HE` для review locales), theme — moon/sun target icon;
  оба controls перенесены в компактную колонку напротив brand, с theme сверху и locale под ней,
  а search остаётся отдельной строкой. Следующий owner review потребовал поменять порядок lower
  mobile header: account/notification controls должны идти одной compact строкой сразу под brand,
  search — следующей строкой, discovery pills — ниже поиска. Guest auth presentation дополнительно
  сокращена до `Sign in`, а рядом добавлен `Sign up` как approved future registration entry
  point на shared `Under development` page; реальная registration/auth backend semantics не
  меняются. Wider layouts сохраняют текущую presentation. Repository CI и Pages для этого
  lower-header/auth correction проходят; owner visual acceptance narrow-mobile shell и итоговых
  Light/Dark action colors подтверждён 2026-10-02. Во время следующей browser-проверки владелец
  выявил mobile disclosure defect: карточка раскрывалась через `mobileDetailsOpen`, но chevron
  оставался привязан к desktop `expanded` и поэтому продолжал смотреть вниз. Текущая ветка
  привязывает chevron к общему `controlExpanded` и добавляет regression coverage для open/close
  direction. Source/automated keyboard/RTL review при этом подтверждает skip link первым keyboard
  target, visible wrapper focus для language selector, отсутствие новых physical left/right
  assumptions и RTL reversal directional entry arrows. Repository CI и Pages для этой latest
  correction проходят; owner visual re-test disclosure chevron подтверждён 2026-10-02.
  Keyboard browser acceptance для Desktop и Mobile подтверждён владельцем 2026-10-02: skip link,
  Enter-to-content, forward/backward Tab traversal и visible unclipped focus прошли визуальную
  проверку. Владелец также подтвердил текущий visual/RTL state как нормальный 2026-10-02 и попросил
  не блокировать дальнейшую работу дополнительной полировкой этого slice; PR #167 считается
  принятым по owner browser review в рамках Pages-preview, не подменяя будущую full real-runtime
  acceptance matrix.
- Target search, notifications и незавершённые footer/product entry points во время owner-only
  pre-release ведут на общую `Under development` page/checklist вместо fake behavior.
- Для owner-only pre-release незавершённые approved target functions могут оставаться видимыми и
  вести на общую локализованную страницу `Under development` со списком оставшейся работы.
  Публичный запуск не выполняется до завершения и acceptance утверждённого target product.
- Stage 6 pre-release external integration поставлен владельцем на паузу; оставшиеся Stage 6
  infrastructure gates не продолжаются до отдельного указания.
- External production-like integration начинается только в Stage 6; завершение Stage 5 не означает,
  что pending migrations, OAuth, runtime roles/Hyperdrive writes, Queues/providers или deployed smoke
  уже приняты внешне.
- Stage 6 dedicated migration identity подтверждена внешним manual read-only workflow из `main`:
  production Environment secret реально подключается как exact `vico_forum_migrator`.
- Production migration workflow больше не допускает database-owner connection: verifier требует
  dedicated migration connection, совпадающую с application owner.
- Production migration boundary разделяет verifier на две fail-closed фазы: pre-migration принимает
  только exact checked-in migration ledger prefix по паре `created_at + Drizzle SHA-256 hash`,
  а post-migration требует exact complete timestamp+hash ledger и repository-owned full structural
  manifest `0000`–`0020` со schema/ownership/ACL invariants.
- Stage 6 schema-first migration выполнена: production target прошёл metadata/preflight,
  pending `0004`–`0020` применены, а postflight подтвердил complete `0000`–`0020`
  ledger, full structural manifest и production privilege contract.
- Repository-owned migration→runtime evidence теперь подтверждает accepted migration through
  `0020_translation_generation_permission`. Это закрывает schema-first evidence gate, но не
  означает, что schema-dependent Worker/runtime уже развёрнут.
- Repository privilege boundary по-прежнему требует direct non-grantable `CREATE` на текущую
  database именно для application owner/migrator и запрещает database `CREATE` для localization
  runtime и `PUBLIC`; bounded identity/capability gate подтверждён external execution.
- Stage 6 runtime contract разделяет existing `localization-read` и отдельную `web`
  capability. Production sequence уже создала `vico_forum_web`, установила protected
  `WEB_RUNTIME_DATABASE_ROLE`, выдала exact reviewed relation grants и приняла database-role
  defaults `lock_timeout=2s` / `statement_timeout=5s`. После нескольких consumed
  bootstrap/recovery попыток рабочий standalone `ALTER ROLE ... PASSWORD ...` precedent был
  повторён под owner: usable web credential установлен без изменения grants/defaults, а Cloudflare
  успешно создал отдельный unbound direct-origin `vico-forum-web` Hyperdrive с disabled query
  caching. Split `HYPERDRIVE` / `WEB_HYPERDRIVE` wiring уже merged в `main`, но production
  Worker всё ещё остаётся на старом baseline deployment и новый web binding/runtime ещё не принят
  внешне. Content generation runtime остаётся disabled/fail-closed и не получает
  task/provider/background DB capability.
- Обычная feature-разработка и её CI остаются отделены от external rollout; merge в `main` сам по
  себе не является deployment/acceptance evidence.

## Реализованный foundation

Текущий repository baseline:

- React Router `8.3.1` Framework Mode + SSR + TypeScript на Cloudflare Workers;
- Node `24.21.0`, pnpm `12.3.4`, React `19.3.0`, Vite `8.2.2`;
- PostgreSQL 17 + Drizzle ORM с append-only migration history;
- Better Auth `1.7.4` + PostgreSQL Drizzle adapter;
- generic `/:locale/*`, runtime `LocaleRegistry`, BCP-47 resolution, LTR/RTL и request-scoped
  `i18next`;
- persistent locale registry, persistent UI translation storage и compiled bundle storage;
- текущая repository migration history — `0000`–`0043`; external accepted migration evidence по-прежнему заканчивается на `0020`.

## Forum core — Stage 4

Stage 4 реализован и проверяется локально/в CI:

- публичное чтение `категория → раздел → тема → сообщения`;
- Better Auth session boundary и `/api/auth/*`;
- authenticated создание темы и ответа;
- safe CommonMark rendering без raw HTML и внешних images;
- transactional per-author cooldown для topic/reply writes;
- solved topic и best answer;
- immutable topic-title/post-body revisions с независимым `sourceLocale | und`;
- dynamic PostgreSQL-backed authorization с built-in/custom roles, редактируемыми grants и
  per-user `allow | deny | inherit` overrides;
- locale-aware authorization management UI;
- server-side `PermissionResolver`, server-derived solution scope и lockout protection;
- authorization availability отделена от permission denial: только классифицированные
  dependency availability failures используют controlled degradation/`503`, unexpected
  programming/schema/configuration errors не маскируются;
- полные `resolveUser()` и `readManagementState()` собираются из одного стабильного
  PostgreSQL snapshot на composite read, сохраняя next-request freshness и request-scoped cache.

Real Google OAuth credentials/smoke и внешний authorization bootstrap не входят в завершённый
local/CI Stage 4 и остаются Stage 6.

## Translation system — текущее состояние Stage 5

### Stage 5A — реализованная часть

В repository/local-CI path работают:

- `UiTranslationService` для exact-target generation planning;
- provider-neutral `TranslationProviderRouter` и capability boundary;
- `LocaleRulesProvider` и validation provider output, включая structured plural units;
- durable translation tasks в PostgreSQL;
- commit task before enqueue и transport-neutral enqueue boundary;
- task lifecycle `pending → processing → pending/stale/completed/failed`, claim token и lease/reclaim;
- stale/source/policy/locale/manual preflight перед provider call;
- durable monotonic generation ordering и current-generation fencing;
- fresh-plan A-B-A reactivation stale stable identity через новую monotonic generation под существующим generation-head lock; completed identity и старая Queue delivery остаются terminal;
- provider-neutral task executor;
- concrete local/CI Cloudflare Workers AI `@cf/meta/m2m100-1.2b` adapter за provider-neutral boundary для bounded UI plain-text subset: provider-local exact language-code mapping, fixed model id, runtime response validation, typed retry/terminal failure mapping и fake-runner contract tests без real AI binding/live calls;
- typed retryable/terminal translation-execution failure taxonomy и transport-neutral `ack` / `retry` / `terminal` outcome boundary;
- bounded durable attempt budget с PostgreSQL-owned lifecycle time, claim-token-fenced retry/failure transitions и persistent `failed` terminal path как local/CI DLQ equivalent;
- transport-neutral `JOB-06` reconciliation/observability: bounded PostgreSQL recovery batches резервируют aged `pending` и expired `processing` tasks через durable reconciliation progress и `SKIP LOCKED`, безопасно переживают duplicate/concurrent runs и partial enqueue failures; observability показывает status, age, attempt-budget, lease и bounded terminal-failure summaries без source/provider payloads;
- conditional machine publication с provider/model provenance;
- atomic `task completion + raw machine translation + whole namespace bundle` publication;
- persisted exact-locale compiled bundles с deterministic current-deploy identity;
- persistent `ui_translations` / `ui_translation_bundles` schema rejects canonical English
  after trim + case-insensitive comparison; repository-owned production verifier uses the same boundary;
- SSR/runtime чтение verified persisted bundles для canonical non-English locale с raw/local/
  English fallback при miss или классифицированной storage degradation;
- repository/local-CI команда `pnpm db:reconcile-ui-bundles` выполняет locked reverify/delete
  convergence obsolete persisted bundles только для disposable local `*_test` PostgreSQL;
  request path остаётся read-only и не вызывает translation provider, external execution не входит в Stage 5.

Migration `0007`–`0010` содержит durable task lifecycle и generation-ordering foundation; `0012` добавляет bounded retry и persistent terminal-failure state; `0013` добавляет durable reconciliation progress и query-derived indexes. `0014` добавляет revision-bound persistence для topic-title/post-body translations с database-backed revision ownership; `0015` расширяет shared durable task storage отдельным `content-topic-title` kind с database-enforced title-revision ownership; `0016` добавляет отдельный `content-post-body` kind с exact post-body revision ownership и тем же shared generation/lifecycle foundation; `0017` добавляет отдельные PostgreSQL fixed-window request-budget counters для user-content translation.

### Stage 5B — реализованный foundation

В repository/local-CI path реализованы:

- provider-neutral `ContentTranslationService` / `ContentTranslationStore` для topic title и post body;
- отдельные PostgreSQL tables для topic-title и post-body translations с identity
  `contentType + contentId + revisionId + targetLocale`;
- database-backed revision-owner/source-locale foreign keys и cascade lifecycle без eligible orphan rows;
- canonical non-`und` target locale, immutable revision source locale и validated
  `persistent_manual | machine` provenance;
- idempotent exact-identity writes с manual-over-machine trust preservation;
- exact-current-revision reads: miss/stale/invalid/classified storage-unavailable result
  возвращает original exact revision; unexpected storage/programming errors не маскируются;
- provider-neutral source-locale resolution/planning boundary для immutable content revisions:
  известный canonical source locale обходит detection, `und` использует только injected detector
  с runtime validation и отдельной acceptance policy; unresolved/classified unavailable source
  блокирует будущий provider job, а manual correction требует нового revision identity;
- concrete local/CI TinyLD `1.3.4` adapter за CNT-03 boundary для revisions с `sourceLocale=und`:
  detector работает process-local без API/credentials, использует explicit reviewed TinyLD-code →
  canonical Vico language mapping, не выводит region/script, требует минимум 24 Unicode semantic
  letters, native score ≥ 0.80 и top-vs-runner-up margin ≥ 0.20. Для post-body semantic text
  извлекается через единый CNT-04 Markdown/technical-fragment boundary; weak/short/mixed/unmapped
  evidence и Georgian script (модели `ka` в TinyLD 1.3.4 нет) остаются unresolved/original-safe.
  Поле CNT-03 `confidence` переносит detector-native TinyLD score и не трактуется как
  калиброванная вероятность; known revision source locale по-прежнему обходит detector;
- request-budget foundation для user-content translation: server-only Web Crypto HMAC-SHA-256
  pseudonymizer принимает уже классифицированный authenticated/anonymous requester identity,
  domain-separates actor kind и key version и выдаёт только bounded base64url subject key; raw
  user id/IP, session token и HMAC secret не сохраняются. Dedicated PostgreSQL fixed-window store
  использует versioned global/requester scopes, caller-supplied positive cost/window/limits,
  один database-owned transaction timestamp, deterministic global-before-requester admission,
  atomic all-or-nothing consumption, typed denial/reset/retry metadata и bounded indexed cleanup.
  Topic-title и post-body planners принимают уже pseudonymized subject + injected versioned
  cost/window/limits/scopes и выполняют correctness-critical admission в той же PostgreSQL
  transaction, что final current-revision/current-translation recheck и durable task
  upsert/dedup/reactivation. Ineligible/current/completed work остаётся free, eligible
  pending/processing duplicate request повторно учитывается budget, denial/error откатывает
  counters вместе с task mutation, а enqueue остаётся after-commit. Authenticated generation routes
  подключены через существующий topic POST boundary; anonymous enablement и финальные quota values
  не выбраны;
- on-demand durable planning для topic-title translation: planner повторно читает current immutable
  title revision из PostgreSQL, проверяет active canonical target и provider-neutral support,
  выполняет atomic request-budget admission вместе с final serialized revision/translation recheck
  и durable task decision, не создаёт work для unresolved/same-locale/current/completed work, создаёт
  revision-bound stable task через shared durable lifecycle и только после commit отправляет
  transport message `{ translationTaskId }`; concurrent duplicate planning дедуплицируется
  одной durable task identity;
- provider-neutral execution/publication foundation для `content-topic-title`: persisted task kind
  определяется до kind-specific claim; content task использует общий PostgreSQL claim/lease,
  attempt budget, retry/terminal state и reconciliation/observability lifecycle; после claim
  повторно проверяются exact current revision/source semantics, generation policy/head, active
  target и отсутствие current translation; provider получает ровно один `domain: content`,
  `plain` request с authoritative original title и resolved source locale;
- machine topic-title result runtime-валидируется и публикуется conditional transaction:
  claim token, current revision, generation/policy и translation trust повторно проверяются;
  existing/manual translation не перезаписывается, а успешная machine write и task completion
  коммитятся атомарно;
- provider data-policy boundary для user content default-deny: machine request различает UI и
  content classification, а topic-title planning и execution используют одну
  `public-forum-topic-title` capability semantics. Существующий Cloudflare Workers AI M2M100
  adapter сохраняет UI behavior и может локально/в CI принять только plain public topic title
  для явно allowlisted canonical locale pair при injected policy; policy не получает source text,
  повторно проверяется при execution, а denied/revoked content не достигает Workers AI runner.
- provider-neutral CNT-04 protected CommonMark foundation для post-body translation:
  source Markdown разбирается в mdast, translatable text получает deterministic AST-position IDs,
  а code, raw HTML, image/link destinations, autolink URLs и embedded technical identifiers
  остаются защищённой структурой/immutable placeholders. Restore принимает только exact bounded
  segment set, проверяет protected-token preservation, вставляет provider values как text nodes,
  deterministic сериализует и повторно проверяет AST structure; нарушение возвращает typed
  `original-fallback` validation error. Результат остаётся input существующего safe
  `ForumMarkdown` renderer, а source revision не изменяется.
- on-demand durable planning для post-body translation: planner повторно читает exact current
  immutable post revision, выполняет source-locale resolution и CNT-04 protection authoritative
  Markdown, проверяет active canonical target, metadata-only provider/data-policy capability,
  current exact-revision translation и выполняет injected request-budget admission атомарно с
  final serialized revision/translation recheck и durable task decision. Stable `content-post-body`
  identity/fingerprint учитывает revision/source semantics, protected representation,
  `protectedContentPolicyVersion`, target и generation policy; PostgreSQL сохраняет только
  revision/source/policy metadata, а transport после commit получает только
  `{ translationTaskId }`. Concurrent duplicate planning сходится к одной durable identity,
  live claim не сбрасывается, completed identity не оживляется, enqueue failure остаётся
  recoverable через JOB-06;
- provider-neutral execution/publication для `content-post-body`: dispatcher определяет persisted
  kind до kind-specific claim, shared PostgreSQL lifecycle сохраняет claim/attempt/retry/terminal
  semantics, а post-body preflight повторно проверяет current revision/source, generation/policies,
  active target и отсутствие trusted current translation. CNT-04 заново строится только из
  authoritative current Markdown и тем же versioned fingerprint связывает execution с durable
  planning. Перед первым provider call применяются injected technical bounds по числу semantic
  segments и их суммарной длине; затем каждый ordered segment отправляется отдельным
  `domain: content`, `public-forum-post-body`, `plain` request с resolved source/target
  locale, причём capability/data-policy boundary повторно проверяется для каждого вызова. Code,
  URL destinations, raw HTML, Markdown structure и protected technical identifiers не передаются
  как provider text;
- post-body result публикуется только после полного успешного segment set: provider/model/
  attribution provenance должен быть единообразным, CNT-04 restore повторно проверяет exact
  segment IDs, protected tokens и Markdown structure, а invalid/unsafe output terminalizes без
  partial translation. Publication transaction сохраняет lock order и повторно проверяет
  generation head, processing task/claim token, current post/revision/source/policies и existing
  translation trust; manual/current translation не перезаписывается, machine translation write и
  task completion коммитятся атомарно. Истёкший, но не reclaimed claim с тем же token может
  завершиться под row lock; реально reclaimed claim с новым token публиковать не может. Transient
  provider/dependency failures используют общий bounded retry lifecycle, stale/current outcomes
  ack-аются без публикации. Existing Cloudflare M2M100 path остаётся default-deny для post-body:
  concrete provider allowlisting/data-policy approval, bindings и live calls не выбраны и не
  входят в этот local/CI foundation;
- provider-neutral pre-claim allowance admission для content translation execution:
  каждый потенциальный provider attempt получает deterministic occurrence identity из durable task,
  current generation и следующего attempt number; PostgreSQL хранит короткую admission lease,
  admitted marker либо durable deferred `retryNotBefore`/bounded reason. Provider allowance
  проверяется до content claim, поэтому denied/unavailable capacity не увеличивает JOB-04
  `attemptCount`, не вызывает provider и не превращается в retry/terminal execution failure.
  Успешный content claim атомарно потребляет admitted occurrence и только тогда начинает execution
  attempt; retry получает новый occurrence, а stale reactivation/new generation инвалидирует старый
  admission. Для post body allowance envelope строится из authoritative CNT-04 semantic segments и
  покрывает весь bounded attempt. JOB-06 не re-enqueue deferred work до reset и не гоняется с live
  admission lease, но восстанавливает ready deferred/expired lease/admitted-unclaimed work; bounded
  observability показывает только aggregate admission/defer counts, age/reset timing и bounded
  reasons. Migration `0019` добавляет nullable content-only allowance lifecycle metadata и recovery
  index. Stage 5 default остаётся fail-closed без authoritative real allowance adapter: local/CI
  contract проверяется injected fake и не утверждает реальное соблюдение 5% provider reserve;
- manual source-locale correction для topic title и post body: code-backed permissions
  `forum.sourceLocale.correctOwn` / `forum.sourceLocale.correctAny` используют dynamic
  authorization и authoritative resource ownership. Correction принимает canonicalizable non-`und`
  BCP-47 source language независимо от UI LocaleRegistry, копирует только authoritative current
  original content в новую immutable revision и меняет только source-locale metadata.
  Expected-revision CAS fencing делает stale/concurrent correction безопасной; предыдущие
  translations/tasks остаются historical revision-bound. Locale-aware topic UI показывает
  correction controls по optional presentation auth, а action повторно проверяет authentication,
  same-origin, current permission и resource ownership server-side. Migration `0018` расширяет
  code-backed permission catalog/check constraint и approved initial built-in grants;
- authenticated one-unit generation planning actions для user-content translation: code-backed permission
  `forum.translation.generate` добавлен в dynamic authorization catalog с initial grants built-in
  `user`, `moderator` и `admin`; role grants и per-user overrides остаются authoritative.
  Existing topic POST boundary поддерживает ровно один current topic title либо один current post body
  текущей темы, требует authenticated session + same-origin + effective permission и выводит target
  только из canonical validated URL locale. Actor pseudonymized server-side через существующий HMAC
  boundary, а planner получает только subject key и injected versioned server-owned request-budget
  policy; production cost/window/limits по-прежнему не выбраны. Route selection использует
  authoritative current topic/page state, а planner сохраняет финальный revision/translation recheck
  и atomic request-budget/task mutation. Automatic-eligible post action заново строит CNT-04 и
  пропускает только semantic body `<= 3000` characters; более длинный body возвращает bounded
  explicit-required no-op до pseudonymization/budget/task mutation. Budget denial возвращает bounded
  `429 Retry-After`, classified authorization/forum/planning availability — controlled `503`,
  normal no-job outcomes original-safe, unexpected errors не маскируются. Action не вызывает
  provider allowance или translation provider synchronously. Migration `0020` добавляет permission
  и initial grants. Default Worker generation capability явно disabled, поэтому local/CI foundation
  не содержит production anti-spam values, HMAC secret, Queue/provider/allowance bindings или live
  calls;
- read-only presentation уже сохранённых current user-content translations на странице темы:
  loader использует authoritative current title/post revisions и canonical validated URL locale,
  выбирает только exact `contentType + contentId + revisionId + targetLocale` records через общую
  validation semantics `ContentTranslationService` и выполняет bounded batch read максимум одним
  title query и одним set-based post-body query. Доступный current translation автоматически и
  независимо показывается для каждой единицы; missing/invalid/classified-unavailable данные
  возвращают exact current original без generation side effects. Topic title и breadcrumb используют
  одну selected presentation, translated post body по-прежнему проходит существующий safe
  `ForumMarkdown` renderer, UI выводит provenance, optional stored attribution и `lang`/`dir`
  metadata, а native `details` control позволяет открыть original без writes/provider calls. Guest
  и authenticated user получают один и тот же persisted public read result.

### Stage 5 — завершённый local/CI path

В repository/local-CI path дополнительно реализована generation-side UX/status integration:

- topic loader для authenticated reader с current effective `forum.translation.generate` читает
  bounded current-generation status одним set-based batch query поверх существующих generation heads,
  task rows и revision metadata; task/provider/claim/budget internals клиенту не сериализуются;
- exact-current persisted translation остаётся authoritative presentation state; classified
  generation-status storage unavailable сохраняет public/original-safe topic read и отключает
  automatic generation hints для этого response, unexpected failures не маскируются;
- eligible original content после hydration автоматически ставится в sequential one-unit generation
  queue с exact `contentType + contentId + revisionId + targetLocale` guard и без повторной отправки
  той же единицы в одном hydration cycle; SSR/GET не выполняет generation POST/provider work;
- post body с CNT-04 semantic length `<= 3000` использует automatic action, более длинный body
  получает отдельный explicit control. Explicit path обходит только automatic length gate и повторно
  проходит те же authenticated permission, authoritative resource/revision/target, pseudonymization,
  request-budget, planner и dispatch boundaries;
- automatic queue подавляет per-item loader revalidation и после завершения выполняет один read-only
  refresh; active `pending | processing | deferred` durable status и client-visible `converging`
  state используют bounded finite polling через loader revalidation, а не повторные generation POST.
  `converging` означает только original-safe cross-read convergence, когда independently read
  presentation ещё original, а durable task уже completed; это не durable task status и backend
  `completed` клиенту не раскрывается;
- UI локализованно и accessibility-visible показывает requesting/pending/processing/converging/
  deferred/failed/unavailable/current/explicit-required feedback. Request-budget `429` может
  показывать только bounded retry timing без раскрытия quota internals;
- regression coverage проверяет batch status semantics, revision/target isolation, original-safe
  degradation, dynamic permission hints без GET side effects, explicit threshold bypass, same-hydration
  dedupe, finite read-only polling и disposable PostgreSQL integration.

Реальные Cloudflare Queue bindings, provider credentials/calls, authoritative production allowance
adapter, production anti-abuse values, provider/data-policy approval и deployed provider/Queue smoke
остаются отдельной Stage 6 external acceptance.

## CI и migration state

Обычный pull-request CI сейчас проверяет:

- accepted migration history и repository-local migration/evidence contracts;
- lint;
- typecheck;
- unit/route tests;
- production build;
- Drizzle migration metadata;
- clean PostgreSQL 17 migration/integration suite;
- production full-schema manifest parity против clean PostgreSQL 17;
- named `localization-read` / `web` runtime privilege contract и disposable PostgreSQL 17
  positive/negative grant probes, включая row-lock и forbidden cross-domain/DDL checks;
- split-authority web relation-provisioning contract: exact grants derive-ятся из shared web
  capability, а disposable PostgreSQL 17 проверяет successful migrator-owner phase и rollback
  при forbidden prerequisite drift;
- Workers build и local Hyperdrive smoke.

Обычный PR CI не выполняет live GitHub Actions verification старого external migration evidence.
Live migration→runtime verification относится только к фактическому external schema-dependent
rollout по `docs/database/MIGRATIONS.md`.

## External / deployed state

Repository/local-CI state намеренно может опережать внешний pre-release environment.

Текущее repository-owned migration evidence относится к
`0020_translation_generation_permission` и подтверждает successful target migration +
postflight verification полного `0000`–`0020` schema contract. Это evidence schema-first
границы; schema-dependent runtime rollout ещё не выполнен.

Существующий внешний localization foundation использует read-only Hyperdrive capability для
`locales`, `ui_translations` и `ui_translation_bundles`. Ранее выполненный real Hyperdrive
acceptance остаётся evidence этого localization path, но не является gate для обычных feature PR.

Repository содержит reviewed exact ACL/verifier contract для отдельной web runtime
capability (Better Auth + forum + dynamic authorization + persisted forum-content reads) и
защищённый split-authority execution path. Production evidence подтверждает созданную
`vico_forum_web` role, protected `WEB_RUNTIME_DATABASE_ROLE=vico_forum_web`, exact 50/50
non-grantable relation privilege pairs, successful read-only runtime privilege verifier,
database-role defaults `lock_timeout=2s` / `statement_timeout=5s` и usable credential.
Cloudflare отдельно содержит unbound direct-origin cache-disabled Hyperdrive `vico-forum-web`.
Production Worker binding/routing и deployed web-runtime acceptance ещё не выполнены.

Fresh Stage 6 pre-deploy recheck подтвердил: native Git Builds integration остаётся отключённой;
Production продолжает обслуживаться baseline version `78f87645` со 100% traffic; owner подтвердил
неизменный пустой `Previews Base` без bindings/runtime variables/secrets; production workers.dev
URL — `https://vico-forum.iliya1947a.workers.dev`. Existing `vico-forum-web` Hyperdrive
по-прежнему unbound/inactive и cache-disabled. Topology gate закрыт без deployment mutation.

Dedicated least-privilege migration credential для production подтверждён external execution как
`vico_forum_migrator`, production migration workflow не содержит database-owner exception, а
required direct non-grantable database `CREATE` capability подтверждена manual read-only
identity/capability workflow. Последующий authorized schema-first migration успешно применил
`0004`–`0020`; production postflight подтвердил complete ledger, full structural manifest и
privilege contract. Repository-owned evidence теперь покрывает `0020`, но Worker deployment,
runtime roles/Hyperdrive writes и другие schema-dependent runtime capabilities ещё не выкатывались.

До завершения Stage 6 ещё не выполнены:

- real Google OAuth configuration и smoke;
- server-controlled bootstrap первого authorization manager;
- production Worker rollout merged split-binding revision + deployed web-runtime acceptance для
  уже существующих usable credential и cache-disabled `vico-forum-web`;
- отдельные translation background/maintenance runtime capabilities;
- Cloudflare Queues и реальные translation providers;
- final preview/private-data isolation recheck для write-capability rollout;
- full production-like deployment smoke и backup/restore acceptance.

## Ближайший маршрут

Текущий активный маршрут — standalone UI/UX product pass по утверждённому target-product contract:

1. Reproducible visual baseline + GitHub Pages progress preview завершён и merged.
2. Foundations/homepage correction slice прошёл owner visual acceptance в GitHub Pages.
   Дальнейшая косметическая полировка homepage сейчас не является приоритетом.
3. `Popular` merged через PR #168 после green repository CI/Pages и owner visual
   acceptance 2026-10-02.
4. `Unanswered` реализован и merged через PR #169: реальный locale-aware public route использует
   существующие topic/post данные и семантику `isSolved = false` + ровно один persisted post;
   owner visual acceptance подтверждён 2026-10-02.
5. `Tags` реализован и merged через PR #170: free-form topic tags, canonical
   normalization/reuse, migration `0021_forum_tags`, public tag index/filter routes, topic creation
   и presentation integration; owner visual acceptance подтверждён 2026-10-02.
6. По выбору владельца следующая bounded product subtask — global Search. Текущая
   implementation-ветка использует existing current topic-title/post revisions и tags, без новой
   migration или отдельного search-index subsystem. Repository CI и GitHub Pages preview проходят;
   owner visual acceptance подтверждён 2026-10-03.
7. Presentation slices через PR #167 уже прошли owner review/merge в пределах Pages-preview.
   Heavy approved subsystems, которые всё ещё перечислены в `Under development`, остаются
   отдельными bounded tasks.
8. Уже существующие product capabilities подключаются к реальным данным/поведению; незавершённые
   approved entry points не имитируют работу и временно ведут на `Under development`.
9. После каждого implementation slice выполнять targeted automated checks и browser review.
10. Завершить UI/UX pass только после полного CI и обязательной real-runtime visual/product
   acceptance из `docs/UI_UX_PASS.md`; GitHub Pages не заменяет эту проверку.
11. Owner mobile review 2026-10-03 унифицировал compact destination cards на Category/Section/Tags/Search: entry action остаётся отдельной vertical orange rail справа по всей высоте карточки; нижний orange footer для этих карточек не используется.
12. Message links реализован и merged через PR #172: permanent message anchor + public Copy link + localized success/failure feedback; owner visual acceptance подтверждён 2026-10-03.
13. Reply/Quote реализован: migration `0022_forum_reply_relationships` добавляет nullable same-topic direct-parent relation; discussion остаётся линейным, Reply таргетирует concrete parent, child показывает parent anchor, parent — direct-reply anchors, Quote вставляет только реально выделенный текст как Markdown blockquote. Existing permissions/rate-limit semantics сохраняются; repository CI и GitHub Pages preview проходят, owner visual acceptance подтверждён 2026-10-03.
14. Full editor/code tooling реализуется в PR #210 на одном shared editor для create-topic,
    reply и Help question authoring; current implementation сохраняет existing body/mutation
    contracts, Reply/Quote integration и optional similar-question flow. Drafts/autosave остаются
    следующим отдельным authoring subsystem, а visual polish editor не расширяет текущий
    функциональный scope.
15. Stage 6 infrastructure gates остаются на паузе до отдельного указания владельца.

Ранее подготовленный защищённый manual rollout mechanism остаётся в repository. При явном
возобновлении Stage 6 актуальная последовательность остаётся следующей:

1. `.github/workflows/production-worker-rollout.yml` — manual main-only workflow через отдельный
   protected Environment `production-worker`, exact authorized SHA и explicit upload/promotion
   confirmations.
2. До Cloudflare access workflow повторно проверяет accepted live migration→runtime evidence для
   `0020`, disposable PostgreSQL contract, exact build и local split-Hyperdrive Workers smoke.
3. Exact pinned Wrangler `4.130.0` сначала создаёт новую Worker version через
   `versions upload` без traffic promotion. Runtime auth values поступают только из protected
   Environment; secrets используются из runner temp и не сохраняются как artifacts.
4. Uploaded version должна пройти GET-only public/auth/database-read smoke через Version URL.
   Promotion допускается только для version из того же authorized run и только при отдельном
   confirmation input.
5. После promotion выполняется production smoke. При automated failure workflow возвращает 100%
   traffic на accepted baseline version prefix `78f87645` и проверяет rollback state.
6. Interactive Google sign-in/session/logout остаётся owner post-deploy smoke и не автоматизируется
   через CI.
7. Подготовительный PR не создаёт `production-worker` Environment, Cloudflare API token,
   Google OAuth client/auth secrets, Worker version/deployment и не меняет traffic. Всё это требует
   отдельного explicit authorization после merge и review.

Stage 5 завершён только в repository/local-CI boundary. Real Google OAuth/bootstrap, remaining
production runtime rollout, Cloudflare Queues/providers, authoritative production
allowance/anti-abuse values, final preview isolation, deployed smoke и backup/restore остаются
Stage 6 работой и не входят в UI/UX product pass.


### Editor 2.0 edit lifecycle E1 — 2026-10-14 (in progress)

PR #215: targeted change at `f6539ff` keeps the published-post edit controls and draft publication barrier pending during React Router `loading` after an `editPost` submission, rather than unlocking immediately after `submitting`. Independent Codex diagnosis records the underlying loss-of-late-input scenario in shared service PR #147. The gated `submitting → loading → idle` success regression passed in CI #38609692082, while the failed-save regression exposed a separately confirmed owner-subtree remount on same-topic POST. A structural correction at `fd7eb7e` retains same-page editor/draft runtime and resets the translation manager's own navigation lifecycle; the status-bearing 400/storage-failure/retry regression was added at `961c730`. The exact code+test head `619105a` passed both `checks` (955 application tests / 93 files; lint, typecheck, builds, schema checks) and `database` (293 native PostgreSQL tests / 27 files) in CI #38619373836. The E1 current-scope published-edit lock/failed-save/runtime-retention correction is verified within repository CI; standalone live-browser acceptance and whole-Editor final review remain outstanding. Related E2/E3 findings remain open, and whole-Editor acceptance/review is not complete.


### Editor 2.0 E2 — edit-resume URL consumption (2026-10-14)

PR #215: fixed confirmed re-opening of a cancelled published-message editor after same-topic revalidation. Cancel and acknowledged successful Save now consume only the `editPost` URL command via same-path `replace` navigation, preserving other query parameters and hash; this does not delete or auto-publish the recoverable edit draft. A fresh explicit resume URL can still open the authorized form. Added actual TopicRoute/router regressions for Cancel → revalidate → remain closed → explicit resume and for Save completion consuming the resume parameter. Code commit `bac86a7`, tests `c89f38c`. The exact code/test head `c89f38c` passed both `checks` and `database` in CI #38623649760; documentation-only follow-up heads do not change runtime behavior. E3 and whole-Editor acceptance remain open.


### Editor 2.0 E3 — published revision fence bound to recoverable edit draft (2026-10-14)

PR #215 addresses the confirmed current-scope E3 stale-edit overwrite scenario: the previously mutable hidden `expectedRevisionId` tracked the latest loader post even when a locally or remotely restored edit draft belonged to an older published revision. A post-edit draft now retains its `publishedRevisionId` in the existing JSONB/local draft payload (optional for backward compatibility; no schema migration), and the live edit form submits that draft-owned fence, not the latest loader revision. The editor is not remounted solely by a changed published revision. When a published revision differs or a legacy draft lacks a recorded baseline, Save is blocked and the existing working text remains available until the author explicitly reconciles with the current published revision. Server post revision CAS is unchanged. TopicRoute/MarkdownEditor regressions cover R1→R2 revalidation, local versioned/legacy recovery, and restoration of a server-synced draft on another device. Exact code+test head `d607bd7` passed `checks` (960 application tests, 93 files; lint/typecheck/build and validation) and `database` (293 native PostgreSQL tests, 27 files) in CI #38626401557. The E3 client overwrite cause is corrected and repository-CI verified; independent final whole-Editor/browser acceptance is not implied. E1/E2 remain previously corrected; whole-Editor acceptance and merge remain outstanding.


### Editor 2.0 — @mentions authoring suggestions (2026-10-14)

PR #215 now supports an initial, bounded user-facing @mention authoring slice. After typing `@` and a name fragment, authenticated authors receive up to eight matching registered users and can insert a Markdown profile link resolved by immutable account ID in both Simple and Advanced editor modes. `/:locale/mentions` returns only member ID and public display name, with session protection, length-limited/LIKE-escaped input, no email projection and private/no-store responses. The new editor suggestion surface uses existing source-edit/history/local-save primitives; no new database table, migration or dependency was added. English, Russian and Hebrew UI label catalogs/fingerprints were updated.

Exact implementation/test head `22c3d3b4123960ef22bf2be097813dcaef1489be` passed `checks` (968 application tests across 95 files; lint/typecheck/build/standard guards) and `database` (294 native PostgreSQL tests across 27 files) in CI #38629891041. Unit/integration tests cover literal-name search and API authorization, escaping and private data; Unicode mention fragment detection; and stable profile-link insertion in both editor modes.

**Remaining Editor 2.0 Stage 6 scope:** durable mention-notification generation on successful publish/edit, duplicate suppression against reply notifications, quoted/code exclusions, edit-history notified-set semantics, plus other approved editor completion/acceptance work. This authoring slice does **not** claim those behaviors are implemented. No live browser/owner visual acceptance, final whole-Editor independent review or merge has occurred.


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

### Editor 2.0 — attributed quote correction (2026-10-15, verification pending)

PR #215 implements a bounded correction after Sol/Codex diagnosis of the attributed-quote renderer. The ReactMarkdown HAST blockquote attribution recognizer now skips incidental whitespace and identifies only the first semantic quote-header paragraph/link. Generated Markdown quote labels entity-escape ampersands so author spellings such as `&copy;` and `&amp;` survive visible rendering. The existing ordinary Markdown source representation, reply relationship and Range/ResizeObserver presentation remain unchanged.

CNT-04 now omits only recognized attribution-label text nodes from machine-translation segments while leaving quoted body text and other link labels translatable. The shared post-body current-translation selector rejects same-revision translated content when its recognized quote-author/number/permalink sequence differs from the source. Post-body task preflight and serialized PostgreSQL planning apply that selector rather than treating every stored row as valid; conditional publication replaces invalid quote-attribution rows atomically while preserving valid manual-translation precedence. The protection policy advances to `cnt06-quote-attribution-v1` for new task identity/policy checks. Focused source/renderer, selection/presentation, planner and native PostgreSQL regressions were added.

The implementation requires exact-head CI and real integrated browser/owner acceptance before it can be accepted by Sol; no CI pass, browser matrix, final whole-Editor review, formal Codex Code Review, merge or external rollout is claimed by this initial record.

### Editor 2.0 attributed quote correction — exact-head repository CI (2026-10-15)

Code/test head `4122e089bcb387ac4b3bcf976801e9e37ba32359` passed [GitHub Actions CI #38741751698](https://github.com/iliya1947/vico-forum/actions/runs/38741751698): `checks` SUCCESS (1003 application tests / 95 files, lint, typecheck, builds and validations) and `database` SUCCESS (298 native PostgreSQL tests / 27 files, migration/privilege/Workers smoke). Two earlier CI heads failed due to test harness/TypeScript project listing rather than a confirmed production regression; the corrections are included in this exact code/test head. An unrelated locale serialization failure (`40001`) seen in the first run did not reproduce on the next exact-head database run; no locale implementation change was made. Real integrated browser behavior, published/editor parity across modes and owner visual acceptance of this exact change remain unverified. This is a code/test gate only, not Sol's independent acceptance, whole-Editor acceptance, formal Codex review, infrastructure change or merge.
