# agents/Миры.md — личная рабочая память Миры.

- Исполнитель текущего этапа: **Мира-3 (GPT-5.6 Sol)**.
- Текущий этап: концептуальное проектирование архитектуры UI progress preview до технического плана.
- Реализация и изменения #322 не авторизованы.
- Перед исследовательским подэтапом проверять актуальный `main` и действующие границы задачи.
- Подэтап 1: production dependencies/test-runtime boundary — завершён.
- Подэтап 2: browser-safe production route graph — завершён.
- Ключевой вывод подэтапа 2: production routes/loaders/actions и application `.server` helpers не нужно дублировать или массово рефакторить; preview должен обрывать graph на genuinely server infrastructure imports через preview-only module resolution.
- Следующий вопрос: единый источник production route table для Data Router preview без ручного дублирования `app/routes.ts`, затем local transport поверх того же router.
- Итог первого этапа должен быть цельным концептуальным документом `research/concept.md`, после чего STOP для решения разработчика.
