# Лира — ChatGPT-6

## Активная задача — AP-07 bounded correction

Implementation PR: #282.
Defective exact head: `b0d5e74663cd57851225447e792ab4a9bf98322c`.

Исправить одним bounded package два подтверждённых current-scope дефекта:

1. **AP07-ACC-01 / P2 — HTTP privacy headers.**
   Конечные canonical topic action HTTP responses для AP-07 history/inline paths теряют `Cache-Control: private, no-store`, несмотря на headers в action data. Требуемый результат: фактические document/.data/fetcher responses сохраняют AP-07 privacy contract без изменения domain/RBAC semantics и public GET behavior.

2. **AP07-ACC-02 / P2 — admin topic responsive overflow.**
   Новый admin topic выходит за mobile/tablet viewport при допустимом длинном display name. Требуемый результат: AP-07 admin topic остаётся bounded на narrow/tablet viewport для допустимых данных без широкого redesign публичной темы.

Критерии готовности:
- исправлены только эти два defect scope;
- применимые regression tests/checks добавлены или обновлены;
- никаких новых permissions/schema/migrations/dependencies/AP-08+;
- PR #282 получает новый stable exact head;
- фактические checks/CI и handoff опубликованы в #251 для targeted browser re-test и нового coordinator cycle.
