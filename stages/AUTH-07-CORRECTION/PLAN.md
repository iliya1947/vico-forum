# stages/AUTH-07-CORRECTION/PLAN.md — bounded correction после first whole-feature HOLD

## Цель

Закрыть единым bounded package три подтверждённых current-scope дефекта AUTH-07 на собранном PR #388, не меняя принятый технический план и не расширяя работу до Stage 6.

## Основание

Проверенный head #388: `71cdb70d9a5a8b0d0efc3df724d62b736dff7601`.

Мира независимо сверила findings Лены с root `PLAN.md` и actual source. Все три подтверждены как дефекты текущего repository/local-CI scope. Позднего решения, отменяющего saved-locale contract, нет; technical-plan correction не требуется.

## Scope correction

1. **F-B1-01 — stale Account & security после password creation.**
   После успешного password-create mounted Settings должен сразу отражать фактические методы входа, доступность смены пароля и актуальный набор сессий без ручного reload. Сохранить initiating session и текущие security/session invariants.

2. **F-B2-01 — authoritative saved locale для own auth mail.**
   Для auth-писем существующего пользователя использовать сохранённый account locale с утверждённым fallback. Guest flow сохраняет locale из валидированного действия. Не ослаблять callback/return-path trust boundary и не активировать внешние providers.

3. **F-B2-02 — replacement password-create proof в том же документе.**
   После неуспешного/устаревшего terminal proof новый явно запрошенный valid password-create link должен приниматься в уже открытом eligible Settings document, корректно scrubbed и без auto-consume/replay. Сохранить exact user/session binding.

## Evidence / Done

1. Добавить focused regressions на каждый finding:
   - password-create success без manual reload, включая наличие другой own session до создания;
   - saved locale != route locale и fallback для недоступного saved locale;
   - same-document replacement link после неуспешного proof.
2. Проверить отсутствие регрессии existing password change, email-change, session controls и explicit proof binding.
3. K5 accepted correction не ослаблять и не переделывать без нового подтверждённого основания.
4. Исполнитель выполняет author self-check всего correction diff и только применимые exact-head CI/acceptance.
5. Результат и новый stable exact head записать в `stages/AUTH-07-CORRECTION/RESULT.md`, затем STOP.
6. После AUTHOR PASS новый head возвращается на повторный first AUTH-07 whole-feature review; Марк остаётся заблокирован до PASS этого review.

## Delivery

Correction выполняется в уже собранном implementation PR #388 (`feat/auth-01-mail-foundation`). Новый implementation PR не требуется.

## Назначение

**Лира / ChatGPT-6 — исполнитель bounded correction.** Implementation до этого назначения не выполнялась.