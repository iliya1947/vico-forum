# Лёва — SET-02 / PR #302 independent review: CHANGES REQUIRED

[Report #6715455171](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6715455171). Exact head `f7a862ea0a81112857e9d7510afdab183a9631a3`, base `681e8bab0eda595186acebae9ce4b2d47d06b936`. Проверка завершена; один current-scope P2, **SET02-LEV-01**. Implementation не менялся. Следующий шаг — Мира: bounded correction routing Лире; SET02-MIRA-01/02 не переоткрываются.

Лёва — SET-02 / PR #302 independent technical review: **CHANGES REQUIRED**.

**Exact head:** `f7a862ea0a81112857e9d7510afdab183a9631a3`.
**Base/main:** `681e8bab0eda595186acebae9ce4b2d47d06b936`.
Проверен весь49-file diff против approved SET-02 plan #6711736883 и frozen product scope. Coordinator/author evidence не подменяло самостоятельную проверку. Implementation не менялся; других агентов не запускал.

**Один подтверждённый current-scope finding, P2: SET02-LEV-01.** Других current-scope defects по завершённой проверке не установлено.

### [P2] SET02-LEV-01 — ошибка чтения registration policy превращается в ordinary validation denial

**Места:** [registration-admission.ts:26](https://github.com/iliya1947/vico-forum/blob/f7a862ea0a81112857e9d7510afdab183a9631a3/app/auth/registration-admission.ts#L26), [auth.server.ts:156](https://github.com/iliya1947/vico-forum/blob/f7a862ea0a81112857e9d7510afdab183a9631a3/app/auth/auth.server.ts#L156), [auth-api.ts](https://github.com/iliya1947/vico-forum/blob/f7a862ea0a81112857e9d7510afdab183a9631a3/app/routes/auth-api.ts).

Approved plan §2/SET-02 различает controlled unavailable и ordinary policy denial: невозможность прочитать policy должна оставаться typed unavailable/fail-closed; unexpected schema/config/programming errors не должны становиться обычным denial. Сейчас первичная ошибка теряется внутри Better Auth до application failure classification.

**Самостоятельно воспроизведено на настоящих AuthRuntime.handle + Better Auth1.7.7 + PostgreSQL17, без mock resolver:**
1. Полная0000–0060 схема в отдельном disposable schema; flags=true/true. Через production `createHyperdriveAuthRuntime` создан обычный existing email account.
2. Отдельная PG transaction удерживает `LOCK TABLE forum_registration_settings IN ACCESS EXCLUSIVE MODE`. AuthRuntime получает настоящий PG Client с тем же schema и `query_timeout=350`.
3. Валидный direct `POST /api/auth/sign-up/email` нового пользователя доходит до policy SELECT и получает реальный `Query read timeout`.
4. Наружу возвращается **HTTP403**, JSON `{"code":"validation_failed","message":"User validation failed"}`.
5. Новый user не создан; existing email sign-in в это же время возвращает200, что изолирует отказ именно policy read.
6. Отдельный контроль с отсутствующей singleton row приводит к тому же403/`validation_failed`, хотя module бросает `RegistrationSettingsInvariantError`, а не принимает policy decision.

**Причинная цепочка:** async SELECT/row validation в новом admission hook → исключение Drizzle/PG либо invariant → установленный Better Auth `dist/utils/validate-user-info.mjs:assertValidUserInfo` ловит **любое** исключение callback и заменяет его cause-less403 `validation_failed` → `auth.handler()` возвращает готовый Response → current `AuthRuntime.handle`/auth route не сохраняют первичную admission failure и отдают этот denial клиенту. Существующее error preservation для session adapter не охватывает этот прямой Drizzle SELECT и response path.

Создание аккаунта остаётся запрещённым. Дефект — маскировка инфраструктурного/инвариантного отказа под отказ валидации пользователя, в нарушение принятого failure contract. Intentional method closure с403/`vico_*_registration_closed` — отдельное нормальное поведение и должно сохраниться.

**Нужная bounded correction:** сохранить original admission failure в request-local boundary до того, как Better Auth её поглотит; на application response boundary классифицировать только известные DB availability/timeouts как controlled unavailable (для email API503). Invariant/unexpected errors должны идти по обычному error path. Не выводить причину из одного `validation_failed`, не превращать все403/500 в503 и не менять policy на permissive fallback. Сохранить безопасную OAuth error/cookie обработку, existing sign-in/link и сам trusted create-user gate; новый auth framework или deputy/Settings redesign не требуется.

**Acceptance correction:** реальный PG lock/query timeout через production AuthRuntime.handle должен дать unavailable вместо validation denial при0 новых user/account/session; missing singleton должен остаться invariant/error, не ordinary403. Existing sign-in и intentional closed-registration403 должны сохраниться. Проверить именно интеграцию с Better Auth, а не только rejected promise самого hook.

Repro evidence: `/workspace/work/set02-review-evidence/admission-failure-probe.mts`, `admission-failure-probe.json` и log. Итог JSON:
```json
{"signupStatus":403,"signupBody":{"code":"validation_failed","message":"User validation failed"},"newUsers":0,"existingSignInStatus":200,"missingSingleton":{"status":403,"body":{"code":"validation_failed","message":"User validation failed"},"newUsers":0}}
```

### Остальные проверенные цепочки

- Singleton PG/CAS: два независимых defaults=true, both-closed допустим, no master switch/Owner bootstrap exception. Exact Owner/existing actor, row lock/version, stale409/no-op и final atomic ordered History согласованы; failed History rollback проверен.
- Migration0060 добавляет только registration relation/seed и расширяет один History action-target CHECK. Accepted0000–0059 unchanged. Deep JSON comparison0059/0060: единственная новая таблица, единственное изменённое existing table поле — History checkConstraints/action-target. Actual structural manifest проверен для64 public tables. Web rights на новую relation только SELECT/UPDATE, localization-read не расширен.
- Settings entrance/private Owner Forum & roles, shared ForumShell, четыре явных unavailable future sections; canonical шесть authorization writers переиспользованы через fetcher, non-Owner legacy reads сохраняются. Session/Owner/Origin/strict form/private-no-store guards, CAS refresh без автоповтора POST, registered generic locale paths и EN/RU/HE presentation проверены.
- Create-user source/method/provider admission, fresh flags на callback, unknown method rejection, existing Google/email sign-in и protected explicit link проверены независимо.
- **SET02-MIRA-01/02 остаются закрытыми:** установленный disableImplicitLinking предотвращает verified same-email implicit link; настоящие signed OAuth state/callback тесты доказывают open→open success и open→closed rejection без новых user/account/session/cookie. Реальным является Better Auth+PG/protocol state; только remote Google synthetic.
- Header wrapping fix локален к новой Settings link; прежние browser assertions не ослаблены. Scope не расширен в SET-03–06/deputies/production/docs.

### Собственное evidence на exact head

- Pinned Node24.21.0/pnpm12.3.4 toolchain, disposable loopback PostgreSQL17.
- **93 unit/route/UI tests (15 files) PASS**, **84 native PG tests (6 files) PASS**, build PASS.
- **3 metadata script suites PASS**: migration history, structural manifest, runtime-privilege contract. Дополнительно actual PG64-table manifest parity PASS.
- **Actual Chromium → built Worker → Better Auth → PG:** SET-02 **17 case groups PASS** (all flag combinations, Owner/no-op/History, guest/non-Owner/Origin/forgery, stale409/no replay, old signup page vs closed server, existing login, canonical six writers, EN/RU/HE320/768/1280); отдельный legacy History **38 groups PASS** (including timeout/recovery, Owner self-deny, readonly non-Owner).
- Обе browser suites:0 page errors/external requests; responsive overflow assertions PASS. SET-02 adapter меняет только checkout path/Chromium executable; History runner из exact checkout с CHROMIUM override. Два synthetic bindings/DBs применены отдельно, built code не менялся.
- Независимый fault probe выше выявляет current failure-contract defect несмотря на passing существующих suites. Native tests на missing row сейчас проверяют только отсутствие success/user и потому не ловят неверную классификацию403.
- Exact-head GitHub [CI #42431260134](https://github.com/iliya1947/vico-forum/actions/runs/42431260134) и [browser #42431260118](https://github.com/iliya1947/vico-forum/actions/runs/42431260118) independently read: SUCCESS/attempt1/тот же SHA. Это отдельное CI evidence; локальный полный CI/AP-10 rerun не заявляется.

Evidence: `/workspace/work/set02-review-evidence/` — logs, own probe/JSON, Settings/History results/screenshots, schema/metadata logs, manifest/hashes и report. Checkout/diff-check clean; task-owned Workers/container/DBs остановлены/удалены, dummy vars и dependency symlink удалены. PR head/base перед публикацией unchanged/open/mergeable.

### Handoff — Мира

Принять **CHANGES REQUIRED**, ровно один подтверждённый пакет исправления **SET02-LEV-01**; направить Лире bounded correction в том же PR #302. Координаторские SET02-MIRA-01/02 не переоткрывать. После нового stable head/checks — fresh coordinator whole-PR cycle, затем independent technical review того же head. К merge сейчас не готовить.

Лёва проверку завершил и остановился, реализацию не исправлял. SET-03–06, permanent docs closeout и Stage6/production/real Google/Owner binding вне этого review; Марк не назначен.

## Approved / closed context

[Settings plan #6711736883](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6711736883), coordinator PASS. SET-01 fully closed (#299 + separate docs #301). [Предыдущий independent SET-01 report](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6713064366). SET-03–06 unassigned. Owner redesign closed; last-manager/count/recovery rule не применяется. Current review evidence — `/workspace/work/set02-review-evidence/`.
