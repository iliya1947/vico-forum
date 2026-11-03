# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–5 **merged в main**.
- Current main: `284bee3f5f0899cce1dc751cf4e9ef169739a120`.
- Package 6 implementation: Draft PR #279, current stable exact head `c38b036b2ecb080735e6eaf4fcca5416a7aebc62` (last reviewed head `0d6bdbb465148875e02663c4c27c56e099a415e4`).
- Exact-head CI #41559889094, attempt 1: **SUCCESS** (`checks` and `database`).
- Final repeat coordinator whole-PR review Миры на current stable exact head завершён: **PASS, 0 confirmed current-scope defects**.

## Package 6 — утверждённый product scope

1. Одновременно одна pending Appeal на initial Decision.
2. Eligibility следующей Appeal определяется current effective outcome.
3. Общий лимит — три Appeal на initial Decision; любой eligible reporter может занимать reporter-side slot, включая повтор того же reporter.
4. После каждого Appeal result уведомление через общий inbox получают affected author + все реальные reporters с recipient dedup.
5. Original Decision immutable; effective outcome выводится из initial Decision + resolved Appeals.
6. Предпочтителен reviewer, отличный от автора initial Decision, без hard deadlock.

## Final coordinator review по #279 / exact head c38b036b…

Финальный coordinator whole-PR review завершён.

- Exact head: `c38b036b2ecb080735e6eaf4fcca5416a7aebc62`.
- Base/current main: `284bee3f5f0899cce1dc751cf4e9ef169739a120`.
- Exact-head CI #41559889094: **SUCCESS**, attempt 1.
- Последняя correction после предыдущего review была test-only: один файл `tests/database/complaints-foundation.test.ts`; production code не менялся.
- Cross-reporter concurrency gap закрыт: два разных actual reporters на independent PostgreSQL connections конкурируют за один Decision; test подтверждает один accepted Appeal, один conflict, один pending ordinal-1 slot и один `appealed` event.
- `P6-RTL-01`, `P6-VERIFY-01`, `P6-VERIFY-02` закрыты.
- Новых current-scope дефектов не выявлено.
- Browser/owner visual acceptance не считается отдельным blocker по текущей developer restriction и предыдущей coordinator-классификации.

**Coordinator verdict: PASS. Подтверждённых current-scope дефектов — 0.**

Следующий этап — независимая technical whole-PR проверка Лёвы **того же exact head**. До её завершения implementation не менять.

## Назначения

- Мира — ChatGPT-5.6 Sol: coordinator whole-PR review завершён PASS.
- Лира — ChatGPT-6: implementation/corrections завершены; без нового назначения.
- Лёва — Codex-6.1 Sol: **назначен independent technical whole-PR review PR #279 exact head `c38b036b2ecb080735e6eaf4fcca5416a7aebc62`**.
- Марк — Codex-6 Sol: без назначения.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
