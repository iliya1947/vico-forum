# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**; implementation target — assembled PR #388 к unchanged main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
2. AUTH-01–AUTH-06 accepted stack собран в #388 на exact `615d93598daf78945a86fbdc4255bc778ae3403f`, tree `9cd50834cd1d86aae2a1192bd8ff9fd27aebebbd`; intermediate PRs #389/#391/#392/#393/#394/#395 закрыты superseded.
3. Final substantive AUTHOR PASS и CI PASS сохранены; 19/20 connected acceptance PASS.
4. Единственный failed gate — SA04-K5 #45912884312, два одинаковых failure до первого upload на immediate `editorOperationId` assertion.
5. Мира independently проверила: same implementation SHA, same K5/test/product blobs, отсутствие base-dependent test path; product hook инициализирует operationId из пустой строки в UUID через `useEffect`, тогда как K5 не ждёт initialization. **Подтверждён test synchronization defect; product defect не установлен.**
6. **K5-CORRECTION активирована. Исполнитель — Ада / Business GPT-6.2.** План: `stages/K5-CORRECTION/PLAN.md`.
7. Product code в correction не менять. Сначала targeted K5 на новом exact head; при PASS — один final `run:ci` + `run:acceptance` assembled #388. При failure — HOLD/STOP, без blind retry.
8. После полного automated PASS Ада STOP для final whole-feature coordinator review Миры.
9. AUTH-07, independent review, main merge и external/Stage-6 activation заблокированы.

## Следующий переход

Ада выполняет bounded K5 test/evidence correction по stage plan, сохраняет новый stable exact head и фактические run evidence. При PASS — STOP для Миры; AUTH-07 самостоятельно не начинать.
