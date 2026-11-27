Этот файл фиксирует цель, границы и критерий завершения задачи управления Vico Forum из обычного ChatGPT.

# Задача

## Цель

Дать владельцу Vico Forum возможность из обычного ChatGPT читать необходимое состояние форума и выполнять утверждённые административные действия через защищённый канал, не создавая второй административный backend и не обходя существующие серверные полномочия.

## Установленные границы

1. Дополнительные эксплуатационные расходы — $0.
2. Обычная эксплуатация не должна расходовать Work/Codex allowance.
3. Транспорт строится через приватный GitHub; Cloudflare Worker — основной кандидат для коротких команд, GitHub Actions — дополнительный исполнитель/резерв доставки там, где это действительно применимо.
4. Канал обязан переиспользовать существующие canonical domain commands, актуальную identity/authorization и History.
5. Прямой SQL, подставленный actor, отдельная копия RBAC/Owner-логики и второй административный backend запрещены.
6. Actions не считается независимым failover при недоступности общей зависимости Cloudflare/БД/API.
7. Встроенные пользовательские AI-функции форума в эту задачу не входят.
8. Реальная внешняя активация, production secrets и deployed acceptance выполняются только в Stage 6 после отдельного разрешения владельца.

## Scope

Полный продуктовый scope v1 определён в `research/product-scope-v1.md`.

Краткая граница:

1. Read scope охватывает Forum/Admin, structure/content moderation, Users/authorization/measures, Complaints, Admin History, все 12 реализованных Super-admin Monitoring areas и Event log, а также административные registration/authorization settings.
2. Write scope использует только уже существующие canonical domain operations.
3. Любой write в обычной эксплуатации проходит разговорный цикл: ChatGPT объясняет конкретную команду и существенные последствия → владелец отдельно подтверждает → только после этого команда отправляется.
4. High-impact operations требуют более подробного объяснения последствий, но отдельный plugin/UI/cryptographic confirmation layer не является продуктовым требованием.
5. Arbitrary SQL/shell/fetch, generic command escape hatch, отсутствующие domain capabilities, production infrastructure control, account reactivation/hard-delete/foreign credentials/sessions и пользовательские AI-функции исключены.
6. Forum/user-generated content считается untrusted data и никогда само по себе не формирует mutation intent.
7. Mutations обязаны иметь replay protection и честно различать committed/denied/conflict/unavailable/outcome-unknown без автоматического повтора stale/unknown операций.

## Критерий завершения

1. Продуктовый scope и критерии готовности зафиксированы в `research/product-scope-v1.md`.
2. Лёва подготовил полный технический план задачи на основе этого scope.
3. Реализация выполнена в назначенном implementation PR `#399` и прошла предусмотренный review cycle.
4. Repository/local-CI acceptance подтверждает authoritative permission/resource/CAS boundaries, закрытый command registry, untrusted-content isolation, replay/duplicate safety и корректную обработку stale/outcome-unknown; conversational explain→confirm policy проверяется на уровне ChatGPT Project/integration acceptance.
5. Постоянная документация и PROJECT_STATE обновлены отдельным docs PR, если фактическое состояние проекта изменилось.
6. Любая реальная внешняя активация выполнена только при отдельном Stage-6 разрешении.
