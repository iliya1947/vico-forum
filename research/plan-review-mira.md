Этот файл фиксирует проверку Мирой технического плана Лёвы перед выбором режима поставки.

# Проверка технического плана — 27.11.2026

## Итог

**HOLD.**

План проверен целиком против `TASK.md`, `research/product-scope-v1.md`, `research/capability-inventory.md`, актуального `main` и текущей официальной документации внешних платформ. Все read/write семейства scope v1, sensitive-классификация, replay/result semantics, atomic receipt, Stage-6 boundary и $0-ограничения в целом покрыты. До реализации остаётся один блокирующий дефект текущего технического решения.

## F-01 — основной ChatGPT→GitHub delivery path зависит от запрещённой cross-plugin orchestration

### Что записано в PLAN

Раздел 1 строит основной путь так:

1. Site-hosted personal plugin/component готовит и подписывает intent.
2. Component вызывает `sendFollowUpMessage`.
3. После этого штатное GitHub-подключение в обычном ChatGPT должно опубликовать `requestRef` в приватный inbox.
4. GitHub webhook допускает Worker к исполнению.

Также PLAN предполагает один model-callable entry, который открывает component и передаёт draft/read/result context.

### Почему это реальный дефект текущей задачи

Актуальная официальная документация OpenAI для Plugins требует:

1. Каждый public tool должен работать самостоятельно.
2. Нельзя инструктировать модель вызвать другой plugin/connector для завершения операции; обязательные зависимости должны быть реализованы внутри собственного plugin.
3. Каждая model-callable operation должна быть отдельным tool; generic executor/discovery surface для неявно выбираемых операций не допускается.
4. `window.openai.sendFollowUpMessage` только просит ChatGPT опубликовать сообщение, authored by component. Это не контракт автоматического вызова GitHub connector и не гарантия записи во внешний сервис.

Источники:
- https://developers.openai.com/plugins/plugin-guidelines — раздел 6.2 Tool independence and exposure.
- https://developers.openai.com/plugins/reference — `sendFollowUpMessage` component bridge.

Следовательно, текущий primary path нельзя считать поддерживаемым контрактом платформы. Это не Stage-6 эксплуатационный риск и не будущий hardening: именно на этой цепочке построена доставка каждой команды v1. Реализация этапов A–I поверх неё создаст архитектуру, основной путь которой противоречит действующим требованиям plugin platform.

### Что подтверждено и не является finding

1. ChatGPT Sites действительно доступен Plus/Pro и может хостить MCP/plugin.
2. Site-hosted plugin может иметь интерактивный UI.
3. Widget может иметь узкий CSP/connectDomains.
4. `sendFollowUpMessage` существует.
5. Текущие Workers Free лимиты и Hyperdrive Free quota, указанные в плане, соответствуют актуальной документации; фактический общий остаток всё равно остаётся Stage 6.
6. GitHub Actions для private repositories имеет included compute и поддерживает hard-stop budgets; фактический остаток/настройка остаются Stage 6.

Проблема узкая: **нельзя делать выполнение public tool зависимым от того, что модель после component-authored follow-up вызовет отдельный GitHub connector**.

## Требуемая коррекция Лёвы

Лёва должен пересмотреть именно transport/plugin boundary, не меняя продуктовый scope.

Исправленный план должен:

1. сохранять private GitHub как установленный transport boundary;
2. не зависеть от model-driven invocation другого plugin/connector для завершения public tool;
3. иметь корректно экспонированные model-callable tools по действующим plugin rules, без generic executor для скрытого реестра операций;
4. сохранять явное user intent/confirmation, untrusted-content isolation, Worker-primary / Actions-additional границу, $0 и Stage-6 activation;
5. после изменения проверить, какие этапы A–I и их зависимости нужно скорректировать.

Конкретную реализацию Мире навязывать не требуется: технический вариант выбирает Лёва.

## Остальная проверка

Других подтверждённых блокирующих findings по текущему scope после полного прохода не найдено.

До исправления F-01 delivery mode не выбирается и реализация `#399` не начинается.
