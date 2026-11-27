# stages/AUTH-07-CORRECTION-2/PLAN.md — bounded correction после final technical HOLD Лёвы

## Цель

Закрыть одним bounded package два подтверждённых current-scope дефекта guest password recovery на assembled PR #388 без расширения scope и без Stage-6/external activation.

## Основание

Проверенный Лёвой head #388: `5b29469fe51e716b483d4e610dd90705f5409029`.

Мира независимо сверила оба finding с actual source и действующим AUTH-03 contract. Оба подтверждены как дефекты текущего repository/browser scope; technical-plan correction не требуется.

## Scope correction

1. **F-B2-03 — reset page пропускает replacement/reopened proof в том же document.**
   Guest reset page должна принимать новый valid reset proof при смене только URL fragment в уже открытом eligible document, безопасно удалять fragment из address bar, не выполнять terminal mutation автоматически и сохранять explicit-submit contract.

2. **F-B2-04 — retry flow теряет safe returnTo.**
   После invalid/expired reset proof переход к forgot-password и повторная issuance должны сохранять уже server-validated safe `returnTo`. Недопустимое/cross-locale значение по-прежнему должно сводиться к существующему safe fallback.

## Evidence / Done

1. Добавить focused browser regressions:
   - same-document reset replacement/reopened link: новый fragment захватывается и scrubbed, форма появляется, до явного submit terminal POST отсутствует;
   - retry через invalid reset → forgot-password → new mail сохраняет исходный safe `returnTo` до последующего sign-in path;
   - unsafe `returnTo` продолжает fallback по существующему guard.
2. Проверить отсутствие регрессии normal fresh reset page, expiry/replay, neutral forgot flow, no auto-session after reset и token privacy.
3. Не менять AUTH-07 correction F-B1-01/F-B2-01/F-B2-02, K5, schema, dependencies, provider activation или Stage-6 behavior без нового подтверждённого основания.
4. Лена выполняет author self-check всего correction diff и только необходимые exact-head checks.
5. Новый stable exact head и результат записать в `stages/AUTH-07-CORRECTION-2/RESULT.md` → STOP.
6. После AUTHOR PASS corrected head возвращается Лёве на повторный owner-assigned final technical review; Лена собственную correction не review.

## Delivery

Correction выполняется в assembled implementation PR #388 (`feat/auth-01-mail-foundation`). Новый implementation PR не требуется.

## Назначение

**Лена / GPT-6.2 — исполнитель bounded correction.** Лёва STOP до нового stable head.
