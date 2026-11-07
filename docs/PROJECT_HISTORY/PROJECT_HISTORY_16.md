# История проекта — 2026-11-07: single-Owner bootstrap decision

Датированная запись о завершении продуктовой границы owner/authorization redesign.
Не является source of truth для текущего поведения и не подтверждает deployed
Google OAuth, Owner binding, production rollout или owner visual acceptance.
Актуальные требования — в [`AUTHORIZATION.md`](../auth/AUTHORIZATION.md) и
[`ADMIN_PANEL.md`](../ADMIN_PANEL.md), состояние — в
[`PROJECT_STATE.md`](../../PROJECT_STATE.md).

- После внедрения Owner authority в Stage 1–2 (implementation PR #294/#296,
  docs PR #295/#297, merged в `main`) владелец определил финальную
  bootstrap product boundary. Решения зафиксированы в служебном PR #251:
  комментарии #6704864380, #6704951180 и handoff #6704973951.
- Vico Forum имеет ровно одного Owner — разработчика. Разработчик входит
  в форум через Google; после Google sign-in серверная Owner binding
  указывает на точный внутренний Better Auth `user.id` этого аккаунта
  через `VICO_OWNER_USER_ID`.
  Google email, имя, provider claim или обычная роль не дают Owner authority.
- Transfer, multiple Owners, successor и recovery-to-another-person UI/API
  не утверждены. First-admin/first-manager grant/bootstrap и отдельная
  application-функция для новой Owner identity не нужны. Более широкое
  восстановление после потери/компрометации, помимо доступа тому же Owner,
  возможно только по новому решению владельца.
- Текущие server-bound authority, effective-vs-raw authorization, Owner
  immunity и Owner-only elevated gate уже реализованы в repository/local-CI;
  этот документационный closeout не меняет runtime, tests, schema,
  migrations, workflows или инфраструктуру.
- Настройка реального Google OAuth, выбор подтверждённого внутреннего
  аккаунта разработчика, server-only Owner binding и deployed acceptance
  остаются Stage 6. После merge финального docs-only PR owner/authorization
  redesign закрывается в repository/local-CI; Settings — следующая
  отдельная продуктовая задача, но не часть этого closeout.
