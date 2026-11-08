# Лёва — SET-04 / PR #307 independent review: CHANGES REQUIRED

[Current report #6718927323](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6718927323). Exact head `5cc5c820b0445ddb57cf3663e7cfb33c059ab108`, base `35fa64428fc551ae58b9026dad45797016dd4251`. Whole38-file review complete, один P2 SET04-LEV-01. SET04-MIRA-01 independently remains closed. Лёва остановился; next — Мира bounded correction routing.

Лёва — SET-04 / PR #307 independent technical whole-PR review: **CHANGES REQUIRED**.

**Exact head:** `5cc5c820b0445ddb57cf3663e7cfb33c059ab108`.
**Base/current main:** `35fa64428fc551ae58b9026dad45797016dd4251`.
Весь38-file scope проверен против [approved SET-04 plan #6711736883](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6711736883) и текущих Settings/Admin/auth contracts. Implementation не менялся; других агентов не запускал. Author/coordinator conclusions не подменяли собственное evidence.

**Ровно1 подтверждённый current-scope P2: SET04-LEV-01.** Других current-scope defects по завершённой проверке не установлено. SET04-MIRA-01 независимо подтверждён исправленным и не переоткрывается.

### [P2] SET04-LEV-01 — Administrator preferences скрыт от допустимого close-only администратора

**Места:** [новый entry projection locale-boundary.tsx:121–133](https://github.com/iliya1947/vico-forum/blob/5cc5c820b0445ddb57cf3663e7cfb33c059ab108/app/routes/locale-boundary.tsx#L121), [новая Settings navigation settings/shell.tsx](https://github.com/iliya1947/vico-forum/blob/5cc5c820b0445ddb57cf3663e7cfb33c059ab108/app/settings/shell.tsx), [Settings landing](https://github.com/iliya1947/vico-forum/blob/5cc5c820b0445ddb57cf3663e7cfb33c059ab108/app/routes/settings.tsx).

SET-04 доступен пользователям с **фактическим текущим Admin или Attention доступом**. Existing `ADMIN_FORUM_PERMISSIONS`/`ADMIN_ADMISSION_PERMISSIONS` и permanent Admin admission matrix включают `forum.topic.close`: это самостоятельная действующая capability, допускающая Forum/Overview. Однако locale-boundary собирает `admin` из неполного списка: `forum.topic.close` в его permission reads/Set отсутствует. Новый `adminEntryDestinations = allowedAdminEntries(admin)` получает пустой список, а новые Settings landing/nav проверяют `header.canViewAdminPanel || header.canViewModerationAttention` и полностью скрывают Administrator preferences.

**Собственная real Chromium → built Worker → Better Auth → PostgreSQL17 проверка:**

1. Настоящий новый пользователь с единственным административным grant `forum.topic.close` (прочие ordinary built-in user permissions не менялись).
2. Direct `/en/admin` → **200**; direct `/en/settings/administrator` → **200**; `/en/settings` → **200**.
3. В последнем Settings документе **0 ссылок** на `/en/settings/administrator` — отсутствуют и nav item, и entry card. Header Admin link также отсутствует. То есть новый Settings surface допускает этого actor сервером, но пользователь не получает путь к нему через Settings.
4. Добавить тому же actor только sibling `forum.topic.pin`, перечитать Settings → **2 ссылки** Administrator preferences появляются.
5. Отозвать только pin, оставив close → снова **0 ссылок**, при этом direct Administrator preferences по-прежнему **200**. Это изолирует пропущенный close, а не session/Owner/Registry/storage outage.

```json
{
  "closeOnly": {
    "/en/admin":200,
    "/en/settings/administrator":200,
    "/en/settings":200,
    "administratorPreferenceLinks":0
  },
  "withAdditionalPin": {"administratorPreferenceLinks":2},
  "afterPinRevoke": {"administratorPreferenceLinks":0,"directAdministratorStatusStill":200}
}
```

**Сравнение с baseline:** пропуск close в старом header boolean уже существовал в main; не объявляю его вновь внесённым SET-04 и не требую отдельного общего header audit. Current-scope defect — новая SET-04 поверхность/её entry destinations и две новые точки Settings navigation используют эту неполную projection и не предоставляют утверждённый доступ поддерживаемому Admin actor. До этого PR Administrator preferences вообще не было. Нужна bounded согласованность новых consumers с уже действующей admission matrix, не расширение прав или исправление несвязанных старых разделов.

**Correction:** учесть весь действующий Admin admission, включая close, в серверной projection, от которой зависят новые entry destinations/Settings links. Сохранить независимые route guards, personal-only storage и intersection с effective permissions; не добавлять permissions, role-name exceptions или локальную authority.

**Acceptance:** реальный close-only actor видит Administrator preferences в Settings и получает допустимые Overview/Forum entry choices; прямой Admin остаётся Overview. После отзыва единственного административного grant новый route403 и ссылки исчезают. Pin/history-only/Attention-only actors сохраняют их существующее поведение. Покрыть согласованность header/Settings projection с authoritative Admin admission на этом случае.

Evidence: `/workspace/work/set04-review-evidence/workspace-probe.py`, JSON/log, `close-only-settings-navigation.png`. Permissions выдавались/отзывались только в disposable fixture; session/HTTP/SSR/React/navigation настоящие.

### SET04-MIRA-01 закрыт отдельно

Независимо от основной author suite создал настоящих Better Auth manager/target, выдал manager только `admin.users.blocks.manage`, через реальный Settings control выбрал compact и открыл measures index. Затем настоящей валидной AP-10 create command создал measure и открыл **реальный protected `/admin/measures/:id` loader**:
- AdminShell получает текущий actor и `data-density=compact`;
- `adminLast` остаётся `measures`, весь preference record неизменен;
- ни private measure ID, ни target ID/path в JSON не записались;
- другой authenticated target получает403 на том же detail URL.

Проверена настоящая route chain, не только manually injected access prop. Own UI rerun также проверил matching/mismatched header actor и comfortable fallback. Coordinator correction от1a858825 — ровно3 files/1 runtime expression, без AP-10 domain/action change.

### Остальные whole-PR границы

- Versioned record содержит только разрешённые enums/boolean и workspace IDs; unknown version/corrupt/invalid groups/raw-URL fields → безопасный default; лишние поля не уходят из decoder. Storage denial не блокирует workspace, transient fallback изолирован по account.
- Same-tab/storage subscriptions и controlled Settings fields остаются account-bound. Header entry preferences пересекаются с текущими доступными destinations/groups; explicit paths/query и object deep links не перенаправляются. Last recording ограничен точным index pathname и нормализованным mode/group, без private URL/query filters/IDs.
- Admin/Attention density применяется только к presentation. TechnicalDetails скрывает secondary IDs/slugs, а reasons/decisions/errors/actions остаются снаружи; manual override работает. Новые authentication/authority/domain semantics не введены.
- Guard нового Administrator route независим, private/no-store и использует current effective Admin/Attention capability, не роль/локальный preference. Owner-only global settings отдельно.
- Localization/EN/RU/HE/native keyboard/tap targets/RTL/320–768–1280 assertions проверены. Нет новой DB/schema/migration/dependency/runtime privilege, SET-05/06, notification/drafts/deputy/production scope.

### Собственное exact-head evidence

- **251 application/unit/route/UI tests,21 файл PASS**: new preferences/route, Admin consumers, measure detail, authorization/locale/header, public Attention и existing Settings regression.
- **9 native PostgreSQL tests,3 файла PASS:** admin-overview/admission, admin-users-authorization, user-measure-authority.
- Build PASS; полная0000–0060 схема в disposable PostgreSQL17.
- **10 real SET-04 Chromium case groups PASS**,0 page errors/external requests: Owner/Admin-only/Attention-only, defaults/last and explicit URLs, density/disclosure/manual override, same-cookie-jar account isolation, revoke и EN/RU/HE responsive/keyboard. Assertions не ослаблены; external adapter меняет только checkout path/Chromium executable; screenshots просмотрены.
- Дополнительный собственный4-case browser probe подтверждает finding и отдельно corrected real measure-detail/independent403. Passing general suite не закрывает close-only omission.
- GitHub [CI #42458305882](https://github.com/iliya1947/vico-forum/actions/runs/42458305882) и [Chromium #42458305779](https://github.com/iliya1947/vico-forum/actions/runs/42458305779) independently read: **SUCCESS, attempt1, тот же SHA**, checks+database и все4 browser jobs. Full CI/AP-10/History local rerun не заявляется.

Evidence/source audit/logs/results/screenshots/manifest/hashes: `/workspace/work/set04-review-evidence/`. Implementation unchanged, checkout/diff clean; head/base before publication unchanged/open/mergeable. Task-owned preview/container/DB/dummy vars/dependency symlink удалены.

### Handoff — Мира

Принять **CHANGES REQUIRED**, подтвердить/направить Лире один bounded пакет **SET04-LEV-01** в том же #307. **SET04-MIRA-01 остаётся закрытым**. После нового stable head/checks — fresh coordinator whole-PR, затем independent same-head review; текущий head к merge не готовить.

Лёва whole-PR review завершил и остановился, реализацию не исправлял; Марк не назначен. SET-05/06, factual docs closeout и Stage6/production/live Google/real Owner binding вне этого review.

## Approved / closed context

Settings plan [#6711736883](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6711736883) approved. SET-01–03 implementation and separate factual docs closed. SET-03 independent PASS [#6717213664](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6717213664) retained with evidence /workspace/work/set03-repeat-evidence/. Current evidence /workspace/work/set04-review-evidence/. SET-05/06 unassigned. No last-manager/count/recovery rule applies.
