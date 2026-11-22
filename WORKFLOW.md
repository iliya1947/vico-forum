# WORKFLOW.md — текущее оперативное состояние

## Текущий этап

- Служебный PR #369, не merge.
- Проверенная основа main: `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.
- Концепция и канонический technical `PLAN.md` приняты; delivery mode: **stacked P0→P5**, затем P6 после merge.
- **P0 завершён и прошёл coordinator checkpoint Миры: PASS.**
- P0 implementation: Draft #373, branch `feature/ui-progress-preview-p0`, stable exact head `e1f077c0c8c7f15d4600df0a64dd661982755bb8`, base main `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.
- P0 exact-head CI `45032800400`: checks/database SUCCESS; browser proof подтверждён.
- **Активный bounded этап: P1 — generic runtime и local transport. Исполнитель — Лира.**
- **P1 implementation:** [Draft #375](https://github.com/iliya1947/vico-forum/pull/375), branch `feature/ui-progress-preview-p1`, stacked base P0 exact `e1f077c0c8c7f15d4600df0a64dd661982755bb8`.
- **P1-A — PASS on exact `4cb98f8ab20b808f140d200a03c6c4dafd90649d`:** default route-module generation uses every descriptor from `app/routes.ts` without handwritten IDs; bounded explicit selection remains for P0. Tests cover all current modules, newly added descriptor, duplicate/unknown selections. [Exact-head CI #45036593299](https://github.com/iliya1947/vico-forum/actions/runs/45036593299) **checks + database SUCCESS**, 227 unit files / 2777 tests PASS, Vite P0 browser smoke PASS, no external calls or page errors. Existing Drizzle Kit BigInt serialization warning/exception remains in green check log; do not claim that generator operation succeeded. Full-route *browser build/runtime* is NOT yet proven and belongs to P1-B.
- **P1-B1 — verified attachment import barrier removal; full import still blocked:** Draft #375 exact head `9451a34da2d646f2ace42f9376127d931cf8d44b`. Added an unpublished full-graph Vite candidate (`app/ui-preview/p1`) and Chromium probe that dynamically imports every generated route after fail-closed transport installation. First run [CI #45040725432](https://github.com/iliya1947/vico-forum/actions/runs/45040725432) proved a real `Buffer is not defined` failure in `postgres-deadlines` while importing the attachment upload route. Scoped fix: one shared `db/forum-attachment-errors.ts`, production re-exports of identical exception constructors, neutral imports in actual upload/download routes and editor permission helper, and regression `instanceof` tests. Repeat [CI #45041079732](https://github.com/iliya1947/vico-forum/actions/runs/45041079732): Vite full-route build and P0 Chromium pass, and Chromium now imports root, locale-negotiation, auth-api, attachment-upload, attachment-download, api and locale-boundary before failing at the next independent `routes/home.tsx` → `db/hyperdrive-forum` import of PostgreSQL/Buffer. `checks` FAIL by expected P1 full-import gate; database job was still running at last observation. **P1-B is not PASS.** No node polyfill or route/action copy; P0 base remains unchanged.
- **P1-B bounded decomposition:** B1 = establish reproducible 78-module browser probe + fix first attachment import barrier (**completed with evidence**); B2 = inspect and neutralize remaining browser-reachable server-only import chains (start with home, other screen routes, complaint/Owner pathways), re-run full-import smoke until no confirmed barrier; B3 = generic Framework module export/props/client-loader adapter with contract tests. STOP after each microstep; full P1 stage still pending.
- P1 должен быть отдельным stacked implementation PR с base на branch/head P0, чтобы его bounded diff содержал только P1.

## P1 — назначение Лире

Цель: превратить доказанный P0 vertical proof в общий browser runtime/transport для всего generated route tree без feature-specific маршрутизации и без второго product layer.

Scope и gate — `PLAN.md §15 / P1`.

Обязательный результат:
1. общий generated module/runtime pipeline для полного текущего route tree, без ручного списка product screens/paths;
2. generic route-module adapter сохраняет применимые production exports и явно падает на неподдержанном runtime contract, а не молча теряет его;
3. единый request-context lifecycle для screen loaders/actions и resource requests;
4. общий local transport для `fetch` и используемого приложением XHR, включая upload progress/abort;
5. корректные Request/Response/FormData/File, method/status/headers/Origin, redirect и AbortSignal semantics;
6. Pages URL codec/history/new-tab/native address handling остаются общими и не превращаются в feature-specific rewrites;
7. полный attachment resource path, включая upload/cleanup/read presentation, работает через реальные product handlers + test infrastructure;
8. reset/remount/dispose не вкладывает transport, не оставляет stale requests/object URLs и не переносит старое состояние в новый instance;
9. browser/integration evidence подтверждает, что общий router обслуживает screens и resources, actions проходят production handlers, а неожиданный backend/external request fail-closed;
10. production regression checks подтверждают сохранность production defaults neutral seams.

Граница P1:
- не строить полный domain fixture universe, роли/Owner/Complaints/все состояния — это P2/P3;
- не делать screen-by-screen scripted handlers;
- не расширять задачу до durable persistence, SQL/WASM или внешнего backend;
- не выполнять atomic cutover/publish старого preview — это P5.

STOP:
- если общий runtime требует копирования product route/action;
- если для работы требуется внешний server/SQL runtime;
- если обнаружен дефект PLAN/P0 seam, из-за которого P1 нельзя корректно продолжить;
- если нижний P0 head нужно изменить: сначала обновить P0 и повторить его coordinator checkpoint, затем синхронизировать P1.

## Следующий переход

**Лира — P1-B1 завершён / STOP; общий P1-B ещё не пройден.** Следующее `...` → **P1-B2:** устранить оставшиеся подтверждённые browser import barriers на основе full-import Chromium, начиная с `routes/home.tsx` → тяжёлый `db/hyperdrive-forum`. Не подменять product modules и не добавлять Node polyfills. После адресного пакета повторить exact-head проверки и STOP перед B3 (generic Framework module export adapter). P1 remains Draft #375 stacked on stable P0; no merge/deploy.

После author self-check и применимых targeted/CI/browser checks Лира передаёт stable exact P1 head Мире на coordinator checkpoint. До PASS P1 не начинать P2; P0/P1 не merge и новый preview не deploy.
