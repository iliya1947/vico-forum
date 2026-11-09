# План реализации админ-панели

> Общий план и координационный документ проекта админ-панели Vico Forum. По прямому указанию разработчика PR #251 является главным каналом планирования и координации этой задачи; не дублировать отчёты или статус админ-панели в PR #236 без явного запроса разработчика. Реализация выполняется через отдельные ограниченные implementation PR, последовательно merge в `main`; этот план остаётся проектной записью верхнего уровня.

## 1. Утверждённая продуктовая модель

Глобальная **Админ-панель** — отдельная защищённая служебная область для управления самим форумом.

Она отделена от:

1. **Требуют внимания** — отдельной очереди уведомлений/действий для модераторов и администраторов.
2. **Контекстного администрирования** — быстрых административных действий с категорией, разделом, темой, сообщением или пользователем рядом с самим объектом.
3. **Будущего интерфейса супер-админа** — возможностей только для владельца, которые проектируются отдельно ближе к завершению проекта.

Админ-панель использует существующую динамическую модель разрешений. Видимость и доступные действия зависят от эффективных code-backed permissions пользователя, а не от жёстко заданного имени роли.

Утверждённая структура верхнего уровня:

1. **Обзор**
2. **Форум**
3. **Пользователи**
4. **Роли и разрешения**
5. **История**
6. **Настройки**

Утверждённые, но ещё не реализованные разделы могут оставаться видимыми во время owner-only pre-release и вести на общую локализованную страницу **В разработке**.

## 2. Утверждённая модель взаимодействия

### 2.1 Обзор

Обзор — полноценная стартовая страница админ-панели, содержащая:

1. навигацию к разделам, доступным текущему администратору;
2. краткую реальную статистику форума;
3. последние значимые административные действия.

«Требуют внимания» не встраивается в Обзор.

### 2.2 Форум

Раздел «Форум» следует единой иерархии:

**категория → раздел → тема → сообщения**

Отдельные административные страницы объектов нужны для:

1. пользователей;
2. категорий;
3. разделов;
4. тем.

Сообщения не получают отдельную административную страницу. Они администрируются в контексте темы и через быстрые действия.

### 2.3 Пользователи

Раздел «Пользователи» использует:

1. список пользователей с поиском;
2. быстрые действия в списке;
3. отдельную административную страницу пользователя для полной работы.

Доступная информация и действия зависят от эффективных разрешений текущего администратора.

### 2.4 Быстрые действия

Использовать одну общую концепцию **Быстрых действий**.

Она должна применяться там, где это уместно:

1. внутри списков/страниц админ-панели;
2. на странице раздела форума;
3. на странице темы;
4. рядом с каждым сообщением;
5. для пользователей, где применимо.

Набор действий определяется:

1. типом объекта;
2. текущим авторитетным состоянием объекта;
3. эффективными разрешениями текущего пользователя.

Быстрые действия должны вызывать те же авторитетные backend-операции, что и полные административные страницы; не создавать параллельную admin-only семантику мутаций.

### 2.5 Роли и разрешения

Переиспользовать существующую основу авторизации и защищённый UI управления авторизацией.

Не создавать вторую систему ролей/разрешений.

Существующие динамические роли, code-backed permissions, персональные overrides `allow/deny/inherit`, актуальность со следующего запроса и серверный `PermissionResolver` остаются авторитетными. Упомянутая в исходном AP-плане защита от last-manager lockout теперь superseded решением владельца из раздела ниже.

### 2.6 Блокировка пользователей

Обычная админ-панель включает временную и постоянную блокировку пользователей.

Временная блокировка поддерживает:

1. типовые предустановленные сроки;
2. произвольную длительность или дату окончания;
3. автоматическое прекращение действия после заданного времени.

Администратор может снять блокировку, созданную другим администратором, если у него есть соответствующее разрешение.

Удаление аккаунта **не** входит в обычную админ-панель. Оно зарезервировано для будущего owner-only интерфейса супер-админа.

Точный продуктовый эффект заблокированного аккаунта должен быть определён до реализации пакета блокировок.

### 2.7 Причины административных действий

Обязательность причины определяется отдельно для каждого административного действия. Не вводить одно глобальное правило.

### 2.8 Административная история

Обычная админ-панель записывает **значимые административные действия**.

Более глубокая и полная owner-only аудит-поверхность относится к будущему интерфейсу супер-админа и не входит в scope этой реализации.

## 3. Последовательность реализации

### Пакет 1 — контракт админ-панели

1. Добавить source-of-truth документ для обычной админ-панели.
2. Зафиксировать утверждённые выше структуру и границы.
3. Определить общий контракт быстрых действий.
4. Определить границу между обычной админ-панелью и будущим интерфейсом супер-админа.
5. Определять новые code-backed permissions только вместе с реально реализуемыми возможностями; не создавать спекулятивные разрешения заранее.

### Пакет 2 — глобальная оболочка админ-панели

1. Добавить locale-aware защищённый маршрут `/:locale/admin`.
2. Добавить общую навигацию и layout админ-панели.
3. Показывать вход в админ-панель аутентифицированному пользователю, у которого есть хотя бы одна применимая административная возможность.
4. Каждый раздел админ-панели независимо повторно проверяет собственную серверную границу разрешений.
5. Реализовать основу Обзора с реальной статистикой форума и доступными направлениями.
6. Не выдумывать недавнюю административную активность до появления Пакета 3; Пакет 3 завершает Обзор, добавляя блок последних значимых действий из реального хранилища истории.
7. Утверждённые, но ещё не реализованные направления должны правдиво вести через существующий механизм «В разработке».
8. Не переносить и не дублировать «Требуют внимания» в админ-панель.

### Пакет 3 — история значимых административных действий

Реализовать обычную административную историю до добавления большого числа новых мутаций, чтобы новые действия могли использовать её единообразно.

Хранить достаточно информации, чтобы ответить:

1. кто выполнил действие;
2. какое значимое действие произошло;
3. какой объект был затронут;
4. когда это произошло;
5. причину, если она требуется для этого действия;
6. минимально полезный контекст изменения.

Где это практично, запись значимого действия и применение самого действия должны находиться в одной транзакционной границе.

Чтение истории должно иметь собственное code-backed permission.

После появления реального хранилища/пути чтения истории завершить Обзор показом последних значимых административных действий пользователям, которым разрешено их читать.

Этот пакет не является будущей полной системой аудита супер-админа.

### Пакет 4 — интеграция ролей и разрешений

1. Интегрировать существующую поверхность управления авторизацией в глобальную оболочку админ-панели как **Роли и разрешения**.
2. Исторически пакет сохранял тогдашний backend авторизации и lockout-инварианты; last-manager invariant теперь отдельно superseded решением владельца и удаляется в owner/authorization redesign Stage 1.
3. Не дублировать назначение ролей, grants, overrides или вычисление эффективных разрешений.
4. Административная страница пользователя может показывать элементы управления авторизацией только если у текущего пользователя есть `access.authorization.manage`.

### Пакет 5 — раздел «Форум»

Постепенно построить глобальную область администрирования форума поверх существующей иерархии.

Ограниченные срезы:

1. административный просмотр/поиск объектов форума;
2. административные страницы категорий;
3. административные страницы разделов;
4. административные страницы тем;
5. администрирование сообщений в контексте темы и через быстрые действия;
6. реальные административные мутации, каждая со своим серверным контрактом, permission, проверкой состояния и тестами.

Утверждённые возможности форума включают закрытие темы для новых ответов. Другие действия с категориями/разделами/темами/сообщениями контролируются разрешениями и должны реализовываться только когда их конкретное поведение определено для текущего пакета.

### Пакет 6 — общие быстрые действия

1. Ввести общую границу presentation/dispatch для быстрых действий, не создавая второй доменный слой.
2. Постепенно перенести существующее контекстное администрирование темы в эту общую модель взаимодействия.
3. Переиспользовать существующие авторитетные операции, такие как закрепление, модерация решений, обработка дублей и исправление source locale.
4. Добавлять новые операции только через их обычные доменные/серверные границы.
5. Фильтровать представление по состоянию объекта и эффективным разрешениям, сохраняя независимую серверную авторизацию для каждой мутации.

### Пакет 7 — пользователи и блокировки

1. Реализовать список/поиск пользователей.
2. Реализовать быстрые действия в списке.
3. Реализовать отдельную административную страницу пользователя.
4. Показывать только информацию/действия, разрешённые эффективными permissions текущего пользователя.
5. Добавить временную и постоянную блокировку с code-backed permissions.
6. Поддержать предустановленные и произвольные сроки временной блокировки.
7. Временная блокировка должна автоматически становиться неактивной по авторитетному сравнению времени; отдельная задача разблокировки только ради истечения срока не требуется.
8. Позволить снимать блокировку другого администратора, если разрешение это допускает.
9. Определить требования к причине отдельно для каждого действия.
10. Исключить удаление аккаунта и другие owner-only возможности супер-админа.

До реализации блокировки явно определить, что именно блокировка запрещает в Vico Forum.

### Пакет 8 — интеграция и завершение

1. Проверить границы разрешений прямых маршрутов и мутаций.
2. Проверить grants ролей и персональные overrides для всех новых возможностей.
3. Проверить запрещённый прямой доступ по URL и fail-closed поведение авторизации.
4. Проверить временные/постоянные блокировки и снятие блокировки.
5. Проверить историю значимых действий и правила обязательности причин.
6. Проверить быстрые действия во всех поддерживаемых контекстах объектов.
7. Покрыть локализацию, RTL/LTR и responsive-поведение применимыми автоматизированными проверками.
8. Документацию, относящуюся к реализации пакета, включая `PROJECT_STATE.md` и профильные source-of-truth документы, обновлять отдельным documentation PR в конце задачи; в implementation PR её не добавлять.
9. Запустить полный CI репозитория и обязательный whole-PR review cycle на стабильном implementation head.
10. Не инициировать owner visual acceptance без явного запроса владельца.
11. Сохранять этот общий план в PR #251 как проектную запись реализации; отдельная implementation-работа завершается и merge через отдельные ограниченные PR.

## Owner decision — Settings deferred after AP-11

1. Текущий AP-11 закрывает integration/factual closeout фактически delivered ordinary-admin scope AP-01–AP-10.
2. Settings **не входит** в текущую ordinary-admin completion и остаётся отдельной будущей фазой.
3. После AP-11 сначала выполняется отдельно запланированная переработка owner/authorization model.
4. Только после неё проектируется и реализуется отдельный Settings package, чтобы его permissions и owner-only/ordinary-admin boundaries опирались на целевую administrative hierarchy.
5. AP-11 не должен придумывать Settings operations, settings storage/API или считать placeholder дефектом текущего closeout. Placeholder остаётся правдивым обозначением будущей функции.

## После завершения админ-панели — переработка owner/authorization model

Это отдельная последующая задача и **не входит в AP-10/AP-11**. До завершения ordinary-admin работы текущую authorization implementation не переделывать.

Owner decision:

1. Текущая защита `AuthorizationLockoutError("mutation would remove the last access manager")` и связанный invariant «после появления первого access manager нельзя оставить систему без хотя бы одного пользователя с effective `access.authorization.manage`» признаны **ошибочным архитектурным решением для целевой модели Vico Forum**.
2. Ошибка находится не в том, что реализация PR #60 нарушила тогдашний контракт: она корректно реализовала контракт PR #59. Ошибочным был сам исходный контракт, который сделал восстановление управления зависимым от подсчёта обычных permission-bearing пользователей.
3. В целевой модели владелец проекта — верхняя административная authority, не может быть заблокирован/понижен subordinate authority и должен иметь полный набор управления форумом, включая роли и разрешения.
4. Поэтому сохранение управляемости должно опираться на явную owner authority, а не на искусственный invariant «в системе всегда должен оставаться хотя бы один ordinary access manager».
5. Текущая модель создаёт лишнюю связанность: role/grant/override mutations вынуждены считать managers и сериализовать изменения ради защиты от состояния, которое корректная owner model должна исключать на уровне самой иерархии.
6. После завершения админ-панели нужно отдельно перепроектировать owner-role / administrative hierarchy и затем пересмотреть:
   - необходимость `AuthorizationLockoutError`;
   - `authz_mutation_lock.managers_ever_existed`;
   - `countManagers()` и связанные проверки/тесты;
   - соответствующие требования в `docs/auth/AUTHORIZATION.md`;
   - любые места, где «последний access manager» используется как recovery-модель.
7. Решение владельца от 2026-11-07: форум ещё не запущен, поэтому первый этап redesign — удалить ошибочный last-manager invariant до реализации новой owner authority. Удаляются `AuthorizationLockoutError`, `managers_ever_existed`, `countManagers()` и связанные проверки/тесты. Сам `authz_mutation_lock` пока сохраняется как технический mutex, потому что AP-10 использует его для согласованности authorization/measure authority; его дальнейшее удаление или замена решается отдельно техническим планом.

## 4. Явно вне scope

1. Редизайн «Требуют внимания» или перенос его в админ-панель.
2. Реализация системы жалоб только потому, что существует админ-панель.
3. Вторая система авторизации/RBAC.
4. Инфраструктурные операции вроде управления Cloudflare/Neon/deployment/secrets.
5. Удаление аккаунта в обычной админ-панели.
6. Будущий owner-only интерфейс супер-админа и его более глубокая аудит-поверхность.
7. Пустые спекулятивные backend-системы только ради заполнения будущей навигации админ-панели.
8. Внешний rollout Stage 6 без отдельного разрешения.

## 5. Продуктовая модель блокировки перед Пакетом 7

Владелец отказался от фиксированных типов блокировки с заранее заданным единым набором запретов.

Каждая конкретная временная или постоянная блокировка настраивается администратором как набор ограничений:
1. ограничения сгруппированы в логические блоки;
2. администратор может выбрать весь логический блок одной галочкой;
3. внутри блока можно независимо включать/выключать отдельные ограничения;
4. срок блокировки и набор ограничений являются независимыми параметрами;
5. снятие/истечение блокировки снимает именно ограничения этой block-записи и не изменяет роли, grants или permission overrides.

Фиксированные presets допустимы только как UI-ярлыки для предварительного выбора галочек, если позже понадобятся; они не должны заменять редактируемый набор ограничений и не являются отдельными типами block policy.

Апелляция на блокировку не является жалобой и не является настраиваемым restriction. Она не может быть отключена выбранным набором ограничений. Жалоба/Complaint — отдельный входящий report о возможном нарушении; block appeal — действие уже наказанного пользователя против конкретной вынесенной ему administrative measure. Каждая measure должна показывать понятный stated reason/violation context, чтобы пользователь видел, за что она назначена, но block appeal не становится Complaint и не переиспользует Complaint Appeal semantics. Вход в block-appeal flow находится на собственной странице аккаунта рядом с соответствующей карточкой меры. Appeal target — exact administrative measure, а не отдельная версия её состояния. Для одной конкретной меры пользователь может подать до **3 апелляций**. Если мера истекла или была явно снята, pending appeal закрывается как утратившая предмет. Изменение restrictions, срока или причины не закрывает pending appeal: она продолжает относиться к той же мере, а история изменений сохраняет, как мера менялась во время рассмотрения.

Существующий Complaints Appeal workflow остаётся отдельным domain: он относится к Complaint Decision/effective outcome. AP-10 block appeal относится к отдельной administrative measure. Ни один из этих workflows не должен автоматически заменять или мутировать другой.

Причина конкретной administrative measure должна быть видна самому наказанному пользователю на его собственной защищённой surface этой меры. Причина меры **не является публичной информацией**: она не показывается другим обычным пользователям и не становится частью публичного профиля/публичного форума только из-за существования санкции.

Ограничения на обычных пользователей и ограничения на пользователей с модераторской/административной властью имеют разные authority levels. Обычный block-management authority не даёт права накладывать block/restrictions на privileged administrative targets. Повышенная authority ниже Owner выражается **обычным permission `admin.users.blocks.managePrivileged` внутри существующего конструктора ролей и per-user overrides**, а не отдельной built-in ролью «старший/главный администратор» и не второй системой иерархии. Владелец проекта является верхней authority и не является допустимым target для subordinate administrative block-authority.

AP-10 не получает отдельное product requirement на несколько одновременно действующих мер и не должен заранее проектировать aggregation/conflict-resolution. Техническое планирование выбирает минимальную модель, достаточную для утверждённого поведения; owner-вопрос возникает только если без выбора пользовательски наблюдаемой multi-measure semantics реализацию действительно нельзя определить.

Минимальный каталог ограничений AP-10:
1. создание тем и Help-вопросов;
2. отправка ответов;
3. загрузка новых вложений;
4. редактирование собственных опубликованных сообщений;
5. изменение публичного профиля;
6. отправка Complaints;
7. отправка Help signals;
8. генерация переводов;
9. для privileged target — применимые служебные полномочия Forum/Help moderation, Complaints moderation, Security review и Users/access administration.

Не ограничиваются через AP-10: публичное чтение, login/session, notifications, собственная read-only block-status surface и любые appeal submission flows. Own solved/best-answer и source-locale correction не выделяются как отдельные санкционные restrictions без реальной moderation-задачи.

Reason policy:
1. создание temporary/permanent меры требует причины;
2. ручное изменение restrictions или срока требует отдельной причины изменения и не переписывает исходную причину;
3. explicit lift требует причины;
4. automatic expiry не создаёт новую причину или синтетическое административное решение;
5. denied/stale/failed/no-op/replay не создают reason/history event.

Иерархия, self-target, лимит до 3 апелляций на меру и lifecycle pending appeal закрыты. Новых owner product gates перед техническим планированием AP-10 сейчас нет.


## 6. Owner authority redesign

Owner — отдельная server-controlled authority поверх существующей dynamic RBAC, **не роль из конструктора**. Все остальные административные шаблоны (`admin`, `moderator`, любые custom roles) и индивидуальные исключения продолжают задаваться существующими role permissions + per-user `allow/deny/inherit`. Отдельной встроенной роли «старший/главный администратор» и второго hierarchy/RBAC слоя не вводится.

Уже зафиксировано:
1. Owner identity задаётся server-side и не определяется названием роли, email, client input или permission snapshot.
2. Owner — верхняя административная authority; subordinate administrative measures не могут target Owner.
3. Owner должен иметь полный доступ ко всем существующим code-backed permissions форума независимо от собственной обычной роли/override. При добавлении новой реализованной permission в централизованный catalog она также автоматически входит в Owner authority; Owner не получает только неизвестные/несуществующие capability вне catalog.
4. Owner authority охватывает **весь централизованный code-backed permission catalog**, включая participation permissions; обычная роль/grants/overrides Owner остаются хранимой конфигурацией, но не уменьшают его effective permissions.
5. Все обычные и повышенные полномочия ниже Owner выражаются существующими permissions и назначаются через тот же конструктор ролей/per-user overrides. В частности AP-10 elevated authority уже выражена `admin.users.blocks.managePrivileged`.
6. Не вводить новую системную роль «Senior/Head Admin» и не кодировать власть по role name.
7. Инфраструктура, deployments, secrets и изменение самой server-controlled owner binding остаются вне forum RBAC.
8. Settings проектируется только после завершения этой owner authority модели.

Решение владельца: специальная граница сохраняется. **Только bound Owner** может выдавать/отзывать `admin.users.blocks.managePrivileged`, включая изменения через role grants, назначение роли с этим permission и per-user override. Обычный `access.authorization.manage` не даёт права выдавать себе или другим эту capability.


## AP-10 owner decisions — multiple measures and appeal handling

1. Если пользователь наказывается за два разных нарушения, это **две разные administrative measures** с отдельными identity/reason/restrictions/lifecycle.
2. Для одной меры допускается до 3 апелляций, но одновременно рассматривается только **одна pending appeal**; следующие подаются последовательно после завершения предыдущей.
3. Удовлетворение appeal не обязано означать полное снятие меры. Результатом может быть полное снятие либо смягчение/изменение restrictions или срока той же меры.
4. Изменение меры по результату appeal не создаёт новую measure identity; история должна сохранять исходную меру и последующее изменение.


## AP-10 owner decision — administrator identity visibility

1. Пользователь не видит identity конкретного администратора/модератора, который создал, изменил или снял меру либо рассмотрел appeal.
2. Own measure/appeal surface показывает только пользовательски значимую информацию: status, reason, restrictions, сроки, изменения меры и результат appeal.
3. Actor/reviewer IDs, display names и иная техническая/служебная информация об администраторах не сериализуются в user-facing projection.
4. Эта информация сохраняется для внутренней административной истории и доступна только владельцу и администраторам с соответствующим разрешением.


## AP-10 owner decision — block-management default grants

1. Capability управления административными мерами по умолчанию **не получает никто**, включая built-in moderator и built-in admin.
2. Право назначать/изменять/снимать меры и рассматривать block appeals выдаётся только явным grant через существующую dynamic authorization model.
3. Initial role grants не должны автоматически включать AP-10 block-management capability.
4. Elevated capability для privileged targets также не имеет initial grants.
5. Истёкшая или явно снятая мера terminal: её нельзя реактивировать продлением/изменением срока; повторное наказание оформляется новой measure.


## Owner decision — single Owner bootstrap

1. Владелец Vico Forum один — разработчик.
2. Передача владения, второй владелец и наследование владения не входят в текущий план.
3. Владелец входит через свой Google-аккаунт.
4. После входа внутренний аккаунт форума разработчика фиксируется сервером как аккаунт владельца.
5. Почта, имя и обычная роль сами по себе не дают права владельца.
6. Отдельный «первый администратор» или «первый менеджер» не нужен.
7. Дополнительная функция форума для этой привязки не требуется; реальная Google-настройка и привязка владельца выполняются и проверяются позже в Stage 6.
8. После отдельного финального documentation closeout owner/authorization redesign считается завершённым, и можно переходить к Settings.


## Settings — product architecture

Owner rejected the single-page Settings concept.

Minimum surface model:
1. **Owner/system settings** — forum-wide configuration and role settings; Owner-only.
2. **Administrator personal settings** — per-admin convenience/workspace preferences only.
3. **User personal settings** — per-user convenience/forum-experience preferences only.
4. **Account & security** is a separate candidate surface and should not be merged into generic convenience settings.
5. Domain-specific settings should normally remain inside the owning subsystem (for example Complaint priority settings).

Current authorization contract conflict to resolve before technical planning:
- role definitions/grants are currently manageable by `access.authorization.manage`;
- owner now requires role settings to be Owner-only;
- still undecided whether role assignment/per-user overrides are also Owner-only or remain delegatable operational administration.

No implementation starts until the surface map and this boundary are fixed.


## Settings surface map

Settings is a family of distinct surfaces:

1. **Owner / system settings** — exact bound Owner only. Whole-forum policy and role configuration.
2. **Administrator workspace preferences** — personal convenience for actors with administrative/moderation workspace access; no global effects.
3. **User experience preferences** — personal forum UI/reading/editor preferences.
4. **Account & security** — personal identity/authentication/security controls.
5. **Subsystem operational settings** — remain inside the owning subsystem by default and use that subsystem's authority.

Not Settings: infrastructure/deployments/secrets/provider credentials/DB/Cloudflare, Owner binding, object administration, public profile content.

Existing preference behavior to preserve when designing the user surface:
- theme is browser-local;
- Editor Simple/Advanced, spellcheck, code-wrap and code-line-number preferences are local per account/device and intentionally not cross-device synchronized;
- Google account linking is an account/security operation, currently surfaced on own profile;
- Complaint priority settings are a subsystem-local example.

Role boundary pending owner decision:
- role definitions + permission sets are Owner-only settings;
- still undecided whether assigning existing roles and per-user overrides remains delegatable user administration or also becomes Owner-only.


## Owner/system Settings — concrete map

Owner-only system Settings is divided into:
1. **Registration** — first-release candidate: open/closed. Optional later split of new-account methods (Google and email/password) without exposing provider secrets.
2. **Role configuration** — create/rename/delete custom roles and change permission sets of all roles. Exact bound Owner only. Assignment of an existing role/per-user overrides remains a separate unresolved boundary.
3. **Participation/anti-spam** — current 5-second global forum write cooldown is a valid later Owner-setting candidate; domain/security rate limits remain outside by default.
4. **Attachments** — current 50 MB per-file maximum is a valid later Owner-setting candidate; executable/type/signature/antivirus security rules remain code/security policy.
5. **Languages** — future Owner control of publication active/inactive state for already valid/prepared locales; bootstrap English remains mandatory, and locale creation/translation/provider rollout is not reduced to a simple setting.
6. **Emergency mode** — read-only/maintenance is a reasonable later Owner-only control, not currently implemented or required.

Explicitly outside Owner/system Settings: branding just for configurability, Forum object administration, public page content, subsystem-local settings, personal preferences, account security, infrastructure/secrets/provider credentials/Owner binding, implementation constants.

Recommended first bounded Owner/system implementation remains intentionally small:
- Owner-only role configuration;
- registration open/closed.

No implementation starts until owner approves product contents and resolves the role-assignment/per-user-override boundary.


## Administrator workspace preferences — concrete map

Audience: actors with actual administrative/moderation workspace capabilities, not a literal role-name check.

Personal-only groups:
1. **Entry/navigation** — default or last administrative destination, with permission-aware fallback; optional favorites later.
2. **Needs attention** — default/last accessible mode and group.
3. **Presentation** — comfortable/compact density; default expanded/collapsed state for secondary technical detail.
4. **Paging/sorting later** — only where a domain exposes safe alternatives; do not override domain queue priority semantics.
5. **Future workflow conveniences** — bounded auto-refresh and admin work notifications only after those mechanisms exist.

Recommended first persistence: browser-local per authenticated account/device, no DB/schema and no sensitive search/target identifiers.

Recommended first bounded package:
- default/last admin destination;
- default/last Attention mode/group;
- density;
- secondary-detail expansion preference.

Not personal admin settings: authority, roles, sanctions, Complaint priority policy, global forum policy, queue-order policy, mandatory safety checks/audit semantics, infrastructure.

No implementation starts until owner approves product contents.


## User experience preferences — concrete map

1. **Appearance**
   - System / Light / Dark.
   - Current manual theme is browser/device-local and not account-keyed; absence of override follows OS/browser theme.
   - Do not silently convert it to server/account synchronization.

2. **Language & regional**
   - Preferred UI locale is a strong account-level setting using the existing validated `user.locale` boundary.
   - Current language switcher changes URL; no user-facing `user.locale` save flow was found.
   - Time zone is a valid later regional preference; current formatting baseline is UTC.

3. **Editor**
   - Simple/Advanced;
   - spellcheck;
   - code wrap;
   - code line numbers.
   - Preserve existing browser-local, per-account, per-device contract. Optional local reset is allowed.
   - Draft/autosave settings remain out of scope.

4. **Notifications**
   - Current kinds: reply, mention, Complaint decision result, Complaint appeal result.
   - Reasonable configurable kinds: reply + mention.
   - Coordinator recommendation: direct Complaint outcome notifications remain mandatory.
   - No email/push/channel controls until those channels exist.

5. **Reading/translation presentation**
   - current behavior prefers an available translation and allows revealing original;
   - later candidates: prefer translation/original and original-expanded presentation;
   - never use a display preference to authorize/generate translations or spend quota.

Not user-experience Settings: Watch/Subscribe, bookmarks, mute/block, title editing, profile fields, account security, admin workspace, global policy.

Persistence is intentionally heterogeneous: browser-local theme; device-local per-account Editor; server/account locale; notification preferences server-side if approved.

Recommended first slice: theme + preferred language + existing Editor preferences; optional reply/mention notification settings as a larger first-release addition.

### Privacy candidate

Public recent online-presence currently exposes signed-in members. A future “show my online status” preference affects visibility to others and therefore belongs to a separate **Privacy** surface, not convenience or account-security Settings.


## Account & security Settings

First useful package:
1. show linked sign-in methods;
2. existing explicit Google connect control belongs here;
3. change password for accounts that already have password credentials;
4. list active sessions/devices;
5. revoke one other session or all other sessions.

Current Vico has email/password + Google foundation and explicit Google linking, but no account-list/unlink/change-password/session-management UI. Session storage already contains expiry/IP/user-agent/user ownership.

Defer: unlinking, email change, password reset/set-password for OAuth-only accounts, account deletion, passkeys and 2FA until their product/security/email boundaries are defined. Public Profile fields remain Profile, not Account settings.

## Privacy Settings

First concrete privacy control:
- **Show my online status**, default on.

Current public online-presence surface exposes recent signed-in member count plus member identities/profile links for users active within five minutes. Privacy-off should exclude the user from both public member list and public count. Exact persistence/cleanup is a later technical-plan detail.

Do not add a generic private-account/hide-posts model: Vico remains a public forum.

Future mute/block/visibility controls may join Privacy only after those features exist. Account deletion/data-export do not justify a separate Data page yet.

## Complete Settings top-level architecture

1. Forum & roles — Owner only.
2. Administrator preferences.
3. User preferences.
4. Account & security.
5. Privacy.

Subsystem operational settings stay subsystem-local. No sixth top-level surface is currently justified; Notifications, Accessibility and reading/translation remain sections under User preferences unless they later grow into independent domains.

No implementation starts until the owner approves the full map and resolves the remaining product decisions.


## Settings consolidated scope status

The detailed Settings sections above are a **product proposal pending owner approval**, not implementation authorization.

Before technical planning, the owner must resolve:
- S1 authorization-management split;
- S2 notification toggles now/later;
- S3 online-presence default;
- S4 global vs per-method registration control.

After those decisions, Mira freezes the first-release product scope and only then hands bounded technical planning to Lev.


## Settings owner decisions — fixed

- **S1:** current release authorization management is Owner-only across role definitions/grants, role assignments and per-user overrides. Future deputy delegation is a required future extension; do not implement deputies now and do not make current design inherently non-delegatable.
- **S3:** online status default ON / opt-out.
- **S4:** independent new-registration controls for Google and email/password.

**S2 remains pending:** reply/mention notification preferences now vs later.

Reason for coordinator's S2.1 recommendation: correct notification preferences require authoritative server-side policy affecting notification creation/unread badge semantics; a UI-only hide toggle is insufficient. Deferral keeps the first Settings slice bounded, but S2.2 remains valid if owner prioritizes it.


## Settings product scope — frozen for technical planning

Owner decisions:
- S1: current release authorization management is Owner-only for role definitions/grants, assignments and per-user overrides; future deputy delegation remains a required extension, not part of this release.
- S2: reply/mention notification preferences deferred.
- S3: online status default ON / opt-out.
- S4: separate Google-registration and email/password-registration controls.

The five-page product map above is frozen for technical planning. Lev now owns decomposition into bounded implementation packages. No implementation starts until the technical plan is complete and reviewed by Mira.


## Settings technical decomposition — approved by Mira

Coordinator review of Lev's technical plan: **PASS, 0 confirmed current-scope defects**.

Approved package sequence:

1. **SET-01 — Owner-only authorization mutations**
   - current release: role create/rename/delete, role grants, user role assignment and per-user overrides are writable only by exact bound Owner;
   - keep one application-policy seam so future deputy delegation can be added without implementing deputies now;
   - no schema/migration required.

2. **SET-02 — Settings shell + Forum & roles + registration policy**
   - introduce the five-surface Settings navigation/shell;
   - Owner Forum & roles surface reuses canonical authorization UI/writers;
   - persist independent Google-registration and email/password-registration flags;
   - registration gate applies only to new-user creation, not existing sign-in or explicit account linking;
   - one forward migration expected from actual main at implementation time.

3. **SET-03 — User preferences**
   - System/Light/Dark using current theme persistence;
   - account preferred locale through existing validated `user.locale`;
   - existing device-local Editor preferences;
   - reply/mention preferences remain deferred.

4. **SET-04 — Administrator preferences**
   - device-local per-account workspace preferences only;
   - default/last admin destination, Attention mode/group, density and secondary-detail expansion;
   - no server authority or domain semantics stored in local preferences.

5. **SET-05 — Account & security**
   - linked sign-in method summary + existing Google link flow;
   - change existing credential password;
   - active sessions, revoke one other session / all other sessions;
   - keep tokens server-side; no unlink/email-change/recovery/deletion/2FA/passkeys.

6. **SET-06 — Privacy**
   - persisted `show online` preference, default ON;
   - hidden user excluded authoritatively from both public online member list and count;
   - heartbeat cannot republish an opted-out user;
   - one forward migration expected from actual main at implementation time.

Sequence is bounded: only the nearest package is assigned at a time. SET-03–SET-06 depend on the Settings shell from SET-02, but otherwise are not forced into one implementation PR.

Technical verification notes:
- Better Auth `user.validateUserInfo` is a valid lifecycle seam for distinguishing new-user creation from link/sign-in and for identifying Google OAuth source.
- Better Auth session-management APIs support the planned list/revoke flow; list-sessions carries freshness requirements.
- These findings validate the technical plan only; no Settings implementation/CI/acceptance has run yet.


## Delivery status and remaining administrative scope

The planning/decomposition sections above are retained as the approved design record. Their pre-implementation status wording is superseded as follows:

- Ordinary Admin Panel AP-01–AP-11 — complete in repository/local-CI.
- Owner/authorization redesign Stage 1–2 — complete in repository/local-CI.
- Settings SET-01–SET-06 — complete in repository/local-CI.
- SET-06 implementation #311 and factual documentation closeout #312 are merged.
- Current main after docs closeout: `787cf6deae38138de2ffe867368ae794349f471f`.
- **The overall administrative program is not complete:** the separately planned Owner-only super-admin surface still remains.
- External/deployed Stage 6 acceptance remains separate and paused by Owner decision.

## Super-admin — product concept decisions

Confirmed Owner decisions and existing boundaries:

1. Super-admin is part of the overall admin work but remains a **separate Owner-only surface** from the ordinary permission-scoped Admin panel.
2. Existing exact server-bound Owner authority is reused; do not create a second RBAC merely for super-admin.
3. Account deletion remains reserved for super-admin, not ordinary Admin.
4. A deeper/full Owner audit surface belongs to super-admin; ordinary Admin History remains the significant-action history.
5. Super-admin must include a dedicated **Infrastructure** tab already in the current super-admin UI.
6. During the current pre-Stage-6 implementation that Infrastructure tab is a **placeholder / Under development surface only**. It must not expose live infrastructure data, secrets, credentials, deployment actions or provider controls.
7. Actual Cloudflare, Neon, deployments, secrets and provider administration inside that tab is deferred to **Stage 6** and is implemented only when Stage 6 is explicitly resumed by the Owner.
8. The placeholder is intentional product structure, not authorization for Stage 6 work and not a reason to build speculative infrastructure backend foundations now.

The remaining super-admin concept, exact sections and owner decisions are still being defined. Technical decomposition by Lev starts only after this product concept is frozen.


## Super-admin — concept v1

This is a product concept, not implementation authorization. The exact technical decomposition starts only after Owner decisions are complete.

### Purpose and boundary

Super-admin is the **Owner-only high-risk administration surface**. It is part of the overall administrative program but remains separate from the permission-scoped ordinary Admin panel.

It reuses the existing exact server-bound Owner identity and authority. Do not introduce a second RBAC, a special Owner role, or generic edit-any/delete-any powers merely because the surface exists.

Super-admin must not duplicate existing product surfaces:
- ordinary forum administration, measures and significant-action History remain in ordinary Admin;
- Roles & permissions, registration controls and other approved forum settings remain in Settings;
- Complaints/Signals/Security queues remain in Needs attention;
- personal account/security/privacy remain in personal Settings.

### Proposed top-level structure

1. **Overview**
   - Owner-only landing page for the super-admin surface.
   - Shows only navigation/status for the implemented super-admin sections.
   - Does not require speculative metrics, infrastructure probes or a second dashboard backend.

2. **Accounts**
   - Reserved for destructive account-lifecycle operations that ordinary administrators must not receive.
   - First confirmed capability: **account deletion**.
   - Exact deletion semantics, retained/anonymized content, identity/history retention and recovery rules remain Owner product decisions before implementation.
   - Ordinary Users search/detail and administrative measures are not duplicated here.

3. **Full audit**
   - Owner-only deeper audit surface, distinct from ordinary Admin History.
   - Ordinary History continues to record significant administrative actions.
   - Full audit may cover a wider technical/security trail only after exact event scope, retention, privacy and access rules are approved.
   - Do not build a generic event bus or speculative audit subsystem before those decisions.

4. **Infrastructure**
   - Present in the current super-admin UI as an explicit **Under development / Stage 6** tab.
   - Before Stage 6 it contains no live Cloudflare/Neon/deployment/secret/provider data and no mutations.
   - Actual infrastructure, deployments, secrets and provider administration are implemented only in Stage 6 after explicit Owner resumption.
   - The placeholder must not create speculative infrastructure APIs or credentials handling.

### Navigation/access concept

- The entire super-admin surface is visible and accessible only to the exact authenticated server-bound Owner.
- Ordinary administrators, moderators and holders of ordinary permissions do not gain read access merely from their role/grants.
- Super-admin is a separate destination, not an extension of the ordinary Admin permission union.
- A visible Owner-only entry may be exposed from the existing administration area, but the exact route/navigation placement is left for the next product-decision step.

### Explicit non-goals for the current super-admin implementation

- no second RBAC;
- no duplicate ordinary Admin/Settings/Attention features;
- no generic arbitrary edit/delete powers;
- no live infrastructure administration before Stage 6;
- no Owner-transfer/recovery-to-another-person model;
- no speculative audit/event backend until audit scope is approved.

### Concept status

Proposed structure: **Overview / Accounts / Full audit / Infrastructure**.

Confirmed parts:
- separate Owner-only surface;
- account deletion belongs here;
- deeper/full Owner audit belongs here;
- Infrastructure tab exists now as Stage-6 placeholder only.

Still requires Owner decisions before technical planning:
- account deletion semantics;
- exact Full audit scope and retention/privacy model;
- exact route/navigation placement and whether Overview needs any real summary data beyond navigation;
- any additional super-admin-only capability, if one is actually required rather than merely convenient.


## Super-admin — Owner product decisions pending

These decisions are required before the super-admin product scope can be frozen. They are product choices, not technical implementation prescriptions.

### SA1 — Public content when an account is deleted
1. Keep published topics/posts and replace the deleted account identity with a neutral deleted-user identity. **Mira recommendation.**
2. Delete the user's published content together with the account.
3. Other policy.

### SA2 — Account-deletion lifecycle
1. Immediate irreversible account deletion after explicit high-risk confirmation; retained public content follows SA1. **Mira recommendation for current pre-release scope.**
2. Soft-delete/deactivation with a recovery period.
3. Two-stage deactivate → later permanent delete.

### SA3 — Can the bound Owner delete their own account from super-admin?
1. No. The only Owner cannot target their own account with this destructive operation. **Mira recommendation.**
2. Yes, with a separate extreme confirmation flow.

### SA4 — Full-audit coverage
1. One Owner-only audit view covering ordinary Admin History plus Owner-only changes, authentication/security events, Settings changes, account deletion, and future Stage-6 infrastructure events when that stage is implemented. **Mira recommendation.**
2. Only ordinary administrative + Owner-only mutation history.
3. Other exact scope.

### SA5 — Full-audit detail level
1. Show actor, target, action, time, reason, bounded before/after details and technical identifiers; include IP/user-agent only where the underlying security/auth event legitimately has them. **Mira recommendation.**
2. Keep the audit mostly human-readable and hide most technical metadata.
3. Other detail policy.

### SA6 — Full-audit retention
1. Retain audit records indefinitely unless a later explicit retention policy replaces this. No ordinary UI deletion. **Mira recommendation.**
2. Fixed retention period.
3. Owner-configurable retention.

### SA7 — Super-admin entry/navigation
1. Add an Owner-only **Super-admin** entry from the existing administration area, opening its own separate super-admin shell/routes. **Mira recommendation.**
2. Entry only from the Owner account/profile menu.
3. Provide both entry points.

### SA8 — Super-admin Overview
1. Compact real overview: section shortcuts + a small amount of already-available truthful status/recent critical audit information; no new speculative metrics backend. **Mira recommendation.**
2. Navigation/section shortcuts only.
3. Full dashboard with additional metrics (would expand scope).

After these decisions, Mira freezes the product scope. Only then does Lev prepare the technical decomposition.


## Super-admin — Owner decisions SA1–SA3 resolved

- **SA1:** Published topics/posts are retained. The public author identity is replaced by a neutral **Deleted user** presentation rather than deleting the content.
- **SA2:** Current super-admin scope provides **deactivation only**, not immediate permanent deletion. The account record/data is retained for **at least one year**. What happens after that minimum retention period is not yet decided and must not be invented during implementation.
- **SA3:** Removed as an unnecessary Owner question. Under the already-fixed single-Owner model (no second Owner, transfer or successor), the bound Owner is **not a valid target** for this destructive/deactivation operation. No self-deactivation control is designed.

These decisions supersede the earlier concept wording that treated immediate account deletion as the first confirmed current capability. The current Accounts surface is therefore an Owner-only account **deactivation** surface with retained public content/anonymized public author presentation and minimum one-year account retention.

SA4–SA8 remain pending.


## Super-admin — Monitoring + Event log replaces “Full audit”

Owner clarified the intended product model:

- The third super-admin area is **not merely an audit/history page**.
- It is a combined **Monitoring + Event log** area.
- **Monitoring** shows the current operational/security state that is useful to the Owner.
- **Event log / History** shows important past events and changes needed to reconstruct what happened.
- Ordinary Admin History remains the narrower significant-administrative-action history for ordinary administrators.
- The super-admin event log is broader and may later include Stage-6 infrastructure/deployment/provider events once those systems exist.
- Do not create live Stage-6 probes now merely to populate Monitoring. Current monitoring scope must use only current-stage data/capabilities; Stage-6-only monitoring is added with Stage 6.

The proposed top-level super-admin structure is therefore:
1. Overview
2. Accounts
3. **Monitoring & Event log**
4. Infrastructure

Earlier wording “Full audit” is superseded.


## Super-admin — Owner-only user card: access and security

Owner clarified the placement of per-user authentication/security information:

- Authentication/session/security information is **not merely global event-log content**.
- Every user in Super-admin → Accounts has an **Owner-only user card/detail**.
- That card contains a dedicated **Access & security** section for the selected user.
- The section is visible only to the exact server-bound Owner; it is not added to the ordinary Admin Users detail and is not granted through ordinary RBAC permissions.
- The section is the primary per-user view for applicable account-access/security information, including:
  - linked/sign-in methods known to the application;
  - active/current sessions or devices where the current authentication provider/data model supports them;
  - relevant recent authentication/security events associated with that user;
  - account deactivation state and Owner-only deactivation controls under the already approved SA1/SA2 rules.
- A global Monitoring/Event log may still surface significant cross-system security events, but it must not be the only way to inspect a user's access/security history or current state.
- Do not expose raw secrets, session tokens, passwords or provider credentials in the card.

This decision expands the Accounts concept from only lifecycle/deactivation into an Owner-only detailed account view with an Access & security section.


## Super-admin / user profile — one profile page with privileged sections

Owner corrected the user-management information architecture.

### Target profile model

The canonical user page remains the existing public profile route `/:locale/users/:userId`. It becomes the **single user-detail page** with progressively protected sections rather than creating a separate super-admin user card.

The page has three access layers:

1. **Public profile**
   - existing public forum identity/profile/statistics/content;
   - remains readable under the existing public profile contract.

2. **Administrative section**
   - rendered on that same user profile only for an authenticated actor with applicable current administrative capabilities;
   - shows only administrative data/actions that the actor is actually authorized to read or perform;
   - access follows current permission-based authorization, not merely the saved role name;
   - ordinary administrators therefore get their own privileged section directly on the user profile.

3. **Owner-only section**
   - rendered on that same user profile only for the exact server-bound Owner;
   - contains the additional account-level information/actions reserved to Owner, including the previously approved Access & security information and account deactivation controls;
   - sign-in methods, sessions/devices where supported, relevant per-user authentication/security events and deactivation state belong here;
   - raw passwords, session tokens, secrets and provider credentials are never exposed.

Protected administrative/Owner data must be authorized and projected server-side. It must not merely be loaded into the public profile response and hidden with client/UI conditions.

### Consequences for existing/previous concept

- The earlier proposed **separate super-admin user card/detail** is superseded.
- Current repository implementation still has a separate ordinary `/:locale/admin/users/:userId` administrative detail page. How that existing route is migrated, redirected, retained as a navigation alias, or composed with the unified profile is a later technical-planning choice; the product target is the unified profile page.
- Super-admin → Accounts, if retained as a top-level area, is **not another user-detail surface**. It may serve account discovery/listing/lifecycle overview and open the canonical profile, but exact navigation is still a product/technical decision.
- Global Monitoring/Event log may show cross-system events, but user-specific current access/security state and relevant history are available primarily in the Owner-only section of that user's profile.
- Ordinary Admin Users functionality and Owner-only account/security functionality remain separately authorized even though they are presented on one profile page.

This decision supersedes the prior “Owner-only user card/detail in Super-admin → Accounts” wording.


## Unified user profile — privileged-section concept v1

The canonical `/:locale/users/:userId` profile remains one page. Privileged sections are server-authorized and progressively added to the public profile.

### Administrative section — proposed current scope

Show this section only when the viewing actor has at least one applicable administrative capability. Inside it, show only subparts the actor is authorized to read/use:

1. **Administrative measures**
   - current measure status and existing management entry/actions only for actors with the applicable measure-management authority;
   - no Owner-only account lifecycle data is exposed here.

2. **Role & permissions**
   - targeted role/effective-authorization information only with the existing `access.authorization.manage` read boundary;
   - mutation controls remain subject to the existing Owner-only authorization-write policy unless a future deputy model is separately approved.

3. **User-related administrative history**
   - not automatically included yet; whether admins with `admin.history.read` should receive a profile-local filtered history is an Owner product decision.
   - Complaints, Signals and Security case queues remain in Needs attention and are not copied into the profile.

### Owner-only section — proposed current scope

Visible only to the exact server-bound Owner.

1. **Account identity**
   - private account email and internal identity data needed to administer the account;
   - linked sign-in methods.

2. **Access & security**
   - active sessions/devices where the current authentication data supports them;
   - relevant per-user authentication/security events;
   - no raw passwords, session tokens, secrets or provider credentials.

3. **Account state**
   - active/deactivated state;
   - deactivation lifecycle and any reactivation behavior once approved;
   - minimum one-year retention from the Owner's SA2 decision.

4. **Owner-only actions**
   - exact action set is still pending. Candidate actions are deactivation/reactivation and forced termination of the user's active sessions; provider unlink/password manipulation are not assumed.

### Product decisions still required for the unified profile

**UP1 — Admin history on profile**
1. Add a compact user-specific administrative-history block for admins who have `admin.history.read`, with a link to the full ordinary History. **Mira recommendation.**
2. Do not show history on the profile; keep it only in the global ordinary History.

**UP2 — Owner private account identity**
1. Show email + internal user ID + linked sign-in methods in the Owner-only section. **Mira recommendation.**
2. Show only email + sign-in methods; keep internal ID only in technical details elsewhere.

**UP3 — Owner security actions**
1. Allow Owner to deactivate/reactivate the account and force-log-out all active sessions. **Mira recommendation.**
2. Only deactivate/reactivate; no forced session termination.
3. Other exact action set.

**UP4 — Deactivation effect**
Proposed default: deactivation blocks sign-in/new sessions and participation, terminates current sessions, preserves published content and account data for at least one year. The public identity behavior while the account is merely deactivated is not yet frozen.

**UP5 — Deactivation reason**
1. Require an Owner-entered reason, visible only in Owner/internal history and never publicly. **Mira recommendation.**
2. Do not require a reason.

Important ambiguity to resolve before implementation: SA1 selected a neutral “Deleted user” public identity, while SA2 later changed the lifecycle to **deactivation only**. Because deactivation is potentially reversible, the Owner must decide whether a deactivated account is anonymized publicly immediately or retains its public identity until a later permanent-deletion/anonymization decision.


## Super-admin / unified profile — Mira logic correction

The previous privileged-section pass contained unsupported assumptions and is corrected as follows.

### Correction 1 — deletion identity does not apply to deactivation

Owner's SA1 decision (“keep published content; show neutral Deleted user”) answered the earlier **deletion** scenario.

Owner's later SA2 decision changed the current lifecycle scope to **deactivation only**, with the account retained for at least one year.

Therefore:
- current deactivation does **not** automatically imply public anonymization;
- the “Deleted user” presentation is reserved for a future actual deletion/anonymization stage if and when such a stage is approved;
- current implementation must not rename a merely deactivated account to Deleted user based on SA1.

There is no SA1/SA2 ambiguity in the current scope once the decisions are applied in sequence: deletion behavior is future-only; current scope is deactivation.

### Correction 2 — reactivation and forced logout were invented

The Owner approved only **deactivation** and minimum one-year retention.

The following are **not approved facts** and must not be carried as current scope:
- reactivation;
- forced termination of all sessions;
- automatic session termination as part of deactivation;
- provider unlink/password manipulation.

Whether any of those belong to the eventual Owner-only profile section must be decided separately only if actually needed.

### Correction 3 — top-level Super-admin Accounts may now be redundant

After the Owner fixed the target user-information architecture as **one canonical user profile with Admin and Owner-only sections**, a second Super-admin user-detail surface is explicitly wrong.

The existing ordinary Admin Users directory already provides user discovery/search. Therefore a separate top-level **Accounts** tab in Super-admin is no longer justified merely to reach user-specific Owner actions.

Current simplest product structure should be treated as:
1. Overview
2. Monitoring & Event log
3. Infrastructure

User/account administration is contextual on the canonical user profile:
- ordinary Admin section for applicable admin permissions;
- additional exact-Owner-only section for private Owner data/actions.

A separate global Super-admin Accounts section should be added only if the Owner identifies a real global account-management need that cannot be served by the existing Users directory + canonical profile.

### Correct current profile facts

Administrative profile section:
- existing applicable admin actions/data, permission-scoped;
- exact content still to be shaped from current Users/measures/authorization mechanisms.

Owner-only profile section:
- additional private account/security data that the Owner explicitly wants there;
- exact action set remains undecided except for **deactivation**.

Do not turn speculative possibilities into Owner questions until they are shown necessary by the product goal.


## Super-admin account lifecycle — Owner clarification

Owner clarified the intended semantics:

- **Deactivation is the current product action and it immediately produces the public “Deleted user” presentation.**
- This is **not physical deletion of the account's stored data**.
- The account's underlying data must be retained for **at least one year** after deactivation.
- Published topics/posts remain preserved.
- The public identity is neutralized as “Deleted user” while the retained private/internal account data remains available only through its authorized internal/Owner boundaries.
- What happens to retained account data after the minimum one-year period is not yet decided and must not be invented.
- This clarification supersedes Mira's previous statement that “Deleted user” applied only to a future actual deletion stage.

Current distinction:
- **public/product state:** deactivated → appears as Deleted user;
- **storage/internal state:** data retained, not erased, minimum one year.


## Unified user profile — privileged sections v2

This section supersedes the earlier proposed UP1–UP5 question set and removes speculative actions.

### Administrative section on the canonical user profile

The existing public `/:locale/users/:userId` profile gains an **Administration** section when the viewer has at least one applicable administrative capability.

The section composes existing user-targeted administration instead of inventing a second subsystem:

1. **Administrative measures**
   - current measure information and the existing applicable measure-management actions;
   - each read/action remains gated by its existing measure permissions and hierarchy.

2. **Role and permissions**
   - current role plus targeted authorization details only for actors with the existing authorization-read boundary;
   - non-Owner remains read-only where the current authorization contract is read-only;
   - exact bound Owner retains the already-approved authorization write controls.

3. **Other existing user-targeted admin actions**
   - only when there is an already implemented authoritative operation and the actor has its permission;
   - do not copy Complaints, Signals or Security queues into the profile; those remain in Needs attention.

4. **No new profile-local Admin History subsystem**
   - ordinary Admin History remains the existing global significant-action history;
   - a new filtered per-profile History view is not added merely to fill this section.

### Owner-only section on the same profile

The exact server-bound Owner additionally receives an **Owner** section containing private account-level information that ordinary admins must not receive:

1. **Account identity**
   - private email;
   - internal account/user ID as technical detail;
   - linked sign-in methods known to the application.

2. **Access and security**
   - active sessions/devices and their safe metadata where the current auth data actually records it;
   - relevant authentication/security events for this specific user;
   - no passwords, raw session tokens, secrets or provider credentials.

3. **Account state**
   - active/deactivated state;
   - deactivation timestamp/status and retained-data state when available.

4. **Owner action: deactivate account**
   - deactivation is the only currently approved Owner-only account mutation;
   - deactivation makes the public identity appear as **Deleted user**;
   - published content remains;
   - underlying account data remains retained internally for at least one year;
   - a deactivated account must not remain usable as an active forum account. Existing session records do not need to be physically deleted as a product requirement, but a deactivated account must fail active-account admission on protected use;
   - no reactivation, provider unlink, password manipulation or separate forced-session action is assumed.

### Remaining product decision for deactivation

A reason rule is still required because it changes the product contract and stored history:

**UP-D1 — Deactivation reason**
1. Require a nonblank Owner reason, stored internally and never shown publicly. **Mira recommendation.**
2. Allow deactivation without a reason.

No other privileged-profile product question is currently necessary.


## Owner decision — deactivation reason not required

The previous UP-D1 question is closed.

Because account deactivation is an exact-Owner-only action, a mandatory reason would be entered by the same Owner who performs and later reviews the action. It does not create an independent approval or accountability boundary in the current single-Owner model.

Therefore:
- **deactivation does not require a reason**;
- do not add a mandatory reason field merely for formality;
- the deactivation event itself may still be recorded with actor, target and timestamp in the applicable internal event/history system;
- no explanation text is required unless a future delegated/approval workflow creates a real consumer for it.

This supersedes the prior recommendation to require a nonblank Owner reason.


## Super-admin decisions — SA6, SA7 and profile history scope

Owner decisions:

### SA6 — Monitoring/Event-log retention
- **SA6.1 selected.**
- Retain the full Owner monitoring/event-log history **indefinitely until the Owner explicitly replaces this policy**.
- There is **no ordinary UI deletion** for this log.
- This is a product retention rule, not a claim about legal/compliance requirements.

### SA7 — Super-admin entry points
- **SA7.3 selected.**
- The exact Owner gets both entry points:
  1. an Owner-only entry from the ordinary administration area;
  2. an Owner-only entry from the Owner account/profile menu.
- Both open the same separate super-admin destination; they do not create two implementations or two authorization models.

### Unified profile — ordinary admin vs Owner history visibility
Owner clarified the profile-history split:

- An ordinary administrator with the applicable permission sees **only the user's violations** relevant to that administrative scope.
- Ordinary admins do **not** receive the user's complete internal activity/security/account summary merely because they can administer the user.
- The exact Owner sees the **full per-user summary** in the Owner-only profile section.
- The full Owner summary may combine applicable user violations with private account/access/security history and other Owner-only user context once those producers/data are actually implemented.
- Do not invent a new generic “violation” database model from this product decision. Technical planning must map the user-facing “violations” view onto authoritative existing or deliberately implemented moderation/measure sources without duplicating case systems.
- Complaints/Signals/Security work queues remain in Needs attention; the profile is a summary/context surface, not a second queue.

This supersedes the earlier proposal that ordinary admins might receive a filtered copy of general Admin History on the user profile.
