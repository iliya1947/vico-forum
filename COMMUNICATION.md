Этот файл хранит общий актуальный контекст, существенные факты, ограничения и блокеры задачи.

# Общий контекст

## Установленные факты

1. Authentication lifecycle AUTH-01–AUTH-07 уже принят в repository/local-CI и находится в `main`; внешняя активация остаётся Stage 6.
2. Исследование в `#300` подтвердило реальный synthetic roundtrip обычный ChatGPT → приватный GitHub → GitHub Actions → GitHub → ChatGPT.
3. Worker-путь подтверждён по официальной документации, но отдельный live Worker PoC по решению владельца не требуется на исследовательском этапе.
4. Рекомендованная граница — единый canonical command handler поверх существующей серверной логики; Worker основной, Actions дополнительный исполнитель/резерв доставки при доступных общих зависимостях.
5. Предложения исследования не считаются автоматически утверждённым продуктовым scope.

## Исходные материалы в #300

- comment 7168057405 — первичное исследование AI/ChatGPT integration;
- comment 7169600355 — synthetic Actions roundtrip PASS;
- comment 7174752351 — комбинированная архитектура и границы резервирования;
- comment 7174975650 — финальная коррекция исследования без отдельного Worker PoC.

## Текущее состояние

Утверждён текстовый user journey в отдельном ChatGPT Project. Любая запись следует за объяснением и отдельным сообщением владельца. Для одной задачи допускаются составная последовательность и фиксированная группа целей. Новый план готов к проверке Мирой. Реальный Actions roundtrip подтверждает транспорт. Применимость персонального подключения с нужными разрешениями на аккаунте Plus относится к Stage 6. [Сценарий](research/user-journey-v1.md) · [Технический план](PLAN.md)


## Дополнительные направления из #300

1. Встроенный AI для пользователей форума.
2. AI для администрирования и модерации.

Оба направления выполняются в этом же служебном PR после текущего ChatGPT-control. Они не входят в #399; product scope и technical plan для них определяются отдельно.


## User AI — current product contract

Действующая пользовательская концепция: `research/user-ai-product-concept.md`.

Утверждённые границы:
1. Vico Consultant — навигатор по форуму и поиск правильной темы/раздела/действия, а не универсальный технический советчик.
2. Использование после авторизации; guest видит launcher и auth-gate.
3. Память только текущей консультации; storage boundary заменяемая для будущего persistence.
4. Disclosure layers User → Moderator → Administrator с server-side выбором и наследованием.
5. Floating launcher внизу справа + контекстные входы в того же Consultant.
6. Topic discovery — до трёх релевантных тем с краткой причиной.
7. Summary не отдельная v1-фича: Consultant может естественно суммировать доступную текущую тему по запросу.
8. Старые `research/user-ai-product-scope.md` и `research/embedded-ai-concept-v1.md` помечены superseded и не являются входом для technical planning.

## Admin/Moderation AI scope proposal

Мира завершила вторую product-scope проработку: `research/admin-moderation-ai-product-scope.md`.

Рекомендация v1: advisory harmful-content signals; spam/duplicate candidates на общем retrieval foundation с user-AI; on-demand complaint brief и evidence/checklist assistant. Никаких auto-hide, sanctions, priority changes, complaint decisions или user risk scoring. Private Complaint material имеет отдельный provider/data-policy gate. Это product proposal Миры до решения владельца и общего technical plan.



## User AI consistency checkpoint

28.11.2026: после исправления смешения задач User AI проверен как отдельный product scope. Действующий источник — `research/user-ai-product-concept.md`; старые feature/mixed концепции superseded. Admin/Moderation AI не проверялся и остаётся отдельной следующей product-задачей. Future common technical planning остаётся PAUSED до принятия Admin/Moderation product contract.


## Реестр трёх задач AI-блока

1. ChatGPT-control — отдельная текущая задача #399/#400.
2. User AI — отдельная задача; действующая концепция: `research/user-ai-product-concept.md`.
3. Admin/Moderation AI — отдельная задача; самостоятельная product-проработка ещё не принята.

По прямой команде владельца дальнейшая работа по User AI и Admin/Moderation AI остановлена до нового указания. Сейчас Мира проверяет завершённый Леной Stage A #399.
