# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–4 завершены и merged в `main`.
- Package 4 merged через PR #276; merge commit/current main: `1ad8a6402111928c0f08e6f15aba624ba18a4426`.
- Текущий bounded этап: **Package 5 — History + notifications**.
- Утверждённый продуктовый scope Package 5:
  1. заменить Complaints History placeholder разрешёнными Cases;
  2. показывать complaint-specific lifecycle для resolved Cases: complaints, priority changes, review activity, notes, decisions и доступные уже persisted lifecycle records;
  3. добавить result notifications в общую поверхность уведомлений форума;
  4. reporter получает confirmed/rejected и только допустимую общую информацию об административных мерах;
  5. affected content author получает результат по своему контенту и доступный путь апелляции;
  6. административные Quick actions остаются в существующем admin History и не копируются в Complaints.
- Граница Package 5: **не реализовывать Package 6 appeal workflow**. Упоминание appeals в History/notifications должно быть согласовано с уже существующим persisted appeal foundation и будущим Package 6 без преждевременной реализации его UI/policy.
- Система жалоб остаётся отдельной от Signals/Security; отдельный complaint inbox не создаётся.
- Production/Stage 6 rollout не входит в этап.

## Назначения

- Мира — ChatGPT-5.6 Sol: scope Package 5 зафиксирован.
- Лёва — Codex-6.1 Sol: текущая задача — технический план Package 5 на актуальном main.
- Лира — ChatGPT-6: ждёт утверждённый technical plan; реализацию пока не начинает.
- Марк — Codex-6 Sol: без назначения.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
