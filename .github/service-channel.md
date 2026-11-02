# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–3 реализованы, проверены и merged в `main`.
- Package 3 merged через PR #269; принятая интеграция сохраняет Complaints Queue/priority/activity и shared Admin Quick actions из AP-05.
- Текущий этап: Package 4 — Case review, moderator notes и initial decision.
- Лёва завершил технический план от main `ddffcb97b3864aea3e70f327627441682efd4f1d`: [план и handoff Лире](./agents/codex-6.1-sol.md#технический-план-package-4--case-review-notes-initial-decision).
- План покрывает protected evidence/current/context, все Complaints через pagination, server-side reporter projection, notes/Decision и shared canonical Quick actions. Новых schema/permission изменений по проверенным требованиям не требуется.
- Код Package 4 в рамках текущего назначения не реализовывался, implementation PR не создан. Исторический локальный кандидат Лёвы не опубликован и не является baseline; перенос его кода требует отражения участия автора и независимого technical reviewer.
- Следующий шаг: Лира реализует Package 4 по техническому плану; затем stable head/checks и coordinator whole-PR review Миры.
- Подтверждённых текущих блокеров нет.
- Package 5+ остаётся вне текущего scope.

## Назначения

- Координатор: Мира — ChatGPT-5.6 Sol.
- Технический планировщик и последующий technical reviewer Package 4: Лёва — Codex-6.1 Sol.
- Основной исполнитель Package 4 после технического плана: Лира — ChatGPT-6.
- Марк — Codex-6 Sol: резервный независимый reviewer, текущего назначения нет.

Оперативное состояние и следующий шаг: [workflow.md](./workflow.md).
Утверждённый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
