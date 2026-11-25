# AUTH-03 — реализация и проверяемые результаты

## Реализация и запуск проверок

Draft PR #392 поверх принятого AUTH-02b #391 (`a668fd6d3b0df99056d517a3b2d2a4fe7cef0180`). Current head `cb40e15b6ede72a23b40807cd6de2942d661c893`. AUTHOR PASS ожидает exact-head CI и applicable acceptance.

- Canonical HTTP/direct credential recovery использует neutral forgot, lifecycle mail и terminal budgets, proof с неизменяемым subject и generation, атомарные consume, password update, invalidation и отзыв сессий. Reset не выдаёт сессию.
- Google-only password creation подключён из Settings Account. Fresh session, expected user/session, current email и mail proof перепроверяются перед записью. Исходная сессия сохраняется, остальные собственные сессии отзываются. Google остаётся связанным. Native direct setPassword без proof закрыт.
- Canonical sign-in и ранее существовавшая change-password защищены от interleaving со сбросом. Native credentials, правила сессии и лимиты Better Auth сохранены. PostgreSQL race fixtures проверяют обе операции, когда reset первым получает lock.
- Forgot/reset и Settings используют POST для чувствительных полей. Proof в fragment не уходит в HTTP-запрос и удаляется после in-memory capture. EN/RU/HE локализованы. Синтетическая почта использует существующую fake transport boundary.
- Migration 0076 расширяет закрытый CHECK attempt operations. После proven commit публикуются password reset/method link facts и фактические session deletion receipts. Manifest parity на PG17 прошла для 76 таблиц.

Локально пройдены focused typecheck/lint, native PostgreSQL reset/create/replay/rollback/race tests, существующие Account Security и password-change tests. Connected Worker / системный Chromium подтвердили два полных потока на интеграционном diff до финального scrub ineligible Settings view. Новые exact-head запуски проверяют опубликованный head. AUTH-04 и внешние провайдеры остаются на паузе.
