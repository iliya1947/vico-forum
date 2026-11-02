# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Текущий этап: Package 4 — bounded P2 correction завершена, ожидается новый coordinator whole-PR review
- Координатор / следующий проверяющий: Мира — ChatGPT-5.6 Sol
- Технический планировщик / reviewer после coordinator PASS: Лёва — Codex-6.1 Sol
- Исполнитель correction: Лира — ChatGPT-6 (author handoff завершён)
- Implementation PR: #276 (`chatgpt/complaints-package-4`), Draft
- Stable exact head: `12d94f308e25f579310b1cf18663697230c10354`
- Baseline main: `6b653e3ec202e649c3ed48ba442d9a5bf5c64d1f`
- Exact-head CI: [#41473612121](https://github.com/iliya1947/vico-forum/actions/runs/41473612121) — checks + database SUCCESS; application 1726/1726, PostgreSQL 452/452, typecheck/build/parity PASS
- Correction: после Decision 409 revalidate Case loader; draft/nonce/reviewedVersion остаются до явного acknowledgement. Добавлены Router/UI regressions для изменений report/note/priority и конкурентного resolution.
- Следующий шаг: Мира проводит новый coordinator whole-PR review #276 на exact head `12d94f308e25f579310b1cf18663697230c10354`. Только после coordinator PASS — independent technical review Лёвы того же head. Package 5+ вне scope.
