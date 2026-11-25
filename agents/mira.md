# agents/mira.md — личная рабочая память Миры по authentication lifecycle

## Текущий контекст

1. AUTH-01: coordinator PASS.
2. AUTH-02a: coordinator PASS.
3. AUTH-02b #391: AUTHOR PASS был на `4fbf8e829fd18c7190a540eade17bdf543a406d3`.
4. Coordinator checkpoint полного bounded AUTH-02b завершён **HOLD**.
5. Confirmed current-scope defect: credential sign-in/sign-up form в `app/auth/credential-view.tsx` без явного POST; pre-hydration/no-JS default GET может положить email/password в URL.
6. Предыдущие три findings Лёвы на этом exact head закрыты; остальные проверенные AUTH-02b runtime/observability/migration boundaries новых confirmed defects не дали.
7. Лёва исправляет coordinator finding; AUTH-03 заблокирован до нового PASS.

## Следующий переход

После нового stable exact head провести повторный coordinator checkpoint изменённого AUTH-02b, включая regression credential transport и отсутствие регрессий signup/verification flow.
