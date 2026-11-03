# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages1–5 merged в main; current main/base: `284bee3f5f0899cce1dc751cf4e9ef169739a120`.
- Package6 implementation: Draft PR #279, final stable exact head `5494fe92dc5cc8b3fed87db5efcc9bc98b2f1731`.
- Exact-head CI #41571491052 attempt1 SUCCESS, checks/database; head/jobs/steps независимо проверены Лёвой.
- Coordinator review Миры: PASS, 0 confirmed current-scope defects.
- Independent technical whole-PR review Лёвы того же final exact head: **PASS, 0 confirmed current-scope defects**.
- [Полный independent результат и handoff Мире #6594813068](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6594813068).

## Утверждённый Package6 scope

1. Одна pending Appeal на initial Decision.
2. Eligibility по current effective outcome: confirmed→author, not-confirmed→reporters; upheld сохраняет, overturned меняет текущий итог.
3. Общий лимит3 Appeal на initial Decision; повтор того же eligible reporter разрешён.
4. Каждый result атомарно уведомляет affected author и всех actual reporters через общий inbox с dedup.
5. Initial Decision immutable, effective outcome выводится из resolved Appeals.
6. Другой initial reviewer предпочтителен, hard deadlock не допускается.

## Закрытые findings и доказательства

- P6-UI-01 CLOSED: target kind в group2/review и current topic title с registry lang/dir восстановлены; actual Worker SSR и rendered EN/RU/HE regressions прошли.
- P6-UI-02 CLOSED: обе формы показывают отдельные localized invalid/conflict/forbidden/notFound/unavailable, сохраняя status/draft/nonce/target; rendered actions/errors/retry regressions прошли.
- P6-DOC-01/02 CLOSED: PROJECT_STATE без transient PR/review snapshots, repository migration history0055 соответствует forward migration.
- Previous P6-RTL/VERIFY findings остаются закрытыми.
- Новый локальный pass:164 application/route/rendered tests, production build, actual Worker+session+PermissionResolver+PostgreSQL HTTP three-slot flow и corrected metadata EN/RU/HE — PASS.
- DB/drizzle/workers tree hashes совпадают с прежним reviewed head c38b036. Previous native73 tests, populated upgrade/concurrency/rollback и дополнительные28-row queue/60-row inbox probes учитываются как unchanged-code evidence; повторно выполненными в final pass не заявляются.
- Browser/Chromium и owner visual acceptance не выполнялись и не заявляются; developer restriction/coordinator classification сохранены. Full CI независимо подтверждён API; полный local CI повторно не запускался.
- Implementation не менялся. Temporary preview/PG/container/symlink/auth vars убраны.

## Назначения и следующий шаг

- Мира — ChatGPT-5.6 Sol: coordinator closeout final exact head и дальнейший owner merge route.
- Лира — ChatGPT-6: implementation/corrections завершены; без нового назначения.
- Лёва — Codex-6.1 Sol: independent review завершён PASS; реализацию не меняет.
- Марк — Codex-6 Sol: без назначения.
- Merge/production/Package7 не выполнялись. После implementation change требуется новый review cycle по текущему регламенту.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
