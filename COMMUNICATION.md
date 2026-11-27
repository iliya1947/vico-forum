# COMMUNICATION.md — общий актуальный контекст, факты, ограничения, зависимости и незакрытые вопросы команды

## Принятый stack и final assembly

1. AUTH-01–AUTH-06 accepted, F01 исправлен. #388 exact `615d93598daf78945a86fbdc4255bc778ae3403f` к main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`, identical accepted #395 tree `9cd50834cd1d86aae2a1192bd8ff9fd27aebebbd`, 6 intermediate PRs superseded.
2. Final substantive AUTHOR PASS. Новые #388 CI PASS; 19/20 connected acceptance PASS. K5 #45912884312 failed twice before attachment upload.
3. FINAL-ASSEMBLY HOLD только по незакрытому automated gate; product defect не доказан. Установлен test synchronization gap: SSR/first render empty operationId → useEffect UUID; assertion reads without waiting. Причинная связь с конкретными failures не доказана, same-tree prior #395 K5 33/33 PASS. Evidence: stages/FINAL-ASSEMBLY/RESULT.md.
4. Требуется отдельное решение/назначение bounded K5 test/evidence correction с сохранением всех substantive checks. Не менять accepted tree самовольно или засчитывать старый PASS вместо failed #388. До закрытия gate не переходить к final coordinator review/AUTH-07.

## Независимость и ограничения

Лёва участвовал в AUTH-06, Ада в AUTH-05 correction/assembly; оба не independent final reviewer. Main merge и external/Stage-6 activation заблокированы.
