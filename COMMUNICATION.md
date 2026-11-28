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


## User AI scope proposal

Мира завершила первую product-scope проработку: `research/user-ai-product-scope.md`.

Рекомендация для v1: semantic/hybrid Search + similar topics/solutions как обязательный общий retrieval result; on-demand question-authoring helper как bounded optional; AI chat/auto-post/thread summaries отложить. Это пока product proposal Миры до решения владельца и общего technical plan.


## Admin/Moderation AI scope proposal

Мира завершила вторую product-scope проработку: `research/admin-moderation-ai-product-scope.md`.

Рекомендация v1: advisory harmful-content signals; spam/duplicate candidates на общем retrieval foundation с user-AI; on-demand complaint brief и evidence/checklist assistant. Никаких auto-hide, sanctions, priority changes, complaint decisions или user risk scoring. Private Complaint material имеет отдельный provider/data-policy gate. Это product proposal Миры до решения владельца и общего technical plan.


## Embedded AI product alignment

Оба research-файла остаются предложениями Миры, а не утверждённым scope:
1. `research/user-ai-product-scope.md`;
2. `research/admin-moderation-ai-product-scope.md`.

Technical planning Лёвы поставлен на паузу. Следующий этап — последовательное согласование product decisions с владельцем; после этого будет собран утверждённый embedded-AI contract и только затем возобновлён technical plan.

## Embedded AI product concept

Предыдущие `research/user-ai-product-scope.md` и `research/admin-moderation-ai-product-scope.md` сохраняются как ранний feature inventory, но не являются product contract.

Новая целостная концепция: `research/embedded-ai-concept-v1.md`.

Центр user experience — приватный Vico AI Consultant: решает проблему через форумные знания + потенциально общие знания модели, показывает forum sources, объясняет текущие темы/ответы и при отсутствии решения переводит консультацию в качественный вопрос людям. Search/similar/editor/summary — capabilities этого journey, а не независимые AI-продукты.

Moderation AI — отдельный permission-scoped copilot и advisory signal layer; он не разделяет protected context с User Consultant и не получает domain-write authority.

Концепция пока proposal Миры. Technical planning Лёвы остаётся PAUSED до последовательного решения владельцем продуктовых развилок.
