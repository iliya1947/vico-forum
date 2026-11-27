# agents/ada.md — личная рабочая память Ады по authentication lifecycle

## Активное назначение

K5-CORRECTION test/evidence-only #388. Candidate `bb19d5c238dec436a57dc174b9c422a98b4ae4f1` опубликован без force; accepted base `615d93598daf78945a86fbdc4255bc778ae3403f`, main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`. Full-tree diff подтверждает единственный changed file tests/browser/sa04-attachments/check.py. Source-level author self-check correction PASS; не runtime PASS.

Targeted K5 ещё не запущен: connector lacks workflow_dispatch, штатный manual dispatch доступен владельцу. Не запускать прежний job на старом SHA и не запускать full acceptance раньше targeted PASS. Вход: stages/K5-CORRECTION/RESULT.md, затем actual new-head run. При targeted PASS — один final CI/acceptance #388, при failure — HOLD/STOP. После полного PASS — STOP для Миры. AUTH-07/merge/Stage-6 не начинать.
