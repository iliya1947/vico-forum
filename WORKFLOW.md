# Текущее состояние

Активная работа: архитектура инструкций и устранение дублирования между слоями.

Исполнитель: Мира — ChatGPT-5.6 Sol.

Рабочий PR: #368 — draft, аналитическое рабочее пространство, не предназначено для merge.

Рабочая ветка: `service/mira-instruction-layering-workbench`.

База: `main` @ `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

## Канонические рабочие файлы

1. `USER_INSTRUCTIONS.current.md` — неизменяемый эталон.
2. `USER_INSTRUCTIONS.draft.md` — 42 пункта / 52 semantic guards; 15/15 current User rules FULL.
3. `PROJECT_INSTRUCTIONS.current.md` — неизменяемый эталон.
4. `PROJECT_INSTRUCTIONS.draft.md` — очищенный Project draft: 16 numbered rules + unique project-only unnumbered guards.
5. `AGENTS.current.md` — exact snapshot актуального main AGENTS.
6. `AGENTS.draft.md` — пока идентичен current.

## User layer

- Current coverage: 15/15 FULL.
- Draft является semantic superset current User rules.

## Project layer

1. Current numbered rules: 18.
2. Draft numbered rules: 16.
3. Удалены:
   - current Project 10 — покрыт User 2 + 7;
   - current Project 3 — покрыт AGENTS Review 5/7, а Project 2 требует читать актуальный AGENTS.
4. Удалён общий goal-дубль.
5. Partial interpretation duplicate сокращён до уникального project-context check.
6. Name/model mapping удалён из Project как дубль AGENTS Roles; project-only требование использовать закреплённые имена сохранено ссылкой на AGENTS.
7. Все 16 сохранённых numbered rules совпадают с current дословно.
8. Потерянных Project-specific guards: 0.
9. Current→draft semantic diff обновлён: `research/project-current-vs-draft-diff.md`.
10. Объём Project file: 443 → 347 whitespace words.

## AGENTS layer

- Межслойный анализ завершён: `research/agents-vs-upper-layers-classification.md`.
- DELETE-SAFE из AGENTS только из-за User/Project coverage: 0.
- `AGENTS.draft.md` ещё не изменён.

Проверяющий: не назначен.

Блокер: нет.

Следующий переход: начать отдельный внутренний аудит `AGENTS.current.md` на собственные дубли и безопасные structural merges; первый проход только классификация, без изменения `AGENTS.draft.md`.
