# Systematic stale/legacy audit — corrected exact registry A–E

Дата reconciliation: 2026-11-22.  
Источник фактического продукта: `main` exact `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.  
Рабочий контекст: service PR #342, `research/stale-legacy-audit-handoff.md`.  
Режим: **audit-only**. Product/runtime code и test files не меняются этим реестром; указанный в таблице дальнейший тип действия — только рекомендация для возможного отдельного cleanup после owner decision.

## Fresh-review correction

Предыдущий вариант с **111 A** не принят fresh review.

После повторной проверки source-of-truth и каждого спорного класса:

1. **26 строк сняты с A**: representative-preview omissions/parity без обязательного 1:1 contract; два действующих attachment draft-context состояния; четыре допустимых dynamic authorization fixture состояния; generic Admin pending scaffold; семь global current-status claims, которые локальный workflow #342 не опровергает.
2. Static GitHub Pages preview по `docs/UI_UX_PASS.md` является representative/mock visual surface и не обязан воспроизводить каждый runtime route/capability. Простое отсутствие отдельного preview состояния не доказывает stale tail.
3. Built-in role permissions — изменяемые DB-данные; `INITIAL_ROLE_GRANTS` — только initial seed. Per-user overrides являются штатным contract.
4. `EditorDraftContext` и `forum_attachment_draft_contexts` остаются действующей attachment-моделью независимо от удаления text drafts/autosave.
5. `PROJECT_STATE.md` и `ROADMAP.md` остаются global Stage/current-state source-of-truth. Локальные `TASK.md`/`WORKFLOW.md` #342 задают маршрут только этой service task.
6. Второй fresh review снял ещё один ложный A: прежний A-085 (`TopicView` optional Block snapshot / `hasBlockSnapshot`) имеет живых current consumers в static UI preview и responsive browser fixture и прямо задокументирован как intentional view-only fallback.
7. Новых подтверждённых A-пропусков в fresh review не установлено.

**Исправленный exact итог: 84 уникальных A-элемента.**

## Обозначения

- **A** — confirmed stale tail / неправдивое текущее состояние.
- **B** — intentional compatibility boundary.
- **C** — genuinely unfinished current-stage item.
- **D** — historical text only.
- **E** — stale classification not established / current-valid candidate.

## A — exact registry, 84 элемента

| ID | Capability | Stale artifact | Current contract → contradiction | Effect | Possible later action — NOT executed |
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
| A-040 | Help topic preview | `PreviewTopicRoute` Help fixture | User identity rewrites any selected Help question as Alex/current-user authored and sets author semantics accordingly. | Own-author controls can appear on another representative question. | Preserve fixture authorship; derive own state from actor identity. |
| A-041 | Discovery topic preview | matched-topic branch in `PreviewTopicRoute` | Topic/first-post `authorId` is hard-coded to `alex` regardless of displayed author. | Current User can become author of unrelated discovery topics. | Use IDs consistent with fixture authors. |
| A-042 | Primary topic preview | `topicData()` / `primaryTopicScenarioData()` | Primary topic author is `alex`, but ordinary User scenario sets `isTopicAuthor=false` except special confirmation. | Implemented own-author capabilities are hidden/inconsistent. | Derive authorship from current actor/topic. |
| A-043 | Editor attachments localization | `editorAttachmentRestoring` | Durable attachment-list restoration for text drafts was removed. | Dead restore-state copy remains. | Remove key and obsolete test-only reference. |
| A-044 | Editor attachments UI | `UploadStatus = "selecting"` | No current producer enters `selecting`. | Unreachable state remains in component contract. | Remove state/branch. |
| A-045 | Editor attachments UI | `UploadStatus = "removing"` | Per-file server remove lifecycle was removed; current Remove only changes local selection. | Unreachable loading state remains. | Remove state/branch and stale copy. |
| A-046 | Editor attachments UI | `removeError` / `editorAttachmentRemoveError` | No current producer sets `removeError=true`. | Unreachable error presentation remains. | Remove branch/key. |
| A-047 | Editor CSS | `app/styles.css` — `.markdown-editor-draft-state` | Text drafts/autosave runtime was removed; selector has no current markup consumer. | Dead Drafts/autosave styling remains. | Remove unused CSS. |
| A-048 | Runtime DB privileges | `.github/scripts/runtime-privileges.mjs` — `forum_editor_drafts` | Text-draft repository/runtime is removed; web runtime still has INSERT/SELECT/UPDATE on historical table. | Runtime retains authority for an unused relation. | Remove obsolete runtime grants; keep historical schema if required. |
| A-049 | Authentication localization | `signInGoogle` descriptor | Header Sign in opens shared email/password + Google credential UI; descriptor still describes Google-backed header button. | Catalogue metadata no longer matches UI. | Update descriptor/fingerprint. |
| A-050 | Super-admin localization | `superAdminIntro` | Current SA-08/Super-admin UI superseded this old SA-01 intro projection; no current runtime consumer. | Dead catalogue entry remains. | Remove key/manual values/fingerprint. |
| A-051 | Super-admin localization | `superAdminOverviewAccountsNote` | Current SA-08/Super-admin UI superseded this old Accounts overview summary; no current runtime consumer. | Dead catalogue entry remains. | Remove key/manual values/fingerprint. |
| A-052 | Super-admin localization | `superAdminOverviewSecurityNote` | Current SA-08/Super-admin UI superseded this old Security overview summary; no current runtime consumer. | Dead catalogue entry remains. | Remove key/manual values/fingerprint. |
| A-053 | Super-admin localization | `superAdminAdminEvent` | Current SA-08/Super-admin UI superseded this old generic admin-event label; no current runtime consumer. | Dead catalogue entry remains. | Remove key/manual values/fingerprint. |
| A-054 | Super-admin localization | `superAdminAllMonitors` | Current SA-08/Super-admin UI superseded this old “View System monitoring” CTA; no current runtime consumer. | Dead catalogue entry remains. | Remove key/manual values/fingerprint. |
| A-055 | Super-admin localization | `superAdminSa02ContextAction` | Current SA-08/Super-admin UI superseded this old generic “Open existing management” action; no current runtime consumer. | Dead catalogue entry remains. | Remove key/manual values/fingerprint. |
| A-056 | Unread localization | `unreadEyebrow` | Current Unread page no longer renders this eyebrow; key survives only in catalog/manual packs. | Dead key remains. | Remove key. |
| A-057 | Notifications localization | `notificationUnread` descriptor | Status is shared by all notification kinds; descriptor still says unread reply. | Metadata is stale. | Generalize descriptor/fingerprint. |
| A-058 | Notifications localization | `notificationRead` descriptor | Status is shared by all notification kinds; descriptor still says read reply. | Metadata is stale. | Generalize descriptor/fingerprint. |
| A-059 | Notifications localization | `notificationOpen` | Action is shared by complaint decision/appeal notifications; visible copy says “Open reply” and descriptor is reply-only. | System notifications get misleading action text. | Generalize copy/descriptor. |
| A-060 | Notifications preview | `notifications-user` fixture/header badge | Badge says 3 unread; fixture has exactly 2 unread and `hasMore=false`. | Preview contradicts its own fixture. | Make badge and fixture counts consistent. |
| A-061 | Localization catalogue | `heading` | Old Stage-1 `Translation foundation` heading has no production UI consumer. | Dead source key remains only in localization fixtures/storage tests. | Remove/replace fixture key. |
| A-062 | Localization catalogue | `stageSummary` | Old Stage-1 summary has no production UI consumer. | Dead source key remains only in localization fixtures/storage tests. | Remove/replace fixture key. |
| A-063 | Localization catalogue | `forumDiscoveryDevelopmentStatus` | Homepage category actions are real; old development-status label has no runtime consumer. | Dead unfinished-discovery key remains. | Remove key. |
| A-064 | Attention localization | `attentionModerationLabel` | Standalone Attention center no longer renders old Moderation eyebrow. | Dead key remains. | Remove key. |
| A-065 | Help localization | `helpSolutionsNeedsAttentionHeading` | Old “Questions needing moderation” heading was superseded by standalone Attention mode. | Dead key remains. | Remove key. |
| A-066 | Measures localization | `measuresPermanentHint` | AP-10 uses structured expiry choices, not blank=permanent ISO guidance. | Dead/stale instruction remains. | Remove key. |
| A-067 | Editor attachments localization | `editorAttachmentListUnavailable` | Durable attachment-list restore endpoint/runtime was removed. | Dead restore-failure key remains. | Remove key. |
| A-068 | Editor attachments UI | `lifecycleMessage = null` scaffold | Old lifecycle messaging has no current producer/rendered state. | Dead scaffold remains. | Remove. |
| A-069 | Editor tests | `app/forum/markdown-editor.test.tsx` — `stubEmptyDraftMetadata()` | Mocks removed draft-head/metadata/list endpoints globally. | Tests preserve a removed API model and can mask regression toward it. | Remove obsolete mocks; retain only explicit no-old-endpoint assertions. |
| A-070 | Editor tests | `app/forum/markdown-editor.test.tsx` — context-change test mock | Separately mocks removed draft/list endpoints. | Tests preserve a removed API model and can mask regression toward it. | Remove obsolete mocks; retain only explicit no-old-endpoint assertions. |
| A-071 | Editor tests | `app/forum/editor-attachments.test.tsx` — inline-image test | Keeps old draft-save/metadata/list flow. | Tests preserve a removed API model and can mask regression toward it. | Remove obsolete mocks; retain only explicit no-old-endpoint assertions. |
| A-072 | Editor tests | `app/forum/public-read.test.tsx` — revision-fence test | Still permits removed draft/list requests. | Tests preserve a removed API model and can mask regression toward it. | Remove obsolete mocks; retain only explicit no-old-endpoint assertions. |
| A-073 | Editor tests | `app/forum/public-read.test.tsx` — reply-loading/Cancel test | Still mocks removed draft/list requests. | Tests preserve a removed API model and can mask regression toward it. | Remove obsolete mocks; retain only explicit no-old-endpoint assertions. |
| A-074 | Editor tests | `app/forum/public-read.test.tsx` — loader-revalidation editor test | Still mocks removed draft/list requests. | Tests preserve a removed API model and can mask regression toward it. | Remove obsolete mocks; retain only explicit no-old-endpoint assertions. |
| A-075 | Editor tests | `app/forum/public-read.test.tsx` — 400-retry/local-storage test | Still mocks removed draft/list requests. | Tests preserve a removed API model and can mask regression toward it. | Remove obsolete mocks; retain only explicit no-old-endpoint assertions. |
| A-076 | Editor tests | AP-10 `stubAttachmentEndpoints()` | Still includes removed head/metadata/list branches. | Tests preserve a removed API model and can mask regression toward it. | Remove obsolete mocks; retain only explicit no-old-endpoint assertions. |
| A-077 | Editor tests | AP-08 `stubUploads()` | Still includes removed draft/list branches. | Tests preserve a removed API model and can mask regression toward it. | Remove obsolete mocks; retain only explicit no-old-endpoint assertions. |
| A-078 | Translation preview | non-RTL `answer` presentation | Underlying answer revision is EN; presentation declares HE original → EN translation. | Fixture violates revision/source identity. | Derive presentation from revision. |
| A-079 | Translation preview | Hebrew `question` presentation | Underlying revision remains EN while presentation claims HE original. | Fixture violates revision/source identity. | Make localized fixture/revision consistent. |
| A-080 | Translation preview | Hebrew `followup` presentation | Underlying revision remains EN while presentation claims HE original. | Fixture violates revision/source identity. | Make localized fixture/revision consistent. |
| A-081 | Translation preview | Russian translation branch | RU falls through generic non-RTL presentation, producing false same-locale states and false EN answer translation for RU target. | Representative RU state is impossible. | Build source/target-aware RU presentation. |
| A-082 | Translation preview | Russian Manager generation state | Title generation state is `current` while title presentation remains original EN. | Canonical generation view cannot produce this combination. | Make presentation/status consistent. |
| A-083 | Super-admin helper seam | `app/super-admin/owner-snapshot.ts` — `viewerId===undefined` | All current Super-admin request loaders supply exact admitted viewer ID; permissive fallback has no production consumer. | Helper can present viewer-bound data without identity binding. | Make viewerId required/remove bypass. |
| A-084 | Super-admin API seam | `Timeline` — `viewerId?: string` | All current runtime callers supply viewer ID; optional API only enables obsolete helper bypass. | Component contract preserves impossible runtime state. | Make viewerId required. |

## B — намеренная совместимость

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
12. GitHub Pages preview — representative visual surface, а не обязательная 1:1 backend/runtime parity.
13. `TopicView` optional Block snapshot / `hasBlockSnapshot` — intentional compatibility boundary для representative/view-only preview и responsive test fixtures без private filter metadata; canonical runtime loader при этом всегда передаёт explicit Block snapshot.

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

## E — stale classification не установлена

1. Representative Pages-preview не обязан иметь dedicated parity для Home, Bookmarks, Personal filters, Settings, every notification kind, Watch/Bookmark/Mute state или every translation/source-locale control. Отсутствие такого отдельного preview coverage само по себе не A.
2. Unmatched topic ID в static preview не доказан как current-product defect: Pages является bounded representative fixture, а не authoritative 404/runtime router acceptance.
3. Отсутствие отдельного static preview для published-post editing, non-self Block profile, AP-10 и иных уже реализованных поверхностей само по себе не stale.
4. `EditorDraftContext`, `forum_attachment_draft_contexts` и security-event context являются текущей attachment-моделью. Формулировки `draft context` нельзя объявлять stale только из-за удаления text drafts/autosave.
5. Preview role grants/overrides не обязаны совпадать с `INITIAL_ROLE_GRANTS`: built-in grants динамически редактируются в DB, а per-user `allow|deny|inherit` — штатный contract.
6. Generic `item.pending` branch ordinary Admin не доказан stale: текущий `docs/ADMIN_PANEL.md` сохраняет contract явной маркировки unfinished destinations.
7. `README.md`, `PROJECT_STATE.md` и `ROADMAP.md` claims о global UI/UX priority не опровергаются локальным маршрутом service task #342. Global Stage/current-state определяется глобальными source-of-truth.
8. Реально опубликованный GitHub Pages deployment в этом audit side-task не проверялся; source registry не утверждает deployed-state correctness.
9. Historical schema relation `forum_editor_drafts` сама по себе не A: forward migrations не переписываются, а старые rows/schema могут сохраняться. A по runtime privileges относится только к текущим grants на уже неиспользуемую text-draft relation.
10. Future cleanup/compactness, не создающий текущего противоречия поведения, не является основанием для исправления.

## Completeness reconciliation

Capability map и обязательные projection-классы handoff пройдены: canonical routes/redirects; navigation/links; feature/status registries; unit/integration/browser tests; UI progress preview/fixtures; localization catalog/manual values/fingerprints; active docs/status docs; compatibility aliases; helper/API seams; scaffold branches.

В A-registry нет повторных строк по одному stale-элементу. Производные manual values/fingerprints одного localization key не считаются отдельными A, если их изменение является следствием одной canonical-key правки.

## Итог

- **A: 84 unique exact candidate registry after second fresh-review correction.**
- B/C/D/E отделены от cleanup и не являются автоматическим списком изменений.
- **Ни один test file, product/runtime file или implementation PR этим audit этапом не изменяется.**
- Тесты в рамках audit side-task не запускались.
- Cleanup/implementation остаётся заблокирован до следующего fresh review этого corrected registry и отдельного решения владельца.
