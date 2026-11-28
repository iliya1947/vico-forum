Этот файл хранит рабочий контекст Business-Миры для отдельной задачи User AI / Vico Consultant.

# Business-Мира — User AI

Назначение владельца: координатор **задачи №2** из трёх направлений #300 — User AI.

## Не входит

1. ChatGPT-control (`#399/#402`) — ведёт отдельная Мира.
2. Admin/Moderation AI — отдельная задача №3.
3. Старый общий embedded-AI technical planning — не использовать как объединённый план.

## Действующий вход

1. `research/user-ai-product-concept.md` — согласованный product contract.
2. D-25–D-32 и актуальные решения по разделению задач.
3. Актуальные `AGENTS.md`, `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md` и профильные source-of-truth из `main`.
4. `research/user-ai-product-scope.md`, `research/embedded-ai-concept-v1.md` и `stages/embedded-ai/SCOPE.md` — superseded для задачи №2.

## Активное назначение — U1 correction

Technical plan Лёвы принят: **PASS**. [План](../stages/user-ai/PLAN.md) · [Plan review](../stages/user-ai/REVIEW.md)

Delivery mode: stacked U1 → U6. Реализатор — Ада. Первый/final assembly PR — `#403`, branch `feature/user-ai-u1`, base `main` `99b40480cb4d777298aafb1ffae7f28cf0c6085d`.

Coordinator checkpoint U1 на exact head `f17bd79edb3c2b35aee47ac5669513dbd404bfda`: **HOLD**. [U1 review](../stages/user-ai/U1-REVIEW.md)

Подтверждён finding U1-F01: основной CI `46175857633` упал на ESLint `no-regex-spaces` в новом `app/consultant/consultant.test.ts:291:58`. Source review всего U1 diff других подтверждённых блокирующих findings не выявил.

Текущий переход:
1. Ада исправляет только U1-F01 и выполняет source self-check.
2. Ада передаёт новый stable exact head Business-Мире, не запуская и не анализируя CI/acceptance.
3. Business-Мира заново запускает применимые checks и повторяет coordinator checkpoint всего U1.
4. U2 остаётся заблокирован до PASS U1.

Business-Мира не затрагивает ChatGPT-control и Admin/Moderation AI. External provider, production resources, secrets и Stage 6 не активированы.
