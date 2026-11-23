# Применение 7 exact-проверенных internal-dedupe изменений AGENTS

Source blob до изменения: `abeec361dd0e52434a0fc04ddb44435bf7ff6466`.
Source exact-check: `research/agents-internal-dedupe-exact-check.md`.

Применены только 7 подтверждённых изменений:

1. Roles 5 / Марк — удалён хвост про default exclusion; explicit-need activation остаётся в Workflow 8.
2. Roles 6 / Лёва — в Roles оставлен high-level role; planning/review/escalation остаются в Workflow 6, Review 1 и Workflow 8.
3. Diagnosis 2 — удалён generic fact-vs-hypothesis дубль; cause-specific prohibition сохранён.
4. Diagnosis 4 — удалён повторный хвост про неделегирование доступной диагностики; diagnostic core и Developer action 2 сохранены.
5. Workflow 7 — review/checkpoint mechanics заменены ссылками на раздел `Проверка PR`; stack topology/synchronization/final assembly сохранены.
6. Developer action 2 — удалён handoff sentence, полностью покрытый Workflow 9.
7. Review 8 — повтор промежуточного checkpoint заменён ссылкой на Review 2; distinction from whole-feature completion сохранён.

Не изменены ранее снятые кандидаты:
- Workflow 11;
- Review 1 / Марк `только по отдельному назначению`;
- Review 6 / plan-change authority.

## Exact result

- AGENTS: 16082 → 15363 chars;
- words: 2015 → 1923;
- numbered rules: 64 → 64;
- экономия: 719 chars / 92 words;
- новых требований: 0.

## Coverage recheck

- Leva planning: PASS
- Leva escalation: PASS
- Leva standard reviewer: PASS
- Mark explicit need: PASS
- Mark separate assignment kept: PASS
- Logic fact/hypothesis: PASS
- Diagnosis cause-specific: PASS
- Developer no delegation: PASS
- Workflow handoff: PASS
- Review 2 checkpoint: PASS
- Review 8 feature not complete: PASS
- Review 6 plan-change kept: PASS

Вердикт: **PASS** — exact saved draft содержит только 7 утверждённых dedupe-изменений; проверенные unique guards и authority gates сохранены.
