# COMMUNICATION.md — общий актуальный контекст, факты, ограничения, зависимости и незакрытые вопросы команды

## Final assembly и K5 correction

Accepted stack AUTH-01–AUTH-06 на `615d93598daf78945a86fbdc4255bc778ae3403f`: author/CI PASS, acceptance 19/20, K5 repeated failure. По назначению Миры Ада внесла bounded correction только в K5 test/evidence. #388 exact `bb19d5c238dec436a57dc174b9c422a98b4ae4f1`; product tree unchanged, новый diff только tests/browser/sa04-attachments/check.py. Source-level author self-check PASS.

Targeted K5 необходим до full CI/acceptance. Connector не имеет workflow_dispatch; штатный manual K5 workflow_dispatch на ветке #388 требуется отдельно. После запуска Ада проверит actual evidence и выполнит stage plan. Details: stages/K5-CORRECTION/RESULT.md, WORKFLOW.md. AUTH-07, independent review, merge и external/Stage-6 blocked.
