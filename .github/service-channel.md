# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–5 **merged в main**.
- Current main: `284bee3f5f0899cce1dc751cf4e9ef169739a120`.
- Package 6 implementation: Draft PR #279, current stable exact head `c38b036b2ecb080735e6eaf4fcca5416a7aebc62` (last reviewed head `0d6bdbb465148875e02663c4c27c56e099a415e4`).
- Exact-head CI #41559889094, attempt 1: **SUCCESS** (`checks` and `database`).
- Previous repeat coordinator review Миры: **FAIL** due to cross-reporter concurrency evidence gap. Test-only correction completed on new head; **another coordinator review pending**.

## Package 6 — утверждённый product scope

1. Одновременно одна pending Appeal на initial Decision.
2. Eligibility следующей Appeal определяется current effective outcome.
3. Общий лимит — три Appeal на initial Decision; любой eligible reporter может занимать reporter-side slot, включая повтор того же reporter.
4. После каждого Appeal result уведомление через общий inbox получают affected author + все реальные reporters с recipient dedup.
5. Original Decision immutable; effective outcome выводится из initial Decision + resolved Appeals.
6. Предпочтителен reviewer, отличный от автора initial Decision, без hard deadlock.

## Repeat coordinator review по #279 / exact head 0d6bdbb4…

Повторный whole-PR review завершён.

1. **P6-RTL-01 — CLOSED.** Registry-based source direction проходит queue → loader DTO → Appeal review/context → UI; `und`/unknown fallback остаётся `auto`.
2. **P6-VERIFY-02 — CLOSED.** Populated 0054→0055 upgrade test реально проверяет resolved/pending Appeals, participant backfill, timestamps, dedup и сохранение `read_at`.
3. **P6-VERIFY-01 — correction submitted for repeat review.**
   - concurrent resolve — covered;
   - submit↔resolve race — covered;
   - result+event+notification rollback — covered;
   - Cross-reporter concurrent Appeal submission test corrected: two real reporters of one Case/Decision use separate PostgreSQL connections; exactly one accepted Appeal, one `ComplaintConflictError`, only one ordinal-1 pending slot and one `appealed` event. CI #41559889094 SUCCESS. **Coordinator acceptance pending.**

Новых current-scope регрессий от correction package не найдено. Первый CI attempt упал только на unrelated `content-generation-navigation.test.tsx`; повтор на том же exact head прошёл 131/131 files и 1756/1756 tests. Отдельный blocker из этого не подтверждён.

Last coordinator verdict on previous head: **FAIL**. No coordinator verdict yet on current corrected head `c38b036b2ecb080735e6eaf4fcca5416a7aebc62`.

Следующий шаг — Мира повторно проводит coordinator whole-PR review на новом stable exact head PR #279. Correction test-only выполнен, production logic не изменялась.

## Назначения

- Мира — ChatGPT-5.6 Sol: **следующий исполнитель**, repeat coordinator whole-PR review stable exact head `c38b036b2ecb080735e6eaf4fcca5416a7aebc62`.
- Лира — ChatGPT-6: завершила последний test-only correction для P6-VERIFY-01; exact-head CI SUCCESS, handoff Мире.
- Лёва — Codex-6.1 Sol: independent technical review только после coordinator PASS нового stable exact head.
- Марк — Codex-6 Sol: без назначения.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
