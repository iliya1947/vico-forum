Этот файл хранит текущее оперативное состояние задачи и следующий переход.

# Workflow

## Активный этап

Stage B принятого `PLAN.md` **активирован**. Реализация идёт отдельной stacked-ступенью `#402`, ветка `feature/chatgpt-forum-control-stage-b`, base — принятый Stage A `#399` exact head `ce85db5f4ae7bc33992174cc6ae69b47da0bf2cd`. Текущий head `#402` — `94fb002e8726f842833b3965f1b2bee362fe572e`: реализованы и локально проверены закрытый transport wire и GitHub App/webhook boundary. Durable registration/Worker/Overview/receipt ещё не подключены.

## Назначение

- Координатор — Мира.
- Автор принятого технического плана — Лёва.
- Исполнитель Stage B — Лена (GPT-6.2); следующий checkpoint после её author self-check — Мира.
- Stage A / финально собираемый первый PR — #399, ветка `feature/chatgpt-forum-control`.
- Stage B implementation PR — #402, ветка `feature/chatgpt-forum-control-stage-b`, base `feature/chatgpt-forum-control`.
- Служебный PR — #400, ветка `service/chatgpt-forum-control`.

## Состояние

1. Product contract согласован; новый `PLAN.md` прошёл полную проверку Миры: PASS. [Проверка](research/plan-review-mira.md)
2. F-01 закрыт: каждый MCP tool самостоятельно проводит запрос через собственный server/GitHub path и не зависит от другого plugin/connector.
3. Delivery mode — stacked A → I по этапам принятого `PLAN.md`; первый implementation PR — `#399`.
4. Account-specific Site/OAuth/write-approval behavior остаётся обязательным Stage-6 gate. Информация не проверена до разрешённой внешней проверки.
5. Stage A coordinator checkpoint: **PASS**. CI run `46148681007` — success; Forum control local OAuth Chromium acceptance run `46149123687` — success; оба на exact head `ce85db5f4ae7bc33992174cc6ae69b47da0bf2cd`.

## Следующий переход

Лена продолжает Stage B в `#402` с head `94fb002e8726f842833b3965f1b2bee362fe572e`: связать готовый GitHub transport с durable PostgreSQL registration/acceptance/claim/receipt lifecycle, Worker ingress и одним canonical Admin Overview reader; провести сквозной локальный fixture и author self-check. Контекст — последний раздел `agents/lena.md`. Внешние credentials не используются; ingress остаётся выключен штатной конфигурацией. После author self-check Лена передаёт stable exact head Мире. CI/acceptance запускает и анализирует только Мира. Stage C до coordinator PASS Stage B не начинать.

## Параллельные AI product-tracks

1. **User AI / Vico Consultant** — technical plan принят: PASS; выбран stacked U1 → U6. Активирован U1 в draft implementation PR `#403`; координатор — Business-Мира, реализатор — Ада. Задача ведётся отдельно от ChatGPT-control и Admin/Moderation AI.
2. **Admin/Moderation AI** — полная product concept proposal подготовлена в `research/admin-moderation-ai-product-concept.md`; ожидает решения владельца.
3. Ни один из этих product-tracks не расширяет Stage A–I ChatGPT-control и его implementation PR.


## User AI — U1 implementation

**АКТИВЕН как самостоятельная задача №2.**

- Coordinator: Business-Мира.
- Accepted plan: `stages/user-ai/PLAN.md`; review: `stages/user-ai/REVIEW.md`.
- Delivery mode: stacked U1 → U6.
- Implementer: Ада.
- First/final assembly PR: `#403`, branch `feature/user-ai-u1`, base `main` `99b40480cb4d777298aafb1ffae7f28cf0c6085d`.
- Initial setup head: `f121b1c775b7c454fb84a8b2d67d52e97dd6247e`.

Текущий scope U1: live session/AccountState guards, current permission/disclosure snapshot, capability-filtered knowledge catalog, server-built canonical links и deterministic navigation без LLM/provider calls.

Не входят: launcher/dialog UI, consultation store, semantic index/retrieval, database migrations, Workers AI, production/Stage 6, U2+, ChatGPT-control и Admin/Moderation AI.

После source self-check Ада передаёт stable exact head Business-Мире, не запуская и не проверяя CI. Business-Мира запускает применимые checks и проводит coordinator checkpoint. U2 не начинать до PASS U1.

## Зафиксированные три направления AI-блока

По прямому уточнению владельца три направления из #300 ведутся как отдельные задачи:

1. **ChatGPT-control** — управление Vico Forum владельцем из обычного ChatGPT; текущая активная реализация #399.
2. **User AI** — встроенный пользовательский консультант/навигация по форуму; product concept согласован отдельно.
3. **Admin/Moderation AI** — отдельная активная product-задача; исходный scope широкий: определить практически полезные встроенные AI-функции для администрации/модерации, не ограничиваясь прежними примерами. Первый шаг — factual workload map — завершён.

User AI ведётся отдельной Business-Мирой как самостоятельная задача №2; план Лёвы принят, stacked U1 → U6 выбран, Ада реализует активный U1 в #403. Общий смешанный embedded-AI technical planning не возобновляется. Admin/Moderation AI остаётся отдельной задачей №3. ChatGPT-control ведётся текущей Мирой отдельно.


## Admin/Moderation AI — product concept

Product discovery завершён до полной концепции-предложения Миры: `research/admin-moderation-ai-product-concept.md`.

Модель: advisory Vico Staff AI = Radar + Context Assistant. Рекомендуемый минимальный release scope: Public Safety Radar, Complaint/Appeal Brief, Admin/Owner Analyst; Related/Placement Helper включается при наличии общего лёгкого retrieval foundation. AI не получает write authority, protected/private data ограничены отдельными tiers, generative staff functions on-demand, paid fallback отсутствует.

Статус: **ожидает решения владельца по концепции**. Technical planning и implementation не начинать до принятия product concept.
