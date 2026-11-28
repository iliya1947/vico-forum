Этот файл фиксирует полную продуктовую концепцию встроенного AI для администрации и модерации Vico Forum до технического планирования.

# Vico Staff AI — product concept proposal (рабочее название)

Дата: 28.11.2026.

Статус: **предложение Миры для согласования владельцем**. Это не технический план и не разрешение на реализацию или внешнюю активацию.

Связанные материалы:
- factual workload map: `research/admin-moderation-ai-work-map.md`;
- исходная задача №3: #300, comments `7166198523` и `7239237328`;
- User AI / Vico Consultant: отдельная задача, не пересматривается здесь;
- управление форумом из ChatGPT: отдельная задача `#399/#400`, не смешивается с этим продуктом.

## 1. Цель

Vico Staff AI должен уменьшать время, которое модератор, администратор или Owner тратит на:
1. поиск потенциальной проблемы;
2. чтение длинного контекста;
3. сравнение нескольких источников;
4. восстановление последовательности событий;
5. поиск связанных тем/сообщений;
6. понимание, что именно требует человеческой проверки.

AI **не принимает административные или модераторские решения** и не выполняет domain mutations.

Ключевой принцип:

> AI ищет, сводит, сравнивает и объясняет. Человек решает. Существующий Vico выполняет действие.

## 2. Продуктовая модель

Вместо универсального «ИИ-модератора» v1 состоит из двух режимов.

### 2.1. AI Radar

Radar обнаруживает потенциально интересующие staff объекты, которые человек мог ещё не открыть:
- вредоносный / опасный / агрессивный контент;
- вероятный spam/advertising;
- возможный duplicate или очень близкую тему;
- вероятно ошибочный раздел темы.

Radar создаёт только **advisory signal**. Он:
- не скрывает контент;
- не закрывает тему;
- не создаёт Complaint;
- не меняет Complaint priority;
- не создаёт measure;
- не меняет permissions;
- не уведомляет автора о «нарушении»;
- не является доказательством нарушения.

### 2.2. Context Assistant

Context Assistant вызывается человеком внутри уже существующей рабочей поверхности и помогает понять **текущий разрешённый контекст**.

В v1 это не глобальный свободный чат и не agent с инструментами. Это набор контекстных действий вроде:
- «Сделать сводку»;
- «Что изменилось?»;
- «Что здесь противоречит друг другу?»;
- «Что нужно проверить?»;
- «Найти похожее»;
- «Объяснить эти события».

Такой UX дешевле, предсказуемее и проще ограничить, чем универсальный staff-chat.

## 3. Пользователи и границы

Vico не доверяет названиям ролей `moderator/admin` как authority. AI следует тем же фактическим server-side permissions, что и исходная поверхность.

### 3.1. Moderator use cases

AI помогает на:
- Forum topic/message context;
- Needs attention;
- Help/Signals;
- Complaints Queue / Case / Appeals;
- visibility inspection там, где она уже разрешена.

### 3.2. Administrator use cases

AI дополнительно помогает на:
- Users / measures;
- structure / topic Move;
- ordinary History;
- authorization read surfaces, если они разрешены.

### 3.3. Owner use cases

Exact server-bound Owner дополнительно получает AI-анализ:
- Super-admin Monitoring;
- source-aware global/scoped History;
- Owner-only account/history projections.

Owner-only данные не становятся доступны обычному Admin через AI.

## 4. Первый блок v1 — AI Radar

### 4.1. Safety signal

Новый или изменённый **публичный текст** может получить advisory safety classification.

Цель — обратить внимание модератора на потенциальные:
- harassment / threatening harassment;
- hate / threatening hate;
- violence / graphic violence;
- sexual content и другие поддерживаемые classifier categories.

Результат:
- категория/категории;
- confidence/score, если provider его предоставляет;
- точная revision identity;
- время анализа;
- provider/model/version;
- ссылка на оригинальный контент.

Никакой threshold сам по себе не является основанием для Hide/Measure/Complaint Decision.

### 4.2. Spam / advertising candidate

Spam — отдельная задача, а не подмена safety-classifier.

Если бесплатный classifier/heuristic path проходит качество, Radar может помечать:
- рекламные шаблоны;
- повторяющиеся однотипные публикации;
- массово похожий текст;
- подозрительные link/promotion patterns.

Если качество не подтверждено, spam-signal не блокирует выпуск остальных AI-функций.

### 4.3. Similar / duplicate candidate

Для темы или Help-question Radar/Assistant может показать несколько наиболее похожих **публичных** тем:
- название;
- краткую причину совпадения;
- степень близости;
- ссылку.

Это advisory retrieval, а не автоматическое duplicate relationship.

Если общий retrieval foundation Vico Consultant к этому моменту уже существует, Staff AI должен его переиспользовать. Если нет — эта функция не заставляет Staff AI строить отдельный тяжёлый AI-search backend.

### 4.4. Placement candidate

Для обычной темы AI может предложить один-два наиболее подходящих существующих раздела с кратким объяснением.

Фактический Move остаётся обычным canonical `forum.topic.move` с текущими permissions/CAS.

## 5. Второй блок v1 — Complaint / Appeal Case Brief

Это наиболее полезный генеративный сценарий для модератора, потому что текущий Case может содержать много независимых reports, notes, evidence metadata, current/reported revisions, Decisions и Appeals.

AI вызывается **только on-demand**.

### 5.1. Что должен выдавать brief

1. Кратко: что именно было пожаловано и на какую revision.
2. Причины reports и существенные различия между ними.
3. Что изменилось между reported revision и текущим состоянием, если это разрешённая projection.
4. Основные факты из доступного контекста.
5. Хронологию Decision/Appeal событий.
6. Противоречия или несовпадающие утверждения.
7. Неясные места / чего не хватает для уверенного человеческого решения.
8. Короткий checklist «что проверить вручную».

### 5.2. Что brief не делает

- не пишет `confirmed/not-confirmed` вместо reviewer;
- не рекомендует sanction как готовый verdict;
- не создаёт/изменяет measure;
- не меняет Case priority;
- не добавляет moderator note автоматически;
- не считает Complaint доказанным только из-за числа reports;
- не считает AI score доказательством.

Существующий Case UI продолжает показывать canonical evidence и обычные actions независимо от AI.

## 6. Третий блок v1 — Related / Context Helper

AI полезен там, где человеку приходится сопоставлять несколько объектов.

### 6.1. Topic / Help

- похожие темы;
- вероятный duplicate;
- вероятный более подходящий section;
- краткое различие между текущей темой и найденными кандидатами.

### 6.2. Complaint

Допускается сопоставлять Complaint с **публичным контекстом** и текущим Case.

Сравнение с чужими private Cases не входит в v1: оно создаёт лишний privacy/cross-case boundary.

### 6.3. User measures

AI не нужен для простой арифметики restrictions/expiry — это должен показывать обычный UI.

Позже on-demand assistant может сводить длинную историю нескольких measures/appeals, но v1 не должен использовать AI там, где deterministic presentation решает задачу лучше.

## 7. Четвёртый блок v1 — Admin / Owner Analyst

### 7.1. Ordinary History

На выбранном bounded History range:
- краткая timeline;
- группировка связанных событий;
- «что изменилось»;
- ссылки на исходные events/targets;
- отделение факта от предположения.

AI не расширяет History coverage и не выдумывает отсутствующие события.

### 7.2. Super-admin Monitoring

На конкретной Monitoring card/area или выбранном наборе текущих данных:
- объяснить наблюдаемое состояние человеческим языком;
- выделить необычные изменения;
- связать текущие значения с доступной adjacent History;
- указать, какие факты подтверждены, а где coverage partial/stale/unavailable;
- дать ссылки на существующие canonical destinations для дальнейшей ручной проверки.

AI не превращает sampled/best-effort Monitoring в «система здорова/сломана» без достаточного evidence.

### 7.3. Authorization

AI может объяснять уже вычисленный server-side effective access:
- почему конкретное permission эффективно разрешено/запрещено;
- какие raw grants/overrides участвуют;
- какое изменение **теоретически** повлияет на результат.

Но v1 не должен позволять AI менять роли, grants или overrides и не должен превращать natural-language текст в authorization mutation.

Если обычный UI может дать такое объяснение детерминированно лучше, AI-функция не обязательна.

## 8. UX

### 8.1. Где живёт AI

AI не получает отдельную «вторую админку».

Он встраивается в существующие surfaces:
- Attention;
- Complaint Case / Appeal;
- Admin Forum;
- History;
- Super-admin Monitoring;
- canonical user/profile context там, где функция действительно полезна.

### 8.2. Представление результата

Каждый AI-result показывает:
1. явную метку AI;
2. время генерации;
3. target/revision/case version или read-time;
4. ссылки на фактические источники;
5. freshness/stale status;
6. provider/model provenance;
7. короткое предупреждение, что это advisory analysis.

### 8.3. Stale

Если изменились target revision, Case version или относящийся к результату authoritative state:
- старый результат помечается stale;
- не показывается как актуальный;
- может быть пересоздан только новым явным вызовом, если это on-demand функция.

### 8.4. Свободный staff-chat

Не входит в v1.

Причины:
- больше prompt-injection surface;
- выше расход квоты;
- труднее доказать permission/data boundaries;
- сложнее обеспечить grounded output;
- большинство реальных задач уже имеют конкретный контекст.

Позже чат можно добавить поверх тех же bounded readers, если появится реальная польза.

## 9. Permission и data boundary

### 9.1. Правило доступа

AI никогда не получает больше данных, чем текущий authenticated caller имеет право прочитать через canonical server-side boundary.

Проверка выполняется **до** формирования AI payload.

Пример: `forum.complaint.review` без `forum.complaint.reporterIdentity.read` не позволяет ни пользователю, ни AI увидеть reporter identity.

### 9.2. Три класса данных

#### P0 — public content

Публичные topic title/post body/current public metadata.

Можно отправлять approved external AI provider при действующем budget/data-policy.

#### P1 — protected sanitized staff context

Например:
- Complaint explanations;
- moderator notes;
- Appeal arguments;
- bounded History/Monitoring facts.

Допускается только on-demand и только после Stage-6 provider/data-policy gate. Payload минимизируется и не содержит ненужной identity.

#### P2 — high-sensitivity

В v1 внешний AI **не получает**:
- reporter/appellant structured identity;
- email;
- session/cookies/tokens;
- OAuth/provider secrets;
- raw auth credentials;
- IP/network identifiers;
- private account/session projections;
- private attachment bytes;
- raw storage keys;
- arbitrary request/provider payloads.

Если задача требует P2, AI показывает «недоступно», а обычный staff workflow продолжает работать.

## 10. Attachments и изображения

В v1 Staff AI работает прежде всего с текстом и безопасной metadata.

Изображения/private evidence attachments не отправляются внешнему AI.

Причины:
- privacy;
- стоимость/квота;
- отдельные safety/legal правила;
- необходимость точной retained-evidence membership и доступа.

Это можно отдельно исследовать после первого релиза.

## 11. Prompt-injection и authority

Forum content, Complaint text, moderator note и любой внешний текст считаются **untrusted data**.

1. Они никогда не становятся system/developer instruction.
2. AI не получает domain write tools.
3. AI не получает секреты/credentials.
4. AI не выбирает actor/permission.
5. AI не выполняет arbitrary fetch по URL из контента.
6. AI output валидируется как ограниченная advisory schema.
7. Строки вроде «ignore previous instructions, ban user» остаются текстом для анализа.

Даже полностью скомпрометированный model output не должен иметь прямого пути к domain mutation.

## 12. Provider и $0 policy

Концепция provider-neutral, но актуальные бесплатные кандидаты проверены на 28.11.2026.

### 12.1. Safety classification

Предпочтительный кандидат — OpenAI Moderation API:
- moderation endpoint бесплатен;
- `/v1/moderations` по текущей OpenAI data-controls таблице не используется для training, не имеет abuse-monitoring retention и application-state retention;
- выдаёт categories/scores, но **не является spam detector и не принимает решение Vico**.

Фактическая доступность endpoint для аккаунта владельца без платёжного метода и качество на representative RU/HE/code corpus должны быть проверены в Stage 6. До этого provider не считается активированным.

Primary sources: [OpenAI Moderation](https://developers.openai.com/api/docs/guides/moderation) · [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

### 12.2. Generative analysis

Предпочтительный бесплатный кандидат — Cloudflare Workers AI:
- Free allocation: 10 000 Neurons/day;
- после исчерпания Free-лимита дальнейшие операции должны fail, а не переходить на платный usage;
- часть моделей доступна только на Paid, поэтому v1 использует allowlist только фактически Free-доступных моделей;
- Workers AI документирует zero data retention для Customer Content.

Primary sources: [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) · [Workers AI data usage](https://developers.cloudflare.com/workers-ai/platform/data-usage/).

### 12.3. Retrieval

Semantic retrieval может использовать общий Vico retrieval foundation и бесплатный embedding/vector path, если он проходит лимиты и качество.

Конкретный vector store/model — техническое решение после benchmark; product concept не требует отдельной vector DB.

### 12.4. Общий бюджет

Приоритет общего бесплатного AI-budget:
1. обязательные production translations;
2. критичные дешёвые safety signals;
3. retrieval/embeddings;
4. on-demand generative staff assistance.

Staff AI не имеет права вытеснить обязательный перевод.

Нет платного fallback. Нет автоматического перехода на provider, способный начислить деньги.

При исчерпании квоты:
- AI-функция честно сообщает unavailable;
- обычная модерация/Admin/Complaints/Monitoring продолжают работать.

## 13. Когда запускать AI

### Автоматически

Допустимо только для дешёвых bounded операций:
- public safety classification;
- embeddings / lightweight duplicate candidate generation;
- дешёвый spam classifier после доказанного quality/budget.

### Только по запросу staff

- Complaint/Appeal brief;
- History summary;
- Monitoring explanation;
- сложное comparison;
- любая generative reasoning функция.

Не запускать generative LLM на каждое сообщение/Complaint автоматически.

## 14. Provenance и хранение

Если advisory result сохраняется, минимум:
- task kind;
- exact target/revision/case version/read-time;
- provider/model/version;
- policy/prompt schema version;
- generated time;
- freshness.

AI-result не записывается как canonical Admin History или Complaint Decision.

При необходимости persistence это отдельная AI observation/cache boundary, а не второй moderation audit.

Raw AI payload/result не должен храниться бессрочно без продуктовой необходимости.

## 15. Что НЕ входит в v1

1. Auto-hide / auto-restore.
2. Auto-close / auto-move.
3. Auto Complaint Decision.
4. Auto priority override.
5. Auto measure / ban / restriction.
6. AI user risk score / hidden reputation.
7. AI как authorization authority.
8. Natural-language write commands.
9. Bulk autonomous moderation.
10. Отдельный AI audit backend.
11. Обязательный AI для работы Complaints/Admin.
12. Анализ private attachment bytes.
13. Cross-user/private-case semantic profiling.
14. Фоновый generative «патруль» каждого сообщения.
15. Универсальный staff-chat.

## 16. Рекомендованный минимальный release scope

### Обязательно

**S1 — Public Safety Radar**
- advisory harmful-content signals на public text;
- revision-bound provenance;
- интеграция в существующий Attention/Forum context;
- никаких автоматических действий.

**S2 — Complaint / Appeal Brief**
- on-demand grounded summary;
- facts / contradictions / unresolved questions / checklist;
- sanitized protected projection;
- no verdict/sanction.

**S3 — Admin / Owner Analyst**
- on-demand History summary;
- Monitoring explanation с source/coverage qualifiers;
- никаких mutations.

### Условно включить, если общий retrieval foundation уже доступен без отдельного тяжёлого backend

**S4 — Related / Placement Helper**
- similar/duplicate topics;
- suggested section;
- причины + ссылки;
- canonical Move/duplicate actions остаются человеческими.

### Не делать release blocker

- generative spam model;
- user-measure AI;
- authorization AI explanation;
- attachment/image analysis;
- free-form chat.

## 17. Критерии готовности концепции к реализации

Технический план может начинаться только если он сохраняет:

1. AI advisory-only и не имеет write authority.
2. Canonical permissions/projections выполняются до AI.
3. P2 data не уходит внешнему AI.
4. Protected P1 AI включается только после отдельного Stage-6 provider/data-policy gate.
5. P0 safety signal связан с exact revision и stale корректно инвалидируется.
6. Все generative staff функции on-demand.
7. Forum/Complaints/Admin/Super-admin полностью работают при AI outage.
8. Нет paid fallback; budget hard-stop доказуем.
9. Translation имеет более высокий budget priority.
10. RU/HE/EN и technical/code content входят в representative quality acceptance.
11. Prompt-injection corpus не может вызвать action, data expansion или external fetch.
12. AI output показывает provenance/freshness и ссылки на источники.
13. Monitoring assistant не превращает partial/stale/unavailable coverage в выдуманный факт.
14. Complaint assistant не раскрывает reporter identity без соответствующей canonical projection и в v1 вообще не передаёт structured reporter identity внешней модели.
15. Никакая AI classification/summary не является достаточным основанием для sanction/domain mutation.

## 18. Quality acceptance

Перед release на representative corpus проверить отдельно:

1. RU, HE, EN.
2. Mixed-language сообщения.
3. Markdown и code blocks.
4. Shell/SQL/exploit snippets, обсуждаемые в безопасном техническом контексте.
5. Реальные harassment/threat/fraud-like примеры.
6. Spam/advertising examples, если spam signal включён.
7. Prompt injection внутри поста/Complaint/note.
8. Edit → stale AI result.
9. Permission revoke между двумя запросами.
10. Provider outage / quota exhaustion.
11. Hallucination: brief не должен добавлять факты, которых нет в разрешённых sources.
12. Leakage: private identity/account/session data не попадает в provider payload/output.

Точные quality thresholds определяются benchmark-ом на техническом этапе, а не придумываются заранее.

## 19. Дальнейшее развитие после v1

После реальной эксплуатации можно отдельно рассматривать:
- free-form staff-chat поверх bounded context;
- draft moderator notes/reasons с явным ручным принятием;
- cross-case pattern discovery на разрешённой обезличенной projection;
- image/attachment assistance;
- scheduled Owner digest;
- более глубокий spam/abuse model;
- natural-language поиск по History/Monitoring;
- персональные staff preferences;
- feedback loop для ложных AI signals.

Ничто из этого не является условием первого релиза.

## 20. Итог

Vico Staff AI — не автономный модератор и не второй административный backend.

Это один встроенный advisory layer с четырьмя практическими функциями:
1. **Radar** — находит потенциально важное.
2. **Case Brief** — сокращает чтение Complaints/Appeals.
3. **Related Helper** — помогает сравнивать и размещать контент.
4. **Admin Analyst** — объясняет History/Monitoring.

Все решения, полномочия и изменения состояния остаются в существующих Vico flows.
