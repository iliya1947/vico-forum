# Block F — Files & attachments security audit

## Статус

1. Audit scope подготовлен 2026-11-11 против current `main` `538084fd472c65459ad55ab30a0f96fbfdd68e56`.
2. Этот `main` отличается от предыдущего security target `4248fed23925e4a23e48485d419ceaf0ce337def` только merged factual SA-02 documentation; attachment runtime/schema между этими targets не менялись.
3. **F1 — Private object / download access / IDOR завершён: PASS, 0 confirmed current-scope findings.**
4. **F2 — Upload admission and request bounds завершён: PASS, 0 additional current-scope findings.**
5. Следующий bounded slice — **F3 Type, content and malicious payload handling**.
6. Мира — auditor/coordinator. Remediation, technical planner и implementer не назначены.
7. Stage 6 external activation остаётся paused.

## F1 — результат

1. **PASS: 0 confirmed current-scope findings** на `main` `538084fd472c65459ad55ab30a0f96fbfdd68e56`.
2. Основной `/api/attachments/file/:attachmentId` не принимает storage key как authority: public read требует точную persisted связь `post ↔ attachment`, private read — authenticated session user + точные `context + operation + attachment`.
3. Private repository lookup связывает ref с `ownerId`; foreign authenticated user с известными `attachmentId/context/operation` не получает metadata. Cancel/Publish terminally retire operation; completed generation отклоняется как gone.
4. Temporary/private и published refs разделены. Удалённая связь конкретного post больше не разрешает выдачу через этот post; shared asset остаётся доступен только через другую действующую published связь. Abandoned temporary refs становятся terminal через bounded 24-hour cleanup; реальное расписание cleanup остаётся Stage 6 по текущему контракту.
5. Object key извлекается только после server-side membership lookup и не возвращается клиенту. Bucket read не начинается при guest/foreign/revoked/not-found path.
6. Success responses используют `private, no-store`, `nosniff` и sandbox; inline разрешён только server-verified raster, text preview — только server-verified bounded text, остальные типы выдаются download как `application/octet-stream` с безопасным disposition.
7. Retained Complaint evidence имеет отдельную current-permission + Case/asset membership boundary; private object key остаётся server-side. Это не расширяет public attachment access.
8. Live external R2 delivery, реальное cleanup scheduling и AV/provider acceptance относятся к paused Stage 6 и не считаются F1 current-scope defect без отдельной доказанной цепочки.

## F2 — результат

1. **PASS: 0 additional current-scope findings** на `main` `538084fd472c65459ad55ab30a0f96fbfdd68e56`.
2. POST/DELETE upload mutations используют только actor из текущей Better Auth session, требуют exact same-origin и до storage проверяют server-side editor context + текущую effective permission; post-edit дополнительно требует authoritative post ownership. Client actor/role не принимается.
3. Operation identity — server-validated UUID внутри owner/context scope. `admitUpload()` проверяет terminal generation до storage; `createDraftAttachment()` повторяет generation check после storage под тем же scope lock, поэтому Cancel/Publish во время upload не может создать поздний live ref.
4. New upload admission проверяет active `attachments.upload` measure до R2 и повторно в metadata transaction после R2. Exact already-committed stable-ID replay возвращается без нового object write; foreign/other-scope stable ID authority не получает.
5. Declared size — bounded safe integer. `0`/invalid и >50,000,000 bytes отклоняются без R2 payload write; фактический stream дополнительно считает bytes и fail-closed при short/long body или read error. Partial/aborted input не может стать verified attachment metadata.
6. Upload path читает только bounded 4096-byte sniff prefix, затем передаёт rest как stream. Worker adapter использует `FixedLengthStream(byteLength)` и не требует whole-object buffering. Unknown/chunked request length не отменяет application hard bound по declared + actually received bytes.
7. До payload write создаётся durable upload-object journal, затем одноразовая reservation и READY activation. Metadata/ref создаются только после успешного private write и обязательной structural finalization; journal/cleanup fencing не позволяет failed storage/DB path превратиться в `type-checked` live ref.
8. Lost/ambiguous outcomes разделены: ambiguous physical write revokes same-key authority через reservation/delete/journal cleanup; ambiguous metadata COMMIT сохраняет object до stable-ID retry, который сходится на одном logical asset. Concurrent same-ID uploads сходятся на одной authoritative metadata/ref, losing physical object удаляется.
9. Уже подтверждённый `FORUM-READ-BOUNDS-01` затрагивает `authorizeEditorWrite()` для topic context через unbounded `readTopicPage`; это прежний Block E root cause и отдельным F2 finding не дублируется.
10. Отсутствие per-user attachment quota не считается finding по утверждённой Block F current-scope границе. Live external R2 acceptance/scheduling остаются Stage 6 и здесь не заявляются как проверенные.

## Цель

Проверить текущую цепочку пользовательского файла от запроса загрузки до выдачи и очистки так, чтобы:

1. чужой или ещё не опубликованный объект нельзя было получить по известному/угаданному идентификатору;
2. client-supplied filename, MIME, IDs, context и operation state не заменяли server-side authority;
3. размер, фактический тип и опасные payloads проверялись на серверной streaming/storage boundary;
4. публикация связывала только проверенные live refs текущего пользователя/operation/context;
5. replay, stale edit, concurrent publish/cleanup и lost ACK не создавали cross-user access, duplicate logical asset или частичную публикацию;
6. удаление/cleanup не удаляло shared/published asset и не сохраняло доступ через уже недействительную ссылку;
7. security evidence оставалась protected metadata, а подозрительный файл не становился публичным;
8. repository/local storage boundary не выдавал будущие Stage-6 R2/AV guarantees за уже доказанные.

## Текущий продуктовый контракт

1. Один файл — максимум 50 МБ; limit должен оставаться конфигурируемым.
2. PostgreSQL хранит metadata/relations, не binary payload.
3. Upload начинается до публикации и создаёт private temporary ref; до publication объект доступен только автору operation.
4. После publication файл доступен только через действующую опубликованную связь; для обычного публичного сообщения это обычно public read.
5. Новые файлы published edit остаются private до успешного Save.
6. Remove из mounted selection сам по себе не публикует и не удаляет shared object; terminal lifecycle и cleanup работают отдельно.
7. Final publication проверяет owner/context/operation, verification/live refs и cleanup state под repository locks и атомарно связывает selected asset IDs.
8. Stale edit/CAS не должен частично менять attachment refs.
9. Private download проходит controlled server path с актуальной ref проверкой.
10. Raster может отдаваться inline; source preview — только inert text; остальные файлы — download. Активный HTML/SVG/script content не исполняется в forum origin.
11. Client filename/extension/MIME недостаточны: сервер проверяет размер, declared type и фактические признаки содержимого; запрещённые executable signatures/форматы отклоняются.
12. Архив не считается безопасным только потому, что это архив; форум не распаковывает и не запускает пользовательские файлы.
13. Suspicious/rejected file создаёт durable security evidence для `Требуют внимания → Безопасность → Вложения`; evidence read требует `forum.attachmentSecurity.read`.
14. Реальный AV provider не подключён и не должен имитироваться.
15. Реальное внешнее R2 provisioning/scheduling остаётся Stage 6; repository/local private R2 adapter/emulator — текущая проверяемая boundary.

## Assets

1. Binary object bytes и object key.
2. Temporary upload operation, generation/context и selected asset IDs.
3. Stable logical file/attachment identity.
4. Published post↔attachment refs.
5. Publication receipt/idempotency identity.
6. Declared filename/MIME/size и server-detected type/size.
7. Security evidence metadata.
8. Cleanup claims/leases и object-deletion state.
9. R2/storage binding и database metadata, используемые runtime.

## Trust boundaries и attacker entrypoints

1. Guest напрямую вызывает download/upload route.
2. Authenticated user A подставляет operation/asset/post/ref пользователя B.
3. Stale mounted editor после account/session switch.
4. Forged filename, MIME, size, context, generation, publication operation и selected IDs.
5. Raw binary with misleading extension/MIME, executable header, HTML/SVG/script/polyglot/archive.
6. Oversized/chunked/aborted upload и повтор после ambiguous response.
7. Direct download по guessed/stale/private ID, включая объект removed from post или abandoned operation.
8. Concurrent upload/publish/edit/cancel/cleanup requests.
9. Retry/lost ACK/replay уже завершённой operation.
10. Privileged-but-wrong actor читает attachment security evidence без exact permission.
11. Storage/database timeout, partial failure и cleanup failure.

## Current-scope границы

1. Проверяется существующая repository/local-CI реализация upload/download/publication/edit/cleanup/security-evidence.
2. Отсутствие общего per-user quota само по себе не finding: текущий продукт его явно не требует. Abuse impact проверяется по реально существующим request/object bounds.
3. Отсутствие live AV scanner само по себе не finding: AV integration отложена; finding возможен только если текущий UI/runtime ложно заявляет scanning/safety или существующая обязательная type boundary обходится.
4. Реальный Cloudflare R2 bucket/config/credentials, production scheduling и deployed object isolation не проверяются до Stage 6. **Информация не проверена** для live R2 acceptance.
5. Будущая Super-admin область `Files & attachments` не реализована и не считается дефектом Block F; текущий `security.attachments` monitor/evidence projection проверяется только там, где касается уже существующей security boundary.
6. Не расширять Block F в generic database/runtime/secrets audit: такие findings идут в Blocks G/H/I, если root cause не является attachment-specific.
7. Уже подтверждённый `FORM-BODY-BOUNDS-01` из Block E не дублировать. Если upload имеет отдельный streaming/body-bound root cause, фиксировать только доказанную attachment-specific цепочку.

## Подзадачи

### F1 — Private object / download access / IDOR

1. Проверить upload/private/published download routes и repository lookup.
2. Guest, owner, foreign authenticated user, stale operation, stale published ref, removed ref.
3. Убедиться, что знание asset/object ID не является authority.
4. Проверить public publication projection отдельно от temporary/private ref.
5. Проверить response headers/content disposition/cache для private и public cases.
6. Проверить, что unauthorized/not-found paths не раскрывают private metadata/object existence сверх текущего контракта.

### F2 — Upload admission and request bounds

1. Session/actor, Origin/CSRF и stale-account checks.
2. Operation/context/generation ownership и terminal state.
3. Byte ceiling 50 МБ на streaming boundary, declared size mismatch, zero/partial/aborted body.
4. Chunked/unknown length и memory buffering.
5. Retry/lost ACK/stable asset identity.
6. Dependency failure не должен превращать failed upload в verified/live ref.

### F3 — Type, content and malicious payload handling

1. Extension + declared MIME + detected content/signature consistency.
2. Executable masquerading, binary/text confusion, HTML/SVG/script and polyglot-like cases supported by current detector.
3. Raster inline path не должен стать same-origin active-content path.
4. Text/source preview must remain inert and encoding-safe.
5. Archive classification must not claim inner safety.
6. Security evidence should record factual reason, not raw file content/secrets.

### F4 — Publication/edit binding, replay and races

1. Final selected IDs exact allowlist; extras/unselected pool refs cannot publish.
2. owner/context/operation/verification/live-ref/cleanup checks under authoritative locks.
3. attachment-only publication and retained published refs.
4. stale published edit, explicit Remove intent, rebase and repeated rebase.
5. duplicate/ambiguous submit receipt behavior.
6. concurrent publish/cancel/upload/cleanup cannot create partial attachment state.

### F5 — Cleanup and physical deletion safety

1. Idle/terminal eligibility and current grace periods.
2. Durable claim/lease and retry semantics.
3. Published/shared refs and live operation refs protect object.
4. Concurrent new reference vs cleanup deletion.
5. Delete failure/retry cannot mark object safely gone when bytes remain accessible.
6. Cleanup must not trust stale client state or arbitrary object key.

### F6 — Attachment security evidence / Attention privacy

1. Evidence persistence for rejected/suspicious upload paths.
2. Dedup/useful metadata without raw bytes/secrets.
3. `forum.attachmentSecurity.read` checked before read; no Help/Admin permission substitution.
4. Direct query/mode/group paths and private/no-store behavior.
5. Deleted object still leaves enough safe evidence without making object downloadable.
6. SA-02 `security.attachments` Owner projection must not weaken ordinary Attention authorization.

### F7 — Storage adapter, runtime privileges and failure isolation

1. Attachment repository/R2 adapter exposes only code-backed operations; no arbitrary browser-selected object key.
2. Web DB capability for attachment relations is no broader than current runtime needs.
3. Storage failure classification is fail-safe for upload/download/publication/cleanup.
4. Secret/binding values are not serialized in response/evidence/log payload.
5. Local R2 emulator behavior is not treated as proof of live production isolation.
6. Cross-cutting generic Worker/DB issues are handed to later blocks instead of duplicated.

### F8 — Cross-chain closeout

1. Re-run root chains across upload → publish → read → edit/remove → cleanup → evidence.
2. Check existing targeted regressions against uncovered cases; tests are evidence, not proof by themselves.
3. Verify each candidate finding against current Stage and distinguish future hardening.
4. Record confirmed findings only after causal path and impact are established.
5. Production/live-R2/AV acceptance remains explicitly unverified where external resources are required.

## Порядок аудита

1. F1 — Private object / download access / IDOR.
2. F2 — Upload admission and request bounds.
3. F3 — Type/content/malicious payload handling.
4. F4 — Publication/edit binding, replay and races.
5. F5 — Cleanup/deletion safety.
6. F6 — Security evidence/privacy.
7. F7 — Storage/runtime failure boundary.
8. F8 — cross-chain closeout.

F1 идёт первым, потому что ошибочная выдача private/stale asset напрямую создаёт current-scope data exposure и не требует будущей инфраструктуры для доказательства.

## Основные current code seams

1. `app/routes/attachment-upload.ts`
2. `app/routes/attachment-download.ts`
3. `app/forum/attachment-request-context.ts`
4. `app/forum/attachment-r2.ts`
5. `app/forum/editor-attachments.tsx`
6. `app/forum/attachment-presentation.tsx`
7. `app/forum/actions.server.ts`
8. `db/forum-attachments.ts`
9. `db/hyperdrive-forum-attachments.ts`
10. `db/forum-attachment-cleanup.ts`
11. `db/attachment-draft-generation.ts`
12. `db/forum-repository.ts`
13. `app/routes/attention.tsx`
14. `workers/app.ts`
15. attachment schema/migrations/runtime privilege contract and targeted tests.

Этот список — starting map, не гарантия полноты: при каждой подзадаче прослеживается фактическая causal chain и связанные callers/storage readers.

## Критерий Block F finding

Finding фиксируется только если одновременно установлены:

1. реальная текущая code/runtime path;
2. нарушенный current contract/security boundary;
3. достижимый attacker/input/state;
4. наблюдаемый impact;
5. причина относится к текущему Stage, а не только будущему live R2/AV/Stage-6 hardening.

## Критерий завершения Block F

1. F1–F8 пройдены против стабильного current-main audit target или явно зафиксированного descendant без attachment runtime changes.
2. Все direct upload/download/publication/cleanup/evidence paths проверены server-side, а не только UI.
3. Каждый finding имеет causal path, impact, severity и Stage classification.
4. Future R2/AV/deployed requirements отделены от current defects.
5. Remediation не начинается автоматически: confirmed findings сначала сводятся в bounded correction package по решению владельца.
