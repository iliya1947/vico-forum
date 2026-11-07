# Лёва — Stage2 owner authority: технический план готов

[Полный план в #251](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6702391114). Baseline main `8301087f9322b34bdd325ed9298fdf3fddd84561`; migrations 0000–0059. Статус: предложен для coordinator review Миры, не implementation/acceptance. Исполнитель не назначен; Марк не назначен.

Лёва — owner/authorization redesign Stage 2: технический план для coordinator review.

Baseline: main `8301087f9322b34bdd325ed9298fdf3fddd84561`, migrations 0000–0059. Stage1 полностью закрыт: implementation #294 и factual docs #295 merged. Ни implementation PR, ни исполнитель Stage2 пока не назначены. Ниже — предлагаемый технический план, не описание уже реализованного поведения.

### 1. Цель и границы

Сделать bound Owner действующей server-controlled верхней authority поверх существующих dynamic roles + per-user allow/deny/inherit. Owner не становится ролью, grant, override или claim из клиента. Его возможность управлять форумом не зависит от назначенной обычной роли, её grants и собственных deny.

Минимальная реализация: одна общая Owner-aware семантика эффективных permissions, её применение во всех существующих read/write путях, согласованная immunity от administrative measures и завершённая Owner-only граница повышенного permission. Без новой схемы/миграции, новых permissions/seed grants, второй RBAC, Senior/Head Admin, Settings, super-admin UI, owner-binding editor, bootstrap/recovery subsystem или изменений инфраструктуры. Миграции остаются до 0059.

`authz_mutation_lock` сохраняется без redesign/removal: target-модель не требует менять сериализацию. Stage1 остаётся действующим: нет manager counts, zero-manager veto или обязанности сохранить обычного access manager. Нулевое число обычных managers допустимо.

### 2. Единый источник Owner authority

Переиспользовать `VICO_OWNER_USER_ID`, полученный только из server environment. Небольшой общий helper нормализует не identity, а правило проверки: binding должен быть валидной непустой строкой без обрезаемых краевых пробелов; сравнение с реальным user ID точное. Email, имя роли, submitted actor ID, session role и произвольные form fields не являются источниками Owner authority.

Owner-aware effective projection для существующего пользователя: все keys текущего code-backed `PERMISSION_CATALOG` независимо от raw role grants/overrides. Это ограниченный набор реализованных возможностей, не wildcard и не разрешение неизвестного permission. Для остальных пользователей сохраняется текущий deny > allow > role. В DB не добавлять Owner grants и не переписывать его обычную конфигурацию.

Raw `role/grants/overrides` продолжают показывать фактическую сохранённую конфигурацию. `effectivePermissions` показывает реальное действие Owner authority. Допустим минимальный внутренний признак источника authority в закрытой management projection, чтобы UI мог объяснить эффективные права при raw deny; отдельного публичного Owner role/badge и редактирования binding не вводить.

Существование DB user и действительная session обязательны. Совпадение env со строкой не создаёт пользователя или authenticated actor. Missing/invalid binding не выдаёт Owner authority; ordinary RBAC продолжает работать. Существующие специальные AP-10/elevated операции, которым необходим валидный binding, сохраняют configuration-unavailable поведение. Не вводить глобальную недоступность форума из-за отсутствия binding.

Owner permissions снимают только capability barrier. Сохраняются resource ownership для Own-операций, lifecycle, closed-topic rules, revision/CAS, причины, validation, Origin/session checks, private no-store, deadlines и атомарная History. Нового edit-any/delete-any права этим этапом не создаётся.

### 3. Authorization: покрыть центральные и транзакционные пути

Основные файлы: `app/authorization/catalog.ts`, общий Owner helper, `db/authorization-repository.ts`, `db/authorization-service.ts`, `db/hyperdrive-authorization.ts`, `workers/app.ts`.

В repository согласовать:
- `resolveUserFrom/resolveUser`;
- отдельный bulk resolver внутри `readManagementState`;
- targeted `readUserManagementState`;
- SQL `effectivePermission/hasPermission`;
- fresh actor check внутри `mutate` после `FOR UPDATE`.

Сейчас последние два пути читают только обычный RBAC. Поэтому bypass в loader или добавление кнопки Owner недостаточны. Общая семантика должна работать и в транзакции на том же client/snapshot; не разрешать mutation по закэшированному route snapshot. Сохраняются фактический actor в History и rollback при ошибке её записи.

Service/Hyperdrive должны давать одинаковый результат для `forUser().resolve()`, `.has()`, directory и inline user controls. Cache остаётся request-local; не добавлять межзапросный Owner/permission cache. Не менять существующие guards всех маршрутов по отдельности, если они уже используют общий capability.

### 4. Меры: один Owner boundary на представление и authoritative admission

Основные файлы: `db/user-measure-authority.ts`, `db/user-measures.ts`, `db/user-measure-read.ts`, `db/user-measure-policy.ts`, `db/user-measure-admin-forum.ts` и затронутые Hyperdrive factories.

Существующий AP-10 rank Owner=3 остаётся производным правилом сравнения меры, не новым RBAC. Owner получает обе block capabilities через общую effective projection. Non-Owner rank по raw обычному RBAC, issuer floor, self-target prohibition, strict target comparison и lifecycle сохраняются. Create/change/lift/appeal review не могут использовать Owner как target.

Immunity текущего bound Owner должна действовать и при enforcement: сохранённая мера не может отключать его forum-management authority или участие. Проверить seeded existing measure на пользователя, являющегося текущим Owner; такая строка не создаёт ограничения Owner. Старые строки/History не удалять и не переписывать, synthetic lift/event не создавать. Это применение текущей server binding, не новая система восстановления или изменения binding.

Общая Owner-aware policy покрывает и Drizzle, и native PG admission. Сейчас прямые writers Forum/attachments/Complaints и generation admission не везде получают owner binding; одной правки permission wrapper недостаточно. Передавать доверенный binding/замкнутую admission function при сборке request в Worker через существующие injection seams, минимально расширив signatures там, где требуется:
- `db/hyperdrive-forum.ts`, `db/hyperdrive-forum-attachments.ts`;
- `db/hyperdrive-complaints.ts`, `db/hyperdrive-complaint-queue.ts`, `db/hyperdrive-complaint-review.ts`, `db/hyperdrive-complaint-appeal.ts`;
- `db/hyperdrive-content-generation-admission.ts` (generation остаётся disabled; consumers/queued tasks не менять);
- authorization/AP-10 native paths и reader `activeRestrictions`.

`withForumAdministrativeRestrictions`, transaction-local checks и UI hints должны одинаково трактовать Owner. Не оставлять скрытую кнопку при разрешённой сервером операции или обратное расхождение. Для non-Owner не менять overlap/expiry/issuer-floor semantics и обычные participation restrictions. Никакого общего обхода domain validation для Owner.

### 5. Повышенный permission: сохранить особую границу и закрыть косвенный отзыв

`admin.users.blocks.managePrivileged` остаётся обычным key конструктора, но изменить его grant/revoke может только bound Owner. Общий helper Owner identity используется и существующим `requireBoundOwner`, и приватными UI flags.

Проверить все текущие способы изменения:
1. добавление/удаление role grant;
2. role assignment в/из роли с elevated key, включая implicit default role;
3. per-user allow/deny/inherit;
4. удаление custom role, содержащей elevated grant.

Пункт 4 подтверждён чтением кода: `deleteCustomRole` сейчас не вызывает Owner gate, а `authz_role_permissions.role_id` имеет ON DELETE CASCADE. Неназначенную elevated role можно удалить и тем самым отозвать её grant. В Stage2 добавить минимальный fresh Owner guard в существующей transaction и соответствующую видимость delete control. Это не общий запрет удаления обычных ролей: assigned-role conflict, system-role protection, no-op и History semantics сохраняются.

Non-Owner с одним `access.authorization.manage` не может выдать себе elevated authority или отозвать её указанными путями. Обычные role/grant/override изменения не получают дополнительных Owner-only ограничений.

### 6. Закрытый UI и текущие consumers

Минимальные изменения `app/authorization/admin-view.tsx`, `app/authorization/user-controls.tsx`, `app/routes/authorization-admin.tsx`, `app/routes/admin-user.tsx` и затронутых measure views: truthful effective list и краткое объяснение authority source для Owner; единая проверка Owner-only controls; защита elevated-role deletion в UI.

Не подменять сохранённую обычную роль словом Owner и не запрещать редактировать её/overrides только потому, что target — Owner: raw конфигурация остаётся обычной, её deny просто не перекрывают верхнюю authority. Не делать отдельный Owner management экран. Existing Header/admin shell, Overview, Forum, Users/access, History, Attention/Complaints/Security должны получить доступ через общий resolver. Поддержать применимую EN/RU/HE copy и действующий localization fingerprint.

Не сериализовать env binding как настройку/поле формы. User-facing own measure projection по-прежнему не раскрывает actor/issuer/reviewer identity. Внутренняя History сохраняет настоящего session actor.

### 7. Проверки реализации и критерии приёмки

**Unit/route/UI + native PostgreSQL:**
- существующий Owner с пустой custom role и deny на весь текущий catalog получает все известные effective permissions; raw grants/overrides не меняются; resolve/has/bulk/targeted/transaction согласованы;
- user с ролью по имени Owner, чужой user ID, неизвестный permission, отсутствующий DB user и missing/invalid binding не дают ложного Owner доступа; обычный deny precedence сохранён;
- Owner может выполнить реальную authorization mutation при deny на `access.authorization.manage` и отсутствии ordinary managers; actual History записана атомарно. Ordinary self-revoke до zero managers всё ещё допустим, следующий fresh non-Owner request denied;
- Owner-only gate проверен для всех четырёх способов elevated grant/revoke, в том числе delete неназначенной elevated role. Unauthorized/failed/stale/no-op не создают административных событий;
- Owner не target мер на всех lifecycle/appeal mutation paths; seeded old restrictions не блокируют текущего Owner в permission wrapper, прямых Drizzle/native admissions и UI hints. Non-Owner overlap/issuer-floor/expiry и target guards не изменены;
- fresh state после ожидания существующего mutex и rollback при History failure реально проверены PostgreSQL; не заменять их mock equality;
- Owner не обходит authentication/Origin, ownership, closed-topic/lifecycle/CAS и validation; availability failures не превращаются в permission success.

**Реальный браузер → built Worker → Better Auth → disposable PostgreSQL:**
- synthetic Owner с пустым raw role/deny видит применимые Overview/Forum/Users/roles/History/Attention/measure controls и выполняет canonical administrative action с проверкой результата в DB/History;
- raw deny остаётся сохранённым и корректно объясняется в management UI;
- non-Owner access manager не может изменить elevated grant/assignment/override/delete; Owner может выдать его custom role/пользователю, следующий request отражает изменение;
- проверки покрывают согласованность UI/серверного отказа, применимые EN/RU/HE и существующие privacy/no-store regression. Переиспользовать History и AP-10/AP-11 browser harness с изолированными fixtures/DB, не строить новый общий test framework;
- build и применимые действующие CI/checks. Точный набор команд/evidence записывает реализатор; технический reviewer делает самостоятельные проверки stable exact head.

Никакой production binding, реальных аккаунтов владельца, secrets/deployments или production-data для этих проверок не требуется.

### 8. Передача и документация

После coordinator approval: Мира назначает Лиру → отдельный bounded implementation PR → stable head и применимые checks/browser evidence → Мира whole-PR review → Лёва independent technical review того же head → merge владельцем → отдельный factual docs closeout.

В docs closeout обновить `docs/auth/AUTHORIZATION.md`, соответствующие clauses `docs/ADMIN_PANEL.md`, browser README по фактическим изменённым flows, `PROJECT_STATE.md`/roadmap и historical index/snapshot. Объяснить различие raw RBAC и Owner effective authority, актуальную immunity и полный elevated gate. Устаревшее «owner binding не выдаёт прав» относится к текущему baseline до Stage2; не сохранять его как будущий контракт. Не объявлять redesign/Settings/production завершёнными заранее.

**Мира:** проверить bounded-план, синхронизировать общий master plan с принятым решением и при approval назначить исполнителя. Не требуется новый продуктовый вопрос владельцу: модель уже зафиксирована. Марк не назначен.

В этом turn выполнена source-level инспекция и техническое планирование. Код/схема/миграции не менялись; перечисленные acceptance tests ещё не выполнялись и не объявляются PASS.

## Закрытый предыдущий этап

Stage1 fully closed: implementation #294 merged main `e20490bc2d80c696bdf78e62539a8e1440821f9e`; factual docs #295 merged main `8301087f9322b34bdd325ed9298fdf3fddd84561`. [Independent PASS Лёвы](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6701647394) относится к head `e3604222ae8cecb4b1f2f94cdd5d7e9f76c15e61`: собственные 23 unit/route/UI + 112 native PG tests, 0058→0059 populated upgrade probe, Chromium/Worker/Better Auth/PG History35 и AP-10/AP-11 34 cases. Evidence: `/workspace/work/stage1-review-evidence/`. Эти результаты не являются acceptance будущего Stage2.

Ordinary AP-01–AP-11 закрыт; [AP-11 independent PASS](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6689555134). Settings после owner/authorization redesign.
