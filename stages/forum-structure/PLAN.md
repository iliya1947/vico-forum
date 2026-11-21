# stages/forum-structure/PLAN.md — принятый план управления структурой форума и переноса тем

Статус: full plan S0–S10 подготовлен Лёвой и принят Мирой; S-P1–S-P4 и S-T1/S-T2 ACCEPT. Implementation не активирован.

## Принятый продуктовый scope

1. Create/rename ordinary categories и sections.
2. Sibling Up/Down ordering.
3. Section reparent.
4. Ordinary topic move внутри/между ordinary sections/categories.
5. Delete/archive/merge/bulk вне scope.
6. Ordinary ↔ Help conversion запрещён.
7. Move/reparent сохраняет topic/post/domain/personal state; mandatory reason, author notification и auto-unpin не вводятся.
8. History хранит фактический before/after structural effect.

## Authority

- `forum.structure.manage`: initial admin.
- `forum.topic.move`: initial moderator/admin.
- custom roles/overrides explicit; Owner через catalog-wide projection.
- Оба входят в Admin Forum admission и existing AP-10 `admin.forum`; новый restriction family не нужен.

## Concurrency/state model

Принято:
- singleton `forum_structure_state` + global structure version как простой pre-release mutex/CAS для редких structural writes;
- `forum_topics.location_version` как narrow CAS для stale/ABA topic move;
- structure → target/parent → actor → History lock order;
- parent `FOR NO KEY UPDATE` совместим с existing FK `KEY SHARE`.

Schema должна добавить persistent display ordering/version foundation без rewriting accepted migrations.

## History / monitoring

- Original Admin History events для category/section changes и `topic.moved`.
- Projection существующих original events в Owner `forum.structure`; второго journal/store не создавать.
- Before/after IDs/names/location/order/version — только нужный audit context, без source content duplication.

## Reads / routes / UI

- Public/admin hierarchy projections должны читать согласованный snapshot для затронутых multi-query DTO.
- Category/section admin forms используют authoritative writers; не подключать trusted fixture helpers напрямую.
- Topic move — canonical narrow action, shared Quick action/Admin topic UI.
- Protected bounded destination picker; не public full-tree API.
- Strict form allowlists, expected versions, actor only from session; stale → 409, unknown commit → explicit refresh.
- No optimistic structural mutation and no automatic POST retry.
- Existing mounted reply/title/post editor keys не должны зависеть от section/category, чтобы move/revalidation не терял drafts/undo/uploads.
- English canonical + RU/HE, logical CSS/RTL, accessible Up/Down; drag-and-drop не обязателен.

## Receipt/integration requirements

- Matching create-topic publication receipt после topic move возвращает persisted current section, не old input section и не move-back.
- Watch/Bookmarks/Mute/Block/read/inbox rows keyed to topic/user сохраняются.
- Hidden content (если visibility stage уже merged) не становится public от move.
- Complaint retained evidence и revision/translation IDs не переписываются.

## Acceptance

- Clean PG17 migration from actual main + schema/manifest/ACL parity.
- Permission/grant/revoke/AP-10/Owner paths.
- Unicode/duplicate/no-op/stale version cases.
- Global sibling ordering under pagination/filter.
- Reparent/move across parents/categories incl. closed/solved/pinned/inactive author.
- Two-connection races: rename/reorder/reparent/create; two moves; A→B→A; move×reparent; move×reply/Watch/close/hide/title/post edit/translation.
- Actor deactivation ordering and History failure rollback.
- Create receipt replay after move.
- Connected Worker+Better Auth+PG17+Chromium + RTL/narrow/keyboard + mounted-editor preservation.

Перед implementation сверить actual main после corrections + moderation visibility; без нового конфликта повторное проектирование не требуется.
