# История проекта — 2026-11-11 — 2026-11-16: Super-admin SA-04 AccountState

Исторический snapshot завершённого **SA-04 A–S**. Это запись о последовательности
implementation, correction, review, CI и merge, **не** source of truth для текущего
поведения. Текущее состояние — [PROJECT_STATE.md](../../PROJECT_STATE.md);
постоянный контракт — [SUPER_ADMIN.md](../SUPER_ADMIN.md);
исходные решения и проверки — [service PR #251](https://github.com/iliya1947/vico-forum/pull/251)
и [service PR #331](https://github.com/iliya1947/vico-forum/pull/331).

## Результат пакета

SA-04 поставил состояние учётной записи в существующем Better Auth `user`,
нейтральную публичную идентичность и замкнутые проверки активности в уже
существующих authenticated/session и authoritative actor-owned операциях.
Миграция `0065_sa04_account_state_foundation` добавила server-owned nullable
`deactivated_at`, `deactivated_by_user_id` и `retain_at_least_until`.
Полностью NULL tuple означает active; полностью заданное состояние имеет
непустого actor и минимум один календарный год хранения по UTC. Существующие
аккаунты остались активными, без backfill.

Публичные профили/авторы/уведомления/история показывают нейтральное
**Deleted user** вместо прежней identity неактивного пользователя;
опубликованные темы, сообщения, ревизии, вложения и защищённые retained
данные сохранены. Better Auth закрывает повторный session/auth admission
неактивного аккаунта, оставляя только узкий signed own-sign-out cleanup.
Авторитетные Forum/attachment/authorization/measure/Complaint/Settings/
generation writers дополнительно проверяют активность на собственной
транзакционной границе, не меняя существующих domain permissions, replay,
History, CAS или принятую background-task/consumer семантику.

**SA-04 не добавил Owner-команду/UI деактивации и production state writer: это
будущий SA-05.** Не доставлены reactivation, physical delete, retention-end
action, массовое завершение чужих сессий, foreign credential/provider
operations, новая роль/permission или rollout Stage 6. Деактивированные
аккаунты в проверках — только fixture state disposable/local среды.

## Фактическая последовательность implementation/merge

Все восемь PR ниже объединены в `main`. Время — UTC по GitHub.

| Пакет | Implementation PR, merged UTC | Доставленная граница | Merge commit |
| --- | --- | --- | --- |
| A1 | [#327](https://github.com/iliya1947/vico-forum/pull/327), 2026-11-11 22:00 | Migration `0065`, schema/CHECK/manifest, без runtime enforcement | `593a03964b8407b249f7c9f5eb117ddb8b07736d` |
| A2–H | [#328](https://github.com/iliya1947/vico-forum/pull/328), 2026-11-12 21:04 | Общие AccountState primitives, neutral public identity: profiles, Forum/discovery, Admin Users/search, mentions, online, notifications, post-history | `13456a17f23c1385bef8ab11c735f43d201edd02` |
| I | [#329](https://github.com/iliya1947/vico-forum/pull/329), 2026-11-13 16:01 | Better Auth active-account session, HTTP/direct API и target-write lifecycle admission; signed own sign-out | `44d6b69a8d235cc8b1ee30953839be71e6ab836a` |
| J | [#330](https://github.com/iliya1947/vico-forum/pull/330), 2026-11-14 12:17 | Forum actor lifecycle на 24 writer paths и service no-op paths, транзакционные races и connected acceptance | `398dae18d5ca7c3fc6dd84fd93a29d7c381ba366` |
| K | [#332](https://github.com/iliya1947/vico-forum/pull/332), 2026-11-15 07:55 | Attachment metadata/journal/private read/Cancel actor admission, local-R2 Worker/Chromium K5 | `6652c898067d05a7c1476377e95f50cd73937410` |
| L | [#333](https://github.com/iliya1947/vico-forum/pull/333), 2026-11-15 16:58 | Все шесть authorization mutation intents с actor state guard внутри существующего mutex/transaction | `859ea69165f51cd997e61b1d1f30f6663f045965` |
| M+N | [#334](https://github.com/iliya1947/vico-forum/pull/334), 2026-11-16 06:39 | AP-10 measure/appeal и Complaints submit/review/priority/activity/notes/decision/appeal admission | `c7f2538ce1d4d37152bc3d503587dc9dabd28f24` |
| O–S | [#335](https://github.com/iliya1947/vico-forum/pull/335), 2026-11-16 08:56 | Own locale, Privacy, Owner registration-settings, new translation-generation plans; whole-SA04 connected closure | `b5180e5fcc8483dc13e1b087102a51560c80e035` |

A1 и A2–H были объединены до следующих writer/auth packages. Для L–S
сначала приняли единый технический план; фактическая поставка затем шла
последовательными merge-блоками **L → M+N → O–S**. Это история
действительного delivery, а не первоначальная модель одного
cumulative PR. Итоговый `main` после #335:
`b5180e5fcc8483dc13e1b087102a51560c80e035`.

## Значимые correction/review циклы

1. **A1 / A2–H:** `SA04-A1-MIRA-01` и `A4-MIRA-01` закрыты до
   итоговых coordinator/independent PASS; объединённые срезы сохраняют
   отсутствие авторитетного deactivate command.
2. **J:** независимая проверка Лёвы воспроизвела
   `SA04-J-LEV-01` — deadlock между edit и same-actor topic-title
   Complaint из-за порядка блокировок. Локальное изменение порядка/
   совместимости locks закрыто повторной независимой проверкой.
   Финальные Мира и Лёва whole-J: **PASS**.
3. **K:** `SA04-K-LEV-01` закрыт корректировкой private unexpected-5xx
   для alias/trailing-slash attachment GET/HEAD. Лёва повторил
   расширенный HTTP privacy probe: **16/16 PASS**. Мира и Лёва whole-K:
   **PASS**.
4. **M+N:** первоначальный [Лёва RETURN](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6902833450)
   подтвердил `SA04-MN-LEV-01`: после прежнего успешного priority
   command последующий 401 терял retry `operationId`. Исправление
   сохранило nonce/selected input при rejected 401/503; новый nonce
   создаётся после успеха/новой Case version. Настоящий Chromium
   проверил 200→503→explicit retry/recovery и 200→401→explicit retry,
   отсутствие auto-POST и новых denied durable effects. На исправленном
   exact head `f5c0336a4e6e1f5cf9c85a4d4730da9d330c53fe`
   [Мира](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6909132820)
   и [Лёва](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6909332856)
   независимо завершили whole-M+N **PASS**, finding CLOSED.
5. **O–S:** во время connected S обнаружены и исправлены отсутствие
   `private/no-store` у ряда lifecycle auth 401 и registration
   fetcher response-stream abort; сохранены канонический writer,
   registration CAS и только ручной retry. Лёва выполнил author
   closeout на exact head `fa0c95105c00449ca72c7fd21a5045929d59542e`.
   [Мира](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6911129561)
   coordinator, [Лира](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6911727821)
   independent и [Марк](https://github.com/iliya1947/vico-forum/pull/331#issuecomment-6911844322)
   independent проверили **один стабильный exact head**, все трое
   **PASS — 0 confirmed current-SA04 O–S defects**. Только после
   трёх PASS #335 был объединён squash merge.

## Конечные exact-head проверки и ограничения доказательств

1. [CI #43827656491](https://github.com/iliya1947/vico-forum/actions/runs/43827656491)
   на финальном #335 head: **1073/1073** real PostgreSQL 17 tests,
   **2363/2363** application tests, lint/typecheck/build, Worker smoke
   и фактический migrated **69-table** schema manifest — SUCCESS.
2. [SA04-S connected #43827656616](https://github.com/iliya1947/vico-forum/actions/runs/43827656616)
   на том же head: настоящий built Worker + Better Auth +
   disposable PostgreSQL 17 + Chromium, **10 connected groups + whole-S PASS**.
   AP-10 (4/4), SA-01, SA-03, J12, K5, L3, M2 и N connected
   regressions на финальном head также SUCCESS.
3. Известная неизменённая проблема `drizzle-kit generate`
   (`TypeError: Do not know how to serialize a BigInt` при exit 0)
   означает, что зелёный generator step сам по себе **не доказывает**
   schema parity. Отдельно проверен фактический migrated manifest.
   Это ограничение не квалифицировалось как новый дефект SA-04.
4. Проверки использовали local/disposable инфраструктуру,
   fixture-деактивацию и synthetic Owner binding. Не выполнялись
   production state change, deployed/real Google OAuth/Owner binding,
   внешняя migration/Stage-6 acceptance или финальная визуальная
   приёмка владельца. Документация SA-04 закрывается **отдельным PR**
   после implementation merge; она не является частью #335.
