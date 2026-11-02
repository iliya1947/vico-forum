# PROJECT_HISTORY_05.md

> [Индекс истории](./PROJECT_HISTORY.md)> · [Предыдущий том](./PROJECT_HISTORY_04.md)> · [Следующий том](./PROJECT_HISTORY_06.md)

Период: **2026-10-27 — 2026-10-28**.

Этот том сохраняет последовательность L6/L7/L8 и связанных Editor/localization/literal-text corrections.

## LOC-06 — отсутствие текста при генерации перевода post body (2026-10-27)

Batch L2 шаг 5/5: в `ContentPostBodyTranslationPlanner.planAndDispatch`
`protectMarkdownForTranslation` выполняется после чтения authoritative
revision, но **до** source-locale resolver. Если segments пусты
(attachment-only / blank / whitespace-only / fenced-code-only post),
действует существующий bounded `original:no-translatable-content`
вместо `InvalidContentSourceLocaleInputError` из normalization и
HTTP 500. Это относится одинаково к automatic и explicit post-body
generation; текущие permission, disabled-runtime, target-locale и
immutable revision проверки сохранены. Для обычного текста source
resolution, provider capability, task upsert и enqueue выполняются
как прежде.

Focused regressions проходят через actual topic action →
DefaultContentGenerationActionCapability → post-body planner,
authoritative revision store и настоящий locale resolver: оба
generation intents с blank-body, whitespace и fenced-only cases
возвращают no-op и не вызывают resolver/upsert/enqueue, а prose cases
queued. Planner-unit regressions также проверяют, что caller-supplied
текст не подменяет authoritative empty revision. Новых schema,
dependency, runtime-policy или external-provider изменений нет.
Exact-head CI и независимый whole-PR review Batch L2 фиксируются
после их фактического выполнения.

## LOC-03 — controlled i18next nesting с options (2026-10-27)

Batch L2 шаг 4/5 расширяет текущий UI translation validator для
i18next nesting: `$t(key)` и default i18next options form
`$t(key, {"lng":"en"})` проверяются как защищённые полные токены,
включая option payload. Добавленные, удалённые или изменённые
parameterized nested lookups не могут обойти provider/local/persistent
validation и затем изменить runtime text через i18next. При
распознавании поддерживаются quoted values с parentheses и
интерполируемые `{{variable}}` в JSON options; malformed и
неподдерживаемый синтаксис отвергается. После whole-PR review
вложенная повторяющаяся regex заменена линейным сканированием
кавычек и скобок, исключающим экспоненциальную обработку короткого
ошибочного input; контролируемый полный nesting-token и options
сохранены.

Изменение локализовано в общем `controlledTokens` boundary;
published raw UI results, source priority, compiled bundle validation
и runtime используют существующие механизмы. Regression проверяет
отказ в результате provider publication, compiled/verified bundle
и фактическую интерпретацию опасного nesting i18next. Новых
schema/migration/dependency, provider и deployment изменений нет.
Реализация Batch L2 завершена; новый whole-PR review проводится только
после bounded correction и повторного exact-head CI.

## LITERAL-TEXT-01 — буквальный текст в Simple (2026-10-27)

В Batch L2 шаге 3/5 уточнено общее экранирование literal prose для
визуального ввода и plain-text clipboard path. Setext-маркеры из дефисов и знаков равенства в начале
строки больше не преобразуются в headings/thematic breaks,
тильды экранируются от GFM strikethrough, а буквальные ampersands
сериализуются через `&amp;`, чтобы `&copy;` и другие character references
не меняли видимый текст. Существующие обычные Markdown-линии,
обработчики HTML rich paste и intentionally formatted Markdown source
не заменяются универсальным escaping при просмотре или переключении
режимов.

Служебный `&#32;` / `&#9;` для начала visual leaf по-прежнему создаётся
отдельно от экранирования пользовательских символов. Plain-text paste
также защищает 4+ начальных пробела на каждой строке
одним structural entity до escaping, чтобы не превращать пользовательский
prose в indented code с видимыми `&amp;` и обратными слэшами.
После bounded correction forced plain Ctrl+Shift+V различает raw-tab
indented-code и prose в действительном Markdown context (включая текст до
курсора и structural prefix). Только настоящий code сохраняет raw source;
в prose escape сохраняет буквальные `&copy;`, тильды и прочую пунктуацию.
Общий контекстный path применяется также к plain-text fallback таблиц и
явной plain-text вставке. Для 4+ начальных пробелов structural entity
сохраняется.
Обычное TSV-преобразование и предыдущее поведение native typing на этом
этапе не менялись. После следующей bounded correction Simple native input с
двумя ведущими tabs или четырьмя пробелами и tab учитывает уже созданный
structural prefix `&#9;` / `&#32;` при решении, является ли остаток indented code.
Поэтому `&copy;` и `~~literal~~` в обычном введённом тексте экранируются,
не меняя намеренный Markdown/code в Advanced или clipboard paste semantics.
Добавлены parser и mounted native-input → FormData → public renderer regressions
на оба mixed-indentation случая с проверками intentional code в Advanced.
Дополнительно добавлены parser и mounted Ctrl+Shift+V → published ForumMarkdown regressions
для raw tab, `&copy;`, `~~literal~~` и existing whitespace/Setext controls. Markdown toolbar actions, Advanced source
editing, DB и authz contracts не менялись. Applicable exact-head CI
и независимый whole-PR review фиксируются по факту отдельно.

## EDITOR-10 — буквальные подписи в Markdown-упоминаниях (2026-10-27)

В Batch L2 шаге 2/5 после влитого EDITOR-04 уточнена сериализация подписи
ссылки, создаваемой autocomplete упоминания. User display name является
авторитетным буквальным текстом. После второй независимой whole-PR проверки
ручной неполный список Markdown-экранирования заменён context-aware
literal-link-label serialization: ASCII punctuation кодируется numeric
character references до Markdown parsing. После bounded correction C0/DEL
символы, которые CommonMark numeric decoder заменяет на U+FFFD,
передаются буквально; только представимые ASCII whitespace controls
кодируются numeric references. Это сохраняет допустимые имена без потери
authoritative code points.
Последовательности вроде `&copy;`, `~~name~~`, `<https://example.test>`,
nested bracket links и backticks остаются буквальным отображаемым именем,
не создавая entity replacement, autolink или GFM formatting.
Server-supplied member ID и profile destination остаются прежними.

Parser/published Markdown и mounted Simple/Advanced autocomplete regressions
проверяют единый profile link с одним literal text child, отсутствие
дополнительных autolink/formatting nodes и immutable recipient ID.
Ранее работавший обычный display name остаётся control. Действующий
Markdown body / notifications / DB / localization contracts не изменены.
Exact-head CI и независимая whole-PR проверка фиксируются отдельно по факту.

## L6 — attachment object journal и ZIP integrity (2026-10-27)

В незамерженном implementation PR L6 прежний post-write settlement дизайн заменён
v2 upload fence. Accepted migrations до `0045` неизменны; промежуточные `0046/0047`
самого PR заменены одной `0046_attachment_upload_fences`. Она создаёт journal с
nullable `reservation_etag` и singleton `forum_attachment_sweep` с durable cursor/claim.
Промежуточного v1 writer в новой реализации нет; production/external state не предполагается.

Новая physical identity `private/fenced-v1/<uuid>` одноразовая. Сначала journal
PREPARING, затем единственный create-only reservation PUT. Только positive ACK
reservation и committed DB activation READY разрешают единственный payload PUT
с positive `etagMatches`. Claim запрещает activation и metadata, даже после
истечения lease. Metadata принимает только проверенный `stored` result и READY
unclaimed journal; это обязательно для v2 key независимо от caller flag.
Идентификатор browser upload и существующие stable-ID retry semantics сохранены;
новая попытка storage всегда использует новый physical key. Ambiguous initialization
не повторяется на старом key и не даёт права payload-writer.

У READY initialization уже завершена и не повторяется. Подтверждённый DELETE
удаляет payload, если тот committed раньше, либо делает positive match позднего
PUT ложным. Cleanup retire journal по claim token после DELETE независимо от
post-write DB availability: прежний `write_completed_at`/единственный terminal
UPDATE больше не используются. Unknown DELETE/DB-retirement outcome сохраняет
claim для следующего bounded прохода. Authoritative asset по key передаётся
обычному reference-aware cleanup и не удаляется orphan processor.

Cleanup PREPARING может обогнать initialization. Поздно появившийся reservation
не сможет пройти DB activation, но подлежит отдельному bounded marker sweep.
По умолчанию pass ограничен 20 journal/asset deletions плюс страницей максимум
5 storage entries для markers; маленькие custom batches сохраняют минимум одну
marker entry. Cursor и lease/token checkpoint durable; завершённый цикл начинает
обход prefix заново. Перед DELETE marker-кандидата проверяется отсутствие
**и journal, и authoritative asset**; DB failure не означает отсутствие.
Старый sweep processor не может перезаписать checkpoint нового claim.
Нет постоянных per-key tombstones, full-prefix scan в одном request или нового
scheduler/Queue. Конечный progress предполагает восстановление DB/storage,
продолжение bounded cleanup и fair cursor progress при обслуживаемой нагрузке.

Workers adapter сохраняет streaming через native FixedLengthStream, cancellation
и hard byte bounds. Reservation отделяется от следующего same-key payload write
ожиданием 1 секунды после ACK: это pacing для документированного R2 per-key write
rate, не storage retry. Обычная успешная загрузка получает эту дополнительную
секунду; failed best-effort DELETE всё ещё восстанавливается journal cleanup.

ZIP finalizer и ATTACH-02/ATTACH-STRUCT-01 не менялись: classic count 65,535
отличается от ZIP64 locator, central metadata читается 128 KiB blocks,
local records проверяются в physical-offset order; missing data descriptor
не может пересечь следующий header. Whole-body buffering/decompression не добавлены.

Native PostgreSQL regressions проверяют actual activation/metadata SQL timeout,
late unknown payload до/после revoke, PREPARING lost ACK, metadata commit/rollback,
concurrent/expired claims, marker pagination/budget/DB failure/stale LIST и asset
protection. Workerd/CI evidence фиксируется после фактического завершения checks.
Новых внешних сервисов, runtime credentials, production/owner visual acceptance
или CPU/deployment candidate C этот correction не включает.

## EDITOR-04 — feedback при отклонённой spreadsheet conversion (2026-10-27)

В отдельной Batch L2 implementation-ветке исправлен UI feedback для
непредставимого или неоднозначного TSV clipboard input в Simple Editor 2.0.
При отказе `spreadsheetToMarkdown` исходный текст, как и раньше, вставляется
через безопасный literal plain-text path; после вставки показывается отдельное
явное сообщение, что табличное преобразование не выполнено и применена
обычная текстовая вставка. Общий warning для отсутствующей возможности
вставить данные/HTML остаётся отдельным и не заявляет ложный успех.

Добавлены focused mounted regressions для нерегулярных и неоднозначно
quoted TSV, успешного табличного преобразования без warning и обычного
plain-text paste. Добавлено новое canonical English UI-сообщение и reviewed
RU/HE локальные значения с соответствующим source fingerprint.
Markdown/document storage, clipboard parsing, attachment, database schema,
authorization и внешние контракты не меняются. Exact-head CI и independent
whole-PR review фиксируются отдельно после фактического выполнения.

## LITERAL-TEXT-01 — follow-up for spoiler closer, tabbed code and Advanced plain command (2026-10-28)

В существующем PR #247 реализовано ограниченное исправление ещё трёх
подтверждённых current-Stage subcases plain-text insertion:
буквальная строка закрытия `:::` теперь экранируется рядом с Vico spoiler
opener и не закрывает внешний спойлер; raw-tab или four-space indented
table-shaped Markdown больше не распознаётся как Vico table раньше CommonMark
code boundary. Контекстный plain-paste serializer учитывает protected
code fragments при определении raw code lines, не добавляя отображаемых
`\\|` к исходному code text. Команда «Вставка без форматирования»
в Advanced использует существующие editable-code ranges, сохраняя сырой
текст внутри действующего fenced code и прежнее экранирование в prose.

Добавлены focused converter и mounted editor regressions для spoiler
body, tab-indented table-shaped literal code, Advanced clipboard command
с `FormData`, публичным `ForumMarkdown` и Undo/Redo; исходные Vico
spoiler/table/direction, реальные code blocks, HTML/TSV, намеренный
Advanced Markdown и другие controls не менялись преднамеренно.
Это состояние реализации; результаты новых тестов, CI, независимого
whole-PR review и browser/owner acceptance здесь заранее не заявлены.

## LITERAL-TEXT-01 — bounded Vico grammar plain-text correction (2026-10-28)

В существующей implementation-ветке PR #247 после независимой whole-PR
сверки исправлен остаточный дефект plain-text/Ctrl+Shift+V: Vico-specific
спойлер (`:::spoiler`), table-shaped строки с `|` и завершающие
`{:vico-dir=ltr|rtl}` больше не превращаются в структуру/атрибут при
публикации буквального текста. Защита применяется только в общем
clipboard/Simple literal serializer; реальный tab-indented code по-прежнему
сохраняется raw, а intentional Advanced Markdown, HTML/TSV conversion,
previous CommonMark literal escaping и исходные пользовательские символы
не меняют семантику. Добавлены pure и mounted
Ctrl+Shift+V → FormData → ForumMarkdown → Undo/Redo regressions,
а также Advanced/code controls. Это implementation state до новых
exact-head CI, independent review и visual acceptance; их результаты
не объявлены заранее.

## LITERAL-TEXT-01 — bounded correction после whole-PR review (2026-10-28)

В Batch L2 на основе независимой проверки двух случаев уточнена буквальная
семантика Simple без изменения intentional Advanced Markdown.
Обычный Simple input после 1–3 ведущих пробелов и tab сохраняет editable
paragraph: сериализатор защищает начальный пробел character reference и
не превращает исходный prose в indented code. Plain-text paste в начале тела
распознанного spoiler определяет code/prose по реальному renderer-compatible
segment boundary, а не по whole-document CommonMark, считающему :::spoiler
обычным текстом. Поэтому настоящий indented code внутри spoiler сохраняет
raw tab, амперсанды и Markdown punctuation без видимых escape sequences;
prose продолжает экранировать те же символы. Shared root/technical/table
context, существующие Ctrl+Shift+V и Advanced source boundaries сохранены.
Добавлены pure-parser и mounted Simple input/Ctrl+Shift+V → FormData →
ForumMarkdown regressions, включая Undo/Redo и root controls. Это
реализация correction; итоговые CI и независимая проверка фиксируются
отдельно после фактического выполнения.
## L8 — Durable localization / translation corrections (2026-10-28)

В implementation-ветке реализованы пять согласованных current-Stage findings:

- `LOC-01`: transport failure у неизвестного COMMIT outcome проходит semantic
  pre/expected/actual reconciliation; blind retry не добавлен.
- `LOC-02`: deterministic bundle validation/obsolete identity отделена от unknown
  verifier/crypto failures; последние не разрешают удалять корректную derived row.
- `I18N-UI-POLICY-01`: bundle format v3 учитывает явную machine generation policy
  в compile/verify/publication/runtime/reconciliation. Request без настроенной policy
  использует manual/local/English fallback; произвольный policy default не введён.
  Manual values остаются независимы от machine policy. Reconciliation CLI принимает
  `--generation-policy=<version>` для того же контекста, не активируя внешние сервисы.
- `LOC-05`: eligible fresh A–B–A продвигает superseded pending/processing task в
  новое поколение в UI/title/body stores и ограждает старые claim/allowance owners.
  UI fresh decision отмечается явно; replay старого job list сам head не передвигает
  и не реактивирует stale task, даже когда её поколение ещё совпадает с head.
  Negative dispatcher regressions проверяют replay без флага и с `freshPlanning:false`;
  разрешённая fresh reactivation и A–B–A сохраняются.
  Ранее не сохранённая UI identity тоже создаётся только с `freshPlanning:true`:
  delayed unpersisted plan без разрешения отклоняется типизированной planning
  precondition error без task/head writes или enqueue. Это относится и к первому
  head; actual plan(A) → fresh planAndDispatch(B) → delayed dispatch(A) regressions
  проверяют сохранение B publication right. Fixture creation отмечена fresh явно.
  Актуальный duplicate processing claim и terminal completed identity сохраняются.
- `LOC-08`: L7 semantic serialization восстанавливает authored direction token,
  отличает его от literal lookalike и проверяет direction до canonicalization loss.
  Protection identity повышена до `cnt06-custom-structure-direction-v3`.

`LOC-09` не включён: доказанный legacy upgrade path остаётся future rollout prerequisite.
PR247/Batch L2 не изменён. Новых schema/dependency/provider/Queue/deployment изменений нет.
Focused helper/component и native PostgreSQL regressions покрывают причинные цепочки,
manual precedence и delayed-owner controls. Локально прошли application/native PostgreSQL17
regressions, lint, typecheck, application/UI-preview build, Workers smoke и Chromium
direction round-trip controls. Exact-head CI фиксируется отдельно после завершения.
Whole-PR self-review и owner visual acceptance не заявляются.

## L7 — Editor structural Markdown semantics (2026-10-28)

В implementation-ветке реализован пакет из семи согласованных findings:

- `EDITOR-03`: частичное снятие inline formatting учитывает удалённые и вставленные
  delimiters дочерних wrappers до расчёта внешней границы. Boundary whitespace
  emphasis выводится за delimiters, а невыделенные пробелы link label остаются
  внутри ссылки; пустые residual wrappers не создаются. При необходимости
  CommonMark attention boundary экранируется literal character reference только
  со стороны выделенного текста, с сохранением символов и source-selection mapping.
  В mixed GFM runs внешний delimiter проверяется отдельно от семьи маркеров ребёнка:
  `~~**`/`**~~` сохраняют strike pairing и selected-only semantics, включая outer
  strike с inner strong/emphasis и partial intraword selection. Flat strike,
  whole-word Clear и reversed nesting остаются supported controls.
  При repeated strike через strong/emphasis Clear удаляет избыточный внутренний
  strike только на пересечённой или вновь открываемой границе, где внешний strike
  уже обеспечивает зачёркивание. Это сохраняет effective formatting невыделенного
  остатка при punctuation и whitespace trimming, включая разные spans wrappers,
  outer link и Unicode; текст и соседние блоки не пересериализуются. Общая модель
  source edits и прежняя attention protection сохраняются.
- `EDITOR-06`: Simple Enter закрывает и вновь открывает пересекающие границу inline
  wrappers по фактическим границам после nested reconstruction, включая начало
  и конец visual leaf; исходник соседних блоков не пересериализуется.
- `RES-EDITOR-02`: Backspace в начале следующего обычного абзаца удаляет separator,
  сохраняет исходный текст и поддерживает общую Undo/Redo history. Совпадающие
  соприкасающиеся inline wrappers объединяются; heading/list/code/table boundaries
  не интерпретируются как обычные paragraph separators. Terminal manual direction
  предыдущего paragraph переносится в конец объединённого paragraph, а каретка
  остаётся перед скрытым marker. При двух explicit overrides сохраняется override
  предыдущего paragraph; если он auto, сохраняется terminal override второго.
- `EDITOR-07`: Tab/Shift+Tab в Advanced code учитывает exclusive selection end;
  следующая строка, включая closing fence, не получает отступ.
- `EDITOR-11`: первоначальная публикация темы, Help-вопроса и ответа сохраняет raw
  body; trim применяется только при проверке содержательности, а не к сохраняемому
  Markdown. Заголовки/идентификаторы сохраняют прежнюю validation.
- `MARKDOWN-CUSTOM-STRUCTURE-DIVERGENCE-01`: mention recipients и translation
  protection используют renderer-compatible разбиение tables/spoilers. Literal
  spoiler summary не создаёт mentions; quotes/code внутри самостоятельных ячеек
  исключаются из recipients. Перевод сохраняет table/spoiler structure и переводит
  человеческий текст, включая буквальный summary. Protection policy повышена до
  `cnt06-custom-structure-v2`; direction round-trip (`LOC-08`, L8) не входит в пакет.
- `MARKDOWN-SPOILER-01`: fence-aware индекс closing markers заменяет повторные
  suffix scans при незакрытых spoiler openers; preprocessing ограничен `O(n log n)`
  по числу строк и `O(n)` памяти.

Добавлены focused regressions для source edits/history, notification recipients,
translation restore и parser work, а также native action → writer → PostgreSQL проверки
сохранения indented code/trailing whitespace и durable mention notifications.
Локальный Chromium проверил native Enter, Backspace с Undo/Redo, partial clear и
exclusive-end Tab вместе с FormData и публичным renderer. Это инженерные локальные
проверки; owner visual acceptance и внешняя infrastructure validation не выполнялись.
Локально пройдены общий application suite, последующие focused regressions, native
PostgreSQL suite, typecheck/TypeScript build, source lint, app/UI-preview builds и
Workers smoke. Fence-aware segmentation совпало с прежней грамматикой на 10 000
ограниченных смешанных примерах. Bounded correction трёх editor transformation
families покрыта helper/component regressions, включая nested links, boundary
whitespace, literal references/Unicode и direction marker/history. После correction
требуется новый whole-PR review стабильного implementation head.

Clear-link image collision исправлена: `[a !b!](https://example.test)`, Clear `a !`
даёт `a &#33;[b!](https://example.test)` — выбранный `!` остаётся буквальным, suffix
сохраняет link text/destination. Защита использует actual reopening anchor после
удаления child delimiters, учитывает уже экранированный `!` и не меняет suffix source.
Focused helper/component и локальный Chromium проверяют source/FormData/public
semantics, selection и Undo/Redo; прежняя matrix до глубины wrappers 4 проходит
14 597 выделений без нарушений. Это bounded correction; whole-PR acceptance
требует нового review стабильного head, не следует из успешной локальной matrix.
