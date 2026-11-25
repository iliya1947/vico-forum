# stages/README.md — индекс самостоятельных этапов authentication lifecycle

1. `AUTH-01/PLAN.md`, `AUTH-01/RESULT.md` — Mail foundation; coordinator checkpoint PASS.
2. `AUTH-02a/PLAN.md` — **активная** stacked-ступень: transaction/plugin/state/limits/constraints foundation.
3. Следующие stage-файлы создаются только после coordinator checkpoint предыдущей ступени.
4. AUTH-07 — финальный review/security gate, не обычная implementation-ступень.
