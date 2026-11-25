# agents/leva.md — личная рабочая память Лёвы по authentication lifecycle

## Текущее назначение

По прямому решению владельца **исправить и довести AUTH-02b** в draft PR #391 после завершённой технической review.

Входной exact head: `bbd35cb60273a2a90cce7aea997d50e4f42943cf`.

## Подтверждённые findings

1. **Built-preview auth binding / P7.**
   - CI P7 собирает Worker до создания корневого `.dev.vars`; built preview не получает lifecycle auth binding.
   - Причина локально подтверждена; неизменённый P7 проходит, когда тестовые переменные подаются в каталог собранного Worker.
   - Исправить конфигурацию built-preview smoke в правильном месте с корректной очисткой. Проверить аналогичные SA04-J12/SA05-2 post-build setup paths.
   - Не менять общий auth secret contract или rate-limit policy без новой установленной необходимости.

2. **SSR resend email leakage.**
   - `app/routes/resend-verification.tsx` без явного POST до гидратации отправляет email через GET query.
   - Исправить серверно корректную form semantics и проверить JS-disabled/pending-hydration path.
   - В рамках полного AUTH-02b self-check проверить, что credential sign-in/sign-up presentation не оставляет аналогичной текущей утечки чувствительных полей.

3. **Locale validation / generation ordering.**
   - syntactically valid, но недоступная locale может пройти раннюю проверку, после чего новое generation уже записано, а mail URL build отвергается; resend делает старый proof stale без нового письма.
   - Исправить согласованно: locale/return-path eligibility должна быть установлена до смены generation либо fallback должен быть полностью согласован.
   - Не расширять scope до новой locale subsystem.

## Границы исправления

1. Исправления ограничены подтверждёнными current-scope findings и необходимыми regression tests.
2. Не смешивать с AUTH-03, recovery/password-create/email-change/unlink.
3. Не вводить workaround chain, fake success, retry, отключение проверок или ослабление production security semantics ради CI.
4. Реальные providers/Stage-6 resources не активировать.
5. Если исправление требует пересмотра принятого технического плана, сначала зафиксировать конкретное противоречие; не наращивать обходы.

## Завершение

1. После correction выполнить полный author self-check bounded AUTH-02b, а не только проверку трёх patches.
2. Запустить применимые exact-head CI/acceptance только после coherent correction package.
3. Обновить `stages/AUTH-02b/RESULT.md` новым stable head и фактическим evidence.
4. Остановиться для coordinator checkpoint Миры.
5. AUTH-03 самостоятельно не начинать до PASS.

## Дальнейший маршрут

После coordinator PASS AUTH-02b Лёва остаётся исполнителем AUTH-03 → AUTH-06. Лёва не является independent final whole-feature reviewer этой сборки.
