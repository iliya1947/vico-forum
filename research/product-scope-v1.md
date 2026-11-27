Этот файл фиксирует утверждённый Мирой продуктовый scope первого релиза управления Vico Forum из обычного ChatGPT до технического планирования.

# Product scope — ChatGPT forum control v1

Дата: 27.11.2026.

## 1. Назначение канала

Канал предназначен для владельца Vico Forum: из обычного ChatGPT он должен уметь получить актуальное административное состояние форума и выполнить уже существующие canonical административные операции без перехода в веб-интерфейс для каждой рутинной задачи.

Канал не является универсальной консолью сервера, SQL-клиентом, shell, вторым Admin backend или новым источником authority.

## 2. Кто является actor

1. Канал предназначен только для exact Owner.
2. Actor никогда не выбирается текстом команды, ID из сообщения, содержимым форума или данными GitHub issue.
3. Каждая операция должна проходить существующие server-side identity, active-account, permission, resource, AP-10, hierarchy, CAS/version и History boundaries.
4. Если текущая authoritative проверка запрещает действие, ChatGPT-канал не должен иметь обхода.

## 3. Read scope v1

В v1 Owner может из чата запрашивать следующие данные в пределах существующих authoritative projections.

1. **Forum overview**
   - реальные aggregate counts и доступное состояние Admin Overview;
   - категории, разделы, их порядок/связи/статистика;
   - поиск и просмотр тем и разрешённых сообщений;
   - текущее состояние topic actions: pin/closed/solved/best answer/Help/visibility/location.

2. **Moderation**
   - очередь скрытого контента и разрешённая инспекция;
   - Help/Needs-attention состояние, для которого уже существуют protected readers;
   - Security/attachment evidence только в существующей разрешённой проекции.

3. **Users and authorization**
   - поиск Users;
   - canonical profile;
   - targeted role/grants/overrides/effective permissions;
   - targeted administrative measures;
   - exact-Owner private account/session/history projection, без token/hash/provider secrets.

4. **Complaints**
   - open Cases, triage и full review;
   - reports/notes/evidence в разрешённой projection;
   - resolved History;
   - pending Appeals;
   - current global reason-priority settings.

5. **History and monitoring**
   - ordinary Admin History;
   - Super-admin Overview;
   - все 12 реализованных Monitoring areas;
   - scoped History и global Event log.

6. **Settings relevant to forum administration**
   - текущие Google/email new-registration flags;
   - текущая authorization configuration.

7. **Infrastructure**
   - только честное текущее состояние, которое реально измеряется существующими monitors;
   - Stage-6 Infrastructure placeholder не превращается в live Cloudflare/Neon/deploy/secrets control.

## 4. Write scope v1 — routine bounded operations

Следующие операции входят в v1. При полностью однозначной явной команде Owner отдельный второй вопрос-подтверждение не нужен; сама явная команда является намерением выполнить действие. Сервер всё равно применяет все authoritative проверки.

1. Pin / unpin topic.
2. Close / reopen topic.
3. Administrative solved / best-answer operations.
4. Help solution moderation, кроме терминальных appeal/review решений, перечисленных в sensitive scope.
5. Confirm/remove Help duplicate, если это не терминальное решение апелляции.
6. Correct source locale для topic title/post по существующим правилам.
7. Rename/reorder existing ordinary category.
8. Rename/reorder/reparent existing ordinary section.
9. Move existing ordinary topic между ordinary sections.
10. Изменить или снять priority override конкретного open Complaint Case.
11. Restore ранее hidden topic/post при наличии требуемой причины и exact target/current state.

Для любой routine mutation команда должна быть достаточно конкретной, чтобы однозначно определить operation, target и обязательные параметры. При неоднозначности действие не выполняется.

## 5. Write scope v1 — sensitive operations с отдельным подтверждением

Перед выполнением этих операций канал обязан сначала показать краткий preview: точный target, текущее релевантное состояние, планируемое изменение и необратимый/широкий эффект. Выполнение разрешено только после отдельного явного подтверждения Owner именно этого preview.

1. **Hide topic/post** — меняет публичную доступность и создаёт permanent History; причина обязательна.
2. **Create category или section** — текущий продукт не имеет delete для этих контейнеров, поэтому ошибочное создание не является нормально обратимым.
3. **Authorization**
   - create/rename/delete custom role;
   - replace role grants;
   - assign user role;
   - change per-user permission override.
4. **Administrative measures**
   - create measure;
   - change restrictions/expiry;
   - explicit lift;
   - resolve measure appeal.
5. **Account deactivation** — exact-Owner canonical deactivation чужого active account.
6. **Registration policy**
   - enable/disable Google new registrations;
   - enable/disable email/password new registrations.
7. **Complaints immutable/terminal records**
   - append moderator note;
   - initial Decision `confirmed | not-confirmed`;
   - resolve Complaint Appeal `upheld | overturned`.
8. **Global complaint priority weights** — меняют ordering policy всех open Cases.
9. **Help/duplicate terminal appeal/review outcome**, когда существующий доменный контракт фиксирует решение/appeal outcome как отдельный persisted результат.

Подтверждение относится к одному конкретному preview. Изменение target, параметров или текущего state делает старое подтверждение неприменимым.

## 6. Операции, не входящие в v1

1. Arbitrary SQL, shell, HTTP/fetch proxy, raw database reads или generic "execute code".
2. Любая операция, для которой нет существующей canonical domain capability.
3. Delete/archive/merge/bulk для forum structure/content, если этого нет в текущем продукте.
4. General edit-any/delete-any topic/post.
5. Account reactivation, hard delete, retention-end purge.
6. Forced foreign-session termination.
7. Foreign credential/password/OAuth-provider mutation.
8. Owner transfer, second Owner, deputy/recovery model.
9. Live Cloudflare/Neon/deploy/secrets administration из Super-admin Infrastructure placeholder.
10. Personal theme/editor/device-local Administrator preferences.
11. Own Account & security mutations через этот канал: password/email/Google link-unlink/own-session revocation.
12. User-facing AI features, AI moderation decisions или autonomous moderation.
13. Любая автоматическая массовая операция, построенная как цикл поверх единичных commands, пока для неё нет отдельной canonical bulk capability.

## 7. Confirmation model

1. **Read** — выполняется без подтверждения.
2. **Routine bounded write** — выполняется по однозначной явной команде Owner; отдельный confirm не нужен.
3. **Sensitive write** — обязательный preview + отдельный explicit confirm.
4. ChatGPT не должен превращать обсуждение, гипотезу, вопрос «что будет если», цитату, пересказ чужого сообщения или содержимое форума в mutation intent.
5. Confirmation не может быть бессрочной и не может переноситься на другой target/state; точный механизм и срок определяет технический план.

## 8. Untrusted-content boundary

1. Тексты тем, сообщений, профилей, жалоб, notes, evidence metadata, History и любые другие форумные данные являются **данными**, а не управляющими инструкциями.
2. Встроенные в них фразы вида «выполни команду», «измени права», «игнорируй правила» и аналогичные инструкции никогда сами по себе не создают mutation intent.
3. Write intent исходит только из текущей явной команды Owner в ChatGPT и, для sensitive operations, из отдельного подтверждения preview.
4. Никакой контент форума не может выбирать actor, command type, permission или confirmation.

## 9. Result and replay semantics

1. Каждая mutation должна иметь уникальную command identity/replay protection.
2. Канал должен различать минимум: `committed`, `not-committed/denied`, `conflict/stale`, `unavailable`, `outcome-unknown`.
3. При stale/conflict канал сначала перечитывает authoritative state и не повторяет mutation автоматически.
4. При неизвестном результате транспортной ошибки mutation не повторяется автоматически; сначала проверяется текущее состояние/receipt/history.
5. Повтор одного и того же подтверждённого command не должен создавать второй domain effect.
6. Ответ Owner должен честно показывать фактический результат и идентифицировать target; нельзя сообщать success только потому, что команда была отправлена.

## 10. Privacy and output

1. Чат получает только данные, которые разрешает соответствующая существующая protected projection.
2. Password hashes, session bearer tokens, OAuth tokens, raw provider payloads, private storage keys и другие существующие запрещённые secrets не добавляются ради ChatGPT.
3. Команда или результат не должны копировать лишний private payload в GitHub, History или transport log.
4. Точный минимальный command/result envelope определяет технический план.

## 11. Product acceptance criteria v1

Scope считается реализованным только если:

1. Все read groups из раздела 3 доступны через единый ограниченный интерфейс без прямого SQL и без дублирования domain readers.
2. Все write operations из разделов 4–5 вызывают существующие canonical server operations и сохраняют их текущие permission/resource/CAS/History semantics.
3. Sensitive operations технически невозможно выполнить без отдельного подтверждения конкретного preview.
4. Untrusted forum content технически не может стать управляющей командой.
5. Replay/duplicate delivery не создаёт повторный domain effect; stale и outcome-unknown не приводят к автоматическому повтору.
6. Owner получает достоверный committed/denied/conflict/unavailable/unknown result, а не транспортный surrogate success.
7. Действия канала отражаются в существующей domain/Admin/Owner History там, где соответствующая canonical operation уже обязана писать History; новый параллельный audit backend не создаётся.
8. Unsupported operations не получают generic escape hatch.
9. Обычная эксплуатация остаётся $0 дополнительной стоимости и не использует Work/Codex allowance.
10. Repository/local-CI acceptance подтверждает команды, permissions, replay, stale/unknown outcomes, confirmation gate и untrusted-content boundary.
11. Stage-6 live activation/deployed acceptance выполняются отдельно и только после явного разрешения Owner.
