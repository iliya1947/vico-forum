# agents/leva.md — личная рабочая память Лёвы по authentication lifecycle

## Текущее назначение

По прямому решению владельца реализовать **AUTH-01 — Mail foundation** как первую ступень stacked delivery по `PLAN.md` и `stages/AUTH-01/PLAN.md`.

## Границы реализации

1. Создать отдельный implementation PR от актуального `main`.
2. Реализовать provider-neutral server-only auth-mail boundary.
3. Реализовать Resend и Brevo transport adapters через injected transport без real outbound calls/credentials.
4. Добавить explicit local/CI fake transport и egress-safe test seams.
5. Добавить безопасные HTML/text templates, locale/fallback/direction handling и server-built action URL validation.
6. Добавить необходимые runtime/config injection seams; fake не должен быть production fallback.
7. Сохранить текущее signup/session/verification поведение: mandatory verification начинается только на следующей ступени.
8. Не добавлять schema/migration/provider SDK без подтверждённой необходимости; не реализовывать AUTH-02+.
9. Не выбирать и не реализовывать anti-bot provider.
10. Реальные Resend/Brevo accounts/keys/DNS/send, production Google OAuth и любые external resources запрещены до Stage 6.

## Завершение ступени

После implementation выполнить author self-check и применимые targeted/local checks, записать implementation PR, stable exact head и фактические результаты в #320 и остановиться для coordinator checkpoint Миры. Следующую ступень самостоятельно не начинать.

Поскольку Лёва теперь участвует в implementation, независимую финальную technical review собственной реализации он не выполняет; reviewer финальной сборки определяется отдельно.
