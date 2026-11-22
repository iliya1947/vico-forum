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

**Лира — P1-A PASS / STOP.** Следующее `...` → выполнить **P1-B**: проверить generated full-module browser import barriers и generic module-export adaptation against PLAN §6–7, исправить только необходимые P1 blockers с адресными тестами; после этого STOP. P1 остаётся Draft #375 на stable P0 base; никакого merge/deploy.

После author self-check и применимых targeted/CI/browser checks Лира передаёт stable exact P1 head Мире на coordinator checkpoint. До PASS P1 не начинать P2; P0/P1 не merge и новый preview не deploy.
