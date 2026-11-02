# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–3 завершены и merged в `main`.
- Package 4 реализован в Draft [PR #276](https://github.com/iliya1947/vico-forum/pull/276), новый stable exact head `12d94f308e25f579310b1cf18663697230c10354`, base main `6b653e3ec202e649c3ed48ba442d9a5bf5c64d1f`.
- На предыдущем head `0de025e7` coordinator review Миры был PASS, а independent technical review Лёвы подтвердил один P2: после stale Decision 409 Case loader не revalidate; при конкурентном resolution activity 404 не восстанавливает старый UI. Мира подтвердила finding и назначила Лире bounded correction.
- Лира внесла локальное исправление в **route revalidation policy**: только при Decision 409 React Router повторно загружает Case. Компонент сохраняет draft, outcome, operation nonce и frozen reviewedVersion; при still-open обновлении новое значение принимается только по явному acknowledgement, при resolved Case выводится сохранённый Decision без старой Resolve form. Автоматического retry нет.
- Добавлены regression tests с реальным `createMemoryRouter` для 409 после нового report/note/priority change (проверяют reread, frozen version, draft/outcome, acknowledgement и новый nonce) и после конкурентного resolution другим reviewer (проверяют сохранённый Decision и отсутствие Resolve).
- **Exact-head CI #41473612121 — SUCCESS:** checks/database, 1726/1726 application tests (120 files), 452/452 PostgreSQL tests (36 files), lint без ошибок, typecheck, builds, migration/schema parity. Новых schema, migrations, permissions, domain/API contracts и Package 5+ нет.
- Коррекция прошла авторские автоматические проверки, но **новый coordinator whole-PR review и technical review ещё не выполнены**; их PASS не заявляется. User browser, deployed R2 и production не использовались.
- Следующий шаг: Мира проводит новый coordinator whole-PR review #276 на exact head `12d94f308e25f579310b1cf18663697230c10354`; после coordinator PASS — независимый технический review Лёвы того же head.

## Назначения

- Мира — ChatGPT-5.6 Sol: следующий coordinator whole-PR reviewer.
- Лира — ChatGPT-6: bounded P2 correction завершена; новые реализации до review findings не назначены.
- Лёва — Codex-6.1 Sol: technical reviewer после нового coordinator PASS.
- Марк — Codex-6 Sol: резервный reviewer без назначения.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
