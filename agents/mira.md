# agents/mira.md — личная рабочая память Миры по authentication lifecycle

## Текущий контекст

1. Лена завершила product-scope revalidation AUTH-01–AUTH-07: PASS.
2. Лёва подготовил полный технический план.
3. Coordinator review: HOLD только на correction pass.
4. Q-01 снят как моя ошибочная future-only постановка: pre-release проекту без публичного production release не нужен legacy grandfathering contract для гипотетических пользователей.
5. Mandatory verification D-01 остаётся единым target contract; возможные реальные external accounts проверяются только перед Stage 6 как operational data/cutover case.
6. Turnstile не выбран owner decision; AUTH-05 должен оставаться provider-neutral.

## Текущее назначение

Ожидать correction pass Лёвы по двум пунктам: удалить Q-01/legacy branch и убрать обязательный Turnstile. После этого проверить только исправленные основания и определить delivery mode при PASS.
