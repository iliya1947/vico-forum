# COMMUNICATION.md — общий актуальный контекст команды по #342

## Канал и источник истины

- Service PR этой задачи: #342; он никогда не merge в main.
- GitHub main — источник истины продукта.
- #300 не используется Мирой как текущий рабочий канал/источник назначений до завершения #342, кроме прямой команды владельца.

## Актуальные продуктовые факты

- Edit own title, Watch, Bookmarks и Mute/Block уже merged и задокументированы в main.
- Repository migration ceiling в текущем product state: 0070; external accepted evidence остаётся только через 0020.
- Stage 6 paused и не связан с текущим corrective/product route.

## Consolidated correction #354

Подтверждённые audit findings:
1. WATCH-AUDIT-1 [P2]: local confirmed mirror мог перезаписать свежий loader state старым ACK.
2. BOOKMARKS-AUDIT-1 [P2]: тот же causal class в topic bookmark control.
3. BOOKMARKS-AUDIT-2 [P2]: old Remove ACK/local removed latch может скрыть row после нового Add и свежего list loader.
4. TITLE-AUDIT-1 [P3]: Save/Cancel вызывает focus до возврата opener в DOM; Chromium оставляет BODY focused.

Owner решил закрыть **все четыре** в одном #354 и только после этого один раз подключать Лёву.

Watch correction уже прошла промежуточную проверку Миры на head `afe23e08...`, но после расширения PR эта проверка не является final gate.

Mira fresh whole-PR review предыдущего head `01cecb91090a2f29f90b7c6ae4a83db77a0f4910` установила **один текущий P3 TITLE-AUDIT-1-R1**: deferred focus request мог пережить Cancel без opener при `canEdit=false` и красть фокус позднее при восстановлении права. **Лира исправила в том же Draft #354**, exact `b67e14d81cd20f2e42264e3d25d336ee19db626b`: request потребляется при закрытии редактора, даже когда opener отсутствует; regression проверяет permission-loss → Cancel → другой фокус → permission-return на той же смонтированной компоненте. Все девять файлов остаются в исходном correction scope, никаких backend/DB/RBAC/контрактов. Author self-check PASS. Exact-head [CI 44622509204](https://github.com/iliya1947/vico-forum/actions/runs/44622509204): **2752/2752 unit** и **1476/1476 PG17**, 7/7 workflows SUCCESS; Title Chromium [44622509311](https://github.com/iliya1947/vico-forum/actions/runs/44622509311): 9/9. **Следующий исполнитель — Мира, новый coordinator whole-PR review всего #354 на `b67e14d81cd20f2e42264e3d25d336ee19db626b`.** Прежний Mira HOLD относится к старому SHA; Лёва только после нового Mira PASS.

## Ограничения correction

- Fresh loader/list truth не должен проигрывать старому mutation ACK или local latch.
- Не добавлять version/timestamp/CAS/client cache/global store/automatic POST retry только ради UI freshness.
- Сохранить pending/error/explicit refresh, actor/target isolation и уже принятые Bookmarks cursor/session semantics.
- Title focus correction не меняет title mutation/data contract.

## Дальнейшие планы

- Moderation visibility: полный V1–V9 plan существует; implementation не активен.
- Forum structure/topic move: S0–S10 plan принят Мирой; implementation не активен.
