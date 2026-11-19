# stages/moderation-visibility/PLAN.md — перенесённый технический план hide/restore опубликованного контента

Статус: full plan V1–V9 подготовлен Лёвой; implementation не активирован. Перед стартом нужно сверить actual main и явно зафиксировать scope/fit по оставшимся product/technical forks, если соответствующее принятие не найдено в новом рабочем контексте.

## Product model proposal

1. Hide/Restore — обратимая административная visibility-модерация, не DELETE и не content edit.
2. Hidden topic отсутствует в public lists/search; direct public topic document/data — нейтральный 404 без hidden metadata/source.
3. Hidden post внутри видимой темы остаётся stable tombstone по id/номеру/relations, но без body/original/translation/revision id/attachments.
4. Topic hide делает все posts effectively unavailable, не переписывая их individual flags; topic restore не раскрывает individually hidden posts.
5. Ordinary author не получает special hidden-source access; private moderation inspection guarded отдельно.
6. Hide/restore topics/posts должны образовать одну законченную vertical feature до review.

Product forks к явному scope/fit:
- V-P1: точная public hide model (topic404/post tombstone vs альтернативы);
- V-P2: authority/reason policy;
- V-P3: сохранение solution/duplicate/read/inbox/personal state и retained data semantics.

## State / authority / History proposal

- `forum_topics` и `forum_posts`: `is_hidden`, `visibility_version`, `visibility_changed_at` + invariants/indexes.
- Capability proposal: `forum.content.visibility.manage`, initial moderator/admin, custom grants explicit; Admin Forum admission + existing `admin.forum` AP-10 family.
- Desired-state commands with expected visibility version + current revision + reason; stale → 409, admitted fresh no-op без version/event.
- One real transition = one atomic typed Admin History event; History failure rolls state back.
- Separate guarded inspection reader; public readers не получают `includeHidden` bypass.

Technical forks:
- V-T1: schema/catalog/grants/History contract;
- V-T2: local lock/writer adaptations and ordering.

## Read/write boundaries

Implementation должна закрыть visibility **до SQL ranking/count/LIMIT**, а не фильтровать React-ready page:
- homepage/category/section/discovery;
- Popular/Unanswered/Tags/Search/Help Similar;
- profile counts;
- topic page/post history/edit/recovery paths;
- notification/current-title presentation;
- own Watch/Bookmarks/Mute rows;
- attachment download/inline/text;
- current translation/original/generation presentation.

Protected Complaints evidence/context and immutable retained Admin/Owner History остаются отдельными explicit private authorities, не используют public reader.

## Related state

- Не удалять Watch/Bookmarks/Mute/Block/read/inbox rows.
- Hidden target не позволяет ordinary ON/save; безопасный own OFF/remove может оставаться доступным без раскрытия source.
- Existing notification rows/read_at сохраняются, но current hidden target presentation становится unavailable-safe.
- Hide/restore не backfill notices, не auto-unsolve/unpin/reopen.
- Existing accepted translation tasks могут завершить private revision-bound storage, но public presentation остаётся gated.
- Attachments не удаляются; public fetch проверяет exact post+topic visibility до bucket access.

## UI/cache/private surfaces

- Canonical typed POST intents для topic/post visibility.
- Private queue/inspector under Admin Forum with fresh capability checks and private no-store.
- No optimistic hide/restore success; stale/unknown commit → explicit refresh, no automatic write retry.
- Public/private document and .data cache boundaries должны исключать stale hidden-source disclosure.

## Acceptance

Real PG concurrency + rollback; authority/grants/revoke/AP-10; public sentinel leak searches in HTML/JSON/errors/search; hidden attachment URL; translation/original; retained Complaint evidence; own-state/inbox unavailable projections; Worker + Better Auth + PG17 + Chromium; EN/RU/HE/RTL/narrow/keyboard. Stable head only после закрытия всех public read leaks.

После implementation: Mira whole-PR → Leva independent review → owner merge → docs closeout при фактической необходимости.
