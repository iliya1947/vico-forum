# Vico Forum — общий служебный канал

Этот файл содержит только актуальное утверждённое состояние команды по правилам текущего `AGENTS.md`. История прежнего рабочего журнала сохранена в Git history служебного PR и не дублируется здесь.

## Активная реализация

- Implementation PR: #215 — Editor 2.0.
- Completed three-reviewer target: `b0930544218f4dba1c25d98820a7c12478c4ef57` (documentation-only successor; Editor runtime remains unchanged from the verified implementation).
- Current GitHub PR metadata and the implementation branch both resolve to `b0930544218f4dba1c25d98820a7c12478c4ef57`. The earlier service-channel observation of `6968b8c…` as a changed head is not supported by repository history: `6968b8c…` is an older ancestor of `b093054…` by 341 commits, and the PR event history contains no 2026-10-17 force-push to or from that commit. Treat the earlier observation as a stale/incorrect read, not as an implementation-head change.
- Runtime/code head коррекции compact toolbar и security-only navigation: `1fed72195536bc3e51967a68a4248c2acb7d21a5`.
- `1fed721… → e47436e…` меняет только `PROJECT_STATE.md`; runtime не меняется.
- Exact implementation-head CI #38949642183: `checks` SUCCESS, `database` SUCCESS.

## Принятое техническое состояние

- Independent `forum.attachmentSecurity.read` сохраняется как отдельная code-backed capability.
- Security-only navigation на bare `/:locale/attention` исправлена: default route ведёт в разрешённый Security → Attachments, explicit forbidden Signals остаётся запрещённым.
- Compact in-page mobile toolbar correction прошла real Chromium technical re-test на EN/LTR и HE/RTL, 320px/390px, Simple/Advanced: overlap/interception не воспроизведены, обязательные controls доступны; fenced-code pointer Indent/Outdent работает, prose не изменяется.
- Предыдущая работа отдельного аудита тестовой системы не входит в PR #215; случайный test-only Package 3 был удалён, current head снова `e47436e…`.

## Pre-review readiness

Pre-review gates закрыты. ChatGPT-5.6 Sol, ChatGPT-6 и Codex-5.6 Sol завершили независимые проверки exact head `b093054…`. Findings опубликованы ниже для согласования. Это не является approval для merge.

Следующие pre-review gates были закрыты до старта цикла:

1. Owner visual acceptance финального Editor 2.0 состояния подтверждён 2026-10-16 как достаточный для pre-release MVP; дальнейшая визуальная полировка явно отложена владельцем и не блокирует завершение Editor 2.0.
2. `PROJECT_STATE.md` синхронизирован documentation-only commit `34d93f1e…`: зафиксированы положительный Chromium re-test и owner visual acceptance; runtime не изменён.
3. Runtime Editor заморожен: никаких новых функциональных или косметических изменений до merge, кроме подтверждённых current-Stage дефектов.

## Последовательность проверки после readiness

Прямое решение владельца от 2026-10-17 уточняет порядок относительно общего `AGENTS.md`:

1. ChatGPT-5.6 Sol — whole-PR проверка.
2. ChatGPT-6 — whole-PR/source-level проверка.
3. Codex-5.6 Sol — whole-PR проверка.
4. После этих трёх проверок findings согласуются, подтверждённые current-Stage defects исправляются одним bounded пакетом.
5. Любое implementation-исправление создаёт новый stable exact head; ChatGPT-5.6 Sol, ChatGPT-6 и Codex-5.6 Sol повторно проверяют исправленный head до состояния, когда подтверждённых current-Stage defects больше не найдено.
6. **Codex-6.1 Sol подключается только после этого, в самом конце перед merge, как финальный технический reviewer.** Не подключать Codex-6.1 Sol к промежуточному defect-discovery циклу до завершения исправлений и чистого прохода остальных проверяющих.

Во время проверки одного stable exact head implementation не исправляется. Первый finding не останавливает проверку. По умолчанию findings сохраняются только у разработчика до завершения соответствующего review-прохода; прямые owner-разрешения на передачу через служебный PR сохраняют силу только в явно разрешённом объёме.

## Owner decisions / ограничения

- Не запускать отдельный GitHub `Codex Code Review` для PR #215. Codex-5.6 Sol выполняет whole-PR проверку в основном defect-discovery цикле; Codex-6.1 Sol подключается только как финальная техническая проверка после исправлений и чистого повторного прохода остальных reviewers.
- Merge выполняет только разработчик.
- Stage 6 external infrastructure/deployment не возобновляется без отдельного указания владельца.
- Во время review-цикла проверка и исправление разделены: изменения implementation допускаются только после завершения проверки и подтверждения current-Stage defect.

## Review cycle

- ChatGPT-5.6 Sol completed its independent whole-PR review of PR #215 on exact implementation head `b0930544218f4dba1c25d98820a7c12478c4ef57`.
- ChatGPT-6 completed its source-level whole-PR review of the same exact head on 2026-10-17. It did not claim its own Chromium/test execution and explicitly bounded that evidence.
- Two GPT-6 findings are independently confirmed by ChatGPT-5.6 Sol as current-Stage defects: Simple-mode Enter ignores the actual caret inside a visual text leaf; non-TSV plain-text paste containing a Tab can discard the pasted content instead of using a safe fallback.
- GPT6-03 (cross-leaf paste selection) and GPT6-04 (paste event with no plain/html flavor) remain unconfirmed candidates. Source shows a plausible failure path, but the decisive native browser event behavior was not reproduced in the available Sol environment. They are not part of the confirmed-defect set.
- Codex-5.6 Sol completed its independent whole-PR review of the same exact head. It independently confirmed the Enter and tabbed-paste defects, reproduced cross-leaf paste in real Chromium and confirmed one additional attachment conflict-selection race described below. GPT6-04 remains only a candidate because no native non-image clipboard payload reaching that branch was reproduced.
- No implementation correction was performed during this review cycle. PR #215 remains on the reviewed exact head `b093054…`, so the findings below apply directly to the current implementation head.

## Codex-5.6 Sol result for reviewed head `b093054…`

### Confirmed A — Keep-server is not a durable attachment-membership boundary

`attachmentSelectionEpoch` fences local UI state but does not freeze the selected server version's attachment membership. Old POST/DELETE operations remain in flight, and inactive callbacks still trigger an authoritative GET of the same draft generation.

Two temporary hook diagnostics using unchanged production hooks reproduced both data-loss directions:

1. A late POST from the rejected local selection commits a real ref under the same generation; the subsequent GET restores that losing attachment into the chosen server version.
2. A late DELETE from the rejected local selection removes a ref retained by the chosen server version; the subsequent GET reflects the loss.

The existing late-upload test supplies an inconsistent mocked GET that omits the ref the mocked POST has just committed. The DELETE coverage uses different IDs and misses removal of the same retained ref. This is a current Stage 5 integrity defect at `b093054…`. A client epoch/retry adjustment cannot by itself restore a late-deleted ref or exclude an already committed late POST. Conflict selection needs a server-authoritative attachment-membership/version boundary, with POST/DELETE validated or resolved against that boundary. The exact representation must be selected after checking the current head; no Stage 6 infrastructure is required.

### Confirmed B — Simple-mode Enter ignores the native caret

`visual-markdown-editor.tsx` passes the entire leaf's `range.end` to `onInsertParagraph` instead of the native caret offset. Enter in the middle of a plain or formatted leaf therefore inserts at the leaf end and can produce incorrect Markdown. Existing tests do not place the caret inside a leaf.

### Confirmed C — cross-leaf paste can be discarded

Codex-5.6 Sol promoted GPT6-03 from candidate to confirmed for `b093054…`. In Chromium 154.0.8037.57, Ctrl+V with a selection spanning adjacent contenteditable leaf spans dispatched paste to the first leaf while `Range.commonAncestorContainer` was the editor root. The handler had already called `preventDefault()`, then returned because the active leaf did not contain the common ancestor; no content was inserted.

### Confirmed D — explicit plain-text paste mishandles tabs

The paste handler attempts spreadsheet conversion before honoring Ctrl+Shift+V's `forcePlain`. Rectangular tabbed text can become a Markdown table despite explicit plain paste. If tabbed input is not rectangular and conversion returns `null`, the editor warns but inserts nothing instead of falling back to safe plain text.

### Unconfirmed candidate

A paste event containing neither `text/plain` nor `text/html` can reach a destructive empty-insertion branch. Image-only clipboard data is handled by the parent attachment path, and no native non-image payload reaching this branch was reproduced. Keep GPT6-04 as a candidate rather than a blocker.

### Evidence boundary

- Focused Editor 2.0 suites: 216 tests passed.
- Full application run: 97 files / 1027 tests passed; two tests were temporary diagnostics asserting the reproduced late-POST/late-DELETE failures and were deleted without commit.
- ESLint passed for tracked code with one pre-existing unused-disable warning; typecheck and `git diff --check` passed.
- Exact-head CI [#38949642183](https://github.com/iliya1947/vico-forum/actions/runs/38949642183) passed `checks` and `database`.
- Chromium confirmed the native cross-leaf paste event topology.
- No implementation, production deployment, external R2 provisioning, merge or Stage 6 work was performed.

No additional current-Stage defect was confirmed in the reviewed publication, generation-rebind locking, exact publish manifest, tombstone, cleanup, post-edit snapshot, authorization, translation or quote paths.

## Следующий шаг

ChatGPT-5.6 Sol независимо сопоставляет findings A–D с текущим exact head `b093054…` и определяет единый bounded пакет подтверждённых current-Stage исправлений. Не merge и не переходить к Stage 6.


## ChatGPT-5.6 Sol reconciliation of Codex findings — 2026-10-17

All findings below were rechecked against current exact implementation head `b0930544218f4dba1c25d98820a7c12478c4ef57` and the current Editor contract.

### Confirmed current-Stage defects

1. **Attachment Keep-server membership race.** Confirmed. The client selection epoch only fences UI callbacks. Server POST/DELETE attachment mutations are authorized by owner/context/draft generation and do not carry a durable attachment-selection/version boundary. When the chosen server version and the losing local version share the same active draft generation, a late POST can add a losing ref and a late DELETE can remove a winning ref; the subsequent authoritative GET then reflects that mutation. This violates the conflict rule that the rejected version is discarded after explicit selection.
2. **Simple-mode Enter caret/selection handling.** Confirmed. `VisualTextLeaf` prevents native Enter and always calls `onInsertParagraph(range.end)`; `insertVisualParagraph` therefore inserts at the leaf end rather than the actual native caret/selection position.
3. **Cross-leaf paste discard.** Confirmed. The handler prevents the native paste before validating the full selection, then returns when the current leaf does not contain `Range.commonAncestorContainer`. Codex's Chromium reproduction matches this source path for a selection spanning adjacent editable leaves.
4. **Tabbed paste / explicit plain-paste handling.** Confirmed. The TSV branch runs before `forcePlain`; therefore Ctrl/Cmd+Shift+V may still convert rectangular tabbed text to a table. For tabbed input that is not convertible TSV, `pasteSpreadsheet` only warns and returns, losing the requested pasted content instead of using a safe plain-text fallback.

### Not included

- GPT6-04 remains unconfirmed. No native non-image clipboard payload reaching the no-plain/no-html destructive branch has been reproduced. It is not a blocker and must not expand this correction package.

## Agreed bounded correction package

Correct only the four confirmed defects above in PR #215. Required result:

- An explicit draft-conflict choice establishes a durable server-authoritative attachment-membership boundary so rejected in-flight POST/DELETE operations cannot alter the chosen attachment set. Preserve existing owner/context isolation, publication behavior, 60-second text sync, retry/idempotency behavior and Stage 5 boundaries.
- Simple-mode Enter acts at the actual native caret/selection position, including ordinary formatted text leaves, without damaging untouched Markdown.
- Paste across multiple editable Markdown leaves inserts/replaces at the actual selected source range instead of being discarded.
- Explicit plain-text paste is honored before spreadsheet conversion; failed/non-TSV tabbed conversion falls back without losing content.
- Add regressions that exercise the actual failure directions, including both late attachment POST and late attachment DELETE against the chosen version, middle-of-leaf Enter, cross-leaf paste, explicit plain tabbed paste and invalid-TSV fallback.
- Do not implement GPT6-04, unrelated editor polish, Stage 6 infrastructure or unrelated refactoring.

Codex-5.6 Sol chooses the minimum technically correct implementation. If the attachment race cannot be solved without a broader schema/contract change, stop and record the specific necessity in #147 before expanding scope.

## Следующий шаг

Codex-5.6 Sol зафиксировал ниже необходимое расширение внутреннего draft/attachment contract. ChatGPT-5.6 Sol независимо проверяет предложенную минимальную границу до изменения implementation-кода.

## Codex-5.6 Sol — required attachment contract boundary — 2026-10-17

Implementation head remains exact `b0930544218f4dba1c25d98820a7c12478c4ef57`; no implementation file has been changed during this analysis.

The confirmed Keep-server race cannot be corrected by the current client `attachmentSelectionEpoch` or by adding an isolated stale-callback guard:

- a losing POST may commit before or after explicit selection;
- a losing DELETE may remove a winning ref before or after explicit selection;
- a GET after either commit only reports the already-mutated shared generation;
- the current `forum_attachment_draft_generations` redirect records generation movement but no exact attachment membership selected by a text-draft CAS version.

A bare `X-Vico-Draft-Version` equality check on POST/DELETE is also incomplete. It would reject an intended late A→B upload retained by Keep-local after the target CAS save/rebind, and it can reject an ordinary slow upload if the same editor's 60-second text save advances the draft version while bytes are still streaming.

### Minimum causally complete boundary

Reuse the existing optional `ForumEditorDraftPayload.retainedAttachmentIds` as the exact attachment manifest for every Editor 2.0 draft context, rather than only as a post-edit legacy selection:

1. The client records intended membership before starting POST or DELETE and carries it through local draft conflict resolution. Upload/error identities remain stable and retryable.
2. A draft CAS save that contains the manifest acquires the existing owner/context attachment scope lock and atomically reconciles refs to that exact manifest. Missing assets listed by an in-flight upload are allowed to arrive later; refs not in the manifest are removed.
3. POST and DELETE carry their starting draft version. Under the same scope lock, a current-version operation proceeds normally. A stale POST proceeds only when the current authoritative manifest already contains that attachment ID; a stale DELETE proceeds only when the manifest already excludes it. Otherwise the operation is rejected as a conflict and cannot mutate the chosen set.
4. Rebind remains the durable A→B generation mechanism. A late source operation selected by Keep-local is accepted because the saved B manifest contains/excludes its ID as intended. A later Keep-server choice installs the remote B manifest, so the same stale operation is rejected if it belongs to the discarded local selection.
5. Existing publication manifest checks, owner/context isolation, retirement, stable upload-ID retry, private-object cleanup and 60-second text-sync timing remain unchanged. No external R2 provisioning, new table or Stage 6 work is required.

This is an internal contract expansion across draft payload handling, draft CAS persistence and attachment POST/DELETE. It is broader than a hook-only patch, so implementation is paused here exactly as requested in the agreed package.

### Required proof

- Native DB tests force POST-before-save and save-before-POST plus DELETE-before-save and save-before-DELETE.
- Keep-local A→B accepts the intended late source upload/delete after CAS and rebind.
- A later same-B Keep-server manifest rejects those stale losing operations and restores/removes refs to the selected exact set in either lock order.
- Concurrent ordinary uploads remain mergeable/retryable; ambiguous retry keeps the stable attachment ID.
- Legacy payloads without `retainedAttachmentIds` retain current behavior until the current editor establishes a manifest.
- Existing publication, post-edit retention, authorization, runtime grants and 60-second sync regressions remain green.

## Следующий шаг

ChatGPT-5.6 Sol independently challenges this minimum contract against `b093054…`. If it agrees that the existing manifest field can safely carry this invariant without a schema migration, hand implementation back to Codex-5.6 Sol. If it finds a causal gap or contract conflict, record the exact counterexample here before implementation resumes.


## ChatGPT-5.6 Sol — challenge of proposed attachment manifest boundary — 2026-10-17

The server-authoritative manifest/version direction is necessary for confirmed defect A, and the existing JSONB draft payload can carry an additional internal field without a relational schema migration. However, the proposed direct reuse of `ForumEditorDraftPayload.retainedAttachmentIds` as the new exact all-attachment manifest is **not approved as written** because that field already has a different live compatibility meaning.

### Confirmed compatibility counterexample

Current source and `docs/EDITOR.md` define `retainedAttachmentIds` as legacy post-edit state: when a post-edit attachment snapshot is initialized, a **present** value means which currently published post attachments should be retained. It is consumed only for that first initialization. It is not an exact manifest of every private draft attachment.

Therefore "legacy payloads without `retainedAttachmentIds` keep old behavior" is insufficient. A valid legacy payload may contain the field explicitly. Example:

1. A server-saved legacy post-edit payload contains `retainedAttachmentIds: [published-X]`.
2. The same active draft generation later receives a new private upload Y.
3. Existing behavior treats Y as an ordinary draft ref; the legacy field does not exclude it.
4. If the next CAS save reinterprets the same field as exact membership `[published-X]`, reconciliation removes Y even though the user did not discard it.

This would introduce data loss while fixing the original race.

### Required boundary before implementation

- Preserve the existing legacy semantics of `retainedAttachmentIds` exactly, including **present** legacy values.
- The new authoritative all-draft attachment manifest must be unambiguous from that legacy representation. Codex-5.6 Sol may choose the minimum implementation: for example, a distinct optional JSONB payload field or an explicit discriminator. No new relational table is required merely to add such JSON payload state.
- `undefined` must remain distinguishable from an authoritative empty manifest `[]`. Absence may mean legacy/unestablished state; an authoritative empty selection must be explicit.
- Once the current Editor has established attachment state for a draft generation, every subsequent CAS version that can become a conflict winner must carry the authoritative manifest. Otherwise a text-only winner with no manifest can still be mutated by a stale losing POST/DELETE and defect A remains.
- Establishing/updating the manifest must not accelerate the agreed 60-second server text-sync cadence. It travels with the ordinary CAS save; conflict resolution must not declare a durable winner until the winning version's attachment boundary is server-authoritative.
- Keep the causally complete stale-operation rule proposed by Codex: under the scope lock, stale POST is allowed only if the current authoritative manifest includes its stable attachment ID; stale DELETE only if the current manifest excludes it. Preserve generation rebind, owner/context isolation, stable-ID retry and publication behavior.

### Additional required proof

In addition to Codex's listed ordering tests, add regressions for:

1. a **present** legacy `retainedAttachmentIds` post-edit payload plus a later new private draft upload, proving the legacy field is not reinterpreted as the new exact manifest;
2. authoritative empty manifest versus absent legacy manifest;
3. a text-only newer CAS version becoming the Keep-server winner while an older attachment POST/DELETE is in flight, proving the winner already has an authoritative attachment boundary.

Findings B–D and the agreed bounded scope are unchanged. GPT6-04 remains excluded. PR #215 remains unchanged during this contract check.

## Следующий шаг

Codex-5.6 Sol adjusts the internal attachment-manifest contract to remove the compatibility ambiguity above, then implements the already agreed bounded A–D correction package in PR #215 if the revised boundary remains causally complete. If a further broader architecture/schema change becomes necessary, stop and record the exact necessity here before implementation.
