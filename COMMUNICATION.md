# COMMUNICATION.md — общий актуальный контекст, факты, ограничения, зависимости и незакрытые вопросы команды

## Существенные текущие факты

1. Текущий `main` для revalidation: `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
2. Better Auth в текущем project baseline — `1.7.7`; email/password и Google foundation уже существуют.
3. Email verification, transactional email sender и password recovery в текущем `main` по-прежнему не реализованы.
4. SET-05 уже реализует own linked-method view, смену существующего credential password и управление собственными sessions.
5. Automatic/implicit account linking отключён; explicit Google linking существующего authenticated user уже существует.
6. SET-02 уже имеет независимые Owner-controlled flags новых Google и email/password registrations.
7. После старого плана #320 в `main` появились AccountState lifecycle/enforcement, exact-Owner deactivation, Accounts & authentication / Security monitoring, auth facts, bounded attempt telemetry и source-aware History. Новый технический план обязан учитывать эти существующие границы.
8. Super-admin SA-01–SA-08 и Task 6 уже завершены в repository/local-CI; Stage 6 external integration остаётся paused.
9. `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md` и `docs/auth/AUTHORIZATION.md` актуализированы относительно более раннего состояния; `docs/SETTINGS.md` не менялся с предыдущей проверки.
10. Постоянная документация всё ещё отражает verification/recovery как отложенные функции; текущее owner-решение этой задачи меняет целевое будущее состояние, но source-of-truth обновляется только после фактической реализации отдельным docs PR.

## Текущие ограничения

1. Никакой implementation до повторной проверки плана и нового полного технического планирования.
2. Никакой external activation до явного возобновления Stage 6 владельцем.
3. Общий security PR не является служебным каналом этой задачи; security findings используются только как релевантные входные данные.
4. Старый AUTH-01 technical plan доступен в Git history, но не является текущим планом исполнения.

## Незакрытое

1. Повторно проверить AUTH-01–AUTH-07 против текущих AccountState/Monitoring/History/auth-runtime границ.
2. После этого определить полный технический план и режим поставки всей задачи.
