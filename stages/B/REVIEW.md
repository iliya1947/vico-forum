Этот файл хранит coordinator review bounded Stage B ChatGPT-control.

# Stage B — coordinator review Миры

Статус: **HOLD**

Implementation PR: **#402**  
Stable exact head: `617c16ab0249d5f69c73795871363be084cc49fc`  
Base: accepted Stage A `ce85db5f4ae7bc33992174cc6ae69b47da0bf2cd`

## Проверенный scope

Stage B из принятого `PLAN.md`: один реальный Admin Overview проходит от tool через локальный GitHub webhook fixture и возвращается через receipt; внешних credentials нет; production ingress выключен штатной конфигурацией.

Source-level coordinator review охватил transport wire, GitHub App boundary, durable request/receipt state, Admin Overview reader/access, Worker composition, migration/runtime grants, DB scenarios и connected browser fixture.

## Source review

Подтверждённых security/scope findings в Stage-B реализации не найдено.

Проверено:
1. GitHub comment несёт только непрозрачные refs/ID и не может сам создать новую команду/actor/args.
2. HMAC проверяется на raw webhook body до parsing; repository/app/installation/bot/inbox binding закрыт.
3. Durable request/receipt state не допускает повторного read при duplicate/redelivery/lost ACK.
4. Revoked/foreign grant блокируется перед acceptance/execution/result release.
5. Status не запускает и не возобновляет операцию.
6. Production Worker без явной injected composition отвечает 404 на forum-control ingress.
7. Stage C+ и write path в Stage B не реализованы.

## CI evidence

CI run: `46173253647`.

Успешно:
- frozen install;
- accepted migration history protection;
- lint;
- typecheck;
- ordinary tests;
- build;
- UI preview build;
- migration metadata validation;
- Drizzle schema parity.

Stage-B OAuth/transport DB tests: **7/7 PASS**.

### B-F01 — migration-count regression

Database job падает в `tests/database/migrations.test.ts:84`:

- фактически применено **81** migration;
- тест всё ещё ожидает **80**;
- Stage B добавил `0080_forum_control_request`.

Это подтверждённый дефект текущего Stage B: новый migration добавлен, а существующий migration-count contract не синхронизирован.

Из-за раннего failure не выполнены следующие DB-job gates:
- production schema manifest parity;
- runtime privilege probes;
- split-authority provisioning checks;
- Worker/database smokes.

## Acceptance

`run:acceptance` не запускался: по workflow gate сначала нужен успешный основной CI.

## Correction criterion

1. Исправить B-F01 без расширения Stage B.
2. Выполнить source self-check correction.
3. Передать Мире новый stable exact head #402.
4. Мира заново запускает полный applicable CI; только после его PASS — Forum control local OAuth/GitHub Chromium acceptance.
5. Stage C остаётся заблокирован.
