# K5-CORRECTION — текущий результат: ROLLED BACK / HOLD / handoff Мире

По прямой команде владельца кандидат `bb19d5c238dec436a57dc174b9c422a98b4ae4f1` откачен, рабочая ветка #388 восстановлена на его непосредственного родителя `615d93598daf78945a86fbdc4255bc778ae3403f` через force-with-lease (expected SHA = candidate), без изменения других commits. Actual branch ref, PR head, tree `9cd50834cd1d86aae2a1192bd8ff9fd27aebebbd` и unchanged main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432` подтверждены. Candidate had zero workflow runs. Ни targeted K5, ни final CI/acceptance на candidate не запускались.

На восстановленном head прежний substantive AUTHOR PASS, CI PASS, 19/20 applicable connected acceptance PASS; K5 #45912884312 дважды FAIL. Не выдавать historical K5 pass или author self-check откатанной correction за закрытие gate. Исходная диагностика сохраняется. Владелец отверг маршрут, требующий ручного запуска от него, и распорядился вернуть задачу Мире. **Ада STOP; Мира определяет дальнейший маршрут.**

## Исторический отчёт откатанного кандидата (не текущий статус)

# K5-CORRECTION — текущий результат Ады

## Exact state и scope

PR #388 / feat/auth-01-mail-foundation, прежний accepted assembly `615d93598daf78945a86fbdc4255bc778ae3403f`, новый exact candidate `bb19d5c238dec436a57dc174b9c422a98b4ae4f1`, tree `cc9c483e2c995ea46c43559c5eed6b6b5885a8c1`, base main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432` unchanged. Non-forced fast-forward с expected old SHA; branch ref и PR head подтверждены. GitHub compare: 1 commit ahead, 0 behind, единственный modified file tests/browser/sa04-attachments/check.py (+55/-6). Полные recursive trees (без truncation) подтверждают ровно этот один non-tree path; product/runtime/schema/dependencies/workflow files идентичны accepted assembly.

## Содержательная самопроверка — PASS bounded correction

Самостоятельно проверены K5 failure source, editor-attachments.tsx initial empty draftId → crypto.randomUUID() в useEffect, markdown-editor hidden operationId, canAdd gated on initialized и шесть первичных read paths. Введён helper ready_editor_operation: Playwright locator assertion ждёт UUID v4 с 25s timeout, затем читает value с 1s timeout и строго проверяет fullmatch. Это ожидание существующего состояния, не создание/подмена ID, не фиксированный sleep, не повтор upload. Подтверждена применимость штатного to_have_value(regex, timeout) в официальной Playwright Python documentation (API с v1.20), pin 1.62.0 не менялся. Без ослабления original length assertion, последующих equality/inequality checks и иных assertions; число строк с assert увеличено 191→192, record call sites 25→25, сохранена исходная 33-case matrix (полнота фактического исполнения подлежит runtime проверке).

Diagnostic evidence для каждой исходной operation read: case label, before/after per-form operation lengths и UUID validity, file input disabled states, elapsed ms, outcome, exception class only. Safe snapshot failure null; original diagnostic assertion remains failure. No raw operation IDs, token, credentials or DOM payload in added evidence. Diagnostics append to success/failure JSON and structured log. Full exact commit diff inspected. Source-level bounded self-check PASS; no connected run executed, no claim runtime PASS or proof of exact root cause for earlier two failures.

## Targeted K5 — ожидает запуска

Stage plan requires targeted K5 first. Inspected installed GitHub connector capabilities: workflow runs/jobs read, failed jobs rerun, label_pr; no workflow_dispatch/new targeted execution. fetch GET only, no POST dispatch. Old K5 job rerun would check out old SHA, full run:acceptance triggers all applicable workflows on #388 and violates targeted-first order. Do not create extra PR/branch, modify workflow semantics or use a blind retry to circumvent this. Main's existing K5 workflow explicitly supports workflow_dispatch and uses github.sha on manual dispatch. штатный путь: [SA04-K5 workflow](https://github.com/iliya1947/vico-forum/actions/workflows/sa04-k5-attachments-browser.yml) → Run workflow → `feat/auth-01-mail-foundation` → Run workflow. Verify actual run head `bb19d5c238dec436a57dc174b9c422a98b4ae4f1` and actual checkout, all 33 cases, new readiness evidence, no errors/external. At time of record no targeted dispatch sent and no run:ci/run:acceptance sent on new head.

After targeted PASS, one final run:ci + run:acceptance #388, verify fresh applicable checks at stable exact head. If targeted fails, HOLD/STOP with evidence; no blind retry. AUTHOR self-check independent, final automated gate not PASS. Ada remains assigned until handoff to Mira after full gate PASS. No AUTH-07/merge/Stage-6.
