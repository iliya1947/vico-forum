# Мира — ChatGPT-5.6 Sol

Активная задача: AUD-20261022 завершён и опубликован; следующий шаг — межаудиторская сверка после завершения остальных независимых аудитов.

Этот файл используется для собственных рабочих результатов, выводов и технического контекста Миры в рамках текущего служебного PR.

## AUD-20261022 — этапы 1–5

- Baseline: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.
- Этапы 1–5 завершены.
- Findings остаются только в current developer chat до завершения checking sequence; Attention Mixed pagination отдельно retained как owner-known non-blocking requirement conflict.

## AUD-20261022 — этап 6, часть 1 — modes / Markdown / clipboard / history

- Baseline повторно подтверждён; `AGENTS.md` полностью прочитан.
- Проверены primary stage-6 paths: `editor-document.ts/test`, `clipboard-markdown.ts/test`, `markdown-editor.tsx/test`, `markdown.tsx/test`, `technical-markdown.ts/test`, `visual-markdown-editor.tsx`, `markdown-syntax.ts`.
- Current contract из `docs/EDITOR.md` сопоставлен с Simple/Advanced, single-Markdown-source, mode persistence, view switching, Undo/Redo, technical protected blocks, clear formatting, clipboard, code keyboard and Split semantics.
- Source remains authoritative and is not reserialized on view/mode switches. CRLF/LF textarea mapping changes only edited spans. History stores exact source+selection, clears redo after divergent edit and is retained through mode/view switching.
- Simple visual surface traverses only known editable text leaves and fails closed across protected technical/structural ranges; complex code and unsupported structures remain source-preserved. Ordinary tables have separate controlled visual editing; unsafe/loss-prone tables remain protected.
- Simple/Advanced preference and explicit spellcheck preference are per authenticated account in localStorage; context changes reset buffer/history and do not persist text drafts.
- Advanced code-only keyboard helpers are bounded to fenced-code content, excluding opening/info and closing fence lines; manual code language is normalized but not restricted to a fixed highlight list.
- Clipboard rich-HTML conversion accepts a bounded safe subset, rejects active/unsafe structures, converts simple spreadsheet tables, and falls back explicitly rather than silently dropping unsupported content.
- One current-Stage finding was confirmed in the shared literal-text escaping path used by Simple visual typing and plain/paste-without-formatting. Details remain only in current developer chat until the audit publication gate.
- Часть 2 quote/mention завершена: whole/selected quote source and presentation, DOM line collapse, mention token/search/insertion, publication recipient extraction и durable edit notification semantics проверены. Quote source хранится обычным Markdown blockquote; attribution/permalink сохраняются; 1–5 visible rows не сворачиваются, >=6 сворачиваются до первых трёх. Mention lookup authenticated/private/no-store, choice inserts stable-id profile link, published parser excludes blockquote/code/inlineCode/html/image and bare @. Notification rows dedupe recipient+post, поэтому reply+mention не дублируются; edit adds only new recipients, deletion does not revoke and re-add does not resend; stale edit emits nothing. Новых independent findings в части 2 нет.

## AUD-20261022 — этап 6, часть 3 — publish / edit

- Проверены publication readiness, native submit replay, Ctrl/Cmd+Enter boundaries, operation identity/fingerprint replay, published-post revision CAS/history и controlled action failures.
- Readiness считает только meaningful text или settled selected/retained attachments; unsettled/error attachments блокируют публикацию. Publication interception сохраняет native validation и submitter, а повторная отправка блокируется через pending state.
- Topic/reply/edit publication receipts проверяются под operation scope до новой записи; exact replay возвращает прежний результат, а modified replay конфликтует. Published edit сохраняет revision history и применяет expectedRevisionId CAS.
- Controlled validation failure сохраняет тот же live editor buffer и допускает retry; history endpoint остаётся server-permission protected.
- Детали findings этой части остаются только в current developer chat по правилу проверки PR.
- Финальная сверка покрытия завершена: все 18/18 первичных файлов stage 6 независимо прочитаны до EOF; stage-6 срезы общих views/actions/mutations/repository и topic route сверены.
- Предметный source-review этапа 6 завершён с findings и явными ограничениями. Browser/a11y/responsive остаются stage 11; attachment lifecycle — stage 7; broad localization — stage 8; test-quality/CI — stage 12.
- Чужие checkpoints/PASS параллельного аудита не использовались как доказательство собственного результата.
- Next step: stage 7 — внутренний attachment upload/download/security/lifecycle/cleanup contract, без R2 как сервиса.


## AUD-20261022 — этап 7

- Часть 1 завершена: upload/type/security/private-ref/download boundary проверен; детали findings остаются только в current developer chat.
- Часть 2 завершена: ZIP/ZIP64, OOXML/ODF, 7z, gzip, tar и OLE/CFB structural validators и их private-storage finalization boundary проверены против текущего ограниченного контракта; детали findings остаются только в current developer chat.
- Следующая часть: attachment publication/edit selection, terminal operation и cleanup/concurrency lifecycle.

## AUD-20261022 — этап 8

- Этап 7 завершён; stage 8 localization/i18n начат на том же baseline.
- Часть 1 завершена: locale identity/registry/resolver, persistent registry, root negotiation, `/:locale` boundary, degraded mode, request-scoped registry wiring и `lang/dir` проверены.
- Ранний кандидат о необходимости `client.end()` на request-scoped Hyperdrive client снят после сверки с актуальным Cloudflare Hyperdrive connection-lifecycle contract; дефектом не считается.
- Часть 2 завершена: canonical UI catalog, RU/HE local manual packs, fingerprints/freshness, persistent manual/machine sources, resource loader, compiled bundles и request-scoped i18next snapshot проверены.
- Часть 3 завершена: content translation presentation, source-locale resolution/correction, topic title/post body `lang/dir`, original disclosure, exact-revision fallback и mixed-language presentation boundaries проверены. Current topic-page translation path и immutable source-locale correction работают согласованно; системная mixed-language metadata gap вне dedicated content presentation path подтверждена, детали остаются только в current developer chat.
- Детали подтверждённых findings остаются только в current developer chat до audit publication gate.
- Следующая часть: финальная сверка stage 8 coverage перед переходом к database stage.

- Части 4A/4B/4C и финальная сверка завершены: durable tasks/retry/reconciliation, request budget, provider allowance, provider/data-policy, TinyLD, CNT-04, content execution/publication, generation UX/status и Hyperdrive adapters сопоставлены с текущим Stage 5 local/CI contract.
- Все 128 primary manifest entries Stage 8 reconciled; uncovered primary paths не осталось.
- Stage 8 закрыт с тремя independent findings; их детали остаются только в current developer chat до audit publication gate. Ложный Hyperdrive client-cleanup finding окончательно снят.
- Production content generation остаётся fail-closed согласно PROJECT_STATE; external quotas, Queue/provider bindings и live provider acceptance не классифицировались как defects текущего Stage.
- Next step: Stage 9 — database schema/integrity/concurrency/lifecycle audit.

## AUD-20261022 — этап 9

- Часть 1 завершена: schema constraints и revision/ownership/reference integrity.
- Baseline остаётся `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; Stage 9 manifest содержит 108 primary files.
- Проверены owner-matching current revision FKs, immutable revision triggers, same-topic parent/best-answer/read-state/notification references, revision-bound translation/task FKs, Help relationship/signal shape+lifecycle constraints и attachment reference ownership/active-gate foundations.
- Historical draft/edit snapshot tables после удаления text drafts не использовались как current defects сами по себе; отсутствие дополнительных FKs/JSON checks там не классифицировано как проблема без текущего reachable causal path.
- Новых independent findings в части 1 нет. Уже известный AUTHZ-01 не дублируется как schema finding: FK integrity корректна, дефект находится в application error handling после удаления custom role.
- Часть 2 завершена: transaction isolation/locking/concurrency invariants across forum/authz/help/attachment/database mutation paths.
- Проверены: authz singleton mutation lock + last-manager serialization, repeatable-read composite authz snapshots, locale graph SERIALIZABLE/table-lock writer, topic-before-user Help/reply lock order, sorted two-topic duplicate locks, signal accept/reject/withdraw locking, best-answer/solution/duplicate serialization, monotonic unread/read-state UPSERT, pin/unpin topic lock, publication/edit attachment scope-before-post/topic ordering, attachment cleanup claim/ref trigger fencing.
- Existing HELP-MOD-01 / HELP-DUP-01 остаются application stale-intent findings и не дублируются как database race defects: repository транзакции сериализуют текущий authoritative state, но соответствующие actions не всегда bind пользовательский intent к увиденной identity.
- ForumWritePolicy app-clock candidate снят: current contract требует transactional per-author serialization, но database-owned lifecycle timestamps отдельно и явно требуются только Help signals.
- Новых independent findings в части 2 нет.
- Следующая часть: migration history/schema parity/production-manifest/runtime privilege contract.

## AUD-20261022 — финальный опубликованный результат

Дата публикации: 2026-10-24.

Baseline полного аудита и повторной causal/current-Stage сверки: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c` (`main`).

Итог после отдельной повторной проверки каждого finding по полной цепочке и обязательной классификации current-Stage vs future-only:

- **27 подтверждённых current-Stage технических дефектов**.
- **1 отдельный SOT drift**.
- Итого **28 подтверждённых текущих проблем**, если считать SOT drift отдельно от implementation defects.
- Ни один future-only scalability / Stage 6 readiness item ниже не входит в эти 27.

### Подтверждённые current-Stage defects

1. **AUTHZ-01 — stale/missing authorization targets не имеют корректной domain-error boundary.** Удалённые/устаревшие role/user targets могут доходить до repository/DB constraint path и превращаться не в ожидаемый controlled domain result. Ранее отдельный `AUTHZ-MGMT-NOTFOUND-01` после causal review объединён сюда как тот же root cause, а не считается вторым дефектом.

2. **AUTH-LINK-01 — unverified email identity может конфликтовать с Google sign-in для того же email.** Текущий credential flow допускает создание email/password identity без verification, а последующий Google identity/link path может не дать владельцу того же адреса штатно войти/связать аккаунт.

3. **AUTH-SESSION-AVAIL-01 — auth/session storage outage может оборвать запрос до штатной route error boundary.** Session/auth resolution выполняется в общей request path так, что классифицированная DB availability failure не во всех путях преобразуется в согласованное controlled unavailable presentation.

4. **AUTH-COOKIE-ORDER-01 — clearing auth cookie может перезаписать новую session cookie в одном response.** При определённой последовательности auth/session middleware старый cleanup `Set-Cookie` способен оказаться после нового session cookie с тем же именем и тем самым удалить только что созданную сессию.

5. **AUTH-LOCALE-RETURN-01 — language switch теряет вложенный `returnTo`.** Переключение locale на auth/credential route сохраняет текущий route недостаточно полно и может выбросить уже закодированный вложенный destination, ломая возврат после sign-in/sign-up.

6. **DISCOVERY-01 — internal Help service section раскрывается через generic discovery surfaces.** `help-solutions-questions` спроектирован как скрытая service section, но часть generic discovery/read paths не везде исключает её, поэтому внутренняя storage identity может появляться как обычный форумный destination.

7. **HELP-MOD-01 — stale solution-moderation action не bound к увиденному best answer.** Form/action несёт topic-level intent без обязательного expected best-answer identity, поэтому после смены authoritative best answer старое действие может примениться уже к новому решению.

8. **HELP-DUP-01 — stale duplicate/appeal action не везде bound к увиденному relationship state.** Repository сериализует текущее состояние, но action intent может пережить изменение duplicate/appeal identity и изменить уже новое authoritative relationship state.

9. **Literal-text escaping finding (исходно без отдельного ID).** Shared Simple visual typing / plain-paste escaping boundary не во всех случаях сохраняет пользовательский literal text как literal Markdown source; введённые marker-like последовательности могут получить Markdown semantics вместо точного текста.

10. **EDITOR-PUB-01 — stale published edit 409 не создаёт штатный rebase path.** После revision conflict same-route loader state не обязательно revalidate-ится до новой authoritative published revision, поэтому UI не получает корректную основу для явного rebase/retry.

11. **EDITOR-PUB-02 — publication conflict показывает нерелевантный solution-oriented feedback.** Ошибка editor publication conflict мапится на неподходящий существующий message key/текст, поэтому пользователь получает ложное объяснение причины отказа сохранения.

12. **CONTENT-SIZE-01 — отсутствует domain/application max-size boundary для topic title/post body publication.** Main publication actions/services принимают непустой content без согласованного верхнего лимита, после чего чрезмерный текст сохраняется и попадает в обычные public read/render/search/translation paths. Точный deployed failure threshold не устанавливался.

13. **MARKDOWN-SPOILER-01 — незакрытые `:::spoiler` дают quadratic `O(N²)` parsing.** `segmentTechnicalMarkdown()` для каждого незакрытого spoiler повторно сканирует остаток документа до EOF; такой body разрешено сохранить, и дорогой parse повторяется на публичном `ForumMarkdown` render path. Точный Worker timeout threshold не измерялся.

14. **ATTACH-LIFECYCLE-01 — DB failure после успешного private R2 write может оставить orphan object.** Cleanup после storage-write/database-failure является best-effort; при одновременно неуспешном delete объект не получает reachable DB ownership/ref и может остаться недостижимым для штатного lifecycle cleanup.

15. **ATTACH-STRUCT-01 — ZIP structural validation не полностью сверяет local metadata с central directory/data-descriptor semantics.** Текущий bounded validator подтверждает общую central/local layout, но оставляет комбинации несогласованной entry metadata, которые могут пройти type-checked structural acceptance.

16. **ATTACH-SEC-01 — Security/Attachments presentation теряет настоящий attachment/upload identity.** Read model/UI показывает derived event identifier в поле/лейбле, воспринимаемом как file/attachment ID, хотя durable security event хранит отдельную исходную upload identity.

17. **ATTACH-HTTP-405-01 — attachment endpoint отвечает 405 без обязательного `Allow` header.** Method-not-allowed response нарушает HTTP contract самой route boundary.

18. **I18N-UI-POLICY-01 — persisted UI bundle validity не учитывает `generationPolicyVersion`.** Bundle freshness/currentness может считаться достаточной при изменившейся generation policy, позволяя использовать артефакт, который больше не соответствует текущей policy identity.

19. **I18N-COPY-01 — post-history loading использует неверный текст про attachment recovery.** Пользовательский loading state истории сообщения связан с unrelated editor/attachment localization key и сообщает другое действие.

20. **I18N-UGC-META-01 — secondary UGC presentations теряют известные `lang/dir`.** Не все места, где уже известна source/content locale пользовательского текста, переносят эту metadata boundary в DOM; часть secondary presentation рендерится с page-direction fallback вместо собственной language/direction semantics.

21. **DB-MANIFEST-01 — production schema manifest не фиксирует predicates partial indexes.** Manifest/parity contract проверяет индексные identities/columns недостаточно полно для partial-index semantics, поэтому изменение/утрата predicate может не быть обнаружено structural parity gate.

22. **DB-ERROR-01 — основной forum mutation boundary маскирует unexpected exceptions как controlled 503.** `createHyperdriveForumWriter.write()` не классифицирует DB availability errors, а `runForumMutation()` после известных domain errors имеет generic `unavailable/503` fallback; programming/schema/invariant/unexpected PG failures становятся внешне неотличимы от storage outage.

23. **POST-EDIT-AVAIL-01 — storage/authz availability failure в published-post edit path может стать generic 500.** Edit authorization/resource-read boundary не во всех ветках преобразует известную dependency-unavailable ошибку в согласованный controlled unavailable response.

24. **FORUM-READ-AVAIL-01 — primary forum storage outage в публичных loaders может стать generic 500.** Core public reading routes вызывают forum reader без общей controlled mapping для `ForumStorageUnavailableError`, несмотря на существующую route unavailable presentation semantics.

25. **NOTIFY-BODY-01 — notifications mutation разбирает request body до auth/same-origin guard.** Ненадёжный/потенциально большой body принимается/парсится раньше дешёвой security rejection boundary, в отличие от требуемого порядка protected state-changing actions.

26. **NOTIFY-PAGING-01 — старые unread notifications становятся недоступны, а badge может зависнуть.** Inbox reader жёстко возвращает последние 50; route/UI не имеют cursor/pagination/mark-all-read, тогда как header badge считает все unread. При >50 unread старые события нельзя открыть/прочитать через UI.

27. **TAG-CARDINALITY-01 — topic creation не ограничивает число unique technology tags.** Normalization ограничивает длину каждого tag, но не cardinality; одна разрешённая topic publication может atomically создать большое число persistent global `forum_tags` + topic-tag rows и непосредственно раздуть public `/tags` catalog, что не ограничивается per-write cooldown.

### Отдельный source-of-truth drift

1. **MIGRATION-SOT-01 — `PROJECT_STATE.md` сообщает repository migration history `0000–0043`, тогда как authoritative migration metadata/manifest уже включают `0044_attachment_draft_conflict_boundaries`.** Это documentation/SOT drift, а не отдельный runtime implementation defect.

### Findings, снятые из current-Stage defect list после повторной проверки

1. **AUTH-PREFLIGHT-01** — первоначальная гипотеза снята после полной causal verification; отдельного current-Stage defect не подтверждено.
2. **AUTHZ-MGMT-NOTFOUND-01** — не отдельный defect; объединён с `AUTHZ-01` как тот же root cause.
3. **DB-HYPERDRIVE-01** — реальный Stage 6 external/runtime readiness вопрос, но не current-Stage defect.
4. **DB-ACL-01** — реальный Stage 6 production-ACL/readiness вопрос, но не current-Stage defect.
5. **FORUM-PAGINATION-01** — unbounded generic reads являются future scalability debt; текущий corpus/runtime failure не подтверждён.
6. **UNREAD-SCOPE-01** — forum-wide unread snapshot для section семантически корректен; scoped optimization относится к future scalability/efficiency.
7. **POPULAR-AGG-01** — `readPopular()` действительно агрегирует все active-30d topics и сортирует в Worker, но текущий product contract выполняется и current-scale runtime failure не подтверждён; future scalability debt.

### Audit boundary / verification notes

- Findings выше перепроверены по текущему `main` с полным causal chain, downstream constraints и current-Stage classification; future-only проблема сама по себе не оставлялась в defect list.
- Во время независимого аудита результаты не публиковались в service PR и GitHub comments не использовались, чтобы не загрязнять параллельные проверки. Эта запись сделана только после прямого разрешения владельца на публикацию.
- Визуальные проверки специально не запускались: владелец разрешает их только по отдельному запросу, а данная публикация фиксирует source/domain audit.
- Где для классификации не требовался реальный deployment threshold (например, `CONTENT-SIZE-01`, `MARKDOWN-SPOILER-01`), точный production failure threshold не заявляется проверенным.
- Следующий этап — независимая межаудиторская сверка с результатами остальных проверяющих; совпадение findings само по себе не считается подтверждением.

