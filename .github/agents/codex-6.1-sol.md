# Лёва — Codex-6.1 Sol

## Выполненное назначение — полный технический план

Подготовить полный технический план bounded-задачи «редактирование заголовка собственной темы» по актуальному main и зафиксированному TOPIC_TITLE_EDIT_SERVICE_PLAN.md.

Исследовать фактическую текущую реализацию title revision/read/write path, ownership/authorization, route/UI, validation, revision/CAS/concurrency, translation currentness/invalidation и необходимые проверки. Определить компактную последовательность реализации и acceptance.

Не реализовывать код. Не расширять scope в admin editing, source-locale correction, другие user actions, UI/UX pass, Stage 6 или external integration.

Если корректное решение требует изменения архитектуры, схемы БД, dependency или публичного контракта, вернуть техническую эскалацию Мире вместо скрытого расширения задачи.

После полного плана STOP для scope/fit review Миры.


## 2026-11-18 — результат технического планирования

Исследован actual main `906d15d896cc3a4f3b7dc9a03f46acd883925d1d`.
Полный предлагаемый план записан в TOPIC_TITLE_EDIT_SERVICE_PLAN.md (§1–9).

Подтверждённые основания решения:
- Title revision primitive уже имеет transaction/CAS/AccountState, но не является
  собственно own-edit command и сам не проверяет topic ownership.
- Title editing отсутствует в ForumWriter, topic action/UI и permission catalog.
- `forum.post.editOwn` документирован только для постов; sourceOwn/Any — только
  correction metadata. Нужен отдельный реальный capability, без edit-any.
- Новый permission невозможен без изменения DB catalog CHECK: это E1, возвращённая Мире.
- `posts.edit` сейчас относится к опубликованным постам: применение к title вынесено в E2.
- Title pointer достаточно сменить; старые translations остаются revision-bound.
  Task publication повторно блокирует/проверяет current topic. Save не должен брать
  task/head locks или вызывать provider.
- Existing forum cooldown читает posts, поэтому один его вызов title-edit spam
  не ограничит. В плане предложен узкий cooldown по title revisions под actor mutex.
- Title-edit source locale для изменённого текста — und; no-op оставляет прежний locale.
- 200 символов — лимит similar-question search, не общий title creation invariant.

План включает собственный typed mutation result/fetcher, frozen expected revision,
explicit rebase, actor/topic isolation и сохранение соседних body/reply editors.
Тестовый маршрут: route/component + реальные PG concurrency/lifecycle/translation
проверки + connected local Worker/Better Auth/Chromium, затем обычный CI.
Это план проверок, а не выполненный acceptance.

STOP: возврат Мире на scope/fit review E1/E2. Код не реализован,
implementation PR не создавался; будущие тесты/CI/browser не запускались.
Независимый технический review возможен после реализации Лирой и coordinator PASS
Миры на том же stable exact head, если Лёва не участвовал в реализации.
