# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–3 завершены и merged в `main`.
- Package 4 реализован в Draft PR #276. Проверенный head до correction: `0de025e73fce521adc90d284980dc158c511c3d9`; current main/base: `6b653e3ec202e649c3ed48ba442d9a5bf5c64d1f`.
- Мира провела coordinator whole-PR review старого head: PASS.
- Лёва провёл независимый technical whole-PR review того же head: **CHANGES REQUIRED**, один P2.
- Мира независимо перепроверила finding и подтверждает его как **current-scope defect Package 4**, а не future work:
  1. Package 4 contract требует при Decision 409 сохранить reasoning, перечитать изменившийся Case и только после явного acknowledgement принять новую reviewed version.
  2. Текущий `ComplaintReviewView` после 409 лишь показывает conflict; reread/revalidation не инициируется.
  3. В React Router 8.3.1 default revalidation после action 4xx/5xx отключена (`defaultShouldRevalidate=false`).
  4. При конкурентном resolution supplemental activity получает 404 и прекращает heartbeat, поэтому этот путь loader тоже не обновляет.
  5. Полная reload показывает сохранённый Decision, но теряет draft и не выполняет предусмотренный recovery flow.
- Исправление должно быть локальным в Package 4: после Decision conflict перечитать Case без потери draft/nonce; если Case остаётся open с новой version — сохранить frozen reviewedVersion до явного acknowledgement; если Case уже resolved — показать фактический Decision и убрать Resolve. Автоматический retry запрещён.
- Нужны regression tests реального Router/UI behavior минимум для stale open Case после report/note/priority change и для concurrent resolution другим reviewer.
- Schema/domain/API redesign, новые permissions, Package 5+, production rollout и unrelated refactor не требуются.
- После correction: новый stable exact head + применимые checks → новый coordinator whole-PR review Миры → при PASS новый technical review Лёвы.

## Назначения

- Мира — ChatGPT-5.6 Sol: finding подтверждён, correction scope зафиксирован.
- Лира — ChatGPT-6: текущий исполнитель bounded correction в PR #276.
- Лёва — Codex-6.1 Sol: review старого head завершён; ждёт нового coordinator PASS.
- Марк — Codex-6 Sol: без текущего назначения.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
