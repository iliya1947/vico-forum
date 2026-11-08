# Лёва — SET-03 / PR #304 independent review: CHANGES REQUIRED

[Current report #6716992555](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6716992555). Exact head `cc8dfc9722287ec66ade759b0b1c8d69a8062a6c`, base `cb805a074de3bfdcd140125ebaa425a76bb6496d`. Whole-PR review complete, один P2 SET03-LEV-01. Лёва остановился; next — Мира correction routing Лире.

Лёва — SET-03 / PR #304 independent technical whole-PR review: **CHANGES REQUIRED**.

**Exact head:** `cc8dfc9722287ec66ade759b0b1c8d69a8062a6c`.
**Base/current main:** `cb805a074de3bfdcd140125ebaa425a76bb6496d`.
Проверен весь26-file scope против [approved plan #6711736883](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6711736883), текущих Settings/Editor/auth/locale contracts. Реализацию не менял; других агентов не запускал. Авторские и coordinator conclusions не подменяли собственные проверки.

**Ровно один подтверждённый current-scope P2: SET03-LEV-01.** Других current-scope дефектов по завершённой проверке не установлено.

### [P2] SET03-LEV-01 — locale draft переносится в другой аккаунт после revalidation

**Место:** [settings-user.tsx:126–134](https://github.com/iliya1947/vico-forum/blob/cc8dfc9722287ec66ade759b0b1c8d69a8062a6c/app/routes/settings-user.tsx#L126).

Новая locale form не привязана к identity своего draft. Hidden `expectedUserId` обновляется из нового `state.accountId`, но uncontrolled `select defaultValue={savedLocale}` сохраняет прежний выбранный DOM value при смене loader/account. Поэтому после смены аккаунта форма уже адресована новому пользователю, продолжая показывать и отправлять несохранённый выбор предыдущего.

**Самостоятельно воспроизведено на exact built Worker → Better Auth → PostgreSQL17 → Chromium, через штатные auth endpoints:**

1. Создать Alice и Bob, сохранить им через настоящий Settings action соответственно `en` и `he`.
2. В контексте Alice открыть `/en/settings/user`, выбрать `ru` без сохранения.
3. В том же browser cookie jar выполнить настоящие `/api/auth/sign-out` и `/api/auth/sign-in/email` для Bob, оставив исходную Settings page открытой (сценарий смены входа в другой вкладке).
4. На исходной странице обычным header language switch перейти на `/ru/settings/user`. Router перечитывает loader/session; header теперь **Bob**, hidden `expectedUserId` теперь **Bob**, PostgreSQL `Bob.locale=he`.
5. Сам select остаётся тем же mounted DOM node (подтверждено собственным sentinel) и всё ещё содержит **ru**, выбранный Alice. Свежий loader `preferredLocale=he` не сбрасывает uncontrolled value.
6. Нажать «Сохранить язык» без нового выбора для Bob → запрос проходит identity check, **Bob.locale меняется he→ru**; Alice.locale остаётся en.

Итог независимого probe:
```json
{
  "before": {"visibleLocale":"ru","accountLocale":"en","expectedUser":"Alice"},
  "after": {"visibleLocale":"ru","accountLocale":"he","expectedUser":"Bob","sameMountedSelect":true},
  "afterSubmit": {"aliceLocale":"en","bobLocale":"ru"}
}
```

Это дефект account/draft isolation нового UI, **не** обход server authorization: writer корректно пишет текущего session actor. Проблема в том, что UI автоматически перевязывает старый выбор к новому expected identity, и stale-account guard уже не может его различить. Before revalidation обычный stale POST действительно получает409 — этот серверный guard исправен.

Причина также соответствует [официальной React select documentation](https://react.dev/reference/react-dom/components/select#controlling-a-select-box-with-a-state-variable): `defaultValue` задаёт только initial selection, не текущее значение после смены props.

**Bounded correction:** связать locale form/draft с текущим account ID, сбрасывая/перемонтируя его при identity change, чтобы visible locale и expected identity менялись вместе. Например, account-keyed form либо эквивалентное явное account-scoped state reset. Не переносить unsaved draft Alice в Bob и не заменять это глобальным auth/RBAC redesign. Сохранить intentional same-account editing и нынешние server-only actor/409/registry guards; автоматический POST не нужен.

**Acceptance:** два настоящих аккаунта в одном browser/storage context, открытая route остаётся mounted; после sign-out/sign-in и SPA loader refresh форма показывает сохранённую preference нового аккаунта (в примере he) либо безопасно блокирует старую форму до её сброса; старый выбор ru не отправляется за Bob. До явного нового submit запись Bob неизменна; после нового выбора меняется только Bob. Отдельные browser contexts и unmount/remount fixture этого случая не проверяют — именно так устроена текущая основная account-isolation coverage.

Evidence: `/workspace/work/set03-review-evidence/account-switch-probe.py`, JSON/log и `account-switch-locale.png`. Повторено штатными sign-out/sign-in, без подмены cookies, mock session или внедрения React state.

### Остальные независимо проверенные цепочки

- Theme остаётся browser-wide на прежнем `vico-theme`; System удаляет override. Bootstrap до hydration сохранён. Settings/header/OS/native storage events синхронизируются через общий helper; denied storage даёт transient browser-session fallback.
- Locale writer обновляет только session actor в существующем `user.locale`; generic Better Auth locale input остаётся закрытым. Strict POST/Origin/field multiplicity/expectedUserId; canonical active choice только из healthy current Runtime Registry; unknown/alias/inactive/noncanonical и degraded bootstrap selection отклоняются. Fresh root negotiation и explicit URL precedence реально проверены, включая dynamic `fr-CA`.
- Собственный PG/HTTP failure probe: реальный row UPDATE timeout → safe private/no-store503 без success redirect; явный retry после recovery303; реальный Registry SELECT timeout →503 даже для en, locale не записывается; unexpected schema42P01 сохраняется исходной ошибкой. Probe проверяет classification timeout, **не** обещает rollback single UPDATE при client deadline: его исход может быть неоднозначным; дополнительное требование атомарного cancellation в план не вводится.
- Editor/code сохраняют ровно четыре прежних per-account/device keys, unset mode/spellcheck defaults и отсутствие server sync. Shared adapter фильтрует subscriptions по account; реальные mounted MarkdownEditor/ForumCodeBlock получают изменения в обе стороны. Existing mode-switch/source/selection/history/attachment/publication boundaries не заменены вторым editor store.
- New authenticated User preferences route/private-no-store, Settings navigation, generic locale paths, EN/RU/HE keyboard/responsive/RTL и translations/fingerprints проверены.
- Schema/migrations/manifest/runtime-privilege contract/dependencies byte-unchanged. SET-04–06, notification preferences, drafts/autosave, deputies, Stage6/production/permanent docs отсутствуют.

### Собственное exact-head evidence

- **333 application/unit/route/UI tests,12 файлов PASS**, включая реальные editor/Markdown suites и новую Settings integration.
- **15 native PostgreSQL tests,4 файла PASS:** user-locale, auth-runtime, forum-email-registration, hyperdrive-registry.
- Build PASS; полная0000–0060 схема применена на disposable PostgreSQL17.
- **Actual Chromium → built Worker → Better Auth → PG:** SET-03 **11 case groups PASS**, separate SET-02 regression **17 case groups PASS**; оба exact SHA,0 page errors/external requests. EN/RU/HE320/768/1280 original overflow assertions сохранены, screenshots просмотрены. Положительные suites не закрывают независимо найденный mounted account-switch defect.
- Оба external harness adapters меняют только checkout path и Chromium executable; source/assertions implementation checkout не редактировались.
- Самостоятельно прочитаны GitHub runs: [CI #42443561989](https://github.com/iliya1947/vico-forum/actions/runs/42443561989) **SUCCESS/attempt2**, checks+database; [browser #42443561941](https://github.com/iliya1947/vico-forum/actions/runs/42443561941) **SUCCESS/attempt1**, browser+history_browser+settings_browser. Оба на том же exact SHA. Полный CI/AP-10/History локальный rerun не заявляется.

Evidence/logs/results/screenshots/source audit/manifest/hashes: `/workspace/work/set03-review-evidence/`. Checkout/diff clean, implementation unchanged, PR/head/base перед публикацией unchanged/open. Task-owned preview/container/DB/dummy vars/dependency symlink удалены.

### Handoff — Мира

Принять **CHANGES REQUIRED**, подтвердить/направить Лире один bounded correction **SET03-LEV-01** в том же PR #304. После нового stable head и применимых checks — fresh coordinator whole-PR, затем independent technical review того же head. К merge сейчас не готовить. SET-04–06 и permanent docs не начинать.

Лёва завершил whole-PR review и остановился; реализацию не исправлял, Марк не назначен.

## Approved / closed context

Settings plan [#6711736883](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6711736883) coordinator-approved. SET-01 closed; SET-02 implementation #302 and separate docs #303 merged. Prior SET-02 independent PASS [#6715843589](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6715843589) concerns07d805d9; its evidence remains /workspace/work/set02-repeat-evidence/. Current SET-03 evidence /workspace/work/set03-review-evidence/. SET-04–06 unassigned. No last-manager/count/recovery rule applies.
