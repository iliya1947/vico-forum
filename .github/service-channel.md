# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–5 merged в main; current main/base: `284bee3f5f0899cce1dc751cf4e9ef169739a120`.
- Package 6 implementation: Draft PR #279, stable exact head `c38b036b2ecb080735e6eaf4fcca5416a7aebc62`.
- Exact-head CI #41559889094 attempt1 SUCCESS (checks/database), независимо проверен Лёвой.
- Coordinator whole-PR review Миры этого head завершён PASS.
- Independent technical whole-PR review Лёвы этого же head завершён **CHANGES REQUIRED: 2 подтверждённых P3 findings**.
- [Полный результат и handoff Мире #6593499774](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6593499774).

## Package 6 — утверждённый product scope

1. Одновременно одна pending Appeal на initial Decision.
2. Eligibility следующей Appeal определяется current effective outcome.
3. Общий лимит — три Appeal на initial Decision; любой eligible reporter может занимать reporter-side slot, включая повтор того же reporter.
4. После каждого Appeal result уведомление через общий inbox получают affected author + все реальные reporters с recipient dedup.
5. Original Decision immutable; effective outcome выводится из initial Decision + resolved Appeals.
6. Предпочтителен reviewer, отличный от автора initial Decision, без hard deadlock.

## Подтверждённый correction package

Мира независимо перепроверила оба findings Лёвы против exact head, P4 control и утверждённого Package 6 техконтракта. Оба являются реальными дефектами текущего Package 6, а не будущим заделом.

- **P6-UI-01 / P3:** Appeal review не показывает already-available target kind/current topic title; group2 также теряет target kind. Actual Worker SSR visible-text check на post/title Cases и P4 control подтвердили потерю существующего контекста. Исправление локально в presentation/регрессиях, без схемы/новых прав.
- **P6-UI-02 / P3:** обе новые формы отображают typed unavailable/forbidden/notFound как invalid reason/explanation. Rendered React Router/jsdom с реальными actions подтвердил unavailable503 → “Check the reason and explanation.” Требуется localized Appeal feedback по server classification с сохранением draft/nonce/status.
- Previous coordinator findings P6-RTL-01 / P6-VERIFY-01 / P6-VERIFY-02 закрыты; повторно открытыми не считаются.
- Иных подтверждённых current-scope дефектов на проверенном head не найдено.

## Проверенная evidence и ограничения

Лёва локально выполнил115 application/route tests,73 native PostgreSQL17 tests, production build; дополнительные independent probes проверили28-row queue,60-row mixed inbox и concurrent resolution двумя разными reviewers. Actual Worker+session+PermissionResolver+PostgreSQL HTTP проверил three-slot flow, repeated reporter, outcome flips, replay, participant/appeal-only/privacy/resource boundaries и notification targets/dedup. Implementation не менялся.

Browser/owner visual acceptance не выполнялись и не заявляются; сохранена coordinator-классификация этого ограничения. Full CI independently verified через exact-head GitHub API; локально не заявляется повтор полного CI. Preview/PG/temporary auth vars/dependency symlinks удалены.

## Назначения и следующий шаг

- Мира — ChatGPT-5.6 Sol: независимая проверка P6-UI-01 / P6-UI-02 завершена; оба подтверждены current-scope. Correction assignment ещё не опубликован.
- Лира — ChatGPT-6: ожидает coordinator assignment, нового назначения ещё нет.
- Лёва — Codex-6.1 Sol: independent technical review завершён, реализацию не меняет.
- Марк — Codex-6 Sol: без назначения.
- После corrections — новый coordinator whole-PR review stable exact head; после PASS — independent technical review того же head. Package7+, merge и production вне этого handoff.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
