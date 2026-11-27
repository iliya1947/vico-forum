Этот файл фиксирует проработанный Мирой рекомендуемый product scope AI для администрирования и модерации Vico Forum до технического планирования.

# Admin & Moderation AI — product scope proposal

Дата: 28.11.2026.

## 1. Цель

AI должен помогать модератору быстрее обнаружить потенциально проблемный контент, найти дубликаты и понять уже собранные факты по жалобе. Он не является самостоятельным модератором, не создаёт новую authority и не заменяет существующие Attention / Complaints / Help / History workflows.

Текущий `main` уже имеет:
1. единый `/:locale/attention` с Signals / Complaints / Security;
2. permission-scoped Help signals и duplicate appeals;
3. Complaints queue с reason counts, automatic/manual priority и reviewer activity;
4. full Case review: reported/current content, reports, context, notes, evidence, Decision;
5. Appeals и resolved History;
6. canonical Hide/Restore, Help outcomes, Complaints decisions, AP-10 measures и History.

Следовательно, AI должен выдавать только дополнительные **advisory facts/signals**, которые входят в существующий moderation flow.

## 2. Рекомендуемый scope первого релиза

### MAI-01 — harmful-content signal

Для нового или изменённого публичного topic title/post AI/classifier может создать advisory safety signal.

Цель:
1. отметить вероятность категорий, которые пересекаются с существующими жалобами: harassment, threats, fraud/phishing, malicious content, personal-data и близкие safety-категории;
2. передать сигнал в существующую Attention/moderation surface с provenance, моделью/версией, временем и confidence/category scores;
3. позволить модератору открыть обычный canonical content/context и принять решение самому.

Границы:
1. classifier flag не скрывает, не удаляет и не ограничивает контент автоматически;
2. не создаёт Complaint от имени пользователя;
3. не выдаёт AP-10 measure;
4. не закрывает Help signal;
5. отсутствие/сбой AI не блокирует публикацию или обычную модерацию.

OpenAI Moderation API является текущим бесплатным кандидатом для этой узкой функции, но provider не фиксируется product scope.

### MAI-02 — spam / duplicate candidate detection

Использовать общий semantic/hybrid retrieval foundation из user-AI для:
1. поиска вероятных дубликатов тем;
2. обнаружения массово похожих/повторяющихся сообщений как одного из сигналов спама;
3. показа модератору конкретных похожих targets и объяснимых similarity facts.

Границы:
1. similarity сама по себе не является нарушением;
2. AI не выполняет `confirm duplicate`, hide или sanction;
3. existing Help duplicate lifecycle остаётся authoritative;
4. один retrieval/index foundation используется совместно с user-AI, а не строится отдельный moderation vector corpus.

Это создаёт прямую зависимость между user-AI retrieval и MAI-02.

### MAI-03 — complaint triage brief

Для открытого Complaint Case AI может по запросу модератора сформировать компактный **case brief** из уже доступной ему canonical projection.

Brief может включать:
1. target и его текущее/зафиксированное состояние;
2. количество и распределение complaint reasons;
3. основные утверждения reporters без раскрытия лишних identity;
4. релевантный публичный context;
5. наличие предыдущего/связанного case, Help duplicate/solution state или pending appeal, если эти факты уже доступны reviewer;
6. список фактов, которые требуют ручной проверки.

Brief не должен:
1. выбирать outcome `confirmed/not-confirmed`;
2. выбирать appeal `upheld/overturned`;
3. автоматически менять priority;
4. писать moderator note;
5. запускать Quick actions.

### MAI-04 — evidence/checklist assistant

На full Case review AI может по явному запросу модератора помочь:
1. сопоставить complaint reason с конкретными фрагментами текста;
2. отметить противоречия между reported revision и current revision;
3. указать, какие canonical evidence/context страницы ещё не просмотрены;
4. подготовить **черновой список аргументов/фактов**, но не готовый authoritative Decision.

Цель — сократить механическую работу, не подменять judgment.

## 3. Что не включать в обязательный v1

1. Автоматическое Hide/Restore.
2. Автоматические bans/measures/restrictions.
3. Автоматическое изменение complaint priority на основании AI.
4. Автоматические Complaint Decision или Appeal outcome.
5. Автоматическое подтверждение duplicate/Help signal.
6. Автоматическую публикацию moderator notes или reasoning.
7. Autonomous moderation loop, который сам читает форум и запускает domain mutations.
8. AI-профилирование пользователей, "risk score" аккаунта или скрытый reputation score.
9. Обязательный генеративный анализ каждого сообщения/жалобы.
10. Отдельную AI moderation queue / отдельный audit backend.

## 4. Privacy boundary

### Публичный контент

Для MAI-01/MAI-02 допускается передавать только минимально необходимую текущую публичную projection.

### Complaints и защищённые данные

Private Complaint data требует отдельной provider/data-policy границы.

По умолчанию автоматический внешний AI не получает:
1. reporter identity;
2. moderator notes;
3. private evidence attachments;
4. account/session/auth data;
5. private profile fields;
6. secrets или raw provider payloads.

MAI-03/MAI-04 включаются для private case material только если выбранный provider и Stage-6 data policy явно разрешены владельцем и технический план обеспечивает минимизацию. До этого можно использовать только безопасную урезанную projection; отсутствие полного AI brief не блокирует Complaints workflow.

Изображения/attachments не отправляются внешнему AI в v1 без отдельного будущего решения.

## 5. Human-in-the-loop

1. AI output всегда advisory.
2. Модератор видит исходный canonical content/evidence рядом или по обычной ссылке.
3. Каждая mutation выполняется существующей отдельной moderation action с текущими permission/CAS/History rules.
4. AI output никогда не является authorization, evidence-of-record или заменой reviewer reasoning.
5. Если AI недоступен, весь moderation lifecycle продолжает работать.

## 6. Provenance and freshness

Каждый сохранённый AI signal/brief, если он persisted, должен быть связан с:
1. точным target/revision/case version;
2. task kind;
3. provider/model/version;
4. generation/classification time;
5. policy/version;
6. статусом freshness.

После edit/hide/restore или изменения relevant Case version старый AI result не должен выглядеть актуальным. Stale advisory result можно сохранить для диагностики, но не показывать как current signal.

AI outputs не записываются в canonical Admin/Owner History как domain moderation action. Если нужен operational trace, он хранится отдельно как AI provenance/observation и не подменяет History.

## 7. Бесплатность и provider policy

1. Дополнительные эксплуатационные расходы — $0.
2. Платный fallback запрещён.
3. OpenAI Moderation API сейчас является бесплатным кандидатом для narrow safety classification и не расходует месячные API usage limits по официальной документации.
4. Cloudflare Workers AI имеет бесплатную квоту 10 000 neurons/day, но она общая с другими Workers AI задачами и обязательным переводом; optional moderation generation не может вытеснять translation.
5. Free quota exhaustion → AI assistance недоступна/отложена, но forum moderation работает штатно.
6. Не запускать expensive generation на каждый post по умолчанию. Continuous classification допускается только для достаточно дешёвого classifier и при доказанном budget; generative case assistance — on-demand.

## 8. Multilingual and code boundary

1. Representative acceptance должен включать RU/HE/EN и технические тексты/code snippets.
2. Модель не должна интерпретировать фрагмент кода, shell-команду или quoted exploit как нарушение только из-за наличия опасных токенов без контекста.
3. Provider-specific categories не заменяют существующие Vico complaint reasons; нужен явный mapping/advisory layer.
4. Unknown/unmapped category остаётся сигналом, но не создаёт новый canonical Complaint reason автоматически.
5. Архитектура не hard-code конечный список locale.

## 9. Abuse and prompt-injection boundary

1. Форумный текст и Complaint content — untrusted data.
2. Встроенные инструкции "ignore rules", "ban user", "close complaint" и подобные строки являются контентом, не командами.
3. AI moderation path не получает model-callable domain write tools.
4. Provider output не может выбирать actor, permission или canonical action.
5. External URLs из контента не fetch-ятся AI subsystem автоматически.

## 10. Критерии готовности product scope

Admin/Moderation AI v1 технически корректен, если план обеспечивает:

1. MAI-01 advisory safety signals без auto-enforcement;
2. MAI-02 на общем retrieval foundation с user-AI;
3. MAI-03 on-demand complaint brief без автоматического outcome;
4. MAI-04 evidence/checklist assistance без canonical write;
5. полную работоспособность Attention/Complaints при AI outage;
6. strict permission/projection parity: AI не видит больше текущего reviewer;
7. revision/case-version freshness и provenance;
8. отсутствие второго moderation lifecycle/queue/audit backend;
9. private-data provider gate до внешней обработки protected Complaint material;
10. $0 hard budget, translation priority и no-paid-fallback;
11. representative multilingual/code false-positive acceptance;
12. prompt-injection isolation;
13. никакая AI score/classification не является достаточным основанием для sanction или domain mutation.

## 11. Рекомендация Миры

Для первого релиза:

1. **обязательно:** MAI-01 advisory harmful-content signal;
2. **обязательно:** MAI-02 spam/duplicate candidate detection на общем retrieval foundation;
3. **включить on-demand:** MAI-03 complaint triage brief;
4. **включить on-demand:** MAI-04 evidence/checklist assistant;
5. **не включать:** autonomous enforcement, auto-priority, auto-decisions, AI user risk scoring.

Ключевой принцип: AI сокращает объём чтения и поиска для модератора, но последнее слово и все domain mutations остаются в существующих canonical flows.
