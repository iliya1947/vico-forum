# Systematic stale/legacy audit — corrected exact registry A–E

Дата финальной completeness reconciliation: 2026-11-22.  
Источник фактического продукта: `main` exact `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.  
Рабочий контекст: service PR #342, `research/stale-legacy-audit-handoff.md`.  
Режим: audit-only. Product/runtime code не менялся; тесты в рамках side-task не запускались.

## Исправление предыдущего счёта

Предыдущий промежуточный вывод **125 exact** был неверен и не должен использоваться как реестр.

После поартефактной reconciliation установлено:

1. **13 повторных подсчётов**: `settingsNoAvailable` был посчитан трижды; `signInGoogle`, preview Bookmarks, preview Filters, `notificationOpen`, `notificationUnread`, `notificationRead`, `editorAttachmentListUnavailable`, `heading`, `stageSummary` — повторно; ранние объединённые attachment-state findings (`Restoring/selecting` и `removing/removeError`) затем были повторно посчитаны уже как отдельные состояния.
2. **1 ложный A**: `unreadCount` не мёртвый localization key. Он используется текущими Unread route/view/data contracts.
3. Stale `previewNotifications()` и mismatch badge считаются **двумя разными противоречиями**: отсутствие реализованных system-notification kinds и отдельная внутренняя несогласованность unread-count.
4. Ранний `topicData()` finding сохранён только как отдельное ложное authorship; Watch/Bookmark/Mute omissions считаются отдельно и не дублируют его.

**Исправленный exact итог: 111 уникальных A-элементов.**

## Обозначения

- **A** — confirmed stale tail / неправдивое текущее состояние.
- **B** — intentional compatibility boundary.
- **C** — genuinely unfinished current-stage item.
- **D** — historical text only.
- **E** — not established / кандидат, для которого исправление не доказано.

## A — exact registry, 111 элементов

| ID | Capability | Stale artifact | Current contract → contradiction | Effect | Action |
| --- | --- | --- | --- | --- | --- |
| A-001 | Settings status | `app/forum/under-development.ts` — `admin-settings` | Canonical `/:locale/settings*` exists; Settings still sits in unfinished registry. | Old entry presents implemented Settings as unfinished. | Remove from unfinished registry; redirect old entry. |
| A-002 | Settings status | `app/routes/admin-forum-legacy.test.ts` — `keeps the Settings placeholder` | Canonical Settings shipped; test still requires obsolete placeholder. | Regression suite freezes a removed state. | Replace with canonical redirect/current-state expectation. |
| A-003 | Search preview | `app/ui-preview/preview-app.tsx` — `under-development-search` | Canonical `/search` and current search preview states exist; one scenario still targets Under development. | Preview can show Search as unfinished. | Remove or retarget scenario. |
| A-004 | Complaints preview | `attention-complaints` preview label | Complaints Queue/Appeals/History/Review are implemented; label still says placeholder. | Implemented moderation is presented as unfinished. | Update label. |
| A-005 | Complaints preview | `PreviewAttentionRoute` | Current complaint queue/appeals/history are not supplied to preview. | Active surface appears empty/incomplete. | Add representative current complaint projection. |
| A-006 | Security preview | `attention-security` preview label | Security/Attachments queue exists; label still says placeholder. | Implemented group is presented as unfinished. | Update label. |
| A-007 | Security preview | `PreviewAttentionRoute` | Current attachment-security queue is not supplied. | Implemented attachments group appears empty. | Add representative current security projection. |
| A-008 | Authorization preview | Admin preview props | Manager fixture gets `canMutateAuthorization=true`; writes are exact-Owner-only. | Preview exposes impossible Manager writes. | Project actual read-only Manager authority. |
| A-009 | Authorization preview | `admin-success` | Manager-only fixture implies Manager can complete exact-Owner authorization write. | Impossible production state. | Remove or move to exact-Owner fixture. |
| A-010 | Authorization preview | `admin-conflict` | Manager-only fixture implies Manager can reach exact-Owner authorization mutation conflict. | Impossible production state. | Remove or move to exact-Owner fixture. |
| A-011 | Registration preview | `previewCredential(..., "sign-up")` | Current sign-up reads registration flags; preview omits them. | Implemented Google/email-password methods render closed. | Supply representative registration flags. |
| A-012 | Attachments preview | Help-question composer | Static Pages has no production `/api/attachments`, but upload stays enabled by default. | Attach can call nonexistent backend. | Disable or honestly emulate upload. |
| A-013 | Attachments preview | Create-topic composer | Static Pages has no production `/api/attachments`, but upload stays enabled by default. | Attach can call nonexistent backend. | Disable or honestly emulate upload. |
| A-014 | Attachments preview | Reply composer | Static Pages has no production `/api/attachments`, but upload stays enabled by default. | Attach can call nonexistent backend. | Disable or honestly emulate upload. |
| A-015 | Localization catalogue | catalog/manual packs/fingerprints — `onlinePresencePending` | Old unfinished/implemented online presence key has no current runtime consumer. | Dead reviewed/translated catalogue surface remains. | Remove consistently from catalog/manual values/fingerprints. |
| A-016 | Localization catalogue | catalog/manual packs/fingerprints — `viewDevelopmentStatus` | Old unfinished/obsolete development-status action key has no current runtime consumer. | Dead reviewed/translated catalogue surface remains. | Remove consistently from catalog/manual values/fingerprints. |
| A-017 | Localization catalogue | catalog/manual packs/fingerprints — `underDevelopmentFeatureSearch` | Old unfinished/Search key has no current runtime consumer. | Dead reviewed/translated catalogue surface remains. | Remove consistently from catalog/manual values/fingerprints. |
| A-018 | Localization catalogue | catalog/manual packs/fingerprints — `underDevelopmentFeatureNotifications` | Old unfinished/Notifications key has no current runtime consumer. | Dead reviewed/translated catalogue surface remains. | Remove consistently from catalog/manual values/fingerprints. |
| A-019 | Localization catalogue | catalog/manual packs/fingerprints — `underDevelopmentFeatureRegistration` | Old unfinished/Registration key has no current runtime consumer. | Dead reviewed/translated catalogue surface remains. | Remove consistently from catalog/manual values/fingerprints. |
| A-020 | Localization catalogue | catalog/manual packs/fingerprints — `underDevelopmentFeaturePinnedTopics` | Old unfinished/Pinned topics key has no current runtime consumer. | Dead reviewed/translated catalogue surface remains. | Remove consistently from catalog/manual values/fingerprints. |
| A-021 | Localization catalogue | catalog/manual packs/fingerprints — `underDevelopmentFeatureUnread` | Old unfinished/Unread key has no current runtime consumer. | Dead reviewed/translated catalogue surface remains. | Remove consistently from catalog/manual values/fingerprints. |
| A-022 | Localization catalogue | catalog/manual packs/fingerprints — `underDevelopmentFeatureProfiles` | Old unfinished/Profiles key has no current runtime consumer. | Dead reviewed/translated catalogue surface remains. | Remove consistently from catalog/manual values/fingerprints. |
| A-023 | Localization catalogue | catalog/manual packs/fingerprints — `underDevelopmentFeatureTechnologyTags` | Old unfinished/Technology tags key has no current runtime consumer. | Dead reviewed/translated catalogue surface remains. | Remove consistently from catalog/manual values/fingerprints. |
| A-024 | Localization catalogue | catalog/manual packs/fingerprints — `underDevelopmentFeatureUnansweredFilter` | Old unfinished/Unanswered key has no current runtime consumer. | Dead reviewed/translated catalogue surface remains. | Remove consistently from catalog/manual values/fingerprints. |
| A-025 | Localization catalogue | catalog/manual packs/fingerprints — `underDevelopmentFeaturePopular` | Old unfinished/Popular key has no current runtime consumer. | Dead reviewed/translated catalogue surface remains. | Remove consistently from catalog/manual values/fingerprints. |
| A-026 | Localization catalogue | catalog/manual packs/fingerprints — `underDevelopmentFeatureForumDiscovery` | Old unfinished/Forum discovery key has no current runtime consumer. | Dead reviewed/translated catalogue surface remains. | Remove consistently from catalog/manual values/fingerprints. |
| A-027 | Localization catalogue | catalog/manual packs/fingerprints — `underDevelopmentFeatureMessageLinks` | Old unfinished/Message links key has no current runtime consumer. | Dead reviewed/translated catalogue surface remains. | Remove consistently from catalog/manual values/fingerprints. |
| A-028 | Localization catalogue | catalog/manual packs/fingerprints — `underDevelopmentFeatureReplyQuote` | Old unfinished/Reply/Quote key has no current runtime consumer. | Dead reviewed/translated catalogue surface remains. | Remove consistently from catalog/manual values/fingerprints. |
| A-029 | Localization catalogue | catalog/manual packs/fingerprints — `underDevelopmentFeatureEditor` | Old unfinished/Editor key has no current runtime consumer. | Dead reviewed/translated catalogue surface remains. | Remove consistently from catalog/manual values/fingerprints. |
| A-030 | Localization catalogue | catalog/manual packs/fingerprints — `underDevelopmentFeatureOnlinePresence` | Old unfinished/Online presence key has no current runtime consumer. | Dead reviewed/translated catalogue surface remains. | Remove consistently from catalog/manual values/fingerprints. |
| A-031 | Registration localization | `signUp` descriptor | Header Sign up is a working credential route; descriptor still calls it future. | Source metadata/fingerprint is wrong. | Update descriptor and reviewed fingerprints. |
| A-032 | Complaints localization | `attentionModeComplaints` descriptor | Complaints mode is implemented; descriptor still says future placeholder. | Current metadata contradicts product state. | Update descriptor/fingerprint. |
| A-033 | Security localization | `attentionModeSecurity` descriptor | Security/Attachments mode is implemented; descriptor still says future placeholder. | Current metadata contradicts product state. | Update descriptor/fingerprint. |
| A-034 | Complaints localization | `attentionPlaceholderGroup1` | Current Complaints group1 uses its real queue heading; old Group 1 key has no runtime consumer. | Dead localization key remains. | Remove key. |
| A-035 | Security localization | `attentionPlaceholderGroup2` descriptor | Key remains for Security group2, but descriptor still claims a temporary Complaints group. | Metadata describes a removed Complaints projection. | Update descriptor/fingerprint. |
| A-036 | Security localization | `attentionPlaceholderGroup3` descriptor | Key remains for Security group3, but descriptor still claims a temporary Complaints group. | Metadata describes a removed Complaints projection. | Update descriptor/fingerprint. |
| A-037 | Complaint appeals localization | `complaintResultAppealUnavailable` | Package 6 appeals are implemented; key says Appeals are unavailable/future. | Dead copy contradicts current capability. | Remove key. |
| A-038 | Super-admin localization | `superAdminAreasLater` | SA-08 has all 12 measured Monitoring areas; only Infrastructure is deferred. | Dead copy says other Monitoring areas are unavailable. | Remove key. |
| A-039 | Settings localization | `settingsNoAvailable` | Authenticated Settings always exposes User, Account & security and Privacy. | Impossible empty-Settings copy remains. | Remove key. |
| A-040 | Preview routing | `previewRouter()` — Home | Canonical `/:locale` Home has no dedicated preview route; wildcard renders selected-scenario element. | Home navigation can render the wrong page. | Add canonical Home preview route. |
| A-041 | Help topic preview | `PreviewTopicRoute` Help fixture | User identity rewrites any selected Help question as Alex/current-user authored and sets author semantics accordingly. | Own-author controls can appear on another representative question. | Preserve fixture authorship; derive own state from actor identity. |
| A-042 | Discovery topic preview | matched-topic branch in `PreviewTopicRoute` | Topic/first-post `authorId` is hard-coded to `alex` regardless of displayed author. | Current User can become author of unrelated discovery topics. | Use IDs consistent with fixture authors. |
| A-043 | Topic preview | unmatched-topic branch in `PreviewTopicRoute` | Unknown topic ID falls back to unrelated primary topic instead of not-found. | Broken links can display the wrong topic. | Return representative 404/not-found. |
| A-044 | Primary topic preview | `topicData()` / `primaryTopicScenarioData()` | Primary topic author is `alex`, but ordinary User scenario sets `isTopicAuthor=false` except special confirmation. | Implemented own-author capabilities are hidden/inconsistent. | Derive authorship from current actor/topic. |
| A-045 | Editor attachments localization | `editorAttachmentRestoring` | Durable attachment-list restoration for text drafts was removed. | Dead restore-state copy remains. | Remove key and obsolete test-only reference. |
| A-046 | Editor attachments UI | `UploadStatus = "selecting"` | No current producer enters `selecting`. | Unreachable state remains in component contract. | Remove state/branch. |
| A-047 | Editor attachments UI | `UploadStatus = "removing"` | Per-file server remove lifecycle was removed; current Remove only changes local selection. | Unreachable loading state remains. | Remove state/branch and stale copy. |
| A-048 | Editor attachments UI | `removeError` / `editorAttachmentRemoveError` | No current producer sets `removeError=true`. | Unreachable error presentation remains. | Remove branch/key. |
| A-049 | Editor CSS | `app/styles.css` — `.markdown-editor-draft-state` | Text drafts/autosave runtime was removed; selector has no current markup consumer. | Dead Drafts/autosave styling remains. | Remove unused CSS. |
| A-050 | Runtime DB privileges | `.github/scripts/runtime-privileges.mjs` — `forum_editor_drafts` | Text-draft repository/runtime is removed; web runtime still has INSERT/SELECT/UPDATE on historical table. | Runtime retains authority for an unused relation. | Remove obsolete runtime grants; keep historical schema if required. |
| A-051 | Authentication localization | `signInGoogle` descriptor | Header Sign in opens shared email/password + Google credential UI; descriptor still describes Google-backed header button. | Catalogue metadata no longer matches UI. | Update descriptor/fingerprint. |
| A-052 | Admin shell | `app/admin/shell.tsx` / overview — `item.pending` | Every current `adminDestinations()` entry has `pending:false`; pending branch/CSS is unreachable. | Dead pre-implementation scaffold remains. | Remove pending scaffold. |
| A-053 | Super-admin localization | `superAdminIntro` | Current SA-08/Super-admin UI superseded this old SA-01 intro projection; no current runtime consumer. | Dead catalogue entry remains. | Remove key/manual values/fingerprint. |
| A-054 | Super-admin localization | `superAdminOverviewAccountsNote` | Current SA-08/Super-admin UI superseded this old Accounts overview summary; no current runtime consumer. | Dead catalogue entry remains. | Remove key/manual values/fingerprint. |
| A-055 | Super-admin localization | `superAdminOverviewSecurityNote` | Current SA-08/Super-admin UI superseded this old Security overview summary; no current runtime consumer. | Dead catalogue entry remains. | Remove key/manual values/fingerprint. |
| A-056 | Super-admin localization | `superAdminAdminEvent` | Current SA-08/Super-admin UI superseded this old generic admin-event label; no current runtime consumer. | Dead catalogue entry remains. | Remove key/manual values/fingerprint. |
| A-057 | Super-admin localization | `superAdminAllMonitors` | Current SA-08/Super-admin UI superseded this old “View System monitoring” CTA; no current runtime consumer. | Dead catalogue entry remains. | Remove key/manual values/fingerprint. |
| A-058 | Super-admin localization | `superAdminSa02ContextAction` | Current SA-08/Super-admin UI superseded this old generic “Open existing management” action; no current runtime consumer. | Dead catalogue entry remains. | Remove key/manual values/fingerprint. |
| A-059 | Preview routing | `previewRouter()` — Bookmarks | Authenticated header links `/bookmarks`; preview router has no Bookmarks route. | Click falls through to unrelated wildcard scenario. | Add representative Bookmarks route. |
| A-060 | Preview routing | `previewRouter()` — Personal filters | Authenticated header links `/filters`; preview router has no Filters route. | Click falls through to unrelated wildcard scenario. | Add representative Filters route. |
| A-061 | Notifications preview | `previewNotifications()` | Current inbox supports complaint-decision and complaint-appeal-result; fixture contains only reply/mention. | Representative inbox omits implemented kinds. | Add representative system-notification cards. |
| A-062 | Unread localization | `unreadEyebrow` | Current Unread page no longer renders this eyebrow; key survives only in catalog/manual packs. | Dead key remains. | Remove key. |
| A-063 | Notifications localization | `notificationUnread` descriptor | Status is shared by all notification kinds; descriptor still says unread reply. | Metadata is stale. | Generalize descriptor/fingerprint. |
| A-064 | Notifications localization | `notificationRead` descriptor | Status is shared by all notification kinds; descriptor still says read reply. | Metadata is stale. | Generalize descriptor/fingerprint. |
| A-065 | Notifications localization | `notificationOpen` | Action is shared by complaint decision/appeal notifications; visible copy says “Open reply” and descriptor is reply-only. | System notifications get misleading action text. | Generalize copy/descriptor. |
| A-066 | Notifications preview | `notifications-user` fixture/header badge | Badge says 3 unread; fixture has exactly 2 unread and `hasMore=false`. | Preview contradicts its own fixture. | Make badge and fixture counts consistent. |
| A-067 | Localization catalogue | `heading` | Old Stage-1 `Translation foundation` heading has no production UI consumer. | Dead source key remains only in localization fixtures/storage tests. | Remove/replace fixture key. |
| A-068 | Localization catalogue | `stageSummary` | Old Stage-1 summary has no production UI consumer. | Dead source key remains only in localization fixtures/storage tests. | Remove/replace fixture key. |
| A-069 | Localization catalogue | `forumDiscoveryDevelopmentStatus` | Homepage category actions are real; old development-status label has no runtime consumer. | Dead unfinished-discovery key remains. | Remove key. |
| A-070 | Attention localization | `attentionModerationLabel` | Standalone Attention center no longer renders old Moderation eyebrow. | Dead key remains. | Remove key. |
| A-071 | Help localization | `helpSolutionsNeedsAttentionHeading` | Old “Questions needing moderation” heading was superseded by standalone Attention mode. | Dead key remains. | Remove key. |
| A-072 | Measures localization | `measuresPermanentHint` | AP-10 uses structured expiry choices, not blank=permanent ISO guidance. | Dead/stale instruction remains. | Remove key. |
| A-073 | Topic preview | `topicData()` — Watch | Signed-in canonical loader supplies actor-scoped Watch state; preview omits it. | Implemented Watch control/state is hidden. | Supply representative actor/state. |
| A-074 | Topic preview | `topicData()` — Bookmark | Signed-in canonical loader supplies actor-scoped Bookmark state; preview omits it. | Implemented Bookmark control/state is hidden. | Supply representative actor/state. |
| A-075 | Topic preview | `topicData()` — Mute | Signed-in canonical loader supplies actor-scoped Mute state; preview omits it. | Implemented Mute control/state is hidden. | Supply representative actor/state. |
| A-076 | Preview routing | `previewRouter()` — Settings | Authenticated header Settings link targets `/settings`; preview router has no Settings route. | Click renders unrelated wildcard scenario. | Add representative Settings route. |
| A-077 | Editor attachments localization | `editorAttachmentListUnavailable` | Durable attachment-list restore endpoint/runtime was removed. | Dead restore-failure key remains. | Remove key. |
| A-078 | Editor attachments UI | `lifecycleMessage = null` scaffold | Old lifecycle messaging has no current producer/rendered state. | Dead scaffold remains. | Remove. |
| A-079 | Editor attachments localization | `editorAttachmentErrorContext` | Visible error still says draft context after text drafts were removed; current entity is upload/authoring context. | User-facing copy describes obsolete model. | Use current operation/context terminology. |
| A-080 | Security localization | `attentionSecurityAttachmentContext` | Visible label says “Draft context”; security events reference upload/authoring context. | Moderator-facing copy describes obsolete model. | Update label/descriptor. |
| A-081 | Editor tests | `app/forum/markdown-editor.test.tsx` — `stubEmptyDraftMetadata()` | Mocks removed draft-head/metadata/list endpoints globally. | Tests preserve a removed API model and can mask regression toward it. | Remove obsolete mocks; retain only explicit no-old-endpoint assertions. |
| A-082 | Editor tests | `app/forum/markdown-editor.test.tsx` — context-change test mock | Separately mocks removed draft/list endpoints. | Tests preserve a removed API model and can mask regression toward it. | Remove obsolete mocks; retain only explicit no-old-endpoint assertions. |
| A-083 | Editor tests | `app/forum/editor-attachments.test.tsx` — inline-image test | Keeps old draft-save/metadata/list flow. | Tests preserve a removed API model and can mask regression toward it. | Remove obsolete mocks; retain only explicit no-old-endpoint assertions. |
| A-084 | Editor tests | `app/forum/public-read.test.tsx` — revision-fence test | Still permits removed draft/list requests. | Tests preserve a removed API model and can mask regression toward it. | Remove obsolete mocks; retain only explicit no-old-endpoint assertions. |
| A-085 | Editor tests | `app/forum/public-read.test.tsx` — reply-loading/Cancel test | Still mocks removed draft/list requests. | Tests preserve a removed API model and can mask regression toward it. | Remove obsolete mocks; retain only explicit no-old-endpoint assertions. |
| A-086 | Editor tests | `app/forum/public-read.test.tsx` — loader-revalidation editor test | Still mocks removed draft/list requests. | Tests preserve a removed API model and can mask regression toward it. | Remove obsolete mocks; retain only explicit no-old-endpoint assertions. |
| A-087 | Editor tests | `app/forum/public-read.test.tsx` — 400-retry/local-storage test | Still mocks removed draft/list requests. | Tests preserve a removed API model and can mask regression toward it. | Remove obsolete mocks; retain only explicit no-old-endpoint assertions. |
| A-088 | Editor tests | AP-10 `stubAttachmentEndpoints()` | Still includes removed head/metadata/list branches. | Tests preserve a removed API model and can mask regression toward it. | Remove obsolete mocks; retain only explicit no-old-endpoint assertions. |
| A-089 | Editor tests | AP-08 `stubUploads()` | Still includes removed draft/list branches. | Tests preserve a removed API model and can mask regression toward it. | Remove obsolete mocks; retain only explicit no-old-endpoint assertions. |
| A-090 | Translation preview | User role fixture in `authorizationData()` | Current User role grants `forum.sourceLocale.correctOwn`; preview role omits it. | Role/effective-permission projection is stale. | Add current grant. |
| A-091 | Translation preview | User translation permission fixture | `forum.translation.generate` is a normal User role grant; preview models it as per-user allow override. | Authorization provenance is false. | Project role grant; remove fake override. |
| A-092 | Translation preview | Moderator role fixture — source locale | Current Moderator grants `forum.sourceLocale.correctOwn`; preview omits it. | Role projection is stale. | Add current grant. |
| A-093 | Translation preview | Moderator role fixture — generation | Current Moderator grants `forum.translation.generate`; preview omits it. | Role projection is stale. | Add current grant. |
| A-094 | Translation preview | ordinary primary Topic — title correction | Alex is author with correctOwn capability; preview hides own title source-locale correction. | Implemented own correction is hidden. | Derive from actor + grant. |
| A-095 | Translation preview | ordinary primary Topic — post correction | Alex-authored question is omitted from `correctablePostIds`. | Implemented own post correction is hidden. | Include owned question. |
| A-096 | Translation preview | `topicToolsGenerationUnits()` | Canonical loader creates a unit for every non-empty post body; preview omits question post. | Generation status coverage is incomplete. | Include question unit. |
| A-097 | Translation preview | non-RTL `answer` presentation | Underlying answer revision is EN; presentation declares HE original → EN translation. | Fixture violates revision/source identity. | Derive presentation from revision. |
| A-098 | Translation preview | Hebrew `question` presentation | Underlying revision remains EN while presentation claims HE original. | Fixture violates revision/source identity. | Make localized fixture/revision consistent. |
| A-099 | Translation preview | Hebrew `followup` presentation | Underlying revision remains EN while presentation claims HE original. | Fixture violates revision/source identity. | Make localized fixture/revision consistent. |
| A-100 | Translation preview | Russian translation branch | RU falls through generic non-RTL presentation, producing false same-locale states and false EN answer translation for RU target. | Representative RU state is impossible. | Build source/target-aware RU presentation. |
| A-101 | Translation preview | Russian Manager generation state | Title generation state is `current` while title presentation remains original EN. | Canonical generation view cannot produce this combination. | Make presentation/status consistent. |
| A-102 | Super-admin helper seam | `app/super-admin/owner-snapshot.ts` — `viewerId===undefined` | All current Super-admin request loaders supply exact admitted viewer ID; permissive fallback has no production consumer. | Helper can present viewer-bound data without identity binding. | Make viewerId required/remove bypass. |
| A-103 | Super-admin API seam | `Timeline` — `viewerId?: string` | All current runtime callers supply viewer ID; optional API only enables obsolete helper bypass. | Component contract preserves impossible runtime state. | Make viewerId required. |
| A-104 | Topic API seam | `TopicView` — optional Block snapshot + `hasBlockSnapshot` | Canonical Topic loader always supplies explicit Block snapshot even for guests; absence exists only for legacy view fixtures. | Component contract preserves impossible canonical-loader state. | Require explicit snapshot; update fixtures. |
| A-105 | Active status docs | `README.md:5-7` | Current service workflow is remaining #342 tasks → #320; general UI/UX is not active, but README calls UI/UX current priority. | Top-level project status is wrong. | Update current priority. |
| A-106 | Active status docs | `README.md:19` | README labels `UI_UX_PASS.md` as the current pass while current service workflow is elsewhere. | Documentation index mislabels active work. | Update wording. |
| A-107 | Active status docs | `README.md:26-29` | README says current next step is UI/UX; active service task says complete #342 then #320. | Next-step guidance is wrong. | Update next step. |
| A-108 | Active status docs | `PROJECT_STATE.md:32` | Current-state file calls UI/UX current standalone priority despite active #342 → #320 route. | Authoritative current-state claim is stale. | Update current phase. |
| A-109 | Active status docs | `PROJECT_STATE.md:282-287` | Nearest route starts with completing UI/UX; active service task is #342 tasks then #320 and does not activate general UI/UX. | Current route is wrong. | Update route. |
| A-110 | Active status docs | `ROADMAP.md:118` | Text says Stage 6 is paused because of current UI/UX priority; UI/UX is not current active priority. | Current roadmap rationale is stale. | Update wording. |
| A-111 | Active status docs | `ROADMAP.md:124-132` | Section declares current standalone priority UI/UX while active workflow is #342 → #320. | Roadmap active-priority section is stale. | Update section. |

## B — намеренная совместимость / действующие границы

1. `under-development?feature=admin-forum` → canonical Admin Forum.
2. `under-development?feature=admin-users` → permission-aware Users/Authorization destination.
3. `/:locale/admin/users/:userId` — guarded compatibility redirect на canonical profile, не второй detail screen.
4. `/:locale/admin/authorization` — сохранённый readable legacy Admin entry, использующий canonical authorization writer; Settings composition не создаёт второй writer.
5. Super-admin **Infrastructure** — единственный честный Stage-6 placeholder.
6. Exact bound Owner: отсутствие второго Owner, generic elevated writer, self-deactivation и чужих credential/session mutations — действующая граница, не stale.
7. Translation original fallback, revision-bound stale/history и provider-neutral code path — действующие контракты; реальные provider/Queue credentials/runtime acceptance остаются Stage 6.
8. Исторические DB/API имена `draft_id` / draft refs в attachment persistence используются для temporary refs, publication receipts и compatibility; это не text-draft runtime.
9. Omitted `operationScope` для старых запросов остаётся intentional request compatibility; first-party scoped controls передают marker.
10. Omitted attachment-selection marker для legacy text-only submissions остаётся intentional compatibility; current first-party editor передаёт явный selection.
11. Legacy notification / Owner History / schema readers, необходимые для уже сохранённых старых записей и cursor compatibility, не являются stale сами по себе.
12. GitHub Pages preview — representative visual surface, а не обязательная 1:1 backend parity. Само отсутствие отдельного preview-сценария не A без противоречия существующей навигации/fixture contract.

## C — действительно незавершённое по текущему contract

1. Drafts/autosave как будущая продуктовая функция; text-draft runtime намеренно удалён из Editor 2.0.
2. Content pages **Rules / Help / About / Feedback / Privacy policy**; не путать Privacy policy с реализованным authenticated Settings → Privacy.
3. Email verification и password recovery / transactional email sender.
4. Stage 6 external integration: real Google/Owner binding, production Neon/Hyperdrive/R2, Queue/provider credentials/runtime, deployed smoke/backup/restore.
5. Security mode group2/group3, где current UI прямо сохраняет их как unfinished placeholders.
6. Реальное background scheduling attachment cleanup и external R2 wiring.
7. Antivirus/provider scanning integration; текущая validation не должна притворяться антивирусом.

## D — исторический текст, не текущий статус

1. Датированные последовательные записи `docs/UI_UX_PASS.md` о том, что Search, Registration, Notifications, Profiles, Editor, attachments/WYSIWYG и другие функции были future на момент конкретного PR-среза. Они сохраняют историю последовательной реализации и не считаются A, пока не заявляют текущий статус.
2. Completion-record разделы `ROADMAP.md`, описывающие scope прежних Stage 1–5 в их историческом контексте.
3. `SCAFFOLD_PLAN.md` — завершённый Stage 0→1 executable/scaffold plan, а не текущий product status.
4. `docs/PROJECT_HISTORY/*` — исторический журнал, не current-state source.

## E — исправление не доказано

1. Отсутствие отдельного static preview для published-post editing, non-self Block profile, AP-10 и иных уже реализованных поверхностей само по себе не stale: representative preview не обещает полную 1:1 матрицу.
2. Реально опубликованный GitHub Pages deployment в этом audit side-task не проверялся; source registry не утверждает deployed-state correctness.
3. Historical schema relation `forum_editor_drafts` сама по себе не A: forward migrations не переписываются, а старые rows/schema могут сохраняться. A-050 относится только к текущим runtime grants на уже неиспользуемую text-draft relation.
4. Future cleanup/compactness, не создающий текущего противоречия поведения, не является основанием для исправления.

## Completeness reconciliation

Capability map и обязательные projection-классы handoff пройдены: canonical routes/redirects; navigation/links; feature/status registries; unit/integration/browser tests; UI progress preview/fixtures; localization catalog/manual values/fingerprints; active docs/status docs; compatibility aliases; helper/API seams; scaffold branches.

В итоговом A-registry нет повторных строк по одному и тому же stale-элементу. Производные manual values/fingerprints одного localization key не считаются отдельными A, если их изменение является следствием одной canonical-key правки.

## Итог

- **A: 111 unique exact.**
- B/C/D/E отделены от cleanup и не являются автоматическим списком изменений.
- Product/runtime code не менялся.
- Тесты в рамках этого audit side-task не запускались.
- Cleanup/implementation остаётся заблокирован до fresh review исправленного registry и отдельного решения владельца.
