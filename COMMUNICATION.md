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


## Stage A coordinator review — HOLD

Мира проверила #399 exact head `fe4c6d7b13cac06e5059d2cffd1d0e4cf5f973eb`.

Подтверждены три текущих finding:
1. OAuth provider export ломает TypeScript typecheck (TS2742/TS7056).
2. DB OAuth acceptance fixture исчерпывает canonical sign-in rate-limit и получает 429, из-за чего lifecycle tests не проходят.
3. SA07 data-monitoring regression test остался на expected migration 0078 после добавления 0079.

Полный отчёт: `stages/A/REVIEW.md`.

Local OAuth Chromium run был skipped и будет запущен Мирой только после correction и успешного применимого CI на новом stable head. Stage B заблокирован.


## Stage A #399 — PASS

Exact head `ce85db5f4ae7bc33992174cc6ae69b47da0bf2cd`.

- основной CI `46148681007`: success;
- local OAuth Chromium acceptance `46149123687`: success;
- A-F01–A-F03 закрыты;
- production/Stage 6 не активированы;
- Stage B не начинать до следующего явного перехода владельца.

Детали проверки: `stages/A/REVIEW.md`.


## ChatGPT-control Stage B активирован

Лена реализует Stage B в stacked PR `#402` (`feature/chatgpt-forum-control-stage-b`), base — `#399` на принятом Stage A head `ce85db5f4ae7bc33992174cc6ae69b47da0bf2cd`.

Scope: один protected Admin Overview read через локальный GitHub webhook fixture с возвратом receipt, без внешних credentials и без production ingress. Stage C+ не входит.


## Назначение — Business-Мира на User AI

По прямой команде владельца задача №2 из трёх направлений #300 — **User AI / Vico Consultant** — передана отдельной Мире с Business-аккаунта.

Границы назначения:
1. Business-Мира ведёт только User AI.
2. ChatGPT-control (#399/#402) остаётся у текущей Миры.
3. Admin/Moderation AI остаётся отдельной задачей №3.
4. Действующий product contract User AI: `research/user-ai-product-concept.md`.
5. Старые `research/user-ai-product-scope.md` и `research/embedded-ai-concept-v1.md` — superseded и не являются входом.
6. Прежний общий embedded-AI technical plan не возобновлять как объединённый план двух задач.


## Будущее назначение — Stage C

По прямой команде владельца следующий этап ChatGPT-control после Stage B назначен **Лёве**.

Условие активации: только после coordinator PASS Stage B. До этого Stage C не начинать и отдельный implementation PR не создавать.


## ChatGPT-control Stage B — coordinator HOLD

#402 exact head `617c16ab0249d5f69c73795871363be084cc49fc`.

Source review Stage B: без подтверждённых finding. CI `46173253647` выявил один current-scope blocker: migration `0080` увеличил clean migration count до 81, но `tests/database/migrations.test.ts` остался на expected 80. Остальные Stage-B transport DB tests 7/7 PASS; checks job проходит lint/typecheck/tests/build/metadata/Drizzle parity.

Correction B-F01 возвращён Лене. Acceptance не запускать до зелёного CI; Stage C остаётся заблокирован.
