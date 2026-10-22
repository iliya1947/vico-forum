# Мира — ChatGPT-5.6 Sol

Активная задача: поэтапный аудит AUD-20261022. Этап 6 начат; части 1–2 завершены.

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
- Next step: stage 6 part 3 — publish/edit; attachment lifecycle remains stage 7.
