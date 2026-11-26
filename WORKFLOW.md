# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; затем AUTH-07 final gate.
3. AUTH-01–AUTH-04 — coordinator PASS на ранее зафиксированных exact heads.
4. AUTH-05 / PR #394 corrected exact `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6` — AUTHOR PASS + COORDINATOR PASS; F01 закрыт.
5. AUTH-06 / PR #395 exact `615d93598daf78945a86fbdc4255bc778ae3403f`, base corrected AUTH-05 `dbbfe1c05...` — **AUTHOR PASS + WHOLE-FEATURE COORDINATOR PASS**.
6. Новый exact-head CI #45897164115 — SUCCESS; database 1998 tests, включая `auth-whole-lifecycle` 62/62; 20/20 applicable connected acceptance — SUCCESS. Подробности: `stages/AUTH-06/RESULT.md`.
7. Повторный whole-feature review: `stages/AUTH-06/REVIEW.md`. Confirmed current-scope blockers: 0.
8. Прежний HOLD F01 superseded corrected AUTH-05 и новым review.
9. Лёва участвовал в AUTH-06, Ада — в AUTH-05 correction; оба не являются independent final whole-feature reviewer assembled feature.
10. AUTH-07, merge в main и external/Stage-6 activation ещё не выполнялись.

## Следующий переход

По stacked workflow требуется отдельная **final assembly**: перенести final AUTH-06 head `615d93598daf78945a86fbdc4255bc778ae3403f` в ветку первого implementation PR #388, закрыть intermediate implementation PRs как superseded, затем провести final author self-check и предусмотренный final review/gate на одном stable exact head. Этот переход пока **не активирован** и исполнитель не назначен.
