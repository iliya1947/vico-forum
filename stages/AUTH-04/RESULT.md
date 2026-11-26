# AUTH-04 — реализация и author verification

Stacked implementation PR [#393](https://github.com/iliya1947/vico-forum/pull/393), branch `feat/auth-04-account-security`, base accepted AUTH-03 #392 `39c07e539a47b8a317b3a274132337a6dc61cfdf`.

Stable exact head `c9035dce425333d14fdf12d2418f4a8a009edabf`.

## Реализация

Safe own-account DTO содержит email, verification status, native Google row ID и pending email-change phase/expiry. Canonical HTTP/direct endpoints требуют authoritative fresh own session и точное ожидание user/session.

Email change использует существующий lifecycle state и transaction owner. Подписанные proofs связаны с purpose, generation и phase, initiating session хранится в state. Подтверждение старого адреса выдаёт письмо новому, final POST атомарно обновляет verified email, инвалидирует pending verification/reset/create/change и отзывает остальные сессии. Инициирующая сессия сохраняется. Occupied-address conflict даёт controlled 409 с rollback. Independent own/mail budgets списываются для фактического получателя каждого этапа.

Google unlink и guarded native adapter delete/deleteMany перечитывают методы под AccountState lock. После удаления остаётся usable verified password либо настроенный Google. Empty/hashless/unknown methods не удовлетворяют invariant. Unlink сохраняет сессии, provider identity и RBAC не изменяются.

Settings содержит EN/RU/HE формы и безопасную pending/status presentation. Proof хранится в памяти после удаления fragment из URL. Hashchange обрабатывает второе подтверждение при уже открытых Settings. POST transport, fresh-session/identity guards и locale-local callback действуют для обоих этапов.

Добавлены committed emailChanged/methodUnlinked facts, actual session-delete receipts, email-change/unlink attempts и mail outcomes обоих email purposes. Forward migration 0077, snapshot и production schema manifest согласованы с PG17.

## Проверка

Author self-check охватил весь bounded contract и взаимодействие с принятым AUTH-03. Подтверждённых блокирующих дефектов текущего scope не осталось.

PostgreSQL regressions проверили оба подтверждения, replay/restart/stale-session, own identity expectation, hashless unlink, native adapter last-method protection, rollback при revoke failure, occupied-address race и concurrent deletes двух usable methods. В последней гонке один commit и один controlled conflict сохраняют метод входа и сессии. HTTP/direct regression также проверяет RU locale второго письма.

Connected Worker/Chromium проверил Settings old-confirm → new-verify → email commit, сохранение initiating session и Google unlink после добавления password. Доставка использует synthetic transport и локальную тестовую БД. Реальная доставляемость внешних mail providers этой проверкой не устанавливается.

Локально прошли typecheck, выбранные unit/component/PostgreSQL проверки, полный Worker/Chromium AUTH-02b/03/04 и SET-05. В существующем Complaint race test исправлен поздний rejection handler, который мог дать unhandled rejection до ожидаемого assertion. Исходный promise, тип ошибки и lock/state assertions сохранены. AP-10 selector Connect Google уточнён до exact match рядом с Disconnect Google.

## Exact-head CI и acceptance

**AUTHOR PASS** на `c9035dce425333d14fdf12d2418f4a8a009edabf`, 2026-11-26.

[CI #45744054677](https://github.com/iliya1947/vico-forum/actions/runs/45744054677) — PASS, jobs checks/database. Все **16/16 применимых acceptance workflows — PASS** на том же exact head.

- [SA04-M2 connected AP10 Worker Chromium AccountState acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061031) — PASS.
- [SA05 whole Owner deactivation connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061021) — PASS.
- [Own topic title connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061037) — PASS.
- [SA-03 unified profile connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061114) — PASS.
- [SA-01 Super-admin connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061059) — PASS.
- [Topic Watch connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061282) — PASS.
- [Topic Bookmarks connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744060995) — PASS.
- [SA04-S complete AccountState connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061357) — PASS.
- [AUTH-02b connected email verification Worker Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061039) — PASS.
- [SA04-J12 connected AccountState Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061151) — PASS.
- [SA06 native monitoring connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061189) — PASS.
- [Personal Mute/Block connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061254) — PASS.
- [SA07 Background Localization Files Data and Integrations connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061011) — PASS.
- [Forum structure whole-feature connected Chromium and local R2](https://github.com/iliya1947/vico-forum/actions/runs/45744061340) — PASS.
- [AP-10 isolated browser acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061238) — PASS.
- [SA08 Overview and whole-program entry connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061259) — PASS.

Skipped label-trigger runs и Manual PR test controls в 16/16 не включены.

## Передача Мире

Назначение — coordinator checkpoint всего bounded AUTH-04 против `stages/AUTH-04/PLAN.md` и принятого AUTH-03, на stable exact head выше. Проверить двухфазный email flow, state/session/uniqueness atomicity, last-usable-method invariant во всех entrypoints, observability и Settings integration.

Implementation PR остаётся draft intermediate stack. Coordinator PASS разрешает следующий AUTH-05, independent intermediate review и merge в main здесь не выполняются. Лёва остановился и AUTH-05 не начинал. Реальные mail/anti-bot/Google resources и Stage-6 activation остаются заблокированными до отдельной команды владельца.


## Параллельная проверка Миры

**PASS** на stable exact head `c9035dce425333d14fdf12d2418f4a8a009edabf`.

Проверен весь bounded AUTH-04 diff против stage/root plan и принятого AUTH-03, а не только author report/green CI. Отдельно проверены:

1. two-phase email change: old-address proof → new-address proof → terminal email commit;
2. current user/session/freshness binding, replay/stale generation и account-switch rejection;
3. atomic email update + lifecycle invalidation + other-session revocation и rollback при conflict/failure;
4. occupied-address race и отсутствие partial durable effects;
5. Google unlink и last-usable-method invariant в custom endpoint и guarded native adapter delete/deleteMany;
6. сериализация account-method writes с AccountState/deactivation через общий user lock;
7. observability/facts/attempt closed values, migration 0077, History/Integrations projections и private DTO;
8. Settings proof capture/hash removal, revalidation и сохранение initiating session;
9. exact-head CI #45744054677 и 16/16 applicable connected acceptance как supporting evidence.

Изменение `tests/database/sa04-complaints-n1.test.ts` проверено как узкая test-harness correction: rejection handler добавлен без изменения исходного promise, ожидаемого типа ошибки или lock/state assertions.

Подтверждённых дефектов текущего AUTH-04 scope не установлено. Реальная внешняя mail/Google/Stage-6 acceptance не утверждается и остаётся вне этой ступени.

По прямому решению владельца отдельная независимая bounded-проверка AUTH-04 остаётся назначенной Лене; AUTH-05 до её результата не активируется.
