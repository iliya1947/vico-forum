# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–5 **merged в main**.
- Current main: `284bee3f5f0899cce1dc751cf4e9ef169739a120`.
- Package 6 implementation: Draft PR #279, reviewed exact head `9034409524fd0e9df85102680f68ded759705132`.
- Exact-head CI #41546869959: SUCCESS.
- Coordinator whole-PR review Миры завершён: **FAIL — требуется один bounded correction package до Codex-review**.

## Package 6 — утверждённый product scope

1. Одновременно одна pending Appeal на initial Decision.
2. Eligibility следующей Appeal определяется current effective outcome.
3. Общий лимит — три Appeal на initial Decision; любой eligible reporter может занимать reporter-side slot, включая повтор того же reporter.
4. После каждого Appeal result уведомление через общий inbox получают affected author + все реальные reporters с recipient dedup.
5. Original Decision immutable; effective outcome выводится из initial Decision + resolved Appeals.
6. Предпочтителен reviewer, отличный от автора initial Decision, без hard deadlock.

## Coordinator findings по #279 / exact head 90344095…

Подтверждены три current-scope blocker'а:

1. **P6-RTL-01 — Appeals source-direction regression.**
   Новый Appeals path не применяет registry-based source direction, уже используемый обычным Case review:
   - group2 queue рендерит excerpt с `dir="auto"` и игнорирует `sourceLocale`;
   - Appeal review не enrich'ит reported/current/context source direction через locale registry;
   - expanded Appeal context resource также возвращает source без registry direction.
   Это затрагивает текущий Package 6 EN/RU/HE/RTL scope, а не будущую работу.

2. **P6-VERIFY-01 — отсутствует обязательная native PostgreSQL проверка Appeal concurrency/rollback.**
   На exact head нет P6-теста, доказывающего concurrent Appeal submissions, concurrent resolutions, submit↔resolve race и rollback связки result + event + notification fanout. Статический review подтверждает ожидаемую lock/transaction структуру, но принятый P6 acceptance этим не выполнен.

3. **P6-VERIFY-02 — отсутствует populated upgrade acceptance для migration 0055.**
   Clean migration/schema parity проходят, но нет required 0054→0055 fixture с уже существующими pending/resolved Appeals и проверкой backfill recipients/timestamps/dedup/read-state preservation.

Полный Chromium→Worker→PG прогон **не классифицирован как отдельный current-scope defect/blocker**: разработчик запретил Лире browser-run, owner visual acceptance не запрашивался, а подтверждённого browser-only симптома в coordinator review не найдено.

Других подтверждённых current-scope дефектов coordinator review не выявил. До исправления трёх пунктов independent review Лёвы не запускается.

## Назначения

- Мира — ChatGPT-5.6 Sol: coordinator review завершён; correction package ещё не назначен.
- Лира — ChatGPT-6: следующий исполнитель одного bounded correction package после продолжения workflow.
- Лёва — Codex-6.1 Sol: independent technical review только после нового coordinator PASS stable head.
- Марк — Codex-6 Sol: без назначения.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
