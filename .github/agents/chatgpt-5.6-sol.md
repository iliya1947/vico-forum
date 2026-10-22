# Мира — ChatGPT-5.6 Sol

Активная задача: поэтапный аудит AUD-20261022. Этап 4 начат; части 1–2 завершены.

Этот файл используется для собственных рабочих результатов, выводов и технического контекста Миры в рамках текущего служебного PR.

## AUD-20261022 — этап 1

- Baseline: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.
- Полностью прочитаны 18 актуальных документов, 7934 строки; подтверждённых document-contract contradictions нет.

## AUD-20261022 — этап 2

- Проверены все manifest targets этапа 2; подтверждённых current-Stage defects не установлено.

## AUD-20261022 — этап 3

- Email/password/session, dynamic authorization и ownership boundaries проверены.
- Детали findings этапа 3 остаются только в current developer chat до завершения всего checking sequence.

## AUD-20261022 — этап 4, часть 1 — public read/discovery

- Проверены Home/category/section public reads, Popular, Search, Tags, Unanswered, 404/API catch-all и public degradation.
- Сквозная проверка Help service-section visibility выявила finding; детали остаются только в current developer chat.

## AUD-20261022 — этап 4, часть 2 — participation, unread, notifications

- Baseline повторно подтверждён; `AGENTS.md` полностью прочитан перед подзадачей.
- Participation: generic section create-topic и topic reply paths derive actor from session, require same-origin and effective permissions, hide reserved Help service section from generic create-topic, and route Help authoring through the server-fixed service section. Domain repository verifies target section/topic/parent existence and blocks replies to confirmed duplicates.
- Persisted write cooldown is 5 seconds per authenticated author across normal forum posts; Better Auth user row acts as per-author DB mutex, so concurrent writes serialize against the same latest-post check. Controlled 429 carries rounded Retry-After and hides internal detail.
- Read-state: `markTopicRead` uses session user only; repository verifies target post belongs to topic. `forum_topic_read_states` has user/topic PK and composite topic/post FK. Upsert advances only if candidate is strictly newer by `created_at,id`, preventing rollback. PostgreSQL tests cover new→unread→read, equal timestamp ordering, concurrent advances, later new message and user cascade.
- Unread loader is authenticated and reads only for session user. Its projection uses generic category/section location; therefore the already-established hidden Help service-section visibility finding also applies to Unread. This extends one finding rather than creating a second root cause.
- Notifications: reply transaction notifies topic author and direct parent author, deduplicates recipients, suppresses self-notifications and records mentions inside the same transaction. Recipient+post unique constraint prevents duplicates; composite topic/post FK keeps target coherent.
- Notifications loader and unread badge derive user id from session. Open action requires same-origin/session and `markReplyNotificationRead` updates only rows whose `recipient_user_id` equals current user; another user's notification id returns domain not-found. Repeated open is idempotent.
- DB integration verifies notification atomicity: rejected notification insert rolls back the reply itself. Mention edit tests preserve durable per-post notified set and do not notify on failed stale edit.
- No new independent current-Stage defect established in this part beyond expansion of the existing global hidden-section presentation finding.
- Whether a user's own newly published post should automatically advance their read marker is not specified strongly enough by current source-of-truth; current implementation counts posts after the marker regardless of author. Recorded as unresolved semantics, not defect.
- Next part: profiles and online presence.
