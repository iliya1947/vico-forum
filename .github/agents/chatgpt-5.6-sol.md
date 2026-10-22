# Мира — ChatGPT-5.6 Sol

Активная задача: поэтапный аудит AUD-20261022. Этап 4 начат; части 1–3 завершены.

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

- Проверены write guards, Help authoring, persisted cooldown, monotonic read-state/unread и transactional reply/mention notifications.
- Existing hidden Help service-section presentation finding also reaches Unread; отдельного root cause нет.

## AUD-20261022 — этап 4, часть 3 — profiles и online presence

- Baseline повторно подтверждён; `AGENTS.md` полностью прочитан перед подзадачей.
- Проверены `app/forum/profile.ts`, profile tests/view, `app/routes/profile.tsx` и test, `app/forum/online-presence-heartbeat.tsx` и test, `app/routes/presence.ts` и test, repository profile/presence methods, `db/hyperdrive-forum.ts` availability adapter, `db/hyperdrive-forum.test.ts`, `db/schema.ts` constraints, `tests/database/forum-profiles.test.ts`, `tests/database/forum-online-presence.test.ts`.
- Public profile projection: id/name/image/joinedAt/bio/githubUrl/websiteUrl/effective role/messageCount/bestAnswerCount only. Route explicitly reconstructs this projection and does not serialize email/permission data even if reader returned extra properties.
- Self-edit: route requires POST, authenticated session, same-origin, exact route ownership; client-supplied userId/role/name ignored. Only bio/GitHub/website are accepted. Repository repeats `validateProfileFields`.
- Bio contract uses <=500 Unicode characters; presentation textarea uses a looser UTF-16 maxLength but server/DB are authoritative. Profile URLs reject control/whitespace, userinfo and non-http(s); GitHub accepts only canonical profile path and is normalized to HTTPS. Presentation revalidates outbound links again with `safeHttpUrl`, uses text rendering for bio and `rel=nofollow ugc noreferrer`.
- Avatar passes through `safeHttpUrl`, uses `referrerPolicy=no-referrer` and falls back to initial on load error. External-host privacy implications belong to later privacy/security stage, not this functional pass.
- Effective role is single-valued because `authz_user_roles.user_id` is PK; profile reader falls back to built-in user role when unassigned. Connected DB tests verify fresh custom role display and no grant leakage.
- Presence client sends immediate + 60-second heartbeats only while authenticated/visible; hidden tab skips. 401 stops timer/listener and revalidates session. Presence is supplemental; fetch failures do not block browsing.
- Presence route requires same-origin authenticated POST + exact heartbeat intent and records session identity only. GET is intentionally 404.
- Repository uses five-minute recent window, one-query window count + max 12 member projection, and 45-second DB-side upsert throttle with monotonic `greatest(last_seen_at, now())`. Public members contain only id/name/image.
- PostgreSQL tests cover repeated heartbeat/throttle, expiration, full count with bounded member list, no email exposure, nonexistent-user FK failure and cascade.
- Новых independent current-Stage defects in profiles/presence не установлено.
- Следующая часть: completeness sweep оставшихся stage-4 manifest targets before closing stage 4.
