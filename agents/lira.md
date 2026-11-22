# agents/Лиры.md — личная рабочая память Лиры.

- Назначение: **исполнитель P1** по service PR #369. Active Draft #375, stacked on P0 exact `e1f077c0c8c7f15d4600df0a64dd661982755bb8`. P1-A generated default full route registry PASS on `4cb98f8ab20b808f140d200a03c6c4dafd90649d`: exact-head CI #45036593299 checks/database SUCCESS, 227 test files / 2777 tests, P0 Chromium regression. P1-B1 import diagnostic + first attachment barrier fix completed on Draft #375 exact `9451a34da2d646f2ace42f9376127d931cf8d44b`. Full Vite build and P0 browser regression pass, P1 Chromium imports first 7 actual modules then fails at `routes/home.tsx` heavy DB import; #45041079732 checks FAILURE as intended gate, database result pending at last observation. P1-B2a confirmed on #375 exact `e4f8e7f94974def1a39d4ce4d0339d76f56fd6ca`: home loader switched to preexisting shared forum-storage error import; P1 Chromium confirms root + first 8 route modules through home, next independent failure `routes/category` (Buffer), [CI #45043385984](https://github.com/iliya1947/vico-forum/actions/runs/45043385984) checks fail expected gate, P0 browser PASS. **STOP**. Next `...` → P1-B2b category route import barrier only; B3 generic exports later.
- Delivery: stacked.
- P0 PASS: Draft #373 `feature/ui-progress-preview-p0`, exact `e1f077c0c8c7f15d4600df0a64dd661982755bb8`.
- P1 создаётся отдельным implementation PR **с base на P0 branch/head**, не от main.
- Канонический план: `PLAN.md`, P1 — §15.
- Цель P1: завершить generic browser runtime + local transport поверх доказанных P0 seams.
- Обязательное: full generated route/module pipeline; module-export contract; fresh context lifecycle; fetch + XHR/upload; Request/Response/FormData/File/status/headers/Origin/redirect/abort; Pages URL/history/native address handling; полный attachment resource path; reset/remount/dispose; fail-closed external/backend boundary.
- Не строить P2 fixtures/roles/Owner/full domain matrix, не делать feature-specific routing/scripts, не вводить SQL/WASM/external server, не выполнять cutover/deploy.
- Если требуется менять P0 stable head — STOP, вернуть зависимость в #369; после изменения P0 нужен новый coordinator checkpoint и синхронизация stack.
- После P1: author self-check + применимые checks/browser/CI, stable exact head → Мира на coordinator checkpoint. P2 только после PASS.
