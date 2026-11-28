Этот файл фиксирует отдельную продуктовую концепцию пользовательского AI Vico Forum. Он не определяет AI для администрирования/модерации и не является техническим планом.

# User AI — product concept

Дата: 28.11.2026.
Статус: основные product decisions по User Consultant утверждены владельцем; technical planning не начато.

## 1. Роль User Consultant

Центральная функция пользовательского AI — **консультант-навигатор по самому Vico Forum**, а не универсальный технический консультант.

Его задача:
1. помочь понять, куда идти и где что находится;
2. найти правильную существующую тему или решение;
3. подобрать подходящий раздел/category/Help;
4. объяснить, каким механизмом Vico воспользоваться;
5. привести пользователя к конкретному следующему действию внутри форума.

Формула продукта: **«Спроси Vico, где и что искать/делать на форуме»**.

## 2. Основные сценарии

Пользователь может спросить:
1. «Где спросить про ошибку Cloudflare Worker?»
2. «Найди тему про Better Auth и Google OAuth».
3. «Куда писать, если перевод сообщения неправильный?»
4. «Где посмотреть свои закладки?»
5. «Как пожаловаться на сообщение?»
6. «Где изменить язык?»
7. «Есть уже тема про такую ошибку?»
8. «Какой раздел подходит для моего вопроса?»

Consultant должен отвечать конкретной навигацией по Vico:
1. подходящая существующая тема;
2. до трёх наиболее релевантных тем;
3. нужный раздел/category;
4. canonical forum page/feature;
5. правильный следующий forum action.

## 3. Пользовательский цикл

### A. Пользователь формулирует намерение

Это может быть:
1. найти решение;
2. найти похожую тему;
3. понять, куда задать вопрос;
4. найти функцию форума;
5. понять, как работает механизм Vico;
6. перейти к нужной доступной странице.

### B. Consultant понимает тип запроса

Минимальные группы:
1. topic/solution discovery;
2. section/category routing;
3. Help & solutions routing;
4. feature/navigation help;
5. settings/account/help surface;
6. reporting/help route;
7. question-placement assistance.

Пользователь не выбирает режим вручную.

### C. Consultant использует знания Vico

Для topic discovery учитываются:
1. lexical + semantic relevance;
2. title/body/tags;
3. solved state;
4. best answer;
5. current visible revisions;
6. category/section context.

Для navigation help используются только разрешённые для текущего disclosure layer знания о структуре и возможностях Vico.

### D. Consultant ведёт к действию

Результат должен быть коротким и actionable:
1. «Вот наиболее подходящие темы»;
2. «Тебе нужен раздел X»;
3. «Это делается здесь»;
4. «Для такого вопроса лучше Help & solutions»;
5. «Подходящей темы нет — вот куда создать новую».

## 4. Поиск правильной темы

Semantic/hybrid retrieval — capability User Consultant и обычного Search, а не отдельный AI-продукт.

Требования:
1. понимать естественные формулировки, не совпадающие с title;
2. работать между языками в рамках общей multilingual-архитектуры Vico;
3. учитывать solved/best-answer как полезные сигналы;
4. не скрывать релевантные unsolved discussions только из-за отсутствия решения;
5. не раскрывать hidden/private content;
6. при AI/retrieval outage обычный lexical Search продолжает работать.

### Выдача Consultant

1. Показывать **до трёх** наиболее релевантных тем.
2. Если одна существенно лучше — можно выделить её как лучшее совпадение.
3. Для каждой кратко объяснять релевантность.
4. Показывать solved/best-answer признаки, если они есть.
5. Если хорошего совпадения нет — честно сказать об этом и предложить правильное место для новой темы.
6. Для длинной выдачи остаётся обычный Search.

## 5. Если подходящей темы нет

Consultant помогает определить:
1. category;
2. section;
3. обычный topic или Help & solutions;
4. подходящие tags;
5. при необходимости — короткий понятный title.

Он не обязан генерировать полноценный технический ответ или переписывать весь body.

## 6. Объяснение возможностей Vico

Consultant должен уметь ориентировать пользователя по таким вопросам, как:
1. Watch / Bookmarks / Mute / Block;
2. best answer;
3. жалоба на контент;
4. настройки;
5. профиль и уведомления;
6. доступные пользователю forum surfaces.

Источник таких ответов — актуальный product/navigation contract Vico и разрешённый disclosure context, а не произвольные знания модели.

## 7. Не универсальный технический советчик

В v1 Consultant не позиционируется как универсальный программист/технический эксперт.

1. Его главная роль — ориентировать внутри Vico.
2. General technical Q&A не является обязательным scope.
3. Внешний web-search не является обязательным scope.
4. Consultant не должен замещать участников форума generated solutions.

Он может естественно кратко объяснить уже доступную ему текущую тему или найденный ответ, если это помогает навигации.

## 8. Summary не отдельная фича

Отдельный product feature «summary темы» в v1 не создаётся.

Если Consultant уже имеет разрешённый context текущей темы, он должен естественно уметь ответить:
1. «О чём эта тема?»
2. «К чему здесь пришли?»
3. «Что здесь главное?»

Не нужны отдельная кнопка, режим, summary storage или background regeneration. Позже отдельный UX для summary должен добавляться поверх существующего Consultant/context path без существенной переделки.

## 9. Editor integration

AI-помощь в Editor нужна только как продолжение навигационного сценария:
1. подобрать раздел/tags;
2. предложить понятный title;
3. предупредить, что вопрос, возможно, создаётся не в том месте.

Полное AI-переписывание body не является обязательной частью v1.

## 10. Доступ

Consultant использовать могут **только авторизованные пользователи**, но он видим гостям.

Для гостя:
1. launcher видим;
2. вместо диалога показывается auth-gate уровня «Зарегистрируйтесь или войдите, чтобы использовать консультанта»;
3. auth-gate ведёт в существующий registration/sign-in flow;
4. model inference, conversation state и AI quota до авторизации не используются.

Public Search/navigation/forum reads остаются доступны гостям как обычно.

## 11. Память

В v1 Consultant сохраняет context только **внутри текущей консультации**.

1. Переходы по страницам не должны сами по себе обрывать текущую консультацию.
2. После её завершения постоянная personal AI memory/history не используется.
3. Conversation-state storage boundary должна быть заменяемой.
4. Позже persisted history/long-term memory должно быть возможно добавить без переписывания consultant core, retrieval и navigation.
5. В v1 persistent-memory subsystem заранее не строится.

## 12. Disclosure layers

Consultant использует три server-selected слоя раскрытия информации:

1. **User** — обычные пользовательские возможности и публичная/личная навигация.
2. **Moderator** — User + разрешённые moderator-only knowledge/navigation сведения.
3. **Administrator** — User + Moderator + разрешённые administrator-only knowledge/navigation сведения.

Назначение этих слоёв — не дать AI «сболтнуть» внутреннюю информацию более высокого уровня.

Требования:
1. layer выбирается trusted server-side состоянием, а не prompt/model;
2. модель получает только knowledge/navigation context своего слоя;
3. нижний layer не содержит внутренних знаний верхних layers;
4. реальные routes/actions всё равно защищаются canonical authorization;
5. disclosure boundary предотвращает раскрытие через AI, authorization boundary предотвращает фактический доступ/действие;
6. технический план должен выбрать простой mapping dynamic roles/overrides → один из трёх disclosure layers без копирования всей RBAC-логики в модель.

Иерархия наследуется снизу вверх:
**User → Moderator → Administrator**.

## 13. Launcher и контекстные входы

Основная точка входа — постоянная плавающая кнопка **«Консультант»** внизу справа.

1. По нажатию открывается popup/side panel поверх текущей страницы.
2. Контекстные входы в Search/topic/editor и других релевантных местах открывают того же Consultant.
3. Контекстные входы передают page/action context, но не создают отдельные AI-режимы.
4. Guest launcher открывает auth-gate.

## 14. Graceful degradation

1. Consultant недоступен → canonical forum navigation продолжает работать.
2. Semantic retrieval недоступен → Search работает lexical-only.
3. Editor работает без AI.
4. Paid fallback запрещён.

## 15. Что не входит в User AI v1

1. Universal technical consultant.
2. External web research.
3. Autonomous answers/posts.
4. Full AI rewriting of user content.
5. Persistent personal AI memory.
6. AI для администрирования/модерации — это отдельная продуктовая задача.
7. Owner ChatGPT control — отдельная задача с отдельными authority/data boundaries.

## 16. Состояние product decisions

Закрыто владельцем:
1. основная роль — forum navigator/topic finder;
2. использование только после авторизации, но guest-visible auth-gate;
3. память только текущей консультации с replaceable storage boundary;
4. disclosure layers User → Moderator → Administrator с наследованием;
5. постоянный floating launcher + контекстные входы;
6. до трёх релевантных тем с кратким объяснением;
7. topic summary — естественная capability диалога, не отдельная v1-фича.

На этом **существенные product decisions текущей User AI концепции закрыты**. Перед техническим planning требуется coordinator consistency check, но не проработка Moderator Copilot.
