# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Accepted stack AUTH-01–AUTH-06 собран в PR #388 к unchanged main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`. Exact head `615d93598daf78945a86fbdc4255bc778ae3403f`, tree `9cd50834cd1d86aae2a1192bd8ff9fd27aebebbd` идентичен accepted AUTH-06 #395. Product code не менялся при сборке; 6 intermediate PRs superseded.
3. Final substantive **AUTHOR PASS** сохранён, confirmed current-scope product defects = 0. Это отдельный результат от CI.
4. Новые checks именно #388: CI #45912881134 PASS (3342 unit/component и 1998 PostgreSQL tests, включая 62 whole-lifecycle); 19/20 applicable connected acceptance PASS.
5. **FINAL-ASSEMBLY HOLD — automated gate K5.** Run #45912884312 attempts 1 и 2 failed на `tests/browser/sa04-attachments/check.py:396`, до первого upload. В тесте отсутствует ожидание асинхронной инициализации editorOperationId; точный фактический value на падении не записан. Та же code tree в #395 ранее прошла 33/33 K5 cases. Product defect не доказан. Evidence и ограниченная диагностика: stages/FINAL-ASSEMBLY/RESULT.md.
6. Accepted tree не изменять самовольно в рамках assembly. Не запускать очередной blind retry вместо диагностики. Нужен отдельный ограниченный test/evidence correction pass или решение по дальнейшему маршруту; корректировка теста даст новый exact head/tree и потребует соответствующей проверки.
7. #388 open/unmerged; final coordinator PASS, independent review, AUTH-07, main merge и external/Stage-6 activation не разрешены.

## Следующий переход

**По прямой команде владельца: Ада STOP, передача Мире.** Мира принимает текущий FINAL-ASSEMBLY HOLD по K5, не как final author/automated PASS. Вход: stages/FINAL-ASSEMBLY/RESULT.md, включая диагностику обоих падений и separate AUTHOR PASS/CI PASS/19 из 20 acceptance. Мира оценивает достаточность evidence, определяет следующий bounded correction/evidence маршрут и назначает исполнителя при необходимости. Рекомендованный test-only вариант остаётся гипотезой, не подтверждённой первопричиной. Ада не назначает себе correction, не изменяет #388 и не инициирует повторный запуск. Final coordinator PASS, AUTH-07, independent review, main merge и Stage-6 activation остаются заблокированы до разрешения gate.
