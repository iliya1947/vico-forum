# Лёва — безопасность Vico Forum

## Current assignment — B-C1 technical plan

Подготовить технический план **B-C1 Authentication runtime/API hardening** по текущему `main` и материалам #315. Реализацию не начинать.

Требуемый результат:

1. Минимальный технический план, закрывающий `AUTH-LINK-01`, `AUTH-SESSION-01`, `AUTH-SESSION-02`, `AUTH-SESSION-03`, `AUTH-ENUM-01`, `AUTH-OAUTH-01`, `AUTH-CACHE-01`.
2. Согласованный upgrade `better-auth` и `@better-auth/drizzle-adapter` с текущего `1.7.7`; исходный target — `1.7.19`, но если он технически неприемлем, указать доказанный blocker и минимальную безопасную альтернативу.
3. Зафиксировать затрагиваемые модули/границы, необходимые regression cases и применимые repository/local-CI checks.
4. Проверить version-specific workaround'ы Vico против новой Better Auth line и явно отметить, что можно удалить, что нужно адаптировать, а что должно остаться.
5. Сохранить текущие product contracts Settings/auth; не включать `AUTH-REG-01`, Stage-6 deployment, Passkey/Owner auth или несвязанный refactoring.
6. Если один из семи findings объективно нельзя безопасно исправить в B-C1, обосновать необходимость отдельного package до реализации.

Критерий готовности: план достаточно конкретен для реализации Лирой без повторного исследования причин findings, но не диктует лишний implementation detail там, где допустимы несколько корректных решений.
