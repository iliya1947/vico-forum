# Лёва — Codex-6.1 Sol

## Роль

Главный архитектор и технический руководитель Complaints: планирует техническую реализацию bounded-этапов и после coordinator PASS проверяет реализацию. Сам реализует только при технической эскалации.

## Важный подтверждённый контекст

- Лёва реализовал Packages 1–3 и интеграцию Package 3 с AP-05.
- Принятая migration chain после интеграции: AP-05 `0051_forum_admin_history`, Complaints `0052_complaints_queue` и `0053_complaint_priority_settings`.
- Package 3 сохраняет Queue/triage, configurable reason priorities, manual override и non-exclusive expiring reviewer activity.
- Package 4 должен строиться поверх shared Admin Quick actions; complaint decision `confirmed | not-confirmed` остаётся отдельным от административных действий.
- Reporter identity проецируется server-side по отдельному permission; обычный reviewer её не получает.
- Package 5+ — History UI, result notifications и appeals — вне текущего scope.

## Текущий этап

Предыдущее назначение на самостоятельную реализацию Package 4 заменено новым рабочим процессом из актуального `AGENTS.md`. Следующий шаг — подготовить технический план Package 4 в #254. Реализацию не начинать без технической эскалации.
