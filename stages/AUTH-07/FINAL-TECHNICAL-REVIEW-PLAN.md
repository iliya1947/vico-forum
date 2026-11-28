# stages/AUTH-07/FINAL-TECHNICAL-REVIEW-PLAN.md — финальная техническая проверка Лёвы по прямому решению владельца

## Назначение

По прямой команде владельца следующий reviewer — **Лёва / Codex-6.1 Sol**. До отдельного решения владельца в этой задаче используются только Лёва и Лена; Марк и Лира не подключаются.

Проверяемый implementation PR: #388.
Stable exact head: `5b29469fe51e716b483d4e610dd90705f5409029`.
Base/main: `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.

## Статус review

Лёва участвовал в реализации AUTH-06, поэтому эту проверку нельзя классифицировать как независимую whole-feature проверку по стандартному workflow. Это **owner-assigned final technical review**.

## Scope

1. Проверить собранный AUTH-01–AUTH-06 + AUTH-07 correction как одну feature на указанном stable exact head.
2. Не принимать coordinator PASS Миры, source self-check Лены или green CI как доказательство корректности без собственной проверки существенных оснований.
3. Проверить закрытие прежних AUTH-07 findings и отсутствие новых current-scope blockers.
4. Проверить взаимодействие correction с identity/session/mail/locale/proof invariants, accepted K5 и границами Stage 6.
5. Findings классифицировать: current-scope blocker / unrelated current-stage / future-only.
6. Первый finding review не завершает.
7. Во время review implementation не менять.

## Evidence

Exact-head CI и 20/20 applicable connected acceptance уже SUCCESS. Повторные запуски без нового основания не требуются; при обнаружении конкретного evidence gap Лёва определяет только необходимую проверку.

## Done

1. Полный заданный scope проверен на exact `5b29469fe51e716b483d4e610dd90705f5409029`.
2. Результат записан в `stages/AUTH-07/FINAL-TECHNICAL-REVIEW.md` как PASS или HOLD с доказательствами.
3. Лёва STOP и возвращает результат Мире.
4. PASS Лёвы является финальной технической проверкой по прямому owner assignment, но не называется independent PASS.
5. Merge/docs closeout/Stage-6 до отдельного следующего решения владельца не выполнять.
