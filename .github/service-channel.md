# Vico Forum — общий служебный канал

Этот PR — единственный актуальный служебный канал ChatGPT и Codex. Он не merge в `main`.

## Текущее состояние

- Implementation PR: #232 — Editor 2.0 follow-up corrections.
- Current head: `ae121565ccedcb7868cba01987e2cde0392b90e9`; exact code/test head `0c6c7c58afbdcd65d486e1462e6eca24dc653b70`.
- Реализация STOP. Старый план локально исправить два lifecycle defect отменён.
- По прямому решению владельца Лёва был отдельно подключён для архитектурного разбора repeated patch-chain. Это разовая архитектурная проверка; в обычный review-cycle #232 Лёва автоматически не возвращается.

## Подтверждённые current-Stage defects

1. Long-lived in-memory local draft может обойти 30-day expiry и воскреснуть через aged-terminal path.
2. First attachment upload новой generation после hidden aged terminal может получить HTTP 409 до первого ordinary text save.
3. `chooseVersion` может перечитать только свежий server version и отправить с ним ранее выбранный cached text, затерев невиденную пользователем более свежую server copy.
4. В Simple mode программный paste меняет Markdown source, но active visual leaf может остаться со старым DOM; следующий native input способен затереть вставленный текст.

## Подтверждённая проблема технического подхода

Attachment composition и text version сейчас не образуют одну однозначную версионную модель. Независимые attachment mutations потребовали последовательных компенсирующих слоёв: `draftAttachmentIds`, provenance/context evidence, version boundaries, physical retention через boundaries и отдельный boundary-release cleanup.

Это не означает, что существующие защиты надо удалить: часть закрывает реальные race/data-loss cases. Но repeated compensation уже прошёл порог AGENTS.md «остановиться и пересмотреть причину». Продолжать локальные patch fixes до согласования модели запрещено.

## Принятый технический план Лёвы

### 1. Зафиксировать исходное состояние и invariants

До изменений закрепить воспроизведения подтверждённых дефектов и правила корректности:
- пользователь выбирает конкретное содержимое относительно известной server version;
- состав вложений выбранной версии однозначен;
- файл существует, пока нужен действующей версии или незавершённому выбору;
- завершённая generation не восстанавливается поздними запросами;
- программное изменение Markdown сразу согласуется с видимым editor DOM;
- ordinary text save остаётся раз в 60 секунд;
- unchanged local draft старше 30 дней не воскресает.

### 2. Разделить local conflict и server conflict

Не представлять другую local copy как `conflict.server`. Явно различать local candidate, server snapshot и terminal head.

Выбор пользователя должен применяться только относительно той server base, которую он видел. Если server head успел измениться, конфликт открывается заново; нельзя подставлять свежий CAS version под старый выбранный payload.

### 3. Согласовать одну модель состава вложений и retention

Сначала составить карту всех writers/readers для `draftAttachmentIds`, live refs, boundaries и provenance.

Целевая модель:
- upload bytes отделён от включения файла в выбранную версию;
- composition вложений имеет явную version ownership;
- выбор победителя атомарно фиксирует text + attachment composition;
- cleanup использует тот же retention contract;
- generation transfer сохраняет выбранные файлы и блокирует поздние mutations проигравшей стороны.

Сначала проверить, можно ли выразить модель существующими таблицами/транзакциями. Новая таблица допустима только при доказанной необходимости. Если решение снова требует нового registry для восстановления предыдущего registry — STOP на проектировании.

### 4. Унифицировать terminal-head discovery

Пустой display-list черновиков не должен означать отсутствие server version. Для конкретного context клиент должен получать достаточную authoritative информацию о terminal generation/base даже после metadata cutoff.

Один и тот же base contract должен работать для text save, first upload и следующих attachment mutations. После этого заново оценить необходимость aged-terminal `expectedVersion=0` exception.

### 5. Исправить DOM ownership Simple mode

Различать:
- native input, где DOM уже изменён браузером;
- programmatic editor command: paste, Enter, Undo/Redo, formatting, restore.

При programmatic command active leaf тоже обязан синхронизироваться с Markdown source и восстановить selection. Исключение «не переписывать active DOM» относится только к native input.

### 6. Убирать компенсации только после доказанной замены

Для каждого существующего protective layer определить: какое правило он защищал, чем заменён и какой regression это доказывает. Не удалять слой только ради упрощения.

## Acceptance

Перед завершением нужны:
- component scenarios для conflict/editor behavior;
- real PostgreSQL для concurrent operations, recovery, expiry и cleanup;
- Chromium + local R2 для focus/paste/next-input и полного attachment path;
- applicable full project checks на stable exact head;
- новый независимый whole-PR review после реализации.

Поведенческие критерии:
- unseen server version не затирается;
- выбранные attachments сохраняются;
- first upload после old tombstone работает;
- paste не исчезает при следующем вводе;
- expired unchanged local draft не воскресает;
- каждый оставшийся protective layer имеет понятную необходимость.

## Границы

- Полностью переписывать Editor 2.0 оснований нет.
- Не расширять #232 до unrelated refinement, косметики или Stage 6.
- Implementation не начинать до согласования модели.
- Мишаню не подключать к промежуточному defect-discovery циклу; финальный whole-PR review только после clean result Миры и Лиры.
- Лёву повторно подключать только по прямой команде владельца.

## Следующий шаг

Этап 1: зафиксировать current model/invariants и карту conflict + attachment state transitions без изменения implementation. После результата — STOP перед переходом к проектированию целевой модели.
