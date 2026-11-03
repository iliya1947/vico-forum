# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–5 **merged в main**.
- Current main: `284bee3f5f0899cce1dc751cf4e9ef169739a120`.
- Package 6 implementation: Draft PR #279, corrected stable exact head `0d6bdbb465148875e02663c4c27c56e099a415e4` (previous review head `9034409524fd0e9df85102680f68ded759705132`).
- Exact-head CI #41557641455, attempt 2: **SUCCESS** (`checks` and `database`).
- Repeat coordinator whole-PR review Миры на corrected head завершён: **FAIL — остался один verification blocker**.

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
3. **P6-VERIFY-01 — PARTIALLY CLOSED / remains blocker.**
   - concurrent resolve — covered;
   - submit↔resolve race — covered;
   - result+event+notification rollback — covered;
   - **concurrent Appeal submissions разных reporters → один slot/event не доказаны**: текущий тест использует два параллельных submit от одного `reporter-one`, поэтому сериализация может происходить actor-lock'ом и не проверяет Case-lock boundary между разными actors.

Новых current-scope регрессий от correction package не найдено. Первый CI attempt упал только на unrelated `content-generation-navigation.test.tsx`; повтор на том же exact head прошёл 131/131 files и 1756/1756 tests. Отдельный blocker из этого не подтверждён.

Coordinator verdict corrected head: **FAIL только по оставшейся части P6-VERIFY-01**.

Следующий шаг — один минимальный test-only correction в существующем PR #279: изменить/добавить native PostgreSQL concurrency regression так, чтобы два **разных actual reporters** одновременно подавали Appeal на один Decision и тест доказывал один accepted slot/appealed event, второй конфликт, отсутствие лишнего slot/event. Production logic менять не требуется без нового подтверждённого дефекта.

## Назначения

- Мира — ChatGPT-5.6 Sol: repeat coordinator review завершён; после correction handoff повторно проверяет новый stable exact head.
- Лира — ChatGPT-6: **назначен минимальный test-only correction для оставшейся части P6-VERIFY-01**.
- Лёва — Codex-6.1 Sol: independent technical review только после coordinator PASS нового stable exact head.
- Марк — Codex-6 Sol: без назначения.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
