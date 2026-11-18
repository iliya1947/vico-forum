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

## Опережающий planning-track

- Bookmarks: полный план завершён и принят; implementation не активирован.
- Mute/block: полный план Лёвы завершён; scope/fit Миры выполнен частично.
- M3/M4/M6 и технические границы приняты условно.
- Блокер Mute/block planning closeout: owner product decisions M1/M2.

## Требуемое решение владельца

1. M1: принять рекомендованный **Mute темы = подавлять все ordinary reply/mention notices из этой темы**, не меняя Watch и контент; либо выбрать альтернативу.
2. M2: принять рекомендованный **Block пользователя = directional notification filter + collapsed posts для blocker**, без запрета публикации/чтения; либо выбрать более сильный publication block.

После M1/M2 Мира фиксирует окончательный Mute/block scope. Реализация Mute/block всё равно ждёт своей очереди после Watch → Bookmarks.
