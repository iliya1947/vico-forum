Этот файл фиксирует проработанный Мирой рекомендуемый product scope встроенного AI для пользователей Vico Forum до технического планирования.

# User AI — product scope proposal

Дата: 28.11.2026.

## 1. Цель

Встроенный AI должен помогать пользователю быстрее найти уже существующее решение и лучше сформулировать новый технический вопрос. Он не превращает Vico в AI-чат и не заменяет форумную модель «тема → обсуждение → проверенное решение».

Текущий `main` уже имеет:
1. обычный public Search по title/tags/current post revisions через lexical `ILIKE`;
2. отдельный lexical similar-question поиск в Help & solutions по title/tags/body;
3. solved topics и best answer как сильный сигнал качества решения;
4. revision-bound translations и generic locale architecture;
5. единый Editor 2.0.

Следовательно, AI должен расширять эти механизмы, а не создавать второй поиск, второй editor или отдельную базу контента.

## 2. Рекомендуемый scope первого релиза

### UAI-01 — semantic/hybrid search

Добавить к существующему публичному поиску semantic retrieval по текущему публичному содержимому.

Product behavior:
1. пользователь вводит обычный запрос естественным языком;
2. результаты объединяют существующее lexical совпадение и semantic relevance;
3. solved topic / current best answer может повышать полезность результата, но не скрывает релевантные unsolved topics;
4. результат ведёт в обычную canonical topic page;
5. при недоступности AI/embedding слоя поиск продолжает работать в существующем lexical режиме.

Это основной обязательный AI-result v1.

### UAI-02 — похожие темы и решения до публикации

Расширить существующую идею Help similar questions на обычное создание темы.

Product behavior:
1. по мере готовности title/body/tags пользователь может запросить/получить компактный список похожих существующих тем;
2. приоритетно показываются релевантные solved topics и темы с best answer;
3. список не блокирует публикацию новой темы;
4. пользователь сам решает открыть найденное решение или продолжить создание темы;
5. один и тот же retrieval foundation используется и для Search, и для similar topics; отдельный AI-поиск для формы создания темы не создаётся.

### UAI-03 — помощь при формулировке вопроса

Добавить **явно вызываемую пользователем** помощь в существующем Editor 2.0.

Допустимый результат:
1. предложить более точный title;
2. указать, какой существенной информации не хватает: ожидаемое/фактическое поведение, ошибка, окружение, уже проверенные шаги;
3. предложить улучшенную формулировку выбранного текста или вопроса.

Границы:
1. AI не публикует и не сохраняет текст самостоятельно;
2. пользователь явно принимает/вставляет предложение;
3. исходный Markdown и code blocks не переписываются без явного выбора пользователя;
4. AI не обязан генерировать решение проблемы и не подменяет ответы участников форума;
5. при недоступности модели Editor работает без изменений.

UAI-03 входит в рекомендуемый v1 только как on-demand helper и первый кандидат на отключение при недостатке бесплатного generation budget.

## 3. Что не включать в обязательный v1

1. Полноценный AI-чат/бот, отвечающий вместо участников форума.
2. Автоматически сгенерированные ответы или публикация AI от имени пользователя.
3. Автоматическое изменение/редактирование опубликованного контента.
4. Персональный AI-профиль/память пользователя.
5. Автоматические рекомендации/лента на основе поведения пользователя.
6. Постоянные AI-summary каждой темы.
7. On-demand summary длинной темы как обязательную release-функцию.

### Почему summary отложен

Thread summary полезен, но требует генеративного inference пропорционально объёму обсуждения, создаёт дополнительную проблему freshness после каждого нового ответа и имеет меньшую ценность для первого релиза, чем поиск существующего решения и предотвращение дублей. Архитектура общего generation layer не должна запрещать его добавление позже.

## 4. Content boundary

1. Индексируется только текущая публично разрешённая проекция.
2. Hidden topic не появляется в public AI search.
3. Hidden post не используется для public AI retrieval.
4. Используется current revision; stale title/body representation не должна оставаться current после edit.
5. Restore возвращает контент в AI discovery только после актуального индексирования.
6. Private Admin/Complaints/account data в user-AI corpus не входит.
7. Provider output не является authoritative forum data.

## 5. Мультиязычность

1. AI discovery не должен создавать отдельные языковые silo.
2. Query и public content могут быть на разных языках.
3. Архитектура не hard-code EN/RU/HE или любой другой конечный список locale.
4. Представление результата использует существующий locale/translation contract Vico; AI не создаёт параллельную translation system.
5. Для acceptance нужен cross-language test минимум на текущем representative EN/RU/HE наборе, но реализация остаётся generic по locale.

## 6. Бесплатность и деградация

1. Дополнительные эксплуатационные расходы — $0.
2. Обязательный перевод имеет приоритет над optional user-AI generation при общей ограниченной квоте provider.
3. Semantic discovery должен иметь bounded generation/indexing budget и не делать базовый Search зависимым от внешней модели.
4. При исчерпании/недоступности AI:
   - Search → существующий lexical fallback;
   - similar topics → существующий lexical/обычный discovery fallback там, где он уже есть;
   - authoring helper → временно unavailable без влияния на Editor/publishing.
5. Платный fallback запрещён.

## 7. Privacy and safety

1. Внешнему provider передаётся только минимально необходимый public/user-submitted content для конкретной функции.
2. Не передавать private Complaints, protected moderation data, account/session/secrets в user-AI path.
3. Forum content и model output являются untrusted data.
4. Prompt-like текст внутри темы не получает полномочий вызывать действия, внешние tools или менять system behavior.
5. AI suggestions явно маркируются как предложения и не считаются проверенным решением форума.

## 8. Критерии готовности product scope

User-AI v1 считается правильно определённым, если технический план обеспечивает:

1. один общий retrieval foundation для semantic Search и similar topics;
2. graceful lexical fallback без AI;
3. solved/best-answer ranking signal без изменения canonical solution state;
4. актуализацию discovery после create/edit/hide/restore;
5. public-only visibility parity с обычным форумом;
6. generic multilingual boundary и representative cross-language acceptance;
7. on-demand authoring helper без auto-publish/auto-write;
8. жёсткий $0 budget и отключение optional generation раньше обязательного translation workload;
9. отсутствие AI-chat/autonomous posting/thread-summary requirement в обязательном v1;
10. возможность позже добавить on-demand thread summary поверх общего generation layer без переделки forum core.

## 9. Рекомендация Миры

Для первого релиза:
1. **обязательно:** UAI-01 semantic/hybrid search;
2. **обязательно:** UAI-02 similar topics/solutions;
3. **включить как bounded optional:** UAI-03 question-authoring helper;
4. **отложить:** thread summaries и AI answers/chat.

Такой scope даёт заметную пользовательскую пользу, переиспользует уже существующие Search/Help/solution/translation/editor boundaries и минимизирует расход бесплатной AI-квоты.
