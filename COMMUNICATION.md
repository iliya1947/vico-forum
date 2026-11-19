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

#354 merged в main как `6fa2a43b02c55515bbd46a0d74fe6cc0d4424caf` после Mira+Leva PASS одного exact head. Все четыре исходных finding и TITLE-AUDIT-1-R1 CLOSED; current-scope defects = 0.

## Текущий этап

Продуктовые V-P1/V-P2/V-P3 уже ACCEPTED (D-08); их нельзя повторно открывать из-за утраты записи при migration. V-T1/V-T2 technical fit PASS. Лёва завершил адаптацию полного V1–V9 к main6fa2a43 и разложил один visibility PR на checkpoints B1–B9: `stages/moderation-visibility/PLAN.md`.

Действующие важные адаптации: current Watch/Bookmarks/Mute/Block и unavailable own/inbox projections; новая visibility capability в existing AP-10/admin/History/Owner classification; atomic publication/recovery guards; parent-topic lock для новых body translation plans; public asset gate до bucket. Эти детали уже входят в stage plan и не являются новыми product forks.

Feature implementation/tests/CI/browser visibility acceptance не выполнялись. Следующий шаг — checkpoint Миры на полноту плана, затем Лира только B1; current assignment не запускает implementation автоматически.

## Дальнейшие планы

- Moderation visibility: current V1–V9/B1–B9 готов к plan checkpoint; implementation не активен.
- Forum structure/topic move: S0–S10 plan принят Мирой; implementation не активен.
