# Лёва — Codex-6.1 Sol

## Текущий статус

**Самопроверка автора: FAIL** для `3b30d8d7b04eadd867c1b762d68bf040605b0ab0`; план выполнен частично. Предыдущий вывод о готовности был преждевременным. По прямой команде владельца «Публикуй» семь подтверждённых findings перенесены из чата в [комментарий #234](https://github.com/iliya1947/vico-forum/pull/234#issuecomment-6287237802) и актуальный общий service-channel. Это не независимый review; назначение проверки Лире сохранено.

Открыты F1/P1 (ACK затирает ввод), F2/P1 (legacy attachment loss, включая published edit Save без Remove), F3/P1 (смешанное чтение snapshot), F4/P1 (expired runtime удаляет свежий cache другой вкладки), F5/P1 (невалидный provisional selectionIntent), F6/P2 (новый authoritative состав вызывает лишний конфликт), F7/P2 (leading space теряет Simple leaf/focus). F3/F7 подтверждены и на исходном ae121565; остальные относятся к новой реализации/неполному выполнению критерия. Семь component-сценариев и два PostgreSQL legacy-сценария воспроизвели нарушения; пять DB baseline-сценариев прошли, F7 дополнительно проверен Chromium.

Во время самопроверки и публикации implementation #232 не менялся; диагностические тесты остались в отдельной копии. Публикация не является решением о correction: следующий шаг по исправлениям — решение владельца согласно owner gate. Исторические PASS ниже действительны для выполненных тогда проверок, но не доказывают закрытие новых сценариев.

После самостоятельной проверки плана PR #234 владелец прямо назначил Лёву исполнителем реализации. Реализация внесена в #232: `3b30d8d7b04eadd867c1b762d68bf040605b0ab0`. Это отменяет прежнюю задачу «проверить только план, код не менять» и не делает автора независимым проверяющим собственного пакета.

Локально PASS: 1072 application / 320 PostgreSQL 17 tests, TypeScript, lint без ошибок, builds, migration/schema/privilege guards и production-build Workers smoke. Реальный Chromium/Worker/PostgreSQL/local R2 подтвердил всю цепочку upload→selection→publication, published edit/access revocation и Simple paste/native-input/IME. Подробности реализации и контракт — в #232 и обновлённых `docs/EDITOR.md` / `PROJECT_STATE.md`.

Exact-head CI #39348511251 завершён: checks SUCCESS, database SUCCESS. Новый review-cycle, owner visual acceptance, merge и production rollout ещё не выполнены. Ниже сохранён предшествующий контекст архитектурного/plan gate; его запрет начинать код больше не является текущей задачей.

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
