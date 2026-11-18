# История проекта — 2026-11-18: редактирование заголовка своей темы

Исторический snapshot завершённого bounded implementation/CI/review цикла редактирования
заголовка собственной темы. Это **не** source of truth текущего поведения. Текущее состояние —
[PROJECT_STATE.md](../../PROJECT_STATE.md), authorization contract —
[AUTHORIZATION.md](../auth/AUTHORIZATION.md), AP-10 restriction contract —
[ADMIN_PANEL.md](../ADMIN_PANEL.md). Рабочий канал задачи — [service PR #342](https://github.com/iliya1947/vico-forum/pull/342).

## Merge

Implementation [PR #343](https://github.com/iliya1947/vico-forum/pull/343) merged
2026-11-18 08:14 UTC. Проверенный implementation head:
`10321fdae762004ac2d55e9618a89c6c41e0d2ac`; merge commit:
`d8667f630450f702783bbbdb9a3ec14432e75660`.

## Доставленный bounded scope

1. Добавлена отдельная code-backed capability `forum.topic.title.editOwn` с forward
   migration `0067_topic_title_edit_own` и initial grants для built-in
   `user`, `moderator`, `admin`.
2. Изменение разрешено только authoritative автору темы при fresh permission и активном
   аккаунте. Existing AP-10 restriction `posts.edit` блокирует и эту own-content operation;
   новый restriction key не создавался. Bound Owner immunity сохраняет общий AP-10 контракт.
3. Реальное изменение создаёт immutable topic-title revision с `sourceLocale: "und"` и
   CAS переключает current revision. No-op не создаёт revision; stale baseline возвращает
   conflict без автоматического retry.
4. Переводы остаются revision-bound: сохранённый перевод старой title revision не становится
   current для нового текста. Source-locale correction остаётся отдельной capability и не
   даёт права переименования.
5. Отдельный title-edit cooldown, edit-any/admin title editor, drafts/autosave/receipts и
   новая recovery subsystem не добавлялись.

## Проверки

Coordinator whole-PR review Миры и две независимые проверки — Лиры / ChatGPT-6 и
Марка / Codex-6 Sol — завершились **PASS** на одном stable exact head без подтверждённых
current-scope дефектов. На exact head GitHub показывал 17 completed-success check-runs,
включая общий application/database CI и connected `title_browser` flow с реальным built
Worker, Better Auth, PostgreSQL 17 и Chromium. Browser coverage включал author success,
guest/non-author denial, two-tab stale conflict с сохранением введённого текста, reload,
section/search current title и узкий RTL flow.

Owner visual acceptance по прямому решению владельца не являлся gate этого bounded цикла и
остаётся в отдельном позднем UI/UX pass.

## Не выполнено этим циклом

Merge не означает production deployment или применение migration `0067` во внешней БД.
Real Google OAuth/Owner binding, Neon/Hyperdrive, providers/Queues и другие Stage-6 external
действия не выполнялись. Stage 6 остаётся paused до отдельного указания владельца.
