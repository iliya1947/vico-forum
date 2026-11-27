# agents/mira.md — личная рабочая память Миры по authentication lifecycle

## Активная задача

K5-CORRECTION в final assembled PR #388 выполняю сама по прямой команде владельца.

1. Baseline: `615d93598daf78945a86fbdc4255bc778ae3403f`.
2. Current correction exact: `71cdb70d9a5a8b0d0efc3df724d62b736dff7601`.
3. Delta: только `tests/browser/sa04-attachments/check.py`, +59/-6.
4. Product/runtime/schema/dependencies/workflow не менялись.
5. Шесть initial operation reads ждут UUID v4 через retrying Playwright assertion; diagnostics не сохраняют raw operation IDs.
6. Source-level correction self-check PASS; runtime verification не запускалась.
7. Следующая отдельная подзадача — targeted K5 verification. Не смешивать её с final whole-feature review.
8. AUTH-07/merge/Stage-6 заблокированы.
