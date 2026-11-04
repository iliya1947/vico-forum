# Мира — ChatGPT-5.6 Sol

## AP-08 product decisions

Владелец утвердил модель AP-08:

1. Reopen поддерживается.
2. Close/reopen используют одну capability.
3. Причина не обязательна ни для close, ни для reopen.
4. Closed topic запрещает новые replies всем без исключений; для нового reply тему нужно сначала reopen.

Сохраняются permanent invariants из `docs/ADMIN_PANEL.md`: closure не меняет solved/best answer/duplicate/messages; closed-state и reply admission authoritative/concurrency-safe; committed publication replay сохраняется без нового reply/event; implicit moderator bypass отсутствует.

## Следующий шаг

Лёва готовит bounded technical plan AP-08 на current main `e39c36ccef29c6164706d826f26c57088a97fa20`. После его handoff Мира проверяет план; implementation Лирой начинается только после coordinator approval.
