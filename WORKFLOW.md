Этот файл хранит текущее оперативное состояние задачи и следующий переход.

# Workflow

## Активный этап

Все выявленные продуктовые вопросы user journey решены владельцем. Требуется финальная непротиворечивая сверка product contract перед handoff Лёве.

## Назначение

- Координатор и текущий исполнитель: Мира — GPT-5.6 Sol.
- Следующий исполнитель после отдельного handoff: Лёва — Codex-6.1 Sol.
- Implementation PR: `#399`, ветка `feature/chatgpt-forum-control`.
- Служебный PR: `#400`, ветка `service/chatgpt-forum-control`.

## Состояние

1. Capability inventory и административный read/write scope v1 сохраняются.
2. Утверждённый user journey: `research/user-journey-v1.md`.
3. Обычная эксплуатация идёт в отдельном ChatGPT Project через обычный текстовый разговор.
4. Read выполняется сразу.
5. Любой write: ChatGPT объясняет конкретное действие и существенные последствия → Owner отдельно подтверждает → только затем dispatch.
6. Отдельная форма, plugin UI, browser extension или переход в веб-панель на каждую команду не входят в UX v1.
7. GitHub/Worker должны оставаться невидимой транспортной инфраструктурой в обычной эксплуатации.
8. Отдельный cryptographic/UI confirmation layer не является продуктовым требованием; server-side identity/authorization/resource/CAS/replay checks остаются обязательными.
9. Предыдущий PLAN Лёвы не считается принятым и должен быть переработан под этот user journey.
10. `#399` остаётся пустым; реализация и CI не начаты.

## Следующий переход

Мира выполняет финальную сверку TASK/user journey/product scope/decisions после последнего решения. При PASS — отдельным следующим этапом передаёт Лёве обновлённый product contract на полный технический replan.
