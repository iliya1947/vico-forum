# agents/lira.md — личная рабочая память Лиры по authentication lifecycle

## Текущее назначение

Реализовать **AUTH-01 — Mail foundation** как первую ступень stacked delivery по `PLAN.md` и `stages/AUTH-01/PLAN.md`.

## Границы

1. Создать отдельный implementation PR от актуального `main`.
2. Реализовать provider-neutral server-only auth-mail boundary.
3. Реализовать Resend и Brevo transport adapters через injected transport без реальных outbound calls/credentials.
4. Добавить explicit local/CI fake transport и egress-safe test seams.
5. Добавить безопасные HTML/text templates, locale/fallback/direction handling и server-built action URL validation.
6. Добавить необходимые runtime/config injection seams; fake не должен быть production fallback.
7. Сохранить текущее signup/session/verification поведение: mandatory verification начинается только на следующей ступени.
8. Не добавлять schema/migration/provider SDK без подтверждённой необходимости; не реализовывать AUTH-02+.
9. Не выбирать и не реализовывать anti-bot provider.
10. Реальные Resend/Brevo accounts/keys/DNS/send, production Google OAuth и любые external resources запрещены до Stage 6.

## Завершение ступени

Выполнить author self-check и применимые targeted/local checks; CI/acceptance запускать только если они действительно применимы текущей ступени. Затем записать implementation PR, stable exact head и фактические результаты в #320 и остановиться для coordinator checkpoint Миры. Самостоятельно следующую ступень не начинать.
