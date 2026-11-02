# Лира — ChatGPT-6

## Роль

Основной исполнитель Complaints Package 4; собственную реализацию не проводит как independent whole-PR reviewer.

## Реализация Package 4 и предыдущие corrections

- [Implementation PR #276](https://github.com/iliya1947/vico-forum/pull/276), ветка `chatgpt/complaints-package-4`, Draft.
- Исходный author handoff: [#6578779607](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6578779607), head `0de025e73fce521adc90d284980dc158c511c3d9`.
- После первого technical review [#6580997474](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6580997474) исправлен P2 Decision 409 recovery через route `shouldRevalidate`; добавлены четыре `createMemoryRouter` UI-регрессии. Промежуточный head `12d94f308e25f579310b1cf18663697230c10354` прошёл CI #41473612121 (1726 app, 452 PG), но получил новый [technical finding](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6581694833) по Framework single-fetch URL.

## Bounded Framework query correction (новое назначение)

- Мира подтвердила новый P2 и [назначила исправление](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6581798378): Decision 409 вызывает targeted `.data?_routes=...`; raw `request.url` содержит framework metadata; strict `reviewPages` возвращает 400 до Case read.
- Использовала официальный React Router v8 `LoaderFunctionArgs.url` — нормализованный application URL. В `app/routes/complaint-review.tsx` `reviewPages(url.href)` вместо `reviewPages(request.url)`; `request` остаётся в типе аргументов route loader. Строгий parser, авторизация/no-store и Decision domain/CAS не изменены.
- В `app/complaints/review-http.test.ts` добавлен сценарий Framework-style raw HTTP Request `review.data?_routes=routes%2Fcomplaint-review&reports=2&notes=3` с нормализованным `url`; проверяются результат Case read, no-store и 400 на дублирующиеся, неизвестные и out-of-range реальные application параметры. Existing Router/UI recovery tests без изменений.
- Новый **stable exact head**: `7d64933d47c257267d1fa4c6aec63685e9d27344`. От предыдущего review head изменены только 2 файла: route и HTTP test.
- [Exact-head CI #41478096937](https://github.com/iliya1947/vico-forum/actions/runs/41478096937): `checks` и `database` SUCCESS, 1727 application tests/120 files, 452 PostgreSQL tests/36 files, lint/typecheck/build/UI preview/migrations/schema PASS.
- Первая CI попытка выявила только тестовый TypeScript excess-property contract при ручном вызове route loader; исправлено добавлением `request:Request` в тип входного объекта; финальный head CI green.
- Независимый live built-Worker/Chromium прогон этого head и owner visual acceptance не проводились и не заявляются. Package 5+, архитектура, schema и permissions не затронуты.

## Текущий этап

Author handoff Мире; до нового coordinator review implementation не меняю. После coordinator PASS — independent technical review Лёвы того же head.

## Package 5 — implementation in progress (PR #277)

- Назначение Миры: [#6583342749](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6583342749).
- Базовый main: `1ad8a6402111928c0f08e6f15aba624ba18a4426`.
- Implementation: [Draft PR #277](https://github.com/iliya1947/vico-forum/pull/277), ветка `chatgpt/complaints-package-5`.
- В работе: forward migration 0054/Drizzle/manifest, единый inbox (typed Decision results), транзакционный fanout, persisted review-started event, protected History/participant result, EN/RU/HE, native и route regression tests.
- Код и CI ещё могут изменяться; stable head, verification PASS и handoff не объявлены. Package 6+/production вне scope.
