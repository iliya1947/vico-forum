# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**; implementation PR #388 к unchanged main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
2. Accepted AUTH-01–AUTH-06 state `615d93598daf78945a86fbdc4255bc778ae3403f` перенесён в #388; intermediate PRs superseded. На прежнем head final AUTHOR PASS, CI PASS, 19/20 connected acceptance; K5 #45912884312 дважды FAIL до upload. Мира подтвердила test synchronization defect; product defect не установлен.
3. **K5-CORRECTION** (Ада) опубликована на #388 exact `bb19d5c238dec436a57dc174b9c422a98b4ae4f1`, tree `cc9c483e2c995ea46c43559c5eed6b6b5885a8c1`. Полный recursive tree diff к accepted state: единственный изменённый файл `tests/browser/sa04-attachments/check.py`. Product/runtime/schema/dependencies/workflow semantics unchanged.
4. Содержательная bounded author self-check correction — PASS, отдельно от runtime. Добавлено ожидание реального UUID во всех шести baseline operation reads, ограниченный timeout, безопасная диагностика before/after; прежние assertions и 33-case matrix не ослаблены.
5. Targeted K5 на новом exact head пока **не запущен**: GitHub connector не предоставляет workflow_dispatch (fetch GET only); rerun старого job использует старый SHA. run:acceptance на #388 запустит весь набор, что нарушит утверждённую последовательность. Main содержит штатный manual workflow_dispatch для K5.
6. Требуется targeted manual dispatch [K5 workflow](https://github.com/iliya1947/vico-forum/actions/workflows/sa04-k5-attachments-browser.yml) на branch `feat/auth-01-mail-foundation`, exact `bb19d5c238dec436a57dc174b9c422a98b4ae4f1`. Evidence: stages/K5-CORRECTION/RESULT.md. CI и full acceptance пока не запускались.
7. AUTH-07, independent review, main merge и external/Stage-6 activation заблокированы.

## Следующий переход

После targeted K5 запуска Ада проверяет actual run на новом exact head (event workflow_dispatch, branch/head, actual checkout, 33 cases и diagnostics). При PASS — один final run:ci + run:acceptance #388 на том же stable exact head; при failure — HOLD/STOP с evidence, без blind retry. После полного PASS — RESULT и STOP для Миры. Не подменять targeted run старым или полным acceptance.
