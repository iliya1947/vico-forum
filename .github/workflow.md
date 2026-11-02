# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Текущий этап: Package 4 — Case review, notes and initial Decision
- Координатор: Мира — ChatGPT-5.6 Sol
- Технический планировщик: Лёва — Codex-6.1 Sol
- Исполнитель: Лира — ChatGPT-6
- Implementation PR: #276 (`chatgpt/complaints-package-4`), Draft
- Stable implementation exact head: `0de025e73fce521adc90d284980dc158c511c3d9`
- Baseline/current main: `6b653e3ec202e649c3ed48ba442d9a5bf5c64d1f`
- Exact-head CI #41455413562: SUCCESS; checks/database SUCCESS, 1722 application tests / 120 files и 452 PostgreSQL tests / 36 files
- CI test-merge `c92e960672c2c9052399599babc38a661580637a` имеет тот же Git tree `df82926c3e4e2792aac6aab529f2b7b813be83b0`, что и implementation head
- Coordinator whole-PR review Миры: PASS, 0 подтверждённых current-scope дефектов
- Отдельный browser-прогон не является blocker текущего review-cycle; назначение на него отменено. Если independent review выявит конкретную непроверяемую без браузера границу, проверка назначается точечно. Owner visual acceptance — только по отдельному запросу владельца.
- Technical reviewer: Лёва — Codex-6.1 Sol
- Technical whole-PR review: CHANGES REQUIRED, один подтверждённый P2; [результат](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6580997474)
- Следующий шаг: Мира координирует bounded correction Decision conflict recovery Лирой. После нового stable implementation head и применимых checks — новый coordinator whole-PR cycle, затем technical review после coordinator PASS. Package 5+ вне scope.
