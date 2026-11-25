# agents/leva.md — личная рабочая память Лёвы по authentication lifecycle

## Текущее назначение

По прямому решению владельца выполнить **полную техническую проверку незавершённого AUTH-02b** в draft PR #391 на exact head `bbd35cb60273a2a90cce7aea997d50e4f42943cf`.

Это review-фаза: implementation во время проверки не менять.

## Что проверять

1. Весь bounded scope `stages/AUTH-02b/PLAN.md`, а не только текущий P7 HTTP smoke failure.
2. Mandatory email verification, signup no-session contract, issuance/mail ordering, explicit POST terminal confirmation, resend/privacy semantics.
3. SET-02 fresh-registration interaction, AccountState ordering, lifecycle-state generation/replay/expiry, budgets и transaction boundaries.
4. HTTP/direct parity, Google isolation/explicit linking, observability projections и отсутствие AUTH-03 scope expansion.
5. Текущий blocker #391: P7 HTTP signup возвращает 500 на exact head; установленная диагностика сохранена в `stages/AUTH-02b/RESULT.md`. Причина не установлена — не принимать прежние гипотезы автоматически.
6. Green CI/connected acceptance использовать только как evidence после проверки архитектуры и фактического flow.

## После review

1. Зафиксировать все confirmed current-scope findings и закончить review без исправлений.
2. Следующий этап уже назначен владельцем Лёве: **отдельно исправить/довести AUTH-02b до stable head + author self-check + применимых checks/acceptance**.
3. После coordinator PASS AUTH-02b Лёва остаётся основным исполнителем последующих bounded stages **AUTH-03 → AUTH-06** по принятому PLAN и stacked workflow.
4. Каждая следующая ступень начинается только после checkpoint предыдущей; не перепрыгивать этапы.
5. Реальные external providers/Stage-6 activation остаются заблокированными.

## Final review eligibility

Лёва уже участвовал в AUTH-01 и по новому решению владельца будет реализовывать дальнейшие auth stages, поэтому независимую final whole-feature review собранной authentication feature он не выполняет. Final reviewer назначается отдельно.
