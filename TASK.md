# TASK.md — задача и критерий завершения новой архитектуры UI progress preview.

## Цель

Определить **концептуальный план** дальнейшего устройства UI progress preview Vico Forum до технического проектирования и реализации.

Повод: текущий implementation PR #322 вырос в крупную отдельную preview-реализацию форума. Возникла альтернативная концепция: использовать непосредственно production routes/components/loaders/actions из актуального `main`, а для preview подменять только данные и внешнюю инфраструктуру через тестовые/fake capabilities и детерминированные fixtures.

Задача этого служебного PR — сначала установить, **какой должна быть целевая модель preview и почему**, а не сразу проектировать конкретные классы, файлы и этапы реализации.

## Исходное состояние

- Current main при создании workspace: `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.
- #322 head, на котором непосредственно перед созданием workspace выполнялся review: `e23c0e0ade79e786e29b4057af1dfd292814e34e`.
- #322 сейчас содержит большую собственную логику preview и representative state.
- В `main` уже существуют dependency-injection seams через React Router contexts для ряда production capabilities, включая forum reader/writer, auth, authorization, complaint submission и Owner profile/lifecycle.
- Это делает вариант production UI/routes + substituted infrastructure технически правдоподобным, но **его жизнеспособность и границы ещё не установлены полностью**.

## Первый этап — концептуальный план

Нужно определить:

1. Какую задачу должен решать UI progress preview и что **не** входит в его назначение.
2. Что в целевой модели должно быть настоящим production-кодом из `main`:
   - router/routes;
   - loaders/actions;
   - views/components;
   - permission/auth presentation logic;
   - другие product contracts.
3. Что допустимо и необходимо подменять:
   - persistence/data;
   - auth session;
   - authorization;
   - external services;
   - R2/attachments;
   - email/OAuth/provider calls;
   - время/идентификаторы и иные nondeterministic dependencies.
4. Как должна выглядеть тестовая предметная база preview:
   - пользователи и роли;
   - категории/разделы/темы/сообщения;
   - settings;
   - moderation/complaints;
   - notifications;
   - watch/bookmark/mute/block;
   - admin/Owner/Super-admin representative states;
   - empty/error/permission states.
5. Как должны работать выбор роли, locale, viewport и representative state без подмены фактической ownership/permission модели.
6. Какие ограничения static GitHub Pages существенно влияют на концепцию.
7. Следует ли preview использовать:
   - in-memory repository/capability adapters;
   - browser-side database/WASM;
   - иной подход;
   и почему.
8. Как должна выглядеть миграция с нынешнего #322 на целевую модель на концептуальном уровне:
   - что переиспользуется;
   - что удаляется;
   - что временно сосуществует;
   - как избежать второй реализации продукта.
9. Какие критерии означают, что новая концепция действительно лучше текущей:
   - parity с `main`;
   - стоимость сопровождения;
   - отсутствие дублирования product logic;
   - deterministic preview;
   - возможность browser acceptance;
   - простота добавления новых capabilities.
10. Какие существенные альтернативы были рассмотрены и почему выбранный вариант предпочтителен.

## Границы первого этапа

- Не писать технический implementation plan.
- Не определять bounded implementation PRs.
- Не менять #322.
- Не писать production/preview код.
- Не делать cleanup старой preview-реализации.
- Не принимать гипотезу `production routes + fake infrastructure` как готовое решение без проверки её концептуальных ограничений.

## Критерий завершения первого этапа

Первый этап завершён, когда существует один цельный концептуальный документ, который:

- определяет назначение и границы UI progress preview;
- описывает выбранную целевую архитектурную модель на уровне компонентов системы;
- объясняет разделение production logic и preview-only infrastructure;
- описывает модель test data/state;
- учитывает static Pages и browser constraints;
- сравнивает существенные альтернативы;
- задаёт концептуальную миграцию с #322;
- содержит критерии готовности;
- явно перечисляет оставшиеся вопросы, которые уже должен решить технический план.

После этого — **STOP и решение разработчика**. Только после принятия концепции Лёва или другой назначенный архитектор готовит полный технический `PLAN.md`.


## Обсуждённая целевая гипотеза

Эта гипотеза должна быть проверена концептуально, но она является исходным вариантом, ради которого создана задача:

1. **Production product logic должна по возможности оставаться настоящей.**
   Preview должен переиспользовать актуальные router/routes/components/loaders/actions и permission/auth presentation logic из `main`, а не иметь вторые версии этих механизмов.

2. **Подменяется инфраструктура, а не продукт.**
   Вместо Neon/PostgreSQL, Better Auth, R2 и других внешних runtime-зависимостей preview получает тестовые реализации тех же capability/interfaces через существующие context seams или другие минимально необходимые boundaries.

3. **Representative test state хранится в репозитории.**
   Пользователи, роли, темы, сообщения, жалобы, notifications, personal state и другие необходимые состояния задаются детерминированными fixtures/test state.

4. **Предпочтительный базовый кандидат — in-memory store/adapters, а не SQL-БД в браузере.**
   PGlite/SQLite/WASM или иная browser-side database рассматривается только если concept research установит, что in-memory capability implementations недостаточно для требуемой parity. UI progress preview не должен дублировать database-integration testing, которое проверяется отдельными PostgreSQL/acceptance наборами.

5. **Одна composition boundary.**
   Концептуально preview должен иметь небольшой composition root (условно `ui-preview/runtime.ts`), который:
   - создаёт test state;
   - создаёт fake/in-memory capabilities;
   - подключает их к production contexts/runtime;
   - запускает настоящий product router/UI.
   Конкретное имя файла и технический способ реализации относятся уже к будущему техническому плану.

6. **Выбор роли не должен переписывать предметные данные.**
   User / Manager / Owner должны означать смену текущей auth/authorization identity, а не изменение владельца темы или автора сообщения в fixture.

7. **Новая capability в `main` не должна требовать второй реализации product behavior в preview.**
   В нормальном случае preview должен получить новый production route/UI/action автоматически; отдельная работа требуется только для representative data или новой infrastructure dependency.
