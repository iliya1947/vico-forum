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
