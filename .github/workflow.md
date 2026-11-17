# Workflow — edit own topic title

## Текущее состояние

- Задача: редактирование заголовка собственной темы.
- Этап: реализация и проверки завершены; ожидается coordinator whole-PR review Миры.
- Координатор: Мира / ChatGPT-5.6 Sol.
- Технический планировщик: Лёва / Codex-6.1 Sol; план завершён.
- Исполнитель: Лёва / Codex-6.1 Sol; реализация и локальная проверка завершены.
- Следующий участник: Мира / ChatGPT-5.6 Sol — coordinator whole-PR review stable exact head.
- Лира / ChatGPT-6: снята с реализации этой задачи.
- Независимый reviewer после coordinator PASS: Марк / Codex-6 Sol, так как Лёва участвует в реализации.
- Implementation PR: #343 — https://github.com/iliya1947/vico-forum/pull/343.
- Stable implementation head: `10321fdae762004ac2d55e9618a89c6c41e0d2ac`.
- Проверенный main: `906d15d896cc3a4f3b7dc9a03f46acd883925d1d`.
- Local checks: 2594 application/unit + 1417 PostgreSQL 17 tests PASS; lint/typecheck/build/UI-preview/migration metadata/manifest PASS; connected browser PASS.
- GitHub CI: 13 из 13 workflows PASS на head `10321fdae762004ac2d55e9618a89c6c41e0d2ac` (общий CI run 44201847789; title browser run 44201847917).

## Принятый scope

- Новый permission `forum.topic.title.editOwn` + forward catalog migration/default grants.
- Server-side session/permission/ownership, active-account admission, immutable revision и CAS обязательны.
- Новый изменённый title получает `sourceLocale: "und"`; старые translations остаются revision-bound.
- Existing user-measure restriction `posts.edit` блокирует и title edit; нового restriction key нет.
- Отдельный title-edit cooldown не добавляется.
- Отдельные drafts/receipts/autosave/recovery subsystem не добавляются.

## Следующий шаг

Мира проверяет весь принятый scope PR #343 на указанном stable exact head. При current-scope дефектах возвращает их исполнителю одним пакетом. После coordinator PASS Марк выполняет независимую техническую проверку того же exact head; Лёва собственный whole-PR review не проводит.

После review/merge отдельным заключительным docs PR обновляются permanent authorization/AP-10 contract и фактический PROJECT_STATE.md. Этот implementation PR не содержит служебных/постоянных документов задачи.

Служебный PR #342 не merge в main.
