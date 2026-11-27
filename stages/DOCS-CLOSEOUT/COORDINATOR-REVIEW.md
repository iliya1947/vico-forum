# DOCS-CLOSEOUT — coordinator review Миры

**HOLD** по docs PR #398 exact `b7b0d9e56e1b733fdc7a7ffd8593fc34150b5143`.

Base/main: `b1a1799b5927ed647eff9a8cbd5c03282f8a2d87`.
Diff: 8 согласованных docs files, 222 additions / 52 deletions; code/schema/tests/config не изменены.

## Проверка

Мира проверила весь docs diff против:
- post-merge main и принятого #388;
- действующих решений #320, включая D-07/D-08;
- AUTH-01/AUTH-05/AUTH-06/AUTH-07 results;
- фактических auth boundaries на принятом implementation head;
- актуальных официальных требований Resend/Brevo там, где docs PR добавляет provider-specific operational requirement.

Старые ложные утверждения о deferred/non-mandatory verification/recovery, SET-05 limitations и Sign-up placeholder удалены. Остальные новые auth/session/linking/mail/anti-abuse/Stage-6 формулировки в проверенном diff подтверждены либо корректно ограничены repository/local-CI / deployed boundary.

## F-DOCS-01 — ROADMAP вводит неутверждённый универсальный DNS requirement

**Current-scope docs defect.**

`ROADMAP.md` Stage 6 item 12 сейчас требует:

> DNS (SPF/DKIM/DMARC)

Это сильнее принятого D-08 (`provider accounts/keys/DNS`) и ошибочно выглядит как единый обязательный набор для обоих поддерживаемых providers.

Актуальная официальная provider-документация различается:
- Resend для sending domain требует SPF/DKIM; DMARC рекомендует, но не делает универсальным обязательным record для domain verification.
- Brevo текущая domain-auth flow использует Brevo code/DKIM/DMARC и прямо указывает, что SPF не требуется для обычной domain authentication (SPF/MX относятся к dedicated IP setup).

Поэтому docs closeout не должен сам вводить новый общий обязательный набор DNS records. Это дефект **текущего docs PR**, хотя сами внешние действия выполняются позже в Stage 6.

### Требуемая correction

Сохранить утверждённую границу без выбора новой policy:
- real provider account/sender/domain;
- **provider-required/applicable DNS authentication records** по актуальной документации выбранного provider;
- server-only credentials;
- delivery/failure acceptance;
- одновременно активен один provider, без automatic fallback/retry.

Не перечислять SPF/DKIM/DMARC как универсально обязательную тройку, если отдельного решения владельца о таком более строгом Vico policy нет.

## Остальной diff

Подтверждённых current-scope blockers больше не найдено.

1. 8-file scope соблюдён.
2. PROJECT/PROJECT_STATE/SETTINGS/AUTHORIZATION/UI_UX_PASS согласованы с merged lifecycle.
3. migration range 0073–0078 и его описание согласованы с repository.
4. PROJECT_HISTORY_35 корректно отделяет historical evidence от current source of truth и честно называет финальный review Лёвы assigned, не independent.
5. Stage 6 остаётся paused; external activation/deployed acceptance не приписаны выполненными.
6. Browser/connected acceptance для docs-only correction не требуется без нового основания.

## Verdict

**COORDINATOR HOLD — 1 finding: F-DOCS-01.**

Лена выполняет только bounded docs correction в существующем PR #398 и возвращает новый exact head + обновлённый RESULT. После correction Мира повторяет coordinator review; Лёву до coordinator PASS не активировать.
