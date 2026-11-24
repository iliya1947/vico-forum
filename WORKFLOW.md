# WORKFLOW.md — текущее оперативное состояние, назначения, PR/head, блокеры и следующий переход

## Текущее состояние

1. Service PR: **#320**.
2. Service branch: `service/authentication-lifecycle`.
3. Planning baseline: main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
4. Product-scope revalidation Лены: **PASS**.
5. Полный технический план Лёвы подготовлен.
6. Coordinator review Миры: **HOLD — один correction pass**.
7. Предыдущий Q-01 снят как ложный blocker: проект pre-release, публичный production release не выполнен, поэтому отдельная product policy grandfathering для «старых пользователей» сейчас не требуется. Mandatory verification D-01 применяется к целевой системе; существующие local/CI fixtures корректируются вместе с implementation. Если перед Stage 6 обнаружатся реальные external credential accounts, их rollout/cutover проверяется как operational data case, а не проектируется заранее как текущая product feature.
8. Остаётся исправить PLAN: убрать legacy-Q-01 ветвление и сделать AUTH-05 provider-neutral без обязательного Turnstile adapter.
9. Текущий исполнитель correction pass: **Лёва / Codex-6.1 Sol**.
10. Реализатор не назначен; implementation PR/head отсутствует.
11. Stage 6 external activation отдельно заблокирована.

## Следующий переход

Лёва одним correction pass обновляет `PLAN.md`: удаляет Q-01/legacy grandfather branch как неподтверждённую future-only сложность и оставляет mandatory verification как единый target contract; external cutover данных переносит в Stage-6 operational recheck. AUTH-05 делает provider-neutral без обязательного Turnstile. Остальную архитектуру не менять без нового подтверждённого finding. После этого Мира проверяет только эти исправления и определяет delivery mode.
