# Stage 6 ChatGPT coordination channel

> Служебный non-merge документ канала ChatGPT. Этот PR не предназначен для merge в `main`.

## Проверенный baseline

- `main` на момент открытия канала: `56d4788911134e49ac01533a98c0c35f622ec6a8`
  (`Docs: close Stage 5 local CI phase (#120)`).
- Stage 4 forum core и Stage 5 translations/background jobs завершены в local/CI path.
- Текущий продуктовый этап — Stage 6 pre-release external integration.
- Служебный PR Codex Stage 6 — #121; он открыт и задаёт первым шагом read-only external preflight.
- В #121 на текущем head `372063cc8b5c1610b11ee4b969e745611cc30fd1` остаётся review-замечание
  Codex: в кратком перечне критериев завершения не отражена обязательная deployed-проверка
  dynamic role/user permission management из Stage 6 source of truth.

## Scope канала

Этот PR используется только для технического диалога и результатов работы ChatGPT по Stage 6.
Изменения продукта и mergeable fixes выполняются отдельными PR. Этот PR не изменяет
инфраструктуру, production data, secrets или deployment.

## Source of truth

Работа Stage 6 сверяется с актуальным `main`, `AGENTS.md`, `PROJECT.md`,
`PROJECT_STATE.md`, `ROADMAP.md` и относящимися профильными контрактами. External API,
platform и exact-version assumptions перед применением проверяются по актуальной официальной
документации.

## Текущий статус

Канал ChatGPT открыт. Внешние изменения не выполнялись. До выполнения external mutations
сначала должен быть завершён и зафиксирован read-only preflight; действия с production
deployment/data/secrets выполняются только после явного разрешения пользователя.
