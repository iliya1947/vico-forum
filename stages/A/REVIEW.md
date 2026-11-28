Этот файл хранит coordinator review bounded Stage A ChatGPT-control.

# Stage A — coordinator review Миры

Статус: **HOLD**  
Проверенный implementation PR: **#399**  
Stable exact head: `fe4c6d7b13cac06e5059d2cffd1d0e4cf5f973eb`  
Base `main`: `c49897181388b4a78f8e8248dc6508551df576c4`

## Проверенный scope

Stage A из принятого root `PLAN.md`:
- приватная модель подключения;
- закрытые tool schemas;
- exact-Owner / live Better Auth session binding;
- scoped OAuth tokens и revoke;
- локальный MCP/OAuth fixture;
- Project instructions;
- локальная Stage-A acceptance foundation;
- без Stage B transport/domain implementation и без production activation.

Проведён source-level review security-sensitive OAuth/admission/store/tool-contract paths и сопоставление adapter interception с фактическими вызовами `@better-auth/oauth-provider@1.7.7`.

## Подтверждённые findings текущего Stage A

### A-F01 — TypeScript compile failure

Основной CI run `46109469613`, job `checks` / `140869541951` падает на `pnpm typecheck`.

`app/forum-control/oauth-provider.server.ts`, exported `createForumControlOAuthProvider`:
- TS2742: inferred exported type нельзя стабильно назвать без ссылки на внутренний pnpm/zod path;
- TS7056: inferred type превышает предел сериализации compiler.

Это текущий дефект Stage A: implementation не проходит обязательный typecheck. Исправление должно сохранить фактический contract pinned Better Auth 1.7.7; способ аннотации выбирает исполнитель.

### A-F02 — OAuth DB acceptance fixture исчерпывает реальный auth rate-limit

CI run `46109469613`, database job `140869542161`: три сценария `tests/database/forum-control-oauth.test.ts` получают `429` вместо ожидаемого `200` в helper `login()`.

Тест выполняет несколько реальных `/sign-in/email` через canonical Better Auth runtime и попадает в общий database-backed rate-limit bucket.

Это текущий дефект Stage A test/acceptance composition: необходимые OAuth lifecycle сценарии не выполняются. Коррекция должна сделать disposable fixture детерминированным **без ослабления production auth rate limiting** и затем доказать все заявленные OAuth/grant/revoke сценарии.

### A-F03 — regression test оставлен на migration 0078

Тот же database job:
`tests/database/sa07-data-monitoring.test.ts:42` ожидает
`0078_auth_registration_challenge_observation`,
но новый accepted repository head содержит
`0079_forum_control_oauth`.

Это текущий integration defect Stage A: добавление migration 0079 требует согласовать существующую проверку текущего compiled migration state.

## Не findings

1. Единственный eslint warning относится к неизменённому `app/forum/ui.test.tsx` и не является дефектом Stage A.
2. OAuth provider/runtime остаётся optional server-side composition; production Worker Stage A не активирует новый канал.
3. При статической сверке native Better Auth 1.7.7 adapter paths для authorization-code persistence, consent, token create/rotation/revoke и replay-family cleanup соответствуют перехватываемым Vico операциям; дополнительного подтверждённого текущего security finding по этой линии не найдено.
4. Browser acceptance run `46109469738` имеет статус `skipped`: это не самостоятельный implementation finding, а **непроведённая обязательная проверка** после исправления текущих дефектов.

## Что ещё не подтверждено из-за раннего CI failure

После typecheck/database failure CI не дал достаточного успешного evidence для полного Stage A:
- remaining build/schema/runtime-privilege checks;
- local OAuth Chromium acceptance.

Их нужно выполнить на новом stable exact head после correction.

## Критерий повторной передачи Мире

1. A-F01–A-F03 исправлены одним bounded correction пакетом.
2. Исполнитель выполняет source self-check изменений.
3. Новый stable exact head передан Мире.
4. Мира заново запускает/проверяет применимый CI и затем `run:acceptance` для local OAuth Chromium.
5. Stage B остаётся заблокирован до coordinator PASS.
