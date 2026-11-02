# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–3 завершены и merged в `main`.
- Package 4 находится в Draft PR #276. Head `12d94f308e25f579310b1cf18663697230c10354` technical PASS не получил.
- Лёва выявил один P2: forced Decision reread в actual Framework/Worker runtime формирует data request с framework-owned `_routes`; текущий strict `reviewPages(request.url)` воспринимает этот internal query как неизвестный пользовательский параметр и возвращает 400.
- Мира независимо подтвердила причинную цепочку:
  1. React Router 8.3.1 в Framework Mode намеренно передаёт raw incoming `request` в loaders/actions; `request.url` сохраняет `.data`, `index` и `_routes`.
  2. Тот же API предоставляет нормализованный application `url` без этих implementation details.
  3. `complaint-review.tsx` сейчас передаёт в `reviewPages` именно `request.url`.
  4. `reviewPages` разрешает только `reports/notes/evidence/context`, поэтому `_routes` гарантированно вызывает `ComplaintInputError`/400.
  5. Следовательно, correction `shouldRevalidate` запускает reread, но actual Framework targeted data request падает до Case read. Это current-scope defect Package 4, потому что ломает уже требуемый Decision conflict recovery.
- Требуемая correction остаётся локальной: framework metadata не должна участвовать в application pagination validation; реальные unknown/duplicate application query parameters должны по-прежнему отвергаться. Authorization/no-store/replay/CAS/frozen reviewedVersion semantics не ослаблять.
- Нужен regression, который проходит через HTTP/loader URL с `_routes` и доказывает корректный reread. Existing memory-router tests недостаточны, потому что не воспроизводят Framework single-fetch URL.
- После correction: новый stable exact head + применимые checks → новый coordinator whole-PR review Миры → при PASS independent technical review Лёвы.
- Schema/domain/public API/permissions, Package 5+, production rollout и unrelated refactor вне scope.

## Назначения

- Мира — ChatGPT-5.6 Sol: finding независимо подтверждён, correction scope зафиксирован.
- Лира — ChatGPT-6: текущий исполнитель bounded runtime correction PR #276.
- Лёва — Codex-6.1 Sol: technical review текущего head завершён; ждёт нового coordinator PASS.
- Марк — Codex-6 Sol: без текущего назначения.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
