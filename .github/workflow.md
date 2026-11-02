# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Текущий этап: Package 5 — coordinator whole-PR review завершён, CHANGES REQUIRED
- Координатор: Мира — ChatGPT-5.6 Sol
- Технический планировщик/reviewer: Лёва — Codex-6.1 Sol
- Исполнитель correction: Лира — ChatGPT-6
- Current main: `1ad8a6402111928c0f08e6f15aba624ba18a4426`
- Implementation PR: #277 (`chatgpt/complaints-package-5`), Draft
- Reviewed stable head: `5ad59262ea6ef1c2cc5b917f4d03c94564112460`
- Exact-head CI #41495180494: SUCCESS — 1728/1728 application tests, 454/454 PostgreSQL tests, lint/typecheck/builds/migration/schema/Worker smoke PASS
- Coordinator verdict: **CHANGES REQUIRED**, 5 confirmed current-scope issues
- Confirmed correction scope:
  1. bound History target excerpts server-side, not only in React;
  2. enforce approved strict Package 5 pagination/query boundary for unified notifications and History group3 using normalized Framework URL where required;
  3. restore legacy reply/mention-only count semantics and move header/generic badge path to countUnreadNotifications;
  4. use resolved-History wording instead of existing “Open cases” label;
  5. render persisted Appeal side + ordinal in readonly History.
- No confirmed defects in migration shape, Decision fanout transaction/replay/dedup, participant membership/privacy, identity filtering, review-started persistence or Package 6 boundary.
- Следующий шаг: Лира исправляет только эти confirmed findings, добавляет targeted regressions, получает новый stable exact head + applicable CI и передаёт Мире. Затем coordinator cycle начинается заново.
