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

## Активное назначение — coordinator U1

Technical plan Лёвы принят: **PASS**. [План](../stages/user-ai/PLAN.md) · [Review](../stages/user-ai/REVIEW.md)

Выбран stacked delivery U1 → U6. Активный bounded-этап — U1 в draft implementation PR `#403`, branch `feature/user-ai-u1`, base `main` `99b40480cb4d777298aafb1ffae7f28cf0c6085d`. Реализатор — Ада.

Business-Мира:
1. не затрагивает ChatGPT-control и Admin/Moderation AI;
2. после author self-check Ады получает stable exact head;
3. сама запускает применимые CI/checks и анализирует результат;
4. проводит coordinator checkpoint U1 против принятого плана;
5. активирует U2 только после PASS U1.

External provider, production resources, secrets и Stage 6 не активированы.
