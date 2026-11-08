# История проекта — 2026-11-08: Settings SET-03

Исторический snapshot закрытого implementation-пакета SET-03. **Не является
source of truth для текущего поведения.** Постоянный продуктовый/runtime контракт —
в [`SETTINGS.md`](../SETTINGS.md) и [`EDITOR.md`](../EDITOR.md), текущее
состояние — в [`PROJECT_STATE.md`](../../PROJECT_STATE.md).

## Поставка

- **SET-03 User preferences** реализовал защищённый для authenticated user
  `/:locale/settings/user` внутри существующего Settings shell.
- Тема **System/Light/Dark** переиспользовала browser-wide `vico-theme`
  с синхронизацией Settings, header, OS, вкладок и reload.
- Предпочитаемый язык записывается только для текущей Better Auth session
  в существующий `user.locale` после проверки здорового Runtime LocaleRegistry
  и canonical active locale. Сохранены Origin/expected account protections,
  private/no-store, priority явного URL и fresh root locale negotiation.
- Четыре существующих ключа Editor/code оставлены device-local и
  per-account, с общим адаптером для Settings и реальных mounted/new
  MarkdownEditor/ForumCodeBlock; серверное хранилище не добавлялось.
- Reply/mention notification settings, timezone, translation preference,
  drafts/autosave, accessibility feature package, SET-04–SET-06 и
  производственные интеграции в этот пакет не входили.

## Implementation, correction и review

- [Implementation PR #304](https://github.com/iliya1947/vico-forum/pull/304)
  объединён в `main` 2026-11-08: implementation exact head
  `6c45bb17ea84f1df0bed8a8b8ca4c558ba42edac`; merge commit
  `e985a43f8853c234c96bb4528a9d4dd709361018`.
- После первоначальной coordinator-проверки Лёва подтвердил
  **SET03-LEV-01**: при смене authenticated account на том же mounted route
  прежний unsaved uncontrolled locale select мог перейти к новому аккаунту.
  Это не обход серверной авторизации, но неверное связывание локального
  draft с новой identity.
- Лира привязала locale form к `state.accountId`, сохранив несохранённый
  выбор при навигации в том же аккаунте и сбрасывая его при смене аккаунта.
  Исправление ограничилось одной runtime-строкой и двумя test files.
  Real Chromium/Better Auth/PG проверка Alice → Bob подтвердила, что
  чужой draft не переносится и `user.locale` меняется только после
  собственного явного сохранения нового пользователя.
- [Мира: финальная coordinator whole-PR PASS](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6717151069)
  — **0 подтверждённых current-scope дефектов** на итоговом exact head.
- [Лёва: независимая повторная technical whole-PR PASS](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6717213664)
  — **0 подтверждённых current-scope дефектов**, SET03-LEV-01 закрыт.
  [Финальная readiness-запись](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6717237660)
  передала merge владельцу.

## Exact-head verification

- [CI #42445796066](https://github.com/iliya1947/vico-forum/actions/runs/42445796066)
  — **SUCCESS**: `checks` и `database`, 162/162 application test files,
  2041/2041 tests, lint/typecheck/build, disposable PostgreSQL 17
  и локальный Worker smoke.
- [Chromium #42445796063](https://github.com/iliya1947/vico-forum/actions/runs/42445796063)
  — **SUCCESS**: `settings_browser`, `browser`, `history_browser`.
  В built Worker + Better Auth + disposable PostgreSQL 17 + Chromium
  прошли 12 SET-03 case groups (включая real same-mounted account
  switch) и 17 существующих SET-02 regression groups; EN/RU/HE,
  RTL, keyboard и 320/768/1280 проверены в local runtime.
- Это доказательства **repository/local-CI**, а не deployed/production,
  real Google OAuth, actual Owner binding или owner visual acceptance.

После merge #304 SET-03 implementation закрыт. Следующий по утверждённой
очерёдности SET-04 ещё не назначен; Stage 6 остаётся приостановленным.
