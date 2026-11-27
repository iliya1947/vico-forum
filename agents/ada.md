# agents/ada.md — личная рабочая память Ады по authentication lifecycle

## Текущая точка

FINAL ASSEMBLY в #388 завершена без product changes; `615d93598daf78945a86fbdc4255bc778ae3403f`, base `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`, accepted tree `9cd50834cd1d86aae2a1192bd8ff9fd27aebebbd`. Intermediate PRs superseded. Substantive AUTHOR PASS, отдельно CI PASS и 19/20 connected acceptance PASS.

**HOLD/STOP по K5 automated gate**, run #45912884312 failed twice at editorOperationId assertion before upload. Исходный React hook starts draftId="" и устанавливает UUID в useEffect; тест читает значение без ожидания этого перехода. Второй failure artifact не содержит page_errors/external requests, actual input value не записан; точная причина падений не доказана, product regression не установлен. Same-tree #395 K5 PASS 33 cases. Evidence в stages/FINAL-ASSEMBLY/RESULT.md.

Не менять accepted tree в рамках assembly, не выполнять blind retry, не переоткрывать AUTHOR PASS из-за CI. Требуется отдельное назначение bounded K5 test/evidence correction либо решение маршрута владельцем/Мирой. AUTH-07, merge, external/Stage-6 запрещены; Ада не independent reviewer.
