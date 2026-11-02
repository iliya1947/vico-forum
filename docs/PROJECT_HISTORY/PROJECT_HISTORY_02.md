# PROJECT_HISTORY_02.md

> [Индекс истории](./PROJECT_HISTORY.md) · [Предыдущий том](./PROJECT_HISTORY_01.md) · [Следующий том](./PROJECT_HISTORY_03.md)

Период: **2026-10-01 — 2026-10-10**.

Этот том сохраняет исторические implementation/CI/review-срезы раннего октябрьского UI/UX и MVP-цикла. Текст ниже перенесён из датированного исторического блока `PROJECT_STATE.md`; порядок внутри исходных групп сохранён, чтобы не переписывать provenance.

## Исторические срезы

## Текущая фаза и датированные срезы реализации

Vico Forum находится в ранней pre-release разработке. Промежуточные PR/CI
checkpoints ниже сохраняются как датированная история, не как очередь действий.

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

- Решение владельца 2026-10-10: приоритет — довести весь форум до работающего MVP,
  не блокируя functional slices дальнейшей косметической полировкой. Достаточно usable
  интерфейса и корректных механизмов; подтверждённые functional/security/data/authz
  defects исправляются в текущем scope. Переработка и детальный UX/visual polish
  существующих экранов, включая профиль, — отдельный последующий проход, не критерий
  готовности отдельных MVP-срезов. Финальная real-runtime acceptance перед публичным
  выпуском по-прежнему обязательна.

- Online presence («Кто сейчас на форуме») реализован и merged в bounded
  MVP PR #213 (2026-10-10): вошедший пользователь с видимой вкладкой посылает
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
  category reader — bounded latest-topic activity по каждому section. Впоследствии merged PR #181 добавил к
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
  owner visual acceptance подтверждён 2026-10-02. Следующей bounded product-функцией тогда был global Search:
  implementation-ветка добавила public
  `/:locale/search?q=...` поверх current topic-title/post revisions и topic tags без новой
  migration/search-index subsystem. Repository CI и GitHub Pages preview прошли; owner visual acceptance подтверждён 2026-10-03. Search merged через PR #171. Message links реализован и merged через PR #172: public permanent post anchors + copy-link UI работают без DB/backend изменений; GitHub Pages preview пройден, owner visual acceptance подтверждён 2026-10-03. Reply/Quote реализован: migration `0022_forum_reply_relationships` добавляет nullable same-topic parent relation для forum posts; обсуждение остаётся линейным, Reply привязывает новый post к конкретному parent, Quote вставляет только выделенный текст как Markdown blockquote, а parent/child сообщения связываются стабильными anchors. Existing permissions/rate-limit semantics не меняются; repository CI и GitHub Pages preview проходят, owner visual acceptance подтверждён 2026-10-03. Последующая hierarchy correction в PR #182
  заменяет topic-oriented homepage blocks на category → section map и переносит прежнюю rich
  section presentation на category pages. Owner visual acceptance реализации подтверждён
  2026-10-05; schema/migration/auth/permission/Stage 6 изменений нет.

- Реализованный Unread/new slice подключает repository/database foundation к runtime/UI:
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
  explanation. Pending appeal не снимает authoritative duplicate status: `Disputed` badge видят
  только moderation actors; explanation доступен только author duplicate и actor с
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

- PR #210: после review на `e30a988` исправлены RTL-isolation для технических language IDs (в текущем head) и inline margins у figure blocks. На том промежуточном head дальнейшие exact-head CI, Pages и Codex review ещё требовали подтверждения.

- PR #210: после Codex review устранены пять текущих editor/code findings: ограничение подсветки больших/токеноёмких блоков, корректные границы выделенных строк, исключение скрытого textarea из Tab-порядка Preview, локализованная подпись ссылки и LTR только для кода при RTL интерфейсе. Добавлены регрессионные тесты. Новые замечания повторного Codex review на `f72af07` касались позиции 0 при форматировании первой пустой строки, языка блока кода с `#` и сохранения состояния кнопок code preview в Split. Исправления и регрессионные тесты добавлены; CI и Pages на `29af5e7` прошли. Последующий Codex review обнаружил реальный дополнительный дефект: per-block ограничение подсветки допускает суммарно неограниченную подсветку множества блоков. Введено ограничение подсветки по размеру всего Markdown-сообщения с безопасным отображением кода без подсветки сверх порога; добавлен тест. CI на `e30a988` прошёл со второй попытки после несвязанного нестабильного теста навигации переводов; Pages успешен. Codex review выявил P2-дефект направления технических идентификаторов `c#`/`f#` в RTL — исправлена изоляция подписи языка и поля его ввода с регрессионными тестами. Отступы figure являются отложенной косметической доработкой редактора, а не блокером текущего Stage. На том промежуточном head проверки и review после исправления RTL ещё не были
  завершены; позднее PR #210 merged 2026-10-10.

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
  каждому section, а merged PR #181 подключил к той же section-card surface persisted pins.
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
