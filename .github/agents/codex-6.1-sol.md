# Лёва — Codex-6.1 Sol

## Текущий статус

Owner назначил Лёву исполнителем removal scope; реализовано и опубликовано в существующем #232: **`5dc32be046b5cb5dc7029d0371137308bc2ef55b`**. [Итог](https://github.com/iliya1947/vico-forum/pull/234#issuecomment-6292445730).

Удалены пользовательские drafts/autosave/recovery/conflicts/UI; сохранены недрафтовый editor и operation/ref-based attachments/publication/editing без text storage/CAS. F7 исправлен, включая whitespace range/projection/native caret. Merged migration history не менялась, unmerged 0045 удалена.

Локально PASS: исправленные targeted suites 93 application/component / 12 PostgreSQL tests с success=true и без failed suites/unhandled errors, types, builds, lint без ошибок (старое warning), schema/history/manifest/privilege guards, production-build Workers smoke. Реальный Chromium/Worker/PostgreSQL/local R2 подтвердил четыре flows, отсутствие autosave/reload recovery, uploads/publication/IME/edit-access и 1/2/4 leading spaces. CI [39434488911](https://github.com/iliya1947/vico-forum/actions/runs/39434488911) pending; автор не является независимым reviewer.

Остановился после реализации. Independent whole-PR review/owner visual acceptance не запускались, merge/deployment не выполнялись. Мишаня не участвует. Следующий шаг — exact-head CI и Мира для координации приёмки. Исторические draft-correction материалы ниже superseded owner removal decision.

Первый removal head a29e15f/CI 39433774478 был FAIL: пустые retired test suites и text-only clipboard без files. Прошедшие 974/272 assertions ранее ошибочно названы полным PASS; утверждение исправлено. Причины устранены в 5dc32be; новый full exact-head CI pending.

## Действующий технический вывод

Text draft version сейчас не определяет однозначно attachment composition. Накопленная compensation chain (`draftAttachmentIds`, provenance/context evidence, boundaries, retention и boundary release) показывает, что механизм прошёл порог обязательного архитектурного пересмотра.

Три дополнительно подтверждённых current-Stage defects:
1. stale selected payload может быть отправлен с fresh unseen server CAS version;
2. Simple programmatic paste может быть потерян следующим native input из-за DOM/source ownership split;
3. attachment-first после hidden aged terminal получает conflict до first text save.

Существующий stale in-memory 30-day expiry defect также остаётся обязательным к закрытию.

## Следующая задача

Не подключаться повторно без прямой команды владельца. Новый действующий план записан в общем service-channel.


## Новый owner gate

После того как Мира и Лира завершат design gate и зафиксируют готовый технический implementation plan для PR #232, до начала реализации владелец отдельно подключит Лёву к PR #234.

Задача Лёвы в этом gate: проверить готовый план на полноту причинной цепочки, отсутствие новой compensation chain, соответствие current Stage/invariants и готовность к implementation. Код до этой проверки не начинать.


## Pre-implementation plan review — назначено владельцем через Миру

Готовый implementation plan PR #232 зафиксирован в общем `.github/service-channel.md` PR #234 и прошёл Mira + Lira plan review; narrow re-review Лиры — PASS, комментарий `6279272069`.

Задача:
- независимо проверить готовый план на полноту причинной цепочки;
- проверить, что четыре confirmed current-Stage defects и compatibility A/B закрываются предложенными переходами;
- проверить отсутствие новой compensation chain / лишней persistence complexity;
- проверить preservation publication/read/rebind/cleanup/generation/local-expiry/Simple-DOM invariants;
- определить, готов ли план к implementation.

Граница:
- PR #232 не менять;
- не писать код и не начинать реализацию;
- новый confirmed current-Stage defect исходного кода сначала вынести владельцу;
- если проблема только в плане, указать конкретный blocker и требуемое изменение;
- при чистом результате дать явный PASS для перехода к implementation.

## Текущий следующий шаг (2026-10-20)

Самопроверка завершена с FAIL; findings опубликованы по команде владельца. Дождаться решения владельца по correction согласно owner gate. Назначение независимой проверки Лире сохранено, её результат здесь не предрешён. Служебный PR не merge; implementation PR не merge без владельца.


## Совещание по findings #232 — участие Лёвы

Owner перевёл опубликованные findings в совместное техническое согласование. Как архитектор, в комментариях PR #234:
- сверить F1–F7 с finding Лиры и M1–M3 Миры;
- проверить дубли, причинные зависимости и противоречия;
- выделить минимальные causal groups и определить, требуют ли они изменения принятого snapshot/CAS плана;
- если correction можно выполнить в существующей модели — обозначить bounded correction scope и invariants;
- если требуется новая compensation layer/table/version или пересмотр модели — явно дать architect STOP/blocker;
- не менять #232 и не начинать correction.

Цель — согласованный технический вывод совещания, а не код.

## Результат архитектурного разбора совещания — 2026-10-20

Назначение service head d19b77c выполнено. [Полный технический разбор](https://github.com/iliya1947/vico-forum/pull/234#issuecomment-6289132230).

- Сверены F1–F7, finding Лиры и M1–M3 на unchanged implementation head `3b30d8d7b04eadd867c1b762d68bf040605b0ab0`. Счёт — 10 отдельных findings; Лира/F6 один корень, M3 не дублирует F6, M2 не дублирует F6. Два варианта F2 сохранены. Принимаю уточнение Лиры: исходный F6 `{A} → {B}` не задаёт однозначный winner из-за mixed keep/newer rules; чистый `{A} → {A,B}` повторно воспроизведён component-тестом. Прежнее утверждение о единственном winner `{B}` отозвано в исходном комментарии; precedence mixed remove+add остаётся открытым.
- Дополнительно воспроизведены M1 (настоящий PostgreSQL 17, publication staged-only asset без draft head), M2 (два autosave одного text/manifest при pending без нового ввода), M3 (incomparable local manifests неразличимы в manual conflict). Диагностика в отдельной копии: expected-correct assertions 0 passed / 3 failed. Это не полный CI/новый independent review; #232 не менялся.
- Семь causal groups: async/read/choice ownership (F1/F3/F5); legacy transition (F2); publication precondition (M1); local expiry/cache ownership (F4); ACK/dirty/causal ordering (F6/M2); manual-choice presentation (M3); Simple whitespace tree (F7).
- Принятая snapshot/CAS модель достаточна как основа bounded correction. Не установлена необходимость новой table/registry/attachment-version или возврата boundaries. Это не approval текущего кода/реализации correction.
- До owner decision нужны согласованный scope и transition proof, особенно headless legacy/multiple generations, migration applicability, pending intent across generation, publication без раннего autosave и сохранность fresh other-tab cache.
- Следующий шаг: Лира проверяет grouping/возражения, Мира сводит общий результат для owner decision. Их согласие не объявлено заранее. Correction не начат.

## Revised scope после owner decouple decision — 2026-10-20

Назначение из service head b7434ba выполнено: [scope и attachment-only предложение](https://github.com/iliya1947/vico-forum/pull/234#issuecomment-6290312937), implementation остаётся `3b30d8d7b04eadd867c1b762d68bf040605b0ab0`.

- T/S decisions независимы, persistence/CAS атомарны. Старый same-text gate helper и whole-payload choice не соответствуют новому требованию; revised A/E/F закрывают независимые решения и их recovery. Это revision требований, не новый finding задним числом.
- A–G и 10 исходных regression obligations сохранены. Добавлена матрица одинакового/различающегося T × auto/manual S, cross-combinations и stale head после частичного выбора.
- Предложил mixed rule: доказанный retained-vs-removed base-file K сохраняется, остальные additions — known-newer либо manual choice; `S_result = S_chosen ∪ K`. Не выдавать это уточнение precedence за уже утверждённый owner rule. Без base/causality не выдумывать K/newer, не union unrelated additions.
- Общая version может продвинуться только из-за текста; это не доказательство возраста offline attachment intent. Generation/status/published revision сохраняются как fences, не свободные стороны product choice.
- Новая таблица/registry/attachment-version не обоснована; code rewrite не нужен. Approval исправлений не объявлял. Код/тесты #232 и source-of-truth docs не менялись, новых runtime прогонов в этом шаге нет.
- Следующий предлагаемый gate: Лира проверяет revised scope, Мира сводит результат для owner decision, включая mixed precedence. Correction пока не начинать.

## Removal boundary review — 2026-10-20

Проверены owner decision/service head `4bdd630`, implementation `3b30d8d` и main `21386887`. [Полный source-level audit](https://github.com/iliya1947/vico-forum/pull/234#issuecomment-6291072682).

- Удаление drafts/autosave технически обосновано. Не исправлять старый T/S conflict mechanism перед удалением; не сохранять text head ради attachment fences.
- Подтверждены зависимости editor-attachments, attachment API context validation, DB attachment create/read/list/initializer/ref operations, publication finalizer и cleanup от draft store. В subtask обязательно снять их сквозным проходом, сохранив права/locking и upload/publication operation без текста/recovery.
- Существующие refs, generation retirement и publication receipts пригодны как основа минимальной technical operation; новая persistent table заранее не нужна. Post revision CAS и retained/new published-file validation сохраняются.
- F1–F6/M2/M3 не отдельный correction backlog при удалённых paths; F2 recovery requirement отменён, published asset safety остаётся. M1 oracle пересматривается под final submitted selection + validated operation refs; F7 независим и обязателен.
- Не переписывать merged migrations 0034–0044 и не тащить 0045 без необходимости. Без массовой schema-чистки/переименований ради слов draft. Старый text не импортировать в technical session.
- Новых runtime/DB/browser тестов не выполнял, implementation не менялся. Scope готов для оформления bounded subtask, где фиксируются конкретный attachment contract/cleanup cutoff; это не implementation approval и не утверждение об уже исправленных findings. Следующий шаг — Мира.
