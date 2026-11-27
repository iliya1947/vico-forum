Этот файл фиксирует проверенную инвентаризацию существующих канонических возможностей Vico Forum, потенциально пригодных для управления из обычного ChatGPT.

# Инвентаризация существующих возможностей

Дата проверки: 27.11.2026. Источник истины — актуальный `main`.

## 1. Проверенные источники

1. `PROJECT.md` и `PROJECT_STATE.md`.
2. `docs/ADMIN_PANEL.md` — прочитан полностью до EOF.
3. `docs/SUPER_ADMIN.md` — прочитан полностью до EOF.
4. `docs/SETTINGS.md` — прочитан полностью до EOF.
5. `docs/auth/AUTHORIZATION.md` — прочитан полностью до EOF.
6. `docs/moderation/COMPLAINTS.md` — прочитан полностью до EOF.
7. Реальное наличие ключевых обработчиков и сервисов выборочно сверено в `main`: topic Quick actions, Owner account lifecycle, Complaints service, Super-admin routes/History, visibility handlers.

## 2. Канонические read-возможности

1. **Общее состояние форума и Admin**: Overview, реальные aggregate counts, категории, разделы, темы, сообщения в разрешённой проекции, Users index, обычная Admin History.
2. **Структура форума**: чтение ordinary categories/sections, их отношений, порядка, статистики, destinations для structural operations и текущего location/version контекста темы.
3. **Контент и модерация**: protected topic/message context, очередь скрытого контента, точечная инспекция hidden target; previous hidden post revision text отдельно требует `forum.post.history.read`.
4. **Пользователи**: поиск Users по публичным identity-полям; canonical profile; targeted authorization snapshot; targeted measures; exact-Owner private account/session/history projection.
5. **Complaints**: open Cases queue, triage, protected full Case review, retained evidence metadata/download, resolved History, pending Appeals queue, global reason-priority settings.
6. **Super-admin Monitoring**: двенадцать реально измеряемых областей — System, Accounts & authentication, Security, Forum, Localization & translations, Notifications, Files & attachments, Administration, Moderation, Background processes, Data, Integrations; scoped History и global Event log.
7. **Infrastructure**: только Stage-6 placeholder; реального live control/read API для Cloudflare/Neon/deploy/secrets этот слой сейчас не предоставляет.

## 3. Канонические write-возможности форума

1. **Topic actions** через существующий authoritative topic handler: pin/unpin; close/reopen; administrative solved/best-answer operations; Help solution moderation; confirm/remove duplicate и duplicate-appeal resolution; source-locale correction.
2. **Visibility**: Hide/Restore published topic или post с обязательной причиной, fresh permission, AP-10 admission и CAS.
3. **Структура**: create/rename/reorder ordinary category; create/rename/reorder/reparent ordinary section; Move existing ordinary topic между ordinary sections. Reserved Help structures не изменяются.
4. Для этих операций уже существуют fresh server authorization, resource/state validation, CAS/revision/version checks и atomic History там, где это предусмотрено.

## 4. Канонические write-возможности пользователей и authorization

1. Exact Owner может создавать/переименовывать/удалять custom roles.
2. Exact Owner может менять grants роли.
3. Exact Owner может назначать пользователю роль.
4. Exact Owner может менять per-user permission override `allow | deny | inherit`.
5. AP-10 позволяет create/change/lift administrative measure и review exact-measure appeal с действующей hierarchy/issuer-floor моделью.
6. Exact Owner имеет отдельную canonical команду деактивации чужого активного аккаунта.
7. Реактивация аккаунта, hard delete, forced foreign-session termination и foreign credential/provider mutation **не реализованы** и не могут считаться доступными командами.

## 5. Канонические write-возможности Complaints

1. Reviewer может добавлять private note в Case.
2. Reviewer может принять initial Decision `confirmed | not-confirmed`.
3. Отдельный reviewer может resolve pending Complaint Appeal как `upheld | overturned`.
4. Разрешённый actor может менять/сбрасывать priority override конкретного open Case.
5. `forum.complaint.priority.manage` позволяет менять глобальные persisted reason-priority weights.
6. Эти команды используют существующий Complaints service, replay/operation identity, version/CAS и transactional event semantics; новый ChatGPT-канал не должен создавать второй Complaints writer.

## 6. Канонические write-возможности Settings/Owner configuration

1. Exact Owner может включать/выключать новые Google registrations и email/password registrations независимо друг от друга через существующую registration-settings command.
2. Authorization writes из Forum & roles остаются теми же каноническими командами из раздела 4, а не отдельным Settings backend.
3. Personal User/Administrator/Privacy preferences и own Account & security существуют, но являются настройками конкретного пользователя/устройства, а не управлением форумом как системой; вопрос их включения в ChatGPT scope должен решаться отдельно, а не автоматически.

## 7. Что нельзя ошибочно включать как уже существующую capability

1. Arbitrary SQL, arbitrary fetch/shell или generic "execute admin command".
2. Delete/edit-any содержимого, если для него нет конкретной реализованной capability.
3. Delete/archive/merge/bulk для categories/sections/topics.
4. Account reactivation, physical deletion/retention-end purge, forced foreign-session termination, foreign credential/provider operations.
5. Управление production Cloudflare/Neon/deploy/secrets через текущий Super-admin Infrastructure — там сейчас только placeholder.
6. Второй Owner, transfer/recovery Owner authority или deputy model.
7. Любая AI-модерация или пользовательские AI-функции — это не часть данной задачи.

## 8. Архитектурное следствие для следующего этапа

1. Новый канал управления не должен реализовывать перечисленные domain operations заново.
2. Нужен ограниченный command/read adapter, который вызывает существующие authoritative server capabilities и сохраняет их fresh identity/permission/resource/CAS/History semantics.
3. Продуктовый scope следующего этапа должен выбирать подмножество уже существующих read/write возможностей по реальной ценности для владельца и риску операции.
4. Операции, которых в текущем продукте нет, не должны появляться в scope "управления из ChatGPT" только ради удобства канала; для них сначала нужна отдельная продуктовая задача.
