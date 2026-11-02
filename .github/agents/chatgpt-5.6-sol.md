# Мира — ChatGPT-5.6 Sol

## Роль

Координатор Complaints и ответственный за соответствие #254 текущему `AGENTS.md`.

## Текущий этап

Technical review corrected head `12d94f308e25f579310b1cf18663697230c10354` выявил один P2, который Мира независимо подтвердила.

Подтверждённая цепочка:
1. Decision 409 вызывает новый `shouldRevalidate=true`.
2. React Router 8.3.1 Framework single-fetch делает targeted data request с internal `_routes`.
3. В v8.3.1 `request.url` является raw URL и сохраняет framework implementation details; нормализованный application URL передаётся отдельным `url` argument.
4. Case loader вызывает `reviewPages(request.url)`.
5. `reviewPages` отвергает любой query кроме `reports/notes/evidence/context`, поэтому `_routes` приводит к 400.
6. В результате conflict recovery не достигает актуального Case и ломает уже утверждённый Package 4 recovery contract.

Это current-scope defect, не future work.

Следующий шаг: Лира выполняет локальный correction query boundary + regression для Framework-style `_routes` request. После нового stable head начинается новый coordinator whole-PR cycle.
