# agents/mira.md — личная рабочая память Миры по authentication lifecycle

## Текущий контекст

1. Corrected AUTH-05 #394 exact `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6` — AUTHOR PASS + фактический COORDINATOR PASS; F01 закрыт.
2. AUTH-06 #395 остаётся на old head `2eb3f9c303ad1b67d5348664267eca665f079cf7` поверх superseded AUTH-05 и требует sync/reverification.
3. По прямому решению владельца текущий AUTH-06 sync/reverification **назначен Лёве**, а не Аде.
4. Лёва должен синхронизировать test/evidence package с corrected base, заново выполнить author self-check и применимые exact-head checks, затем STOP.
5. После нового AUTH-06 AUTHOR PASS я заново провожу whole-feature coordinator review assembled auth stack.
6. Лёва после участия в AUTH-06 и Ада после AUTH-05 correction не подходят для independent final review; reviewer определяется отдельно после coordinator PASS.
7. AUTH-07 и external/deployed provider activation остаются заблокированными.
