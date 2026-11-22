# WORKFLOW.md — текущее оперативное состояние

## Текущий этап

- Служебный PR #369, не merge.
- Проверенная основа main: `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.
- Концепция и канонический technical `PLAN.md` приняты; delivery mode: **stacked P0→P5**, затем P6 после merge.
- **P0 завершён Лирой и прошёл coordinator checkpoint Миры: PASS.**
- Implementation PR: Draft #373, branch `feature/ui-progress-preview-p0`, stable exact head `e1f077c0c8c7f15d4600df0a64dd661982755bb8`, base main `9cff976a9621d9fe5dfef28ea5367e390ff435b1`, behind 0.
- Exact-head CI run `45032800400`: checks SUCCESS, database SUCCESS. Chromium evidence подтверждает real `root`/locale/topic modules, real `clientAction→action`, Form/fetcher, real resource handlers с middleware, Pages base/new-tab/Back/Forward, mode-aware image/download, 0 external requests и 0 page errors.
- Shared production seams ограничены root document locale, mode-aware attachment URL и DB-neutral error identities; production builds/tests проходят. Копий product route/action и внешнего runtime нет.
- Незакрытые XHR upload и полный attachment API/resource coverage относятся к P1 по PLAN и не являются P0 blocker.
- Lint warning относится к неизменённому `app/forum/ui.test.tsx`. Drizzle `generate` BigInt exception присутствует в отдельном старом schema-parity step, который #373 не менял; это не P0 causal regression и не доказательство успешного generate.
- P0 не merge/deploy. P1 пока не начинать до нового bounded назначения.

## Следующий переход

После отдельной команды разработчика Мира готовит bounded назначение **P1 — generic runtime и local transport** на основе P0 head и PLAN §15.

До этого:
1. не merge #373;
2. не начинать P1;
3. не публиковать новый preview;
4. не менять P0 stable head без нового review.
