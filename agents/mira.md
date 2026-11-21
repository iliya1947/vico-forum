# agents/Миры.md — личная рабочая память Миры.

- Исполнитель текущего этапа: **Мира-3 (GPT-5.6 Sol)**.
- Текущий этап: концептуальное проектирование архитектуры UI progress preview до технического плана.
- Реализация и изменения #322 не авторизованы.
- Перед исследовательским подэтапом проверять актуальный `main` и действующие границы задачи.
- Подэтап 1: production dependencies/test-runtime boundary — завершён.
- Подэтап 2: browser-safe production route graph — завершён.
- Подэтап 3: единый production route table для Data Router preview — завершён.
- Коррекция подэтапа 3: adapter обязан сохранять Framework route IDs по file path; оставлять Data Router автогенерацию нельзя.
- Подэтап 4: local application transport — завершён.
- Подэтап 5: native attachment byte presentation — завершён.
- Route source: `app/routes.ts`; modules — production route modules; server infrastructure — preview-only module-resolution substitution.
- Local programmable HTTP: `createStaticHandler().queryRoute()` + fresh preview RouterContextProvider на каждый request.
- Browser bridge: same-origin matched-route `fetch` wrapper; Better Auth 1.7.7 захватывает global fetch на top-level createAuthClient, поэтому transport ставится до lazy route-module evaluation.
- Attachment upload: узкий preview XMLHttpRequest adapter поверх того же dispatcher.
- Native attachment raster/open/download: единый presentation resource contract; production -> controlled HTTP URLs, preview -> `blob:` URLs из fake bucket. Service Worker/DOM interception/preview copies не нужны.
- Transport/R2 block концептуально закрыт.
- Следующий conceptual block: единый deterministic test state + controls identity/locale/viewport/scenario без изменения ownership.
- Итог первого этапа должен быть цельным концептуальным документом `research/concept.md`, после чего STOP для решения разработчика.
