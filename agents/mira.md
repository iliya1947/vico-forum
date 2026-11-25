# agents/mira.md — личная рабочая память Миры по authentication lifecycle

## Текущий контекст

1. AUTH-01: PR #388 / head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`, coordinator PASS.
2. AUTH-02a: PR #389 / head `06656fef2d85e03c62b7ab69b03fa96ecfc68653`, author PASS + coordinator PASS.
3. AUTH-02b: draft #391 / входной correction head `bbd35cb60273a2a90cce7aea997d50e4f42943cf`.
4. Лёва завершил full technical review: HOLD, три confirmed current-scope findings.
5. Correction/finalization AUTH-02b активирован у Лёвы.
6. После нового stable head + author self-check + applicable exact-head checks Мира проводит coordinator checkpoint всего bounded AUTH-02b.
7. После PASS AUTH-02b Лёва остаётся исполнителем AUTH-03 → AUTH-06; final independent whole-feature reviewer назначается отдельно.

## Следующий переход

Ждать correction handoff Лёвы. На checkpoint проверить не только закрытие трёх findings, но и весь AUTH-02b contract на новом exact head; green CI использовать только как supporting evidence.
