# Лёва — Stage2 / PR #296 independent technical review: PASS

[Полный отчёт #6704068605](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6704068605). Назначенная independent review завершена на exact head `824ab8eccb091664c2e7d37f81f2737e7fd43e87`. Подтверждённых current-scope defects: 0. Следующий шаг — Мира: readiness; merge выполняет владелец, затем separate factual docs closeout.

Лёва — independent technical review PR #296: **PASS**.

**Exact head:** `824ab8eccb091664c2e7d37f81f2737e7fd43e87`.
**Base/main:** `8301087f9322b34bdd325ed9298fdf3fddd84561`.
Проверен весь 34-file diff против approved Stage2 plan #6702391114 + authoritative AP-10 revision #6702520494 + Owner all-catalog clarification. Проверка самостоятельная: coordinator PASS не использован как доказательство; реализацию не менял, других агентов не запускал.

**Подтверждённых current-scope defects: 0.**

### Выводы по реализации

1. **Owner effective authority.** Одна exact server binding даёт существующему DB user все keys централизованного code-backed catalog независимо от сохранённой обычной роли/grants/deny. Новая реальная catalog capability автоматически входит в projection; неизвестные строки не становятся authority. resolve, direct has, bulk/targeted management и fresh actor check после mutex согласованы. Raw конфигурация не переписывается; `authoritySource` — закрытая presentation metadata, не роль/grant/session claim. Missing/invalid binding не повышает обычного пользователя.

2. **AP-10 authoritative path.** Actor/target raw permissions заново вычисляются из grants+overrides до Owner projection/sanction filtering на том же transaction client. Только bound Owner проходит без raw basic block-manage key; rank3 затем проходит обычные self/Owner-target, strict hierarchy и issuer-floor checks. Create/change/lift, accepted/rejected appeal review, target/detail и ранний queue precheck согласованы. Non-Owner raw deny, elevated prerequisite, peer/floor boundaries и privacy discovery сохранены.

3. **Immunity и request composition.** Сохранённые measures не ограничивают текущего Owner в native/Drizzle admission, Forum/attachments, Complaints adapters, dormant generation admission, administrative permission wrapper и private restriction hints. Stored rows/History не удаляются и не превращаются в synthetic lift. Worker передаёт server binding через существующие injection seams. Для non-Owner overlap/expiry/floor/enforcement продолжают действовать. Domain/session/Origin/ownership/CAS/lifecycle checks не заменены Owner bypass.

4. **Owner-only elevated gate.** Role grants add/remove, role assignment в/из elevated role (включая implicit default), personal allow/deny/inherit и косвенный revoke удалением elevated custom role защищены в serialized authorization transaction. Ordinary role changes/delete не получают нового общего Owner-only запрета. UI и backend согласованы; direct forged non-Owner POST не полагается на скрытые controls.

5. **UI, localization, scope.** Закрытый UI показывает реальную сохранённую роль/deny и отдельно объясняет Owner effective authority в EN/RU/HE; публичной Owner роли или binding editor нет. Существующие private/no-store и own-measure identity allowlist сохранены. Нет изменений schema/migrations/seeds/dependencies/permanent docs/Settings/super-admin/infra; `authz_mutation_lock` сохранён без redesign. Last-manager/count veto не возвращён.

### Собственное evidence на exact head

Pinned Node24.21.0, pnpm12.3.4 toolchain, одноразовая loopback PostgreSQL17; существующие dependencies. Сборка exact checkout **PASS**.

- **56/56 unit/route/UI tests, 8 files:** Owner/helper, authorization presentation/repository/Hyperdrive, authorization/measures routes, AP-10 authority и Worker composition.
- **96/96 native PostgreSQL tests, 8 files:** Owner authorization, authorization snapshots, AP-10 authority/direct enforcement/readers/transitions и atomic History, на полной repository migration chain 0000–0059.
- **Собственный дополнительный native PG probe**, отдельно от авторских tests:
  - existing Unicode Owner с пустым raw role и deny на весь catalog сохраняет catalog-bound authority; unknown/nonexistent user не получает права;
  - через `pg_stat_activity` подтверждены **два реальных mutex waits**: Owner и ordinary manager; revoke обычного actor committed вместе с release. Owner mutation succeeds, ordinary actor после fresh check denied; denied role/event не создаются;
  - принудительный trigger failure на History откатывает Owner-created role и event, несмотря на raw-deny bypass;
  - текущий Owner immune к stored ordinary/admin restrictions; invalid binding не immune; measure rows/lift state и event count не переписываются.
- **Actual Chromium → built Worker → Better Auth → PostgreSQL:**
  - AP-10/AP-11/Stage2 **37 case groups PASS**, включая canonical Owner elevated assignment/override/explicit grant-revoke/delete, fresh recipient requests/History, preserved raw deny и EN/RU/HE at320/768/1280;
  - Admin History в **отдельной disposable DB: 35 case groups PASS**, canonical six management producers, no-op/denied/stale, real timeout/503/degradation/recovery, self-revoke commits один event и next management GET/POST denied;
  - AP-10 results: 0 layout failures, 0 page errors, 0 external requests; History: 0 page errors/external requests. Screenshot assertions не ослаблялись.

AP-10 runner исполнен из внешней копии с **двумя только environment substitutions**: checkout path и `/usr/bin/chromium` executable вместо channel lookup. Все case/assertion/SQL и implementation-файлы неизменны. History runner исполнен непосредственно из exact checkout с `CHROMIUM` override. AP-10 JSON пишет exact implementationHead; History JSON SHA не содержит, поэтому привязка подтверждается checkout/build/command manifest этого review.

### GitHub checks и состояние

Самостоятельно сверены exact-head runs:
- [CI #42349494000](https://github.com/iliya1947/vico-forum/actions/runs/42349494000): SUCCESS, attempt1, head824ab8e.
- [Browser #42349494094](https://github.com/iliya1947/vico-forum/actions/runs/42349494094): SUCCESS, attempt1, тот же head.

Это author/CI evidence отдельно от перечисленных собственных reruns; полные1974 app/571 PG tests локально повторно не заявляю.

PR open/draft/mergeable; head/base перед публикацией unchanged. Diff от ранее coordinator-reviewed04865401 до final head — ровно2 test files; весь final34-file diff проверен независимо. Tracked checkout чист; task-owned Workers остановлены, disposable PostgreSQL container/DBs удалены, dummy vars и dependency symlink удалены.

Local evidence: `/workspace/work/owner-stage2-review-evidence/` — application/database/build logs, independently written owner-boundary-probe.mts + JSON, both browser logs/results/screenshots, environment adapter, command manifest и hashes.

### Handoff — Мира

Принять independent **PASS** на указанном exact head и завершить readiness #296. Merge выполняет владелец. После implementation merge — отдельный factual documentation closeout с Owner effective-vs-raw contract, immunity/elevated boundary, PROJECT_STATE и historical evidence. До implementation/docs merge Stage2 целиком не closed.

Это repository/local engineering review, не production deployment, owner visual acceptance или завершение Settings/redesign целиком. Любое изменение implementation head требует нового coordinator-first цикла. Лёва review завершил и остановился; Марк не назначен.

## Approved planning context

- [Исходный bounded plan #6702391114](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6702391114)
- [Authoritative AP-10 correction #6702520494](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6702520494)
- Owner all-catalog clarification и coordinator plan PASS зафиксированы в общем плане/канале; administrative-only interpretation отозвана.
- Нулевое число ordinary managers допустимо; last-manager principle не применяется. Owner authority — отдельная server-controlled projection, не система recovery/count veto.
- Полный исходный личный planning snapshot доступен в service history; этот файл отражает актуальный review result.

Stage1 полностью закрыт (#294 + #295 merged); [предыдущий independent PASS](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6701647394). Ordinary AP-01–AP-11 закрыт. Settings остаётся после owner/authorization redesign; Марк не назначен.
