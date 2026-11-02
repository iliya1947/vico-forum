# PROJECT_HISTORY_06.md

> [Индекс истории](./PROJECT_HISTORY.md) · [Предыдущий том](./PROJECT_HISTORY_05.md)

Период: **2026-10-29 — 2026-10-31**.

Этот том сохраняет позднеоктябрьские Admin Panel, Complaints, Editor, discovery, search, i18n и accessibility implementation/correction snapshots.

## 2026-10-29

## I18N-UGC-META-01 — original topic-title metadata in Search/Unanswered (2026-10-29)

В отдельной implementation-ветке устранена потеря source-locale metadata текущей ревизии
заголовка темы между repository и Search/Unanswered presentation. `readUnanswered()` и
`search()` теперь возвращают `sourceLocale` из current topic-title revision; loaders
сохраняют его и получают `titleDirection` из request-scoped LocaleRegistry.
Заголовки на обеих страницах имеют собственные `lang/dir` независимо от UI locale;
для `und` атрибут `lang` не выдумывается, направление — `auto`, для известного
source locale без registry direction сохраняется известный `lang` и `dir="auto"`.

Добавлены focused repository/PostgreSQL и mounted route/DOM регрессии: противоположные
направления source/UI, неизвестные метаданные, смена актуальной ревизии и совпадение
по тексту сообщения. UI Preview fixtures для этих двух карточек синхронизированы с
изменённым presentation contract. Не меняются схема БД, SQL ranking/query semantics,
Unanswered filtering, public Help location projection, другие UGC списки,
translation generation/provider/runtime или архитектура. CI, browser acceptance,
независимый review и merge на момент первоначальной записи не объявлялись завершёнными.
Впоследствии PR #260 проверен и merged 2026-10-29.

## Complaints — Package 1 domain foundation (2026-10-29)

Ниже сохранён исторический срез Package 1. Ограничения submission и новой revision
заменены реализованным Package 2 выше; subsequent appeal policy остаётся отложенной.

Correction 2026-10-30: другой reporter после resolution той же current revision
создаёт новый Case с immutable previous_case_id на последний закрытый Case того же
target. Составной self-FK и insertion guard проверяют same-target/resolved predecessor;
старый Case/Decision не меняются, lifetime reporter+target duplicate barrier сохранён.
Ссылка входит только в protected reviewer projection. Forward migration 0048 и native
post/title/concurrency/chain/negative regressions добавлены. Формулировка affected-author
contract уточнена: user FK плюс authoritative repository capture под content lock;
нового content-author DB invariant нет. Checks и новый independent review фиксируются
после выполнения; Package 2+ и external rollout не добавлены.

Correction 2026-10-30: Case/Appeal reads вычисляют review admission и дополнительную
reporter/appellant identity projection из одного consistent authorization snapshot.
Обычный capability ограничивает resolution cache отдельным handle операции, сохраняя
свежесть следующего service call при повторном использовании capability; Hyperdrive
сохраняет существующий request-local snapshot. Добавлены native regressions для обоих
read methods/adapter-ов с committed переходом review-only → neither → identity-only,
next-call freshness, allow/deny/inherit и fail-closed при authorization failure.
Schema/permissions/UI не меняются. Фактические проверки и новый independent review
фиксируются отдельно после выполнения; acceptance заранее не заявляется.

В отдельной implementation-ветке реализован server-only complaints foundation:
отдельные Complaint/Case/immutable initial Decision/Appeal/notes/lifecycle events,
post/title revision targets с owner-matching FKs, atomic replay/CAS и bounded
reviewer/participant reads. Reporter/appellant identity не выбирается обычной
SQL projection; дополнительный elevated permission не выдаётся initial admin.
Новые code-backed permissions используют существующий PermissionResolver.

Forward migration `0047_complaints_domain_foundation` сохраняет evidence refs
вложений reported post revision; active-ref gate и все стадии cleanup учитывают
эти refs. Append-only evidence/events и deferred Case→Decision FK защищают
историю. Native tests покрывают grouping/title-first-post separation, privacy,
permission freshness, revision/evidence retention, rollback и concurrency.
Permanent contract: `docs/moderation/COMPLAINTS.md`.

Новых HTTP routes, user/queue/appeals UI, rate-limit thresholds, priority/presence,
notifications или Quick actions нет. Спорная new-revision-while-previous-Case-open
admission и subsequent appeal transitions возвращают explicit policy-required
без writes до решений Packages 2/6. Storage поддерживает максимум 3 appeals без
необратимого unique-pending ограничения; initial Decision не переписывается.
Проверки/CI и independent whole-PR acceptance фиксируются отдельно после
фактического выполнения; production migration/GRANT/deploy не выполнялись.

## EDITOR-08 — disabled Find/Replace и paste boundaries (2026-10-29)

В отдельной implementation-ветке отключённый редактор блокирует inputs и команды
сохранённой Advanced Find/Replace панели. Find Next/Replace all проверяют disabled
до изменения selection, view, source или history; состояние панели сохраняется
для повторного включения. Ранее исправленный EDITOR-05 active-write и
Preview/Split pending-selection path не меняются.

Simple paste проверяет disabled до передачи plain/HTML/spreadsheet/forced-plain
в mutation callbacks. Clipboard-команды проверяют актуальное committed disabled
состояние перед запуском и после завершения readText; поздний success/rejection
в отключённом редакторе не изменяет source/history/pending selection или notice.
Обычные enabled paste, точный source и Undo/Redo сохраняют прежнюю семантику.
Изменение не вводит общий read-only redesign или новые внешние зависимости.

Добавлены focused mounted regressions для трёх причин, re-enable, соседних
заблокированных команд и enabled history controls. Фактические проверки/CI и
независимый whole-PR review на момент первоначальной записи ожидались.
Впоследствии PR #259 проверен и merged 2026-10-29.

## AP-01 — постоянный контракт обычной админ-панели (2026-10-29)

Добавлен [`docs/ADMIN_PANEL.md`](docs/ADMIN_PANEL.md) — постоянный контракт утверждённой
структуры, admission/section/action matrix, общего Quick actions, significant-action/reason
matrix и отдельных границ «Требуют внимания» и будущей super-admin UI. Согласованы необходимые
ссылки и scope формулировки в product, authorization, UI/UX и roadmap документах.

Этот пакет меняет только документацию. Глобальный shell, administrative History, новые
object pages, закрытие тем и блокировки не реализованы; runtime catalog, код, schema,
миграции и зависимости не меняются. Эффект блокировки и ещё не выбранные reason/reopen rules
сохранены как явные условия перед соответствующими implementation пакетами. Координация
admin-panel работы ведётся в PR #251 по прямому указанию разработчика, без дублирования в #236.
Checks и независимый review этого документационного пакета фиксируются после их выполнения;
runtime/browser/owner acceptance будущей админ-панели не заявляется.




## EDITOR-05 — Advanced Find Next selection/focus (2026-10-29)

В отдельной implementation-ветке Find Next применяет найденный source range
непосредственно к уже активному Advanced write textarea, используя существующее
source-to-textarea offset mapping, и очищает consumed pending selection.
Переход из Preview/Split сохраняет прежний pending-selection/layout-effect path.
Поиск остаётся буквальным, идёт от selectionEnd и wraps к первому совпадению;
empty/no-match не меняют selection/source. Поиск запоминает только selection,
не создаёт Markdown edit или отдельный Undo content step.

Добавлены mounted regressions для последовательных matches/wrap, исходных caret
positions, Preview/Split, single literal match, LF/CRLF/CR и Unicode/UTF16 mapping,
точного FormData source и Undo/Redo. Replace all и остальной Find/Replace UI
не менялись; regex/highlighting/counters не добавлялись. Фактические проверки/CI
и независимый whole-PR review фиксируются отдельно после выполнения.

## Preview scenario correctness — confirmation and Appeals (2026-10-29)

В отдельной implementation-ветке исправлены две локальные Preview/tooling причины.
Реально matched topic route и fallback используют общую primary-topic fixture
projection: dedicated best-answer confirmation открывает нерешённую тему с
выбранным ответом и авторскими controls, сохраняя prompt query при смене locale.
No-dismiss оставляет best answer и не помечает тему решённой. Другие topic states
и переходы к другим темам сохраняют отдельные fixture boundaries.
Preview-фильтр явно сопоставляет группу `appeals` с case type `appeal`, поэтому
advertised appeal count сопровождается карточкой fixture. Needs-review/review-status,
Mixed topic count и намеренно пустой attention scenario сохраняют прежнюю семантику.

Production actions/permissions/Attention group и case identities не менялись.
Добавлены integration regressions через настоящий `EmbeddedPreview`/router.
Фактические checks/CI и независимый review фиксируются после выполнения;
static Preview не заявляется production E2E или owner visual acceptance.

## Responsive containment — menu, revision history and manager header (2026-10-29)

В отдельной implementation-ветке исправлены три разные current-Stage причины
расширения document на узких экранах. Main extra-menu редактора использует
ограниченный toolbar containing block, сохраняя sticky-панель; raw history
получает full-row/shrink boundary и локальную горизонтальную прокрутку `pre`
без изменения текста ревизии. Narrow manager header сохраняет один ряд account
controls: attention label переносится внутри ссылки, auth sizing учитывает
min-content, а профиль сохраняет полный avatar перед сокращаемым именем.

Изменения ограничены presentation CSS. Editor source/Undo, history retrieval,
permissions и auth actions не менялись. Добавлен отдельный воспроизводимый
Chromium layout/hit-testing regression harness на реальных shared components
и synthetic preview/history data. Фактические результаты checks/CI и независимый
whole-PR review фиксируются отдельно после выполнения; owner visual acceptance,
контрастный refinement и external rollout не заявляются.

## DISCOVERY-01 — generic discovery location of Help questions (2026-10-29)

Публичные Help & Solutions вопросы сохраняются в internal service section
`help-solutions-questions`, но он не должен отображаться как пользовательский
раздел. Generic Unanswered, Search, Tag detail и authenticated Unread/New теперь
используют общую repository projection public location: для обычных тем
сохраняется category + section, для Help-вопросов возвращается только публичная
Help category с `section: null`. UI-карточки условно показывают section
без пустого разделителя; service-section id/name не передаются через эти
reader/loader payloads. Help topics остаются discoverable с прежними topic
links, сортировкой, тегами и результатами. Home/direct-section policy,
dedicated Help flows, authoring, moderation, topic breadcrumb и схема БД
не меняются. Добавлены PostgreSQL reader fixtures и route/presentation
regressions для четырёх affected surfaces и обычных тем.
CI и независимая whole-PR проверка фиксируются после реализации отдельно;
browser/external/production acceptance не заявляются.

## CODE-SEARCH-01 — search history field synchronization (2026-10-29)

В отдельной implementation-ветке исправлена рассинхронизация формы публичного поиска
при переходах по истории на том же `/:locale/search` route. URL `q`, loader и
результаты уже следовали за навигацией, но неконтролируемый `input` сохранял
значение предыдущего поиска из-за `defaultValue`, задающего только начальное
значение. При одинаковом нормализованном `query` разные raw URL/history
entries не меняли прежний `key={query}`, оставляя dirty input. Теперь identity
поля зависит от ключа закоммиченной записи React Router location, а не от
нормализованного запроса. Изменение записи истории перемонтирует только search
input; редактирование до submit остаётся неконтролируемым. GET-форма, loader,
backend search, URL parsing и соседние UI-механизмы не изменены.
Native route regressions проверяют GET-поиски A→B, Back/Forward,
normalized-equivalent raw queries, dirty draft, empty/whitespace-equivalent
history entries, согласованность URL/результатов/input и редактирование до submit.
Выполнение CI и независимый whole-PR review фиксируются отдельно; external
deployment и визуальная приёмка не заявляются.

## LITERAL-TEXT-01 — plain serializer EOL и ordered markers (2026-10-29)

В существующем PR #247 реализована ограниченная correction двух согласованных
остаточных случаев общего plain-text clipboard serializer. CRLF, CR и LF
получают единую LF view на входе до построчного escaping и contextual raw-tab
classification; повторные проходы используют тот же input и line indices.
Markdown/Vico marker после одиночного CR больше не обходит line-start guards.
Ordered-list marker экранируется по завершающей пунктуации (`1\.` / `1\)`),
сохраняя literal цифры и знак без дополнительного отображаемого backslash.

Genuine contextual raw-tab code сохраняет literal punctuation/entities;
нормализация относится только к входящему plain clipboard fragment. Existing
source вне insertion, Native Advanced raw paste, dedicated existing-code
operation и HTML/TSV conversion сохраняют прежние boundaries. Добавлены
CR/LF/CRLF/mixed marker/code controls и mounted Simple paste → FormData →
public renderer → Undo/Redo regressions, включая outer spoiler и существующий
CRLF source вне вставки. Это implementation state; applicable CI и новый
whole-PR review фиксируются отдельно после выполнения.

## LITERAL-TEXT-01 — source-positioned literal code insertion (2026-10-29)

В существующем PR #247 raw-substring helper заменён ограниченной моделью
«найти действующую единицу кода → заменить logical content → применить
bounded source edits». Токены существующего Markdown parser задают content,
padding и container boundaries; renderer-compatible обход включает spoiler
body и table header/body cells. Inline encoding сохраняет literal edge spaces
и выбирает безопасные backtick delimiters. Block encoding сохраняет required
indented/quote/list continuation prefixes и проверяет fenced hazards для
CR/LF/CRLF. Exact source вне необходимых edits не пересериализуется;
команда сохраняет одну Undo/Redo transaction и source caret mapping.

Внутри table inline code применяется общий renderer/editor/semantic-consumer
escaped-pipe codec: `\|` обозначает literal pipe по GFM, прочие punctuation и
entities не декодируются. Общая table grammar не заменена. Непредставимые
комбинации (например, odd literal backslash count перед pipe либо multiline
cell code) отклоняются без изменения source, с generic clipboard warning;
known-code failure не переходит в prose serializer. Перед применением edits
проверяется фактическая renderer semantic structure и ожидаемое code value.
Translation protection policy повышена до `cnt06-table-code-direction-v4`, поскольку
изменилась общая table-code semantics; provider/recovery/schema не менялись.

Добавлены source/value/container/history, mounted command → FormData →
public renderer и translation protection regressions. Это implementation
state; CI, engineering application checks и независимая проверка фиксируются
отдельно после выполнения. Whole-PR acceptance и owner visual не заявлены.

## LITERAL-TEXT-01 — Advanced code contexts and matching fences (2026-10-29)

В существующем PR #247 после независимого review реализована bounded
correction трёх подтверждённых current-Stage остаточных случаев команды
Advanced «Вставка без форматирования»:

- распознаётся действующий inline code, чтобы Markdown-sensitive clipboard
  content сохранялся буквально без prose escaping; при необходимости
  увеличивается длина inline backtick delimiters;
- code внутри Vico spoiler распознаётся по локальному Markdown-документу
  тела спойлера (как в публичном ForumMarkdown), а не по root AST;
- если clipboard внутри существующего fenced code содержит standalone
  closing-fence candidate той же marker/длины или длиннее, расширяются
  исходные opening/closing delimiters, а сам clipboard text остаётся raw.
  Это предотвращает досрочное закрытие блока и попадание последующего
  content в Markdown вне исходного кода.

Команда формирует единый history edit; обычная prose plain-команда,
Simple/Advanced native paste, другие технические команды и сохранение
существующего текста преднамеренно не изменялись. Добавлены pure
source/renderer-semantics и mounted toolbar → FormData → ForumMarkdown →
Undo/Redo regressions, включая shorter/opposite-fence controls.
Это зафиксированное implementation state; успех новых exact-head tests,
CI, independent whole-PR review и browser/owner acceptance заранее
не утверждается.

## 2026-10-30

## AP-03 — authorization-change History (2026-10-30)

В отдельной implementation-ветке добавлены History и Overview recent actions с независимым
`admin.history.read` (initial grant только built-in admin). Шесть существующих authorization
management operations записывают реальные typed deltas внутри authoritative transaction;
lockout/rejected/rollback/no-op не создают событий. Labels bounded, контекст удалённой
custom role сохраняется без target FK, private emails/requests/sessions не копируются.
AP03-MIRA-01 correction: keyset paging использует generated bigint position вместо
пары timestamp/random UUID; поздние события с тем же timestamp не попадают на older pages.
UUID и actual DB display time сохранены, cursor — decimal string без Number-conversion.
Allocation идёт под прежним authorization mutation lock; rollback gaps допустимы.
Runtime History privileges остаются SELECT/INSERT без sequence grants. UTC timestamps,
EN/RU/HE, private/no-store и classified outage boundaries сохранены.
Forward migration `0049_admin_history`, Drizzle metadata, schema manifest и runtime
SELECT/INSERT contract обновляются вместе. AP-04+, Quick actions и super-admin audit не
реализуются. Фактические tests/CI/browser результаты и author handoff фиксируются в #251;
review, merge, owner visual acceptance и production rollout этой записью не заявляются.

## AP-04 — Roles & permissions внутри admin shell (2026-10-30)

В отдельной implementation-ветке единственный AuthorizationAdminView встроен в общий
AdminShell с active Roles navigation, без вложенного ForumShell/main и второго h1.
Canonical `/admin/authorization`, формы/intents/fields и независимые GET/POST gates
`access.authorization.manage` сохранены. Loader использует тот же resolver handle для
permission gate и effective navigation; service/repository/History/lockout path не меняется.
Heading hierarchy/CSS и shared preview согласованы; применяются общие localized metadata
и private/no-store headers. Новых permissions/schema/API и AP-05+ нет. Фактические checks,
browser/CI и author handoff фиксируются в #251; review/merge/owner visual/rollout заранее
не заявляются.

## AP-05 — shared topic Quick actions и forum History (2026-10-30)

Синхронизация после merge Complaints Package 2 #266: ветка включает main `5ac2a18`.
Принятые `0050_complaint_submission`, snapshot 0050 и journal prefix сохранены;
AP-05 SQL без изменения содержимого перенумерован в `0051_forum_admin_history`,
snapshot 0051 сгенерирован поверх объединённой схемы. Complaint forms/capability,
обе группы localization/fingerprints и schema/manifest changes объединены.
Новый exact head требует полного coordinator-first review заново; прежний handoff
на `7664ea9` больше не является актуальным. Результаты повторных checks/CI/browser
и test-merge фиксируются в #251 после их фактического завершения.

Correction C после diagnosis на `c6aef29`: explicit own требует текущий Own permission,
Any→own fallback удалён. Revoked/absent Own даёт controlled denial без mutation/event,
даже если Any сохраняется. Явный any и legacy scope choice сохранены. Отдельный server
presentation flag и redirect admission не предлагают Any-only автору own confirmation;
administrative self-action остаётся в Quick actions. Scope/resource/CAS и History ordering
прежние; schema/permissions/migration prefix/Complaints не меняются. Correction требует
нового coordinator-first review на новом head; проверки фиксируются в #251 по факту.

Correction A/B после diagnosis/review на `b427800`: текущие own solution/source controls
явно передают `operationScope=own`, scoped administrative Quick actions — `any` в прежние
intents. Сервер проверяет marker/capabilities и прежний ownership/state/CAS; выдача Any
после открытия own-формы её смысл не меняет. Author confirmation остаётся own, явный admin
Quick action на собственном объекте — admin. Legacy calls без marker сохраняют прежний
выбор scope. Remove duplicate получает ID реально принятого pending appeal через RETURNING
и включает его accepted outcome в то же History event/presentation, без private текста и
дополнительного event. No-appeal context прежний. Schema/permissions/migrations не меняются.
Добавлены targeted route/native/browser regressions, включая stale/retry/atomic rollback.
Фактические checks/CI/handoff записываются в #251 после выполнения; correction требует
нового coordinator-first review cycle.

Существующие contextual topic controls используют reusable typed descriptors и
TopicQuickActions; формы отправляют прежние intents на canonical topic endpoint. Pin/unpin,
administrative solved/best-answer, Help solution/duplicate/appeal и source-locale paths
сохраняют server gates, own-only controls, reason validation и прежние stale/CAS identities.
History append выполняется внутри тех же Drizzle transactions; failure откатывает mutation,
actual no-op/replay/denied не создаёт events. Help signal review пишет один outcome с effect,
без дублирования inner operation и private case explanation. Own-scope операции не становятся
административными по роли автора. Для общего порядка pg и Drizzle producers используют
transaction advisory lock непосредственно перед последним append и держат его до commit;
существующие domain/authorization locks остаются. Forward migration 0051 расширяет только
History action/target constraint; Drizzle metadata и schema manifest согласованы, runtime
SELECT/INSERT и permission catalog прежние. EN/RU/HE History и Quick actions локализованы.
AP-06+, новые admin pages, closure/blocking и production rollout не входят в пакет.
Фактические checks/browser/CI и author handoff фиксируются в #251. Whole-PR independent
review, owner visual acceptance и merge этой записью не объявляются завершёнными.

## Complaints — Package 3 open Queue / triage (2026-10-30)

В отдельной implementation-ветке поверх merged Package 2 (#266, main 5ac2a18)
первый Complaints placeholder в Needs attention заменён Queue открытых Cases.
`forum.complaint.review` независимо открывает Queue/header link и bounded triage;
Signals/Security capabilities не дают complaint access и обратно. Ordinary SQL
не выбирает reporter accounts/explanations/notes; elevated identity key не расширяет
Queue projection. Бounded current topic title/reported-revision excerpt сохраняют
source locale/direction из runtime registry (und/unknown → auto); UI даёт ссылку
на topic/post context и отдельную triage-страницу.

Один SQL snapshot возвращает полный total и 25 Cases + lookahead; сортировка —
effective priority DESC, first report ASC, Case ID. Пустая страница не обнуляет total.
Автоприоритет — максимум reason weights: spam/other low, harassment/impersonation
normal, threats/fraud-phishing/malicious-content/personal-data high. Volume сам по
себе priority не повышает. Nullable moderator override и возврат к automatic
защищены actor mutex/Case lock/version CAS/operation replay; immutable priority
event пишется атомарно, event failure rollback сохраняет прежний Case.

Non-exclusive activity использует отдельные (Case,reviewer) leases: heartbeat POST
раз в 30 секунд только на видимой triage-странице, DB TTL 90 секунд, best-effort
expiry при уходе. Projection — boolean других активных reviewers, без identity;
GET не пишет presence, lease не меняет Case version и не назначает владельца.
Прекращение renewal/revocation не оставляет permanently-stuck marker. Forward
0051_complaints_queue, schema/journal/snapshot/manifest и runtime INSERT/SELECT/UPDATE
контракт activity table согласованы. Permanent contract: docs/moderation/COMPLAINTS.md.

Новых permissions, Signals/Security effects, admin History producer, full review/
notes/decisions UI, Quick actions, notifications, appeals или complaints History UI
нет. Exact-head CI #41106124347 на implementation head bf546fc завершён SUCCESS:
1649 application tests и 412 PostgreSQL17 tests. Локально также прошли 13 focused
Queue HTTP/UI/presentation tests и повторные 57 Complaints native tests, typecheck,
lint (0 errors/одно прежнее
warning), Worker/UI Preview builds, 18 infrastructure guard suites, clean 52 migrations,
manifest 59 tables, runtime privilege/provisioning/credential probes и Worker smoke.
Upgrade 0050→0051 с существующей Complaint/event сохранил их без изменений;
существующий open Case попал в Queue с automatic priority по его причине.
Actual Chromium → built Worker → Better Auth → PostgreSQL: 19 scenarios PASS —
global totals/paging, priority Form/CAS/auto reset, two-reviewer presence, revocation/
expiry, EN/RU/HE keyboard/320/390/768/1280, actual storage timeout/recovery, без JS errors/
external requests. Stable exact head и фактические CI/author evidence публикуются
в handoff #254; production migration/GRANT/deploy и independent review не заявляются.

## Complaints — Package 2 user submission (2026-10-30)

Package 2 merged через PR #266. Ниже сохранены его датированные implementation/
correction snapshots; актуальное Queue поведение описано в Package 3 выше.

Интеграция после merge AP-03 (#265): implementation-ветка обновлена поверх main
`269783d`. Принятые `0049_admin_history`, snapshot 0049 и journal prefix сохранены
без изменений; Complaints SQL перенумерован в `0050_complaint_submission` без
изменения содержимого, snapshot 0050 сгенерирован поверх объединённой схемы.
Сохранены оба набора localization/CSS, routes и request-scoped Worker capabilities.
Clean 51 migrations/manifest parity (58 таблиц) и upgrade 0049→0050 с существующим
AP-03 History event/position прошли. Авторские native checks: 399 tests; actual
browser: 20 Complaints и 16 AP-03 History cases без JS errors/external requests,
включая Unicode/retry/quota и History producer/paging/outage/recovery. Typecheck,
lint (0 errors/одно прежнее warning), Worker/UI Preview builds и runtime privilege/
provisioning/credential rollback probes, 18 infrastructure guard suites и полный
application run (1634 tests) прошли. Exact-head CI #41091012168 на `39161be` прошёл; coordinator review и
independent whole-PR reviews Лиры/Марка завершены PASS, current-scope defects — 0.

Дополнение после merge #267: ветка обновлена также поверх main `bb18442` с AP-04
Roles & permissions внутри AdminShell. Merge прошёл без конфликтов; принятые
AP-04 view/loader/forms/heading hierarchy/CSS и расширенный browser harness
сохранены. Новых schema/migrations AP-04 не добавляет: последовательность
0049_admin_history → 0050_complaint_submission и schema manifest не меняются.
Результаты проверок объединённого exact head фиксируются в author handoff #254.

Correction после review: у complaint explanation textarea удалён native UTF-16
`maxlength`, обрезавший допустимый non-BMP ввод. Серверная проверка 2000 Unicode
code points после trim, Other required и request byte bound сохранены. Уточнён
устаревший source comment domain module. Добавлены focused native HTTP и actual
keyboard browser regressions для 2000 non-BMP/mixed, 2001 rejection и сохранения
input/operation nonce при retry. Авторские correction checks прошли: 44 Complaints
native tests, 14 form/HTTP tests, typecheck, lint (0 errors/одно прежнее warning),
Worker build и 20 actual browser cases без JS errors/external requests, включая
keyboard input 2000 non-BMP/mixed и 2001 → HTTP 400 → correction/retry с тем же nonce.
На текущем exact head `39161be` correction сохранена; exact-head CI #41091012168
и новый coordinator-first whole-PR cycle завершены PASS.

В отдельной implementation-ветке поверх merged Package 1 добавлены независимые формы
жалобы на post и topic title в контексте темы. EN/RU/HE форма проверяет Other explanation,
сохраняет observed revision и operation nonce для retry, показывает inline confirmation
без перехода. POST-only action требует реальную session, same origin и текущий effective
`forum.complaint.create`, ограничивает вход и вызывает submission-only Worker capability.
Ответ `private, no-store` не раскрывает Case/report IDs, reporter identity или counts;
stale revision даёт conflict, известные dependency failures — 503, quota — 429/Retry-After.

Durable budget: 10 новых жалоб за rolling 10 минут и 50 за rolling 24 часа на actor.
Под actor-row mutex проверяются immutable persisted reports по DB statement time;
replay/lifetime duplicate budget не расходуют, rejected writes rollback, concurrent
submissions не превышают лимит. Новый reporter/time index ограничивает чтение.
Новая revision всегда создаёт отдельный Case, включая открытую предыдущую revision,
с immutable previous_case_id на последний Case того же post/title. Same-revision
successor по-прежнему ссылается на последний resolved Case; старые evidence/Decision
сохраняются. Forward migration 0050 обновляет predecessor FK/guard и добавляет индекс;
Drizzle metadata и structural manifest согласованы с этой схемой.

Авторские проверки: 392 native PostgreSQL 17 tests, 1627 application tests и затем
14 focused tests исправленного endpoint/form (включая перенос Retry-After из action
в framework headers), lint без ошибок (одно существующее warning), typecheck,
Worker/UI Preview builds, Drizzle metadata/parity и 18 infrastructure guard tests.
Полный actual Worker/Better Auth/PermissionResolver/PostgreSQL browser flow прошёл:
post/title, Other, inline confirmation, stale conflict, next-request deny, реальная
квота/Retry-After/duplicate/retry; EN/RU/HE keyboard/layout в 320/390/768/1280,
без JS errors и внешних запросов. Structural manifest и native ACL/provisioning/
credential rollback probes, built Worker smoke прошли. CI и stable-head handoff
фиксируются отдельно после выполнения. Package 3+ queue/priority/presence/review UI,
notifications/appeals UI/Quick actions не добавлены. Production migration/GRANT/deploy,
owner visual acceptance и independent whole-PR review не заявляются.

## RES-A11Y-01 — accessible name Simple textbox (2026-10-30)

В отдельной implementation-ветке каждый VisualTextLeaf с role=textbox получает
собственное author-supplied accessible name через существующий локализованный
ключ editorVisualSurface. Имя не вычисляется из текста сообщения и не зависит
от наличия имени у ancestor region или отдельного native textarea.
Общий leaf path покрывает пустой/trailing текст, formatted fragments и nested
spoiler. Новые translation keys, зависимости или общая ARIA widget model не добавлены.

Source/history/selection, Simple/Advanced переключения, native textarea labels,
table inputs, Preview и disabled/paste boundaries не меняются. Добавлены focused
mounted regressions для имени, нескольких instances, runtime localization,
редактирования/Undo/Redo и соседних корректных controls. Фактические checks/CI
и независимый whole-PR review на момент первоначальной записи ожидались.
Впоследствии PR #261 проверен и merged 2026-10-30.

## AP-02 — admin shell и Overview foundation (2026-10-30)

В отдельной implementation-ветке реализован `/:locale/admin`: общий reusable
admin shell/navigation и Overview. Admission — union существующих applicable
Forum capabilities и `access.authorization.manage`, без нового общего permission.
Header получает server-resolved presentation flag, loader повторно проверяет
актуальный effective access до чтения данных. Own-only/attention-only grants
входа не дают; existing `admin/authorization` сохраняет свой независимый gate.
Browser title нового admin route использует уже resolved UI translation snapshot
locale boundary и существующий catalog с canonical-English fallback, включая
обновление при client-side смене locale. Literal title AP02-LIRA-01 устранён;
результаты повторных проверок и нового review фиксируются отдельно в #251.

Новый scalar aggregate reader в одном SQL statement считает categories/public
sections/topics/messages, не использует capped lists и не читает пользователей
или attention queues. Zero и classified-unavailable различаются; недоступность
counts не убирает navigation, неожиданные ошибки не скрываются. Document/data
responses private/no-store. Незавершённые Forum/Users/History/Settings ведут на
общий Under development; новых section-read/mutation authority они не дают.

Добавлены canonical EN/RU/HE strings/fingerprints, logical responsive CSS,
route/view/native PostgreSQL и actual-browser regression harness. Permanent
contract обновлён в `docs/ADMIN_PANEL.md`. History/recent actions, Quick actions,
полная композиция Roles, новые object pages, schema/migrations/permission keys
и AP-03+ не добавлялись. Фактические checks/CI/browser evidence и independent
review фиксируются отдельно после выполнения; owner visual и production rollout
не заявляются. Координация этого пакета — только #251.

## 2026-10-31

## Complaints Package 3 — integration with AP-05 / main e564948 (2026-10-31)

По назначению #254/#6536295319 PR #269 интегрирован с принятым main `e564948`
после merge #268. Принятые AP-05 Quick actions, own/any operationScope, permission/resource/CAS
и transactional forum History producers сохранены вместе с Complaints Queue/triage,
configurable reason mapping и activity. Обе группы canonical/localized keys и reviewed
fingerprints объединены без изменения их значений.

Принятый `0051_forum_admin_history` и его snapshot/journal prefix сохранены byte-for-byte.
Непринятые Complaints SQL без изменения содержания перенумерованы в
`0052_complaints_queue` и `0053_complaint_priority_settings`; snapshots 0052/0053
пересобраны поверх принятого AP-05 snapshot 0051. Explicit fixture migration lists,
manifest и clean migration count согласуются с 54 migrations / 60 tables.
Ссылки на прежние номера в датированных author-check sections ниже исторические.

Применимые checks, upgrade и browser/CI результаты записываются в #254 по завершении;
прежний review на 5601aab не закрывает новый integration head. Нужен новый
coordinator-first whole-PR cycle. Package 4+, merge и production rollout не выполняются.

## Complaints — Package 3 configurable reason priorities (2026-10-31)

По дополнению #254/#6530944971 PR #269 теперь хранит глобальную mapping всех восьми
причин в domain singleton `forum_complaint_priority_settings` (initial values прежние).
Queue/triage используют актуальную persisted mapping в том же SQL snapshot: существующие
и новые open Cases пересчитываются при чтении; manual override имеет преимущество,
Automatic использует текущую mapping. Complaint history и Case versions от изменения
настройки не переписываются; admin History producer не добавлен.

Реальный localized UI `/:locale/attention/complaints/settings` позволяет читать/изменять
все восемь уровней. Независимый `forum.complaint.priority.manage` проверяется на GET/POST
и в service; initial admin grant, review-only не допускается. Management-only actor видит
Attention header и попадает в settings без Case reads; глобальный admin admission не меняется.
Один atomic full-map version CAS защищает concurrent/stale save; 409 требует reload и
повторной проверки значений. Нет process cache или второго configuration/RBAC framework.
Forward `0052_complaint_priority_settings`, schema/journal/snapshot, manifest и runtime
SELECT/UPDATE ACL согласованы; repository history 53 migrations / 60 tables.

Авторские проверки дополнения: полный PostgreSQL17 suite — 417 tests, включая 62
Complaints; 8 новых HTTP/UI tests и focused route-shape 2/2. В полном application запуске
1656 tests прошли, один прежний route-shape expectation требовал добавления нового route;
expectation исправлен без runtime change. Final exact-head CI и author handoff фиксируются
в #254. Lint 0 errors (одно прежнее warning), typecheck, Worker/UI Preview builds,
18 infrastructure guard suites, Drizzle metadata/schema parity, manifest 60 tables,
runtime privilege/provisioning/credential probes прошли. Upgrade 0051→0052 сохранил
existing Case/event и применил configured priority при следующем чтении.

Финальная actual Chromium→Worker→PostgreSQL проверка runtime 73e64d9 прошла 33 scenarios:
Queue/triage регрессии, actual full-map Form save/persistence, current automatic priority,
manual override/Automatic, stale CAS и integer bounds, management-only admission,
next-request deny, EN/RU/HE 320/390/768/1280 keyboard/layout, genuine timeout/recovery.
JS errors/external requests — 0; complaint history от настройки не меняется, admin History,
Signals/Security effects отсутствуют. Evidence — `/workspace/work/pkg3-mapping-results/`;
воспроизводимый harness — `tests/browser/complaints-queue/`.
Новый coordinator-first exact-head review и merge пока не завершены.
Package 4+, production migration/deployment/secrets не выполняются.
