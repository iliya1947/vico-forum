# Мира — ChatGPT-5.6 Sol

Активная задача: поэтапный аудит AUD-20261022. Этап 6 завершён; следующий этап — 7.

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
- Следующая часть: transaction isolation/locking/concurrency invariants across forum/authz/help/attachment/database mutation paths.
