# PROJECT_HISTORY_04.md

> [Индекс истории](./PROJECT_HISTORY.md) · [Предыдущий том](./PROJECT_HISTORY_03.md) · [Следующий том](./PROJECT_HISTORY_05.md)

Период: **2026-10-20 — 2026-10-26**.

Этот том сохраняет post-Editor решения и correction packages конца октября: отказ от drafts/autosave, auth/session/rate-limit, published-edit recovery, database/notifications/read-state и Help lifecycle.

## Editor 2.0 — removal drafts/autosave (исторический срез 2026-10-20; PR #232 merged 2026-10-21)

По решению владельца пользовательские черновики/автосохранение перенесены в возможные
будущие функции (`Under development: drafts`). Runtime local/server text persistence,
60-second autosave, recovery/discovery, межвкладочные конфликты, My Drafts и status UI
удалены в PR #232. Прежний snapshot correction scope отменён.

Текущая реализация использует in-memory editor buffer и отдельную upload/publication
operation без текста. Private refs, terminal markers и publication receipts используют
существующую схему. Final submit atomically проверяет/продвигает выбранные файлы;
post-edit сохраняет expectedRevisionId, Save/Cancel и историю. Abandoned uploads имеют
технический 24-hour idle cleanup cutoff; durable claims и published-ref protection
сохраняются. Merged migrations не переписываются, unmerged snapshot migration 0045 удалена.
F7 был исправлен в visual surface и editable whitespace range.

На исходном removal head targeted component/application проверки (93 теста) и publication/operation
PostgreSQL проверки (12 тестов) проходят с нулём failed suites и unhandled errors.
TypeScript, builds, migration/schema/privilege guards и production-build Workers smoke
проверены. Chromium/Worker/PostgreSQL/local private R2 подтвердил четыре authoring flows,
отсутствие text autosave/reload recovery, upload/publication/edit access и F7, включая
1/2/4 ведущих пробела. Итоги полного exact-head CI фиксируются в служебном канале;
Независимая проверка выявила L1–L3; после их верификации и PASS плана
реализован bounded correction. Remove теперь меняет mounted selection без удаления
server temporary pool/activity timestamps и допускается после ambiguous upload failure;
per-file DELETE выведен из контракта. Явный published-edit rebase применяет local Remove
к latest published attachments, сохраняет local new uploads и затем продвигает revision
fence. Новая persistence/table/tombstone не вводится. Регрессии проверяют idle cutoff,
late ACK/commit, точный manifest, rebase/removals/uploads и повторную concurrent revision.
Полные локальные application (979 tests) и PostgreSQL (279 tests) suites проходят
с success=true и без failed suites. Typecheck, lint (одно прежнее warning) и обе сборки
прошли. Результат нового exact-head CI фиксируется в служебном канале после завершения.
Нового Chromium/Worker/private-R2 прогона для L1–L3 не выполнялось: изменённые
переходы проверены component/PostgreSQL regressions. На указанном тогда correction head новый whole-PR cycle ещё не запускался;
это исторический статус, а не текущий review gate.
Отдельный visual/Pages gate отменён владельцем; visual review — только по его запросу.
Подробный действующий контракт — docs/EDITOR.md.
Production/external migrations/deployment не выполнялись. Ниже сохранены исторические
срезы Editor 2.0; их описания drafts/boundaries/CAS не являются текущими требованиями.

## Пакет 3 — bounded correction published-edit recovery (2026-10-25)

Проверка выявила два текущих дефекта реализации: modified replay после уже committed edit
повторно использовал завершённую publication operation, а открытый editor менял feedback
чужого topic-level409 на сообщение о правке. Repository теперь различает modified receipt
replay отдельным subtype существующего domain conflict. Edit action возвращает current
public baseline и ID завершённой operation; явный rebase меняет только эту завершённую
operation на новую. Обычный stale revision сохраняет незавершённую operation и её uploads.

Уже опубликованный после потерянного ACK asset становится retained ровно один раз; Remove
intent сохраняется. Не попавший в current public baseline upload сохраняет исходный File
в памяти для Retry в новой operation с новым asset ID. Активные image destinations во всём
in-memory Undo/Redo history получают этот ID без изменения текста, code spans или labels.
Серверные owner/context/operation gates не ослаблены. Edit-specific409 copy выбирается по
фактическому action result/guard context, а не по наличию открытой формы.

Native PG regressions проверяют committed edit → identical replay → modified409 → fresh
operation → успешное сохранение с вложением и без него. Две Chromium проверки через built
Worker/PostgreSQL прошли: реальная потеря ответа после commit и восстановление изменённого
buffer; stale markSolved409 при mounted editor с сохранением текста и solution feedback.
Полные local suites:1058 application и298 PostgreSQL tests PASS; typecheck, lint(одно прежнее
warning), обе сборки, migration-history guard и local built Worker smoke PASS. Один первый
app run не дождался initial mounted editor за1s; изолированные11 cases прошли, ожидание
готовности формы в fixture увеличено до3s, повторный полный1058 suite прошёл. Product logic
из-за этого timeout не менялась.
Schema/migrations/dependencies не менялись; новый exact-head CI и whole-PR review должны
проверяться после публикации correction. Пакет4 и внешние/production/visual actions не начаты.

## Пакет 3 — failure semantics и восстановление опубликованной правки (2026-10-25)

Ordinary forum mutations преобразуют в controlled responses только известные domain errors
и typed storage unavailability. PostgreSQL writer классифицирует connection/query-timeout
failures на границе адаптера; SQL/schema/programming faults проходят в error handling.
Primary forum read loaders и protected edit-resume отображают typed dependency outages как
`503`, сохраняя прежнюю optional-presentation degradation и неожиданные faults как ошибки.
Cleanup PostgreSQL client/pool не подменяет уже полученный success или исходный отказ.

Router `handleError` пишет только allowlisted error kind, известный SQLSTATE и безопасные
ссылки на файлы/строки stack; message, cause payload, SQL/params и unpublished content не
передаются в журнал. Browser client actions трёх authoring routes оставляют mounted editor
после server/transport fault с отдельным unexpected feedback и статусом `500`; успешные
redirects сохраняются. Серверная ошибка продолжает бросаться и диагностироваться на сервере.

При конфликте published edit action повторно читает текущую public revision нужного
сообщения. Открытая форма показывает её, сохраняет локальный text/attachment intent и старую
expected revision до явного rebase. Более свежий loader snapshot имеет приоритет над старым
conflict response. Сбой conflict refresh также оставляет форму открытой. Edit conflict copy
отделена от solution-selection copy; новые сообщения включены в EN/RU/HE manual packs.

Локально прошли 1051 application и 296 PostgreSQL tests; последующая дополнительная проверка
нового loader snapshot прошла в целевом editor regression. Typecheck, lint (одно прежнее
warning), application/UI-preview builds и migration-history guard проходят. Exact-head CI
и whole-PR review проверяются после публикации. Local built Worker smoke и пять Chromium
проверок через Worker/PostgreSQL прошли: stale conflict/rebase/save redirect, typed `503`,
unexpected SQL `500`, transport failure/retry и profile fault без unpublished text в response/logs.
Schema/migrations/dependencies не менялись;
пакет4, visual acceptance, production и внешние сервисы не запускались.

## Bounded correction — stale-identity Google linking (2026-10-25)

Review пакета2 подтвердил `AUTH-LINK-STALE-IDENTITY-01`: кнопка на stale профиле A
могла запустить связывание под текущей server session B. Теперь own-profile action
передаёт profile ID в `x-vico-link-user` только как expectation. Existing Better Auth
before-hook для `/link-social` разрешает authoritative session и отклоняет отсутствующую
или несовпавшую expectation с `409` до OAuth state/account write; guest остаётся `401`.
Штатный endpoint использует ту же проверенную request-local session. Signed state и
provider/email verification/origin checks сохраняются; client не подменяет expectation
на другой account и показывает существующий auth failure feedback.

Новая native PostgreSQL regression проверяет stale A/B+GoogleB, missing expectation,
normal A/A redirect→callback→persisted link, mismatched/unverified provider, guest,
foreign Origin и сохранение target при смене cookie после выдачи state. Positive paths
подтверждают один session lookup внутри link request. До исправления два regression cases
возвращали `200` вместо `409`; после исправления весь набор проходит. Provider code exchange
и user info синтетические, реальные Google credentials/calls не использовались.

Локально прошли 997 application и 291 PostgreSQL tests, typecheck, lint (одно прежнее
warning), application/UI-preview builds, migration-history guard и local built Worker smoke.
Схема/миграции/dependencies и общая permission architecture не менялись. Exact-head CI и
новый whole-PR review должны проверяться после публикации; прежние verdicts относятся к
старому implementation head. External/production/visual acceptance не запускались.

## Audit correction — auth/session/identity (2026-10-25)

Второй ограниченный audit-пакет исправляет `AUTH-01`, `AUTH-02`, `AUTH-LINK-01`,
`AUTH-LOCALE-RETURN-01`, `AUTH-SESSION-AVAIL-01` и `XR-CROSS-TAB-IDENTITY`.
Предварительные session cookies применяются перед окончательными endpoint cookies;
назначение удалённой custom role возвращает controlled not-found без изменения assignment.
Безопасный nested credential returnTo переносится на выбранный locale с сохранением query/hash;
redirect sanitizer остаётся прежним.

Google подключается явно из собственного профиля после password sign-in через штатный
Better Auth `linkSocial`; совпадение unverified local email не разрешает implicit linking.
Session storage outages классифицируются до потери исходной ошибки внутри Better Auth и
дают safe no-store 503 до Router; unexpected ошибки не переводятся в unavailable.
Editor account expectation отклоняет stale-account Publish/Save до записи, heartbeat
обнаруживает смену пользователя и запускает loader revalidation. Application permissions,
схема, миграции и pinned dependencies не изменены.
DOC-04 согласован с permission-based доступом `forum.post.history.read` в `docs/EDITOR.md`.

Локально прошли 995 application tests, 283 PostgreSQL tests, typecheck, lint (одно прежнее
warning), обе сборки, migration-history/schema parity и local Workers smoke. Целевые
регрессии cookie ordering и stale editor identity воспроизводят исходное поведение на baseline
и проходят с исправлениями. Exact-head CI и независимый whole-PR review фиксируются отдельно
после публикации; готовность к merge этим локальным результатом не заявляется.
External Google/provider smoke, production rollout и visual acceptance не запускались.

## Audit correction — auth rate-limit concurrency (2026-10-25)

Первый ограниченный пакет `AUTH-RATE-LIMIT-RACE-01` обновляет Better Auth и
`@better-auth/drizzle-adapter` с `1.7.4` до `1.7.7` — исправленной версии
[GHSA-44jh-23m7-hpcf](https://github.com/better-auth/better-auth/security/advisories/GHSA-44jh-23m7-hpcf).
Текущие PostgreSQL/Drizzle, database-backed rate-limit storage, trusted-IP boundary,
authentication/session и dynamic application permissions сохраняются. Новая схема,
миграции, альтернативное хранилище или собственный rate-limit wrapper не добавляются.

Новая PostgreSQL-регрессия использует настоящий Better Auth HTTP handler и существующую
auth-конфигурацию с малым test-only лимитом. Три конкурентных admission UPDATE ждут один
удерживаемый row lock, затем проверяются HTTP200/429, сохранённый count, Retry-After и
независимый IP bucket. Проверены действующее окно и reset истёкшего окна. На исходных
зависимостях `1.7.4` оба случая воспроизводят превышение лимита; на `1.7.7` оба проходят.
Локально прошли 979 application tests, 281 PostgreSQL tests, lint (одно прежнее warning),
typecheck, application/UI-preview builds, migration/schema/privilege probes и Workers smoke.
Использованы pinned Node 24.21.0 и pnpm 12.3.4; frozen lockfile проверен.
Exact-head CI первого пакета прошёл; независимый review Миры завершён, PR #237 влит владельцем.
Production/external rollout и visual acceptance не запускались. Остальные audit findings
этим пакетом не исправляются.

## LOC-04 — корректный loading copy истории сообщений (2026-10-26)

В отдельной implementation-ветке от `main` исправлено смешение состояний загрузки:
приватный post-history UI больше не использует attachment-specific сообщение
`editorAttachmentRestoring`. В каталоге UI появился отдельный
`postHistoryLoading` с English source и согласованными локальными RU/HE
переводами и source fingerprints; прежний текст восстановления вложений не менялся.

Регрессионный UI-тест проверяет pending `readPostHistory` action через React Router
fetcher, history-specific статус при загрузке и отображение ревизии после ответа.
Права просмотра истории, загрузка данных, вложения и locale-runtime semantics не
менялись. Проверки CI фиксируются отдельно в implementation PR; самостоятельный
whole-PR review, merge и external/production/owner visual acceptance не заявляются.

## Batch L1 — fixes 1–5/5 (2026-10-26)

В implementation branch batch L1 исправлено распознавание valid nonzero empty TAR:
два завершающих 512-byte zero blocks без `ustar` header распознаются при
первичной проверке типа как TAR. Полная structural validation после приватной
загрузки требует, чтобы оставшееся содержимое пустого TAR было zero padding;
несоответствующая сигнатура, повреждённый архив и неверный MIME отвергаются.
Добавлены focused type, structural и private R2 upload regressions.

Вторым последовательным fix `ATTACH-04` разрешён локальный Remove uploading/
pending файла из mounted editor selection без отмены всей operation и без per-file
DELETE/abort. При Remove активный запрос помечается как игнорируемый для
progress/success/error/terminal-410 callbacks, но продолжает обычный server
upload/cleanup lifecycle; removed ID не может повторно появиться в selection.
Другие pending/stored файлы, unsaved text и operation identity сохраняются.
Focused mounted MarkdownEditor regression проверяет 3 файла + unsaved text,
поздние success/error события и сохранение выбора остальных; отдельный
published-edit regression проверяет, что late `410 gone` снятого файла не
перезапускает operation. Whole Cancel сохраняет прежнюю отдельную semantics.

Третий последовательный fix `ATTACH-HTTP-405-01` унифицирует ответ
`405 Method Not Allowed` attachment-upload resource: для неподдерживаемых
`HEAD`/`PATCH`/`PUT`/`OPTIONS` возвращается `Allow: GET, POST, DELETE` с
сохранением прежнего `Cache-Control: no-store` и `nosniff`. Supported GET
selection, POST upload и whole-operation DELETE cancel не меняются.
Добавлена regression через React Router resource dispatch по фактическому
route registry; direct handler-level тесты существующей upload semantics сохранены.

Четвёртый последовательный fix `EDITOR-01` сохраняет точные последовательности
пустых строк внутри fenced code при HTML-paste из `<pre>`, ограничивая прежнее
сворачивание трёх и более переносов обычным prose вне code. Generated fence
остаётся длиннее любого backtick-run содержимого; focused converter/Markdown AST
regressions проверяют сохранность кода и нормализацию соседнего prose.

Пятый последовательный fix `EDITOR-02` сохраняет таблицы, импортируемые из
TSV и безопасного HTML, как literal cell values: символы Markdown-разметки
экранируются при генерации Markdown table, но исходный пользовательский
Markdown вне конверсии не меняется. Простой редактор показывает и редактирует
исходные буквальные значения без накопления escape-символов. Existing
pipe/backslash/newline preservation и отказ от неподдерживаемых сложных
таблиц сохраняются. Focused regressions покрывают source, визуальную форму и
опубликованный Markdown rendering.

В draft batch L1 выполнены все пять fixes: `ATTACH-03`, `ATTACH-04`,
`ATTACH-HTTP-405-01`, `EDITOR-01`, `EDITOR-02` (5/5).
Implementation выполнена, exact-head CI и независимый whole-PR review/
принятие ещё проверяются отдельно.
Production/external/owner visual actions не выполнялись.

## Пакет 5 — Help lifecycle и ограничение тегов (2026-10-26)

Correction package закрывает `HELP-01`, `HELP-02`, `HELP-MOD-01`,
`TAG-CARDINALITY-01` и документальный sidecar `DOC-03`. Формы удаления duplicate
relationship, решения appeal и модерации решения передают identity увиденной сущности.
Repository повторно проверяет эту identity под topic/relationship lock, поэтому устаревшее
действие не применяется к новой relationship, appeal или заменённому best answer.
Авторская форма апелляции передаёт observed relationship ID; после удаления R1 и создания R2
старое заявление отклоняется, а актуальное связывается только с текущей relationship.

Removal/resolution timestamps вычисляются через `statement_timestamp()` после ожидания
блокировок и не могут оказаться раньше более новой `confirmed_at` / `created_at`.
Публичная запись темы принимает не более 10 уникальных непустых тегов после NFKC-нормализации,
trim, whitespace collapse и case-insensitive deduplication; превышение отклоняется до любых
topic/tag writes. Pending `Disputed` badge однозначно остаётся moderator-only в списках и на
странице темы, тогда как автор видит собственное pending-appeal сообщение без этого badge.
Application и disposable PostgreSQL regressions фиксируют эти контракты.

## Пакет 4 — database, notifications и read-state (2026-10-26)

Correction package закрывает `DB-01`, `DB-02`, `DB-03`, `CORE-01`, `CORE-02` и `CORE-03`.
Forward migration `0045_audit_database_notifications_read_state` делает allowance metadata
явно non-null для активной allowance-ветви. Production schema manifest теперь включает hash
предиката каждого индекса, а web runtime ACL — `SELECT`, `INSERT`, `UPDATE` для
`forum_topic_read_states`.

Forum cooldown mutex использует `FOR NO KEY UPDATE`: записи одного автора по-прежнему
сериализуются, но встречные ответы разных авторов совместимы с FK `KEY SHARE`. Ограниченный
notification inbox сортирует непрочитанные перед прочитанной историей, поэтому непрочитанные
старше первых 50 остаются достижимыми. Topic view продвигает read marker только до последнего
фактически доставленного в loader snapshot сообщения, а не до более нового cursor из отдельного
concurrent read-state запроса. Disposable PostgreSQL и repository checks фиксируют эти
контракты.

## Пакет 3 — точная замена image destination при recovery (2026-10-26)

Подтверждён LEVA-PR239-A7D2954-01: Retry менял attachment ID, но regex мог оставить
старый destination в bare reference definition либо изменить похожую строку в label.
Замена теперь использует точные source spans destination tokens существующего
Markdown-парсера с той же grammar. Обновляются только inline images и действующие
definitions, используемые image references; labels, titles, code, обычные ссылки,
неиспользуемые и перекрытые definitions сохраняются. Text/Undo/Redo и attachment
operation/selection продолжают использовать прежний recovery lifecycle.

До исправления девять новых source regressions воспроизвели ошибку. После correction
local1076 application/300 native PostgreSQL tests PASS; targeted61 PASS. TypeScript,
lint(одно прежнееwarning), обе сборки и migration-history guard PASS. Chromium проверил
оба варианта: actual built Worker edit actions/native PG, commit/lost response →
upload410 → Retry201 → stale409/rebase → Save; сохранённый body и inline image используют
новый ID, label и Undo/Redo сохранены. Upload bridge использует настоящий Node handler/PG,
контролируемую upload session и synthetic byte storage; image response — local fixture.
Это не download-handler/R2 E2E, production или owner visual acceptance.
Новых dependencies, schema/migrations, endpoints или permission changes нет.
Новый exact-head CI и whole-PR review проверяются после публикации correction.

## Пакет 3 — terminal upload до повторного Save (2026-10-26)

Подтверждён MIRA-PR239-998715-01: после committed edit/lost ACK новый upload получает410
от завершённой operation и блокирует Save раньше доступного409/rebase recovery. Published-edit
uploader теперь меняет operation при точном typed ответе410 gone. Выбранные Files и
text/Undo/Redo остаются в mounted editor; обычный Retry отправляет файл с fresh operation/asset
IDs. Retry становится доступным независимо от блокировки Save. Последующий stale409/rebase
обновляет public baseline без повторной смены fresh operation и без дублирования старого asset.
Оставшиеся private uploads из прежней operation сохраняют File для Retry. Поздние ACK
подавляются прежней identity boundary. Другие authoring flows и другие upload errors не
меняют retry identity. Новых endpoints, schema, dependencies или server permission contracts нет.

Две initial UI regressions воспроизвели дефект на998715b; после исправления local1065
application/300 PostgreSQL tests PASS, typecheck,lint(одно прежнееwarning),обе сборки,
migration-history guard и local built Worker smoke PASS. Chromium проверил actual built
Worker edit actions + native PostgreSQL с upload bridge к настоящему Node upload handler:
commit/lost response → new upload410 → Retry201 → stale409 → rebase → Save success,
с сохранением Undo/Redo и двух выбранных файлов без дублирования. Bytes storage и upload
session context в bridge синтетические; external R2/provider/production/visual acceptance
не заявляются. Новый exact-head CI и whole-PR review проверяются после публикации.
