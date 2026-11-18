# Workflow — пользовательские действия перед #320

## Общий канал

- Service PR: #342.
- Последовательность реализации: edit own topic title → Watch → bookmarks → mute/block → #320.
- #342 остаётся общим service PR и не merge в main.

## Завершённый этап 1 — edit own topic title

- Implementation #343 + docs #344: merged; reviews PASS.

## Активный implementation-этап 2 — Watch

- Исполнитель: Лира / ChatGPT-6.
- Draft implementation PR #345; stable review head ещё не объявлен.
- Лира продолжает UI/tests/connected acceptance и после stable exact head возвращает работу Мире.

## Опережающий planning-track — завершён

- Watch: технический план принят; implementation активен.
- Bookmarks: полный план принят; implementation ждёт завершения Watch.
- Mute/block: полный план принят полностью после owner decisions M1/M2.
- M1: topic Mute suppresses all future ordinary reply/mention notices from that topic; Watch/content unchanged.
- M2: directional user Block suppresses future ordinary notices from blocked actor and collapses that actor's ordinary TopicView posts for blocker; no publication/read ban.
- M3/M4/M6: окончательно приняты вместе с M1/M2.

## Следующий шаг

Лира завершает Watch #345 до stable exact head и STOP для coordinator whole-PR review Миры. После полного closeout Watch следующий implementation bounded-этап — Bookmarks; отдельного повторного архитектурного планирования не требуется, только сверка уже принятого плана с актуальным main.
