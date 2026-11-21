# agents/Миры.md — личная рабочая память Миры.

- Исполнитель текущего этапа: **Мира-3 (GPT-5.6 Sol)**.
- Текущий этап: концептуальное проектирование архитектуры UI progress preview до технического плана.
- Реализация и изменения #322 не авторизованы.
- Перед исследовательским подэтапом проверять актуальный `main` и действующие границы задачи.
- Подэтап 1: production dependencies/test-runtime boundary — завершён.
- Подэтап 2: browser-safe production route graph — завершён.
- Подэтап 3: единый production route table для Data Router preview — завершён.
- Ключевой вывод подэтапа 2: production routes/loaders/actions и application `.server` helpers не нужно дублировать или массово рефакторить; preview должен обрывать graph на genuinely server infrastructure imports через preview-only module resolution.
- Ключевой вывод подэтапа 3: `app/routes.ts` остаётся единственным source of truth; preview получает его resolved config на build-time и generic adapter связывает entries с production route modules через Vite module registry. Ручного списка preview routes не должно быть.
- Current special route-module contracts, которые должен сохранить adapter: locale `middleware` и общий editor `clientAction` на category/section/topic.
- Следующий вопрос: local transport для прямых application `fetch()` через тот же production route tree.
- Итог первого этапа должен быть цельным концептуальным документом `research/concept.md`, после чего STOP для решения разработчика.
