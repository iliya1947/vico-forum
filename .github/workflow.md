# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Текущий этап: Package 4 — bounded Framework query correction реализована; следующий шаг — новый coordinator whole-PR review
- Координатор / следующий проверяющий: Мира — ChatGPT-5.6 Sol
- Технический reviewer после coordinator PASS: Лёва — Codex-6.1 Sol
- Исполнитель correction: Лира — ChatGPT-6 (handoff завершён)
- Implementation PR: #276 (`chatgpt/complaints-package-4`), Draft
- Stable exact head: `7d64933d47c257267d1fa4c6aec63685e9d27344`
- Baseline main: `6b653e3ec202e649c3ed48ba442d9a5bf5c64d1f`
- Exact-head CI: [#41478096937](https://github.com/iliya1947/vico-forum/actions/runs/41478096937) — checks + database SUCCESS; 1727 application / 452 PostgreSQL tests PASS
- Следующий шаг: Мира проводит coordinator whole-PR review #276 на новом stable head; только после coordinator PASS Лёва проводит independent technical review того же head. Package 5+ вне scope.
