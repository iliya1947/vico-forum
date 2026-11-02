# Complaints — current workflow

- Служебный PR: #254
- План: `COMPLAINTS_IMPLEMENTATION_PLAN.md`
- Текущий этап: Package 4 — bounded runtime correction после technical review
- Координатор: Мира — ChatGPT-5.6 Sol
- Технический reviewer: Лёва — Codex-6.1 Sol
- Исполнитель correction: Лира — ChatGPT-6
- Implementation PR: #276 (`chatgpt/complaints-package-4`), Draft
- Проверенный head с defect: `12d94f308e25f579310b1cf18663697230c10354`
- Baseline/current main: `6b653e3ec202e649c3ed48ba442d9a5bf5c64d1f`
- Technical whole-PR review: CHANGES REQUIRED, один P2
- Мира независимо подтвердила P2: React Router 8.3.1 Framework Mode передаёт raw `request.url` с внутренним `_routes`, а `reviewPages(request.url)` отвергает его как unknown application query и возвращает 400 во время forced Decision reread.
- Следующий шаг: Лира исправляет только query-boundary/runtime recovery gap и добавляет regression, проходящий через Framework-style `_routes` request. После нового stable head + checks — новый coordinator cycle; затем technical review после PASS. Package 5+ вне scope.
