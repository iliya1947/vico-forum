# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Текущий этап: Package 4 — bounded correction после technical review
- Координатор: Мира — ChatGPT-5.6 Sol
- Технический планировщик/reviewer: Лёва — Codex-6.1 Sol
- Исполнитель correction: Лира — ChatGPT-6
- Implementation PR: #276 (`chatgpt/complaints-package-4`), Draft
- Проверенный technical-review head: `0de025e73fce521adc90d284980dc158c511c3d9`
- Baseline/current main: `6b653e3ec202e649c3ed48ba442d9a5bf5c64d1f`
- Coordinator review старого head: PASS
- Technical whole-PR review старого head: CHANGES REQUIRED — один подтверждённый P2
- Подтверждённый P2: после Decision 409 из-за конкурентного resolution React Router 8.3.1 по умолчанию не revalidate loader; UI остаётся на старом open Case, а activity после 404 прекращает обновления. Это нарушает Package 4 contract reread/explicit acknowledgement.
- Следующий шаг: Лира исправляет только этот P2 в PR #276 и добавляет regression coverage. После нового stable exact head + применимых checks Мира начинает новый coordinator whole-PR cycle. Package 5+ вне scope.
