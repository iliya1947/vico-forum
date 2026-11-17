# Редактирование заголовка собственной темы — служебный план

## Цель

Добавить обычному авторизованному пользователю возможность редактировать заголовок только собственной темы.

## Утверждённая продуктовая граница

1. Автор темы может изменить заголовок своей темы.
2. Гость и другой пользователь не получают это право только из-за доступности публичной страницы темы.
3. Это не административное редактирование темы и не расширение Admin / Super-admin.
4. Это не исправление source locale. Существующие операции `forum.sourceLocale.correctOwn` / `correctAny` остаются отдельной capability и не дают общего права редактировать заголовок.
5. Заголовок остаётся отдельной immutable revision/translatable unit. Изменение не должно переписывать текущую revision in place или делать перевод старой revision current для новой.
6. Тело первого сообщения, ответы, solved/best-answer state, pin/close/duplicate и иные функции темы не меняются этой задачей.
7. Stage 6, production deployment, внешние provider/Queue/OAuth/Hyperdrive действия и UI/UX product pass вне scope.

## Контракты, которые необходимо сохранить

1. `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`.
2. `TRANSLATION_ARCHITECTURE.md` и `docs/translation/CONTENT_TRANSLATION.md`, особенно CNT-02, CNT-03 и CNT-05.
3. `docs/auth/AUTHORIZATION.md`: authoritative identity/ownership проверяются server-side; client-provided author/role/permission не являются доказательством.
4. Существующие validation, same-origin/CSRF, revision/CAS и failure semantics применяются там, где они относятся к выбранному write path.

## Критерии готовности функции

1. Авторизованный автор темы может изменить её заголовок через обычный пользовательский интерфейс.
2. Гость и неавтор не могут выполнить mutation.
3. Успешное изменение создаёт новый authoritative title revision/source version и становится current title.
4. Старые title revisions и привязанные к ним translations остаются историческими; они не выдаются как current для новой revision.
5. Конкурентное/устаревшее редактирование не должно молча перезаписывать более новую current revision.
6. Не изменяются несвязанные состояния темы и права других действий.
7. Реализация проходит применимые local/CI проверки текущего проекта.

## Рабочий маршрут

1. Мира — фиксирует scope и канал задачи.
2. Лёва — исследует актуальный `main` и готовит полный технический план bounded-реализации: существующий title revision/write path, authorization boundary, route/UI, concurrency/CAS, translation invalidation/currentness, тесты и критерии acceptance.
3. После принятия технического плана Лира реализует bounded scope в отдельном implementation PR.
4. Мира проводит coordinator whole-PR review stable exact head.
5. После coordinator PASS Лёва выполняет независимую техническую проверку того же exact head, если не участвовал в реализации.
6. Документация фактического состояния — отдельным PR в конце задачи, если реализация меняет permanent/current project state.

Реализация до завершения технического планирования не начинается.

## Технический план Лёвы — 2026-11-18

### Статус и проверенный срез

Полный технический план подготовлен по `main` `906d15d896cc3a4f3b7dc9a03f46acd883925d1d`.
Служебный исходный head: `7a99aa932237bf66283834ad8665281790a46827`.
Реализация не начата; план ниже является предложением для scope/fit review Миры, а не разрешением исполнителю.

Полностью прочитаны актуальные AGENTS.md, PROJECT.md, PROJECT_STATE.md, ROADMAP.md,
TRANSLATION_ARCHITECTURE.md, docs/translation/CONTENT_TRANSLATION.md,
docs/auth/AUTHORIZATION.md, docs/EDITOR.md, docs/ADMIN_PANEL.md,
docs/translation/UI_TRANSLATION.md и docs/database/MIGRATIONS.md.
Проверены исходники и относящиеся тесты в указанном срезе. Это исследование кода;
unit/DB/browser/CI проверки будущей реализации не выполнялись.

### 1. Установленная текущая реализация

| Область | Проверенный факт и исходник |
| --- | --- |
| Title identity | `db/schema.ts`: `forum_topics.current_title_revision_id` указывает на отдельную `forum_topic_title_revisions`; revision содержит text, source locale, actor и дату. В `drizzle/0004_forum_domain_foundation.sql` есть owner-matching deferred FK и запрет UPDATE revisions. Новая content model не нужна. |
| Низкоуровневая запись | `db/forum-repository.ts:4333` / `ForumService.reviseTopicTitle` уже делают insert revision + CAS pointer в транзакции под topic lock и AccountState admission. Это не готовая команда own-edit: repository primitive не проверяет владение темой и не имеет title-edit permission, input policy или cooldown. Не выставлять её напрямую пользовательскому route. |
| Source correction | `ForumService.correctTopicTitleSourceLocale` проверяет current revision и own/any scope, затем создаёт новую revision с прежним текстом. `topicAction` обрабатывает `correctTitleSourceLocale`. Этот путь сохраняется отдельным. |
| Authorization | `app/authorization/catalog.ts`, `db/schema.ts:648`, `docs/auth/AUTHORIZATION.md`: title-edit ключа нет; `forum.post.editOwn` относится именно к сообщениям. В БД действует закрытый `authz_permissions_catalog_check`, grants/overrides динамические. `forum.sourceLocale.correctOwn/Any` не разрешает изменение текста. |
| Boundary | `app/forum/actions.server.ts` и `mutations.server.ts`: session actor, same-origin, fresh request permission, typed failure mapping и stale-account expectation. `db/account-state.ts`: actor row FOR NO KEY UPDATE удерживается в той же transaction до COMMIT/ROLLBACK. |
| UI | `app/routes/topic.tsx` выдаёт текущую title revision/original и optional capability flags. `TopicView` в `app/forum/views.tsx` показывает заголовок и own topic tools, но title edit отсутствует. Published-post editor отделён и имеет собственные CAS/recovery/attachments. |
| Reads | `readTopic/readTopicPage`, section/category/home/Help/search/profile readers соединяют title через current pointer. Изменение pointer не требует переписывать эти списки или менять topic URL. |
| Translation | Topic loader строит title unit с actual revision ID. `ContentTranslationPresentationService` запрашивает exact revision и возвращает current original при miss/unavailable. Title task planner и execution store повторно проверяют current title pointer, publication блокирует topic row; stale task не публикует старый результат как current. |
| Moderation/lifecycle | `posts.edit` сейчас документирован для собственных опубликованных сообщений; `admin.forum` относится к административным операциям. Topic closure запрещает новые ответы, а не existing own edits. Own участие не становится admin History только из-за роли автора. |

Нельзя считать существующий лимит 200 общим title-publication контрактом:
в `actions.server.ts` он относится к поиску похожих Help-вопросов, тогда как обычная
публикация title использует trimmed nonempty string. Не переносить поисковую NFKC-нормализацию
в редактирование и не исправлять попутно создание тем.

### 2. Техническая эскалация Мире — до implementation

**E1 — необходимый permission/schema contract.** Рекомендован самостоятельный code-backed
`forum.topic.title.editOwn`. Он даёт только изменение текста заголовка своей темы.
Ни `forum.post.editOwn`, ни `forum.topic.create`, ни source-locale permissions не заменяют его.
Это расширение каталога и DB CHECK, поэтому требуется новая forward migration, а не только UI.
Затрагиваются `app/authorization/catalog.ts`, `db/schema.ts`, новая SQL migration и Drizzle metadata.
Рекомендованные initial grants: built-in user/moderator/admin; custom roles и существующие
overrides не переписываются. Bound Owner получает capability через существующую projection,
но всё равно обязан быть автором темы. Новый ключ не входит в Admin admission/authority families.

Необходимость подтверждена существующим CHECK и отсутствием capability в catalog.
Изменять историю `0000`–`0066` нельзя; номер следующей migration определяется заново по main
при реализации. Новые таблицы/колонки content domain, dependencies, второй RBAC и внешние
ресурсы для этого не нужны. До решения Миры это именно эскалация, не утверждённая schema change.

**E2 — явное согласование administrative-measure applicability.** Рекомендация:
существующий `posts.edit` запрещает также own title editing; применить его в UI и
транзакционном admission, сохранив current Owner immunity. Это расширяет нынешнюю формулировку
restriction из `docs/ADMIN_PANEL.md`, поэтому не делать это молча.
Не добавлять новый restriction key, не заменять его `admin.forum`, не менять restrictions
для source-locale correction, solved/best-answer или других действий.
Если Мира считает необходимым отдельное продуктовое решение владельца, зафиксировать его
перед передачей Лире. Остальная техническая часть от выбора E2 не меняется.

Мира рассматривает E1/E2 вместе с планом. Если решение меняет каталог/схему/контракт иначе,
план сначала корректируется; реализация не должна начинаться по неразрешённой развилке.

### 3. Предлагаемый пользовательский и серверный контракт

Один canonical POST к существующему `/:locale/topics/:topicId`, новый intent
`editTopicTitle`. Поля: `title`, `expectedRevisionId`, `editorActorId`;
actor берётся только из session, target — только из route params.
Нет own/any selector, admin endpoint, sourceLocale input, revision ID от клиента или
изменения first-post body.

Валидация на route и service boundary:

- единственный точный intent и по одному обязательному текстовому полю; reject duplicates,
  File вместо string, отсутствующий/blank title, revision или actor expectation;
- если среди нескольких intents есть `editTopicTitle`, отклонить весь ambiguous submit,
  а не выбрать первый другой intent;
- `title.trim()` как существующий publication path; внутренние Unicode, пробелы, emoji,
  combining marks и письменности сохраняются, без NFKC, Markdown/HTML parsing или
  автоматического collapse whitespace; NUL отклоняется контролируемо;
- не вводить поисковый лимит 200 или новый глобальный title limit без отдельного решения;
  конкретное ограничение размера запроса/заголовка, если потребуется, явно согласовать
  и применять одинаково на нужных границах, не выдавая его за уже существующее;
- отсутствующий expected actor — invalid; отличный от current session — conflict.
  Это только stale-form expectation, не evidence авторства;
- `operationScope`, `sourceLocale` и административный inline marker не являются
  параметрами новой команды и при передаче отклоняются.

Перед write — current session, same-origin и fresh `forum.topic.title.editOwn` через
существующий request PermissionResolver. Не доверять loader boolean, роли или client authorId.
Revocation/deny действует на следующий request, как в действующем authorization contract;
новый глобальный authz mutex для обычной title mutation не нужен.

Результаты отдельного typed response `operation: "topicTitleEdit"`:

| Ситуация | Результат |
| --- | --- |
| Успех / допустимый unchanged-title no-op | 200, явный success с authoritative revision ID; loader revalidation |
| Гость / отсутствующий или inactive actor | 401 |
| Invalid input | 400 |
| Origin / permission / ownership / applicable active restriction denial | 403 |
| Неизвестная тема | 404 |
| Старая revision, смена аккаунта, CAS conflict | 409 |
| Cooldown | 429 и Retry-After |
| Классифицированная dependency unavailability | 503 |
| Unexpected schema/configuration/programming failure | Обычный server error path; client сохраняет форму и показывает failure |

Success и controlled errors — `Cache-Control: private, no-store`; сохранить route
`headers` propagation на document/single-fetch. Не превращать неожиданные ошибки в forbidden
или availability. Transport failure не означает, что сервер не закоммитил изменение.

### 4. Transactional own-title command

Добавить узкую `editOwnTopicTitle({topicId, actorId, expectedRevisionId, title})` в
`ForumWriter` → Hyperdrive adapter → ForumService → DrizzleForumRepository.
Service нормализует/валидирует input; adapter сохраняет существующий typed
availability/cleanup contract. Низкоуровневые revision primitives и correction callers
не переопределяются новой own-edit семантикой.

В одной repository transaction:

1. Взять target topic `FOR NO KEY UPDATE`; прочитать authoritative author/current pointer.
   Нет темы — notFound; чужой автор — forbidden; несовпадение expected revision — conflict.
2. Взять authoritative actor admission через
   `assertActiveAccountForDrizzleMutation(tx, actorId)` и держать его до конца транзакции.
   Затем проверить applicable restriction по принятому E2 через injected measureAdmission,
   сохранив server-bound Owner immunity. Эти проверки обязательны и для no-op.
3. Прочитать immutable current title. Если trimmed submitted title уже равен current text,
   вернуть успех без revision, изменения sourceLocale, cooldown write или History.
   Проверка expected revision выполняется РАНЬШЕ no-op: старый запрос не становится
   успехом только из-за совпадения текста/ABA.
4. Для реального изменения — bounded transactional cooldown с существующим ForumWritePolicy
   (сейчас 5 секунд), отдельно для title revisions данного actor. Под уже взятым actor
   mutex прочитать последнюю title revision по author/createdAt, использовать существующий
   author-time index и вычислить cooldown после ожидания lock. Учитываются существующие
   title revisions, включая создание/own correction; новый Save не меняет cooldown
   создания сообщений/Help signals. Зафиксировать этот узкий baseline явно.
   Не использовать `enforceForumWriteCooldown` без изменения: он читает forum_posts и
   сам по себе повторные title edits не ограничит.
5. Создать серверный UUID revision, новый original text и `sourceLocale: "und"`.
   Старое определение языка относится к старому тексту; не переносить его или UI locale
   на изменённый заголовок. No-op не сбрасывает known locale.
6. Insert immutable title revision с actor/time; CAS UPDATE только
   `forum_topics.current_title_revision_id` по topic ID и expected revision.
   Пустой UPDATE — conflict, вся transaction откатывается.
7. Вернуть новую revision identity. Не изменять body revisions/attachments, tags, authorship,
   timestamps создания темы, read state, notifications, solution/closure/duplicate/pin.

Не брать task/generation-head/history ordering locks после topic/actor locks: title edit
вообще не пишет translation tasks и admin History. Сохраняется существующий порядок
content → actor. Проверить совместимость с Complaint topic-title locks и deactivation;
не оборачивать публичный `reviseTopicTitle` второй вложенной транзакцией.

Own title edit не является administrative operation, в том числе если автор — admin/Owner.
Сама revision хранит actor/time/text; новый admin History event или публичный title-history UI
в этот scope не добавляется. Существующие Complaint evidence продолжают ссылаться на старую
immutable revision и не перепривязываются.

### 5. Concurrency, retry и translations

Два Save с одной expected revision: один меняет pointer, другой получает conflict без
второй revision/частичных изменений. Гонка с source-locale correction симметрична:
выигравшая операция создаёт current revision, проигравшая повторно не применяется.
Source correction не переименовывает тему и не возвращает потерянный title baseline.

Никакого last-write-wins, автоматического retry/rebase или обновления hidden
expectedRevisionId вслед за каждым loader refresh. При 409 пользователю показывается
актуальный original title; собственный текст остаётся в форме. Применение к новой current
revision требует явного действия, после которого новый Save снова защищён CAS.
Если обновляющее чтение не удалось, сохранить buffer и прежний expected ID; не разрешать
фиктивный rebase. Более новый loader snapshot может заменить только server baseline.

Отдельные publication receipts/drafts для title не нужны: при потерянном success старый
повтор вернёт 409 и не создаст вторую revision. UI обновляет current title и позволяет
сверить результат; нельзя показывать непроверенный success или автоматически пересылать
текст на новую revision.

Translation invalidation происходит через новую revision identity. Не удалять/обновлять
старые translations и не копировать их на новый ID. Topic loader читает новый unit;
пока нового перевода нет — original нового заголовка. Никакого synchronous provider call
или автоматического enqueue из Save/SSR. Existing on-demand generation работает для нового
current ID. Результат old task после edit остаётся stale; результат, опубликованный до edit,
остаётся историческим и не попадает в new revision presentation.
Body translation lifecycle не меняется.

### 6. UI и recovery

В topic loader добавить `canEditOwnTitle`: authenticated actor + new effective permission
+ authoritative topic ownership + applicable restriction. Typed optional authz/measure outage
скрывает fresh control, public read сохраняется; unexpected failure не подавляется.

Сделать небольшой изолированный `TopicTitleEditor` рядом с отображаемым заголовком,
доступный автору ordinary и Help темы. Не прятать его за `canReply`,
`canUseAdminPanel`, `canCorrectTitleSourceLocale` или body `editablePostIds`.
Closed/solved/confirmed-duplicate темы не создают нового запрета title editing:
существующие state guards запрещают свои действия, а не эту own-команду.

Редактор — обычное текстовое поле с подписью, `dir="auto"`, Save и Cancel.
Initial value — `topic.title.originalContent`, даже когда показан перевод.
Не использовать MarkdownEditor, upload operation, drafts/autosave/localStorage.
Новые строки — canonical English catalog; local packs обновляются только с реальным
переводом/fingerprint, generic locale routing и fallback сохраняются.

Предпочтителен собственный fetcher/typed result, чтобы title errors/success не попадали
в feedback reply/post editors. Mounted state привязан к topic+actor, а не к revision:
revalidation не стирает ввод и frozen expected revision.
Успех закрывает форму только после явного success соответствующего submit;
изменение loader title само по себе не доказывает успех именно нашего Save.
Cancel не меняет серверное состояние; повторное открытие берёт current original.

Pending блокирует повторный Save. Validation/401/403/409/429/503/transport/unexpected
failure сохраняет buffer; запрет по свежим permissions/measure блокирует Save,
сохраняя уже открытую форму/Cancel в том же actor context.
Смена actor/topic изолирует старый buffer, late responses не закрывают новую форму.
После rebase нужен новый явный Save. Открытые reply/post body editors не теряют свой
buffer или baseline из-за title fetcher revalidation.
Keyboard/focus/label/status и узкий RTL layout проверяются для изменённого control,
без общего UI/UX pass.

### 7. Компактная последовательность реализации

После принятия E1/E2 и scope/fit review — один отдельный implementation PR от заново
проверенного main, с тремя логическими частями:

1. **Capability и transactional command.** Catalog/default grants, forward CHECK/seed migration
   и metadata; ForumWriter/service/repository/adapter; focused service/DB tests.
   Catalog не включать в Admin admission и не давать edit-any.
2. **Route и UI.** Unique form validation, session/origin/permission/stale-identity guards,
   typed operation response/no-store, loader capability, isolated text editor и English keys;
   route/component tests и необходимый CSS.
3. **Integration и acceptance.** Настоящий PostgreSQL concurrency/rollback/translation/lifecycle
   tests и connected local Worker + Better Auth + browser flow; применимые CI checks.
   После реализации фиксируется stable implementation head.

Ожидаемые production-code файлы: `app/authorization/catalog.ts`, `db/schema.ts`,
новые `drizzle/*.sql` и metadata, `db/forum-service.ts`, `db/forum-repository.ts`,
`db/hyperdrive-forum.ts`, `app/forum/actions.server.ts`,
`app/forum/mutations.server.ts`, `app/routes/topic.tsx`,
новый небольшой title-editor component, его подключение в `app/forum/views.tsx`,
`app/localization/catalog.ts` и точечный существующий CSS.
`workers/app.ts`, route topology и translation pipeline не требуют новой архитектуры.
Обновить type-safe ForumWriter fixtures, которые обязаны знать новый метод, без unrelated cleanup.

Permanent/current-state документация меняется отдельным заключительным docs PR:
authorization catalog/defaults, при принятии E2 — AP-10 applicability, фактическое
`PROJECT_STATE.md` после реализации/проверок. В implementation PR не включать
служебные файлы и отчёты. Stage 6, #320, #331 и чужие задачи не затрагиваются.

### 8. Обязательная проверочная матрица реализации

| Уровень | Существенные проверки |
| --- | --- |
| Route/security | Guest; missing/wrong Origin; permission denied/revoked; custom allow/deny/inherit; автор и неавтор при том же permission; Owner неавтор; sourceOwn/sourceAny/postEdit-only не дают title edit. Missing/duplicate/File fields, ambiguous intents, wrong stale actor; typed availability против unexpected. Проверить no-store в response и actual framework transport. |
| Service/repository | Валидный собственный title → ровно одна новая revision/current pointer, `und`; прежняя revision неизменна. No-op сохраняет locale и counts; чужой/missing/inactive actor, wrong topic/revision и late restriction denial не оставляют побочных записей. Cooldown 429, независимость от post cooldown и serialization двух тем одного actor. |
| Настоящий PostgreSQL | Два разных соединения с одинаковым expected ID: один commit/один conflict. Edit × own/any source correction в обоих порядках; stale/ABA retry. Deactivation до actor admission запрещает write, writer-first держит actor lock до commit. Insert/CAS failure откатывает новую revision. Соседние topic-title Complaint submission и translation publication завершаются без deadlock и сохраняют evidence/currentness. |
| State invariants | После Save неизменны first-post body/revisions/attachments, reply relationships, best answer, solved, tags, pin, closure version/state, duplicate state и existing notifications/read-state. Closed/solved/duplicate own topic остаётся редактируемым при наличии права; foreign topic — нет. |
| Translation | Existing old title translation сохранён как history; reload новой revision показывает new original. Current known locale → changed text `und`, unchanged-title сохраняет known locale. Old queued task paused в provider window не публикуется current после edit; new task на новом current ID независима; body translation не затронут. Расширить existing provider-window test реальной новой own-edit командой вместо одного raw SQL pointer update. |
| UI/recovery | Original вместо translated text; Save/Cancel/pending; empty validation; stale conflict с сохранением собственного текста; explicit rebase; второй конфликт после rebase; lost success/transport и classified/unexpected server errors; late response/actor-topic change; revoked permission/measure; открытый body/reply editor переживает title revalidation. |
| Connected runtime | Локальный built Worker + настоящая Better Auth session + disposable PostgreSQL 17 + Chromium: ordinary/Help own edit, guest/nonowner direct POST denial, reload/list/search current title, conflict двух вкладок, controlled failures. EN/LTR и зарегистрированная RTL fixture, narrow viewport, keyboard/focus, safe text/XSS display. Production OAuth/provider/Neon не нужны. |

Переиспользовать test seams из `app/forum/write-actions.test.ts`,
`app/forum/public-authz-degradation.test.ts`, `app/forum/edit-recovery.test.tsx`,
`tests/database/sa04-forum-revision-lifecycle.test.ts`,
`tests/database/sa04-forum-edit-lifecycle.test.ts`,
`tests/database/content-translation-store.test.ts` и
`tests/database/content-topic-title-execution.test.ts`.
Новые focused title-edit tests должны проверять наблюдаемую безопасность/atomicity/recovery,
а не только дублировать последовательность вызовов реализации.

Обязательный обычный CI по `.github/workflows/ci.yml`: migration-history guard,
`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
`pnpm ui-preview:build`, `pnpm db:check`, schema parity и clean PostgreSQL 17
`pnpm db:test`; existing manifest/runtime-privilege/local Workers smoke не ослабляются.
При новой CHECK migration согласовать schema manifest fixtures именно с существующей
current/full-schema проверкой; historical external accepted manifest/evidence не обновлять
как будто rollout состоялся. Local DB только loopback `*_test`.
Browser evidence привязать к стабильному implementation head.
Pages/owner visual acceptance выполняются при применимости и по явному запросу владельца;
не выдавать static preview за mutation acceptance.

### 9. Handoff и STOP

Техническое исследование и полный предлагаемый план завершены.
Мире переданы E1 (new permission + CHECK/seed forward migration) и E2 (применимость
`posts.edit`), а также конкретные write/UI/concurrency/translation/tests контракты.

Следующий шаг — **Мира: scope/fit review и решение по E1/E2**.
Лира не активирована. После принятия плана Мира фиксирует точное назначение Лире
в этом служебном PR; реализация — отдельным implementation PR.
Затем coordinator whole-PR review Миры и, после coordinator PASS,
независимая техническая проверка Лёвы того же stable exact head.
Агенты друг друга не запускают. Этот служебный PR не merge в main.


## Scope/fit review Миры — 2026-11-18

### Решение по E1 — ACCEPT

Новый code-backed permission `forum.topic.title.editOwn` является текущей частью задачи, а не заделом на будущее.
Причина: `docs/auth/AUTHORIZATION.md` требует отдельный catalog key при появлении новой защищённой capability; существующий `forum.post.editOwn` относится к сообщениям, а source-locale permissions не дают права менять текст заголовка. Закрытый `authz_permissions_catalog_check` означает, что корректное добавление capability требует forward migration и seed/default grants.

Принять границу Лёвы: initial grant для built-in `user`, `moderator`, `admin`; custom roles/overrides не переписывать; Owner получает capability через существующую catalog-wide projection, но ownership темы остаётся обязательным. Не добавлять edit-any.

### Решение по cooldown — REJECT

Отдельный 5-секундный cooldown для редактирования заголовка не входит в задачу и не следует из существующего аналога. Текущий `editPublishedPost` не вводит отдельный edit cooldown; создание новой политики для title revisions было бы расширением поведения без подтверждённой необходимости.

Следствие: убрать 429/cooldown из контракта этой функции и из обязательной test matrix. Существующие общие request/security limits не ослабляются и не меняются.

### Упрощение реализации и acceptance

1. Сохранить обязательные инварианты: server-side session/permission/ownership, same-origin, active-account admission, immutable new title revision, CAS по expected revision, новый текст получает `sourceLocale: "und"`, старые translations остаются revision-bound и не становятся current.
2. Не строить отдельную recovery-подсистему для короткого title editor. Достаточно существующих route/fetcher patterns: при 409 сохранить введённый текст и показать конфликт; дальнейшее действие пользователя работает от заново полученного current baseline. Специальные drafts/receipts/autosave/idempotency subsystem не добавлять.
3. Новый own-edit command должен быть узким и не выставлять низкоуровневый `reviseTopicTitle` напрямую. Ownership и expected revision проверяются authoritative внутри write boundary/transaction.
4. Проверки гонок/translation/lifecycle добавлять только там, где новая команда создаёт новый путь или меняет lock/admission composition. Уже доказанные неизменённые внутренние механизмы не дублировать целиком ради этой функции.
5. Обязательный browser acceptance: автор может изменить title; guest/non-author не могут; stale revision конфликтует; после reload/list/search отображается current title; LTR/RTL и безопасный вывод сохраняются. Это не общий UI/UX pass.

### E2 — требуется решение владельца

Текущий permanent contract описывает user-measure restriction `posts.edit` как запрет собственного редактирования опубликованных сообщений. Технически допустимы как минимум два варианта для новой title-edit capability:

- распространить существующий `posts.edit` на редактирование заголовка собственной темы как на часть группы Own content;
- не применять `posts.edit` к title edit и позже при реальной необходимости отдельно спроектировать restriction policy.

Мира рекомендует первый вариант: он соответствует смыслу группы Own content и не создаёт новый restriction key/UI/schema. Но это меняет семантику действующего административного ограничения, поэтому выбор принадлежит владельцу и не фиксируется молча.

До решения E2 Лиру не активировать. После решения Мира обновляет accepted plan и передаёт Лире bounded implementation.


## Решение владельца по E2 — 2026-11-18

E2 принят: существующее user-measure restriction `posts.edit` блокирует также редактирование заголовка собственной темы.

Это считается тем же ограничением группы Own content; новый restriction key не создаётся. Реализация должна применять restriction и в UI capability, и на authoritative server-side write boundary. Existing Owner immunity сохраняется по текущему контракту.

Итоговый accepted scope перед реализацией:

1. Добавить отдельную capability `forum.topic.title.editOwn` с forward catalog migration/default grants по принятому E1.
2. Разрешать изменение только автору темы; guest/non-author не получают mutation.
3. Использовать immutable new title revision + CAS по current expected revision; новый изменённый текст получает `sourceLocale: "und"`.
4. Сохранить revision-bound translation semantics; старые translations не становятся current для новой revision.
5. Применять существующее `posts.edit` restriction к title edit; нового restriction key не добавлять.
6. Не вводить отдельный title-edit cooldown, drafts/receipts/autosave или новую recovery subsystem.
7. Не расширять задачу в admin edit, source-locale correction, другие user actions, UI/UX pass, Stage 6 или external integration.

План принят для реализации с указанными overrides scope/fit review Миры. Следующий этап — Лира реализует bounded scope в отдельном implementation PR от актуального `main`.
