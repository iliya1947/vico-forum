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

Все четыре исходных finding и дополнительный TITLE-AUDIT-1-R1 **закрыты** на final exact head `b67e14d81cd20f2e42264e3d25d336ee19db626b`. Мира coordinator whole-PR PASS и Лёва independent whole-PR PASS относятся к одному SHA; confirmed current-scope defects = 0. Review охватывает все девять файлов, а не только последний title delta. Evidence и границы — `stages/corrections/REVIEW.md`.

Current #354 остаётся Draft/open; owner Ready→merge при неизменном head. Код PR во время review не менялся. Product main drift относительно base только документационный; новые scope/implementation changes не добавлялись.

## Ограничения correction

- Fresh loader/list truth не должен проигрывать старому mutation ACK или local latch.
- Не добавлять version/timestamp/CAS/client cache/global store/automatic POST retry только ради UI freshness.
- Сохранить pending/error/explicit refresh, actor/target isolation и уже принятые Bookmarks cursor/session semantics.
- Title focus correction не меняет title mutation/data contract.

## Дальнейшие планы

- Moderation visibility: полный V1–V9 plan существует; implementation не активен.
- Forum structure/topic move: S0–S10 plan принят Мирой; implementation не активен.
