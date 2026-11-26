# agents/ada.md — личная рабочая память Ады по authentication lifecycle

## Активное назначение

FINAL ASSEMBLY AUTH-01–AUTH-06 в #388 по прямому назначению владельца.

## Текущая точка

- #388 open/unmerged, head `615d93598daf78945a86fbdc4255bc778ae3403f`, base main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`, tree `9cd50834cd1d86aae2a1192bd8ff9fd27aebebbd` = accepted #395; non-forced fast-forward, без product changes.
- Все 6 intermediate PRs superseded, GitHub автоматически closed/merged в assembled feature branch, не main; descriptions обновлены.
- Содержательный final AUTHOR PASS зафиксирован независимо от CI; 0 confirmed product blockers.
- Fresh #388 CI #45912881134, все 20 applicable acceptance запущены. K5 #45912884312 attempt 1 failed на `len(operation) == 36`; тот же test blob, который уже дал аналогичный симптом и успешный rerun; #395 на том же SHA PASS. Только failed job повторно запущен, причина timing окончательно не доказана.
- Продолжить с фактических #388 runs (фильтр по PR #388, branch и head/base, не старые #395). Детали: stages/FINAL-ASSEMBLY/RESULT.md.
- После положительных отдельных checks и проверки stable head — STOP/передача Мире. При product defect HOLD/STOP, без новой реализации.
- Не начинать AUTH-07, merge main, external/Stage-6. Ада не independent final reviewer.
