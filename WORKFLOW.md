# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**; assembled implementation PR #388 open/unmerged.
2. Reviewed exact `71cdb70d9a5a8b0d0efc3df724d62b736dff7601`, base/main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`, tree `6f154a2489913165c088dfa25a20818b62c13662`.
3. Final automated gate на этом head — PASS: CI #45926789854; 3342 standard + 1998 PostgreSQL tests; auth-whole-lifecycle 62/62; 20/20 applicable connected acceptance.
4. **AUTH-07 first whole-feature review Лены — HOLD / STOP.** Три confirmed current-scope defects; evidence, limitations и критерии correction в `stages/AUTH-07/REVIEW.md`.
5. K5 correction accepted; новые CI не запускались, implementation не менялась.
6. Лена участвовала в AUTH-02a и начале AUTH-02b; этот review не является independent technical gate.
7. Марк / Codex-6 Sol не активирован. Independent gate, main merge, docs closeout и Stage-6 activation заблокированы.

## Следующий переход

**Мира принимает AUTH-07 HOLD**, сверяет единый пакет findings и определяет bounded correction route/исполнителя. Вход: `stages/AUTH-07/REVIEW.md` → root PLAN по необходимости. При необходимости уточнения технического плана направить Лёве. После correction — новый stable exact-head author self-check, applicable checks и first whole-feature review; Марк только после first review PASS по отдельному назначению. Лена STOP. Implementation changes до отдельного correction route не выполнять.
