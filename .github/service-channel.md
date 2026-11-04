# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-07 merged в `main`. Current main: `e39c36ccef29c6164706d826f26c57088a97fa20`.
- Следующий bounded package — **AP-08: topic closure/reopen**.
- Product gate AP-08 закрыт решением владельца:
  1. **Reopen поддерживается.**
  2. **Close и reopen используют одну code-backed capability.**
  3. **Обязательная причина не требуется** ни для close, ни для reopen.
  4. **Closed topic не принимает новые replies ни от кого**, включая администратора/модератора; чтобы ответить, тему нужно сначала reopen. Actor exceptions нет.
- Уже утверждённые invariants сохраняются: close/reopen не меняют solved/best answer/duplicate relationships и не удаляют сообщения; persisted closed-state и reply admission должны иметь одну authoritative concurrency boundary; reply, уже committed по publication receipt, при replay должен вернуть прежний результат без нового reply или duplicate History event.
- AP-08 не должен вводить implicit moderator bypass, второй RBAC или admin-only mutation semantics; точный технический способ определяет Лёва по текущему main.
- AP-09 Users, AP-10 blocking, AP-11 closeout и production rollout пока не начинать.

## Назначения и следующий шаг

- Мира — product scope/gate AP-08 закрыт.
- **Лёва — следующий агент: bounded technical planning AP-08 на актуальном main.**
- Лира — implementation только после coordinator review/утверждения технического плана.
- Марк — не назначен.

### Задача Лёве

Подготовь bounded technical plan AP-08 для topic close/reopen по актуальному `main`.

Требуемый результат:
- определить минимальный scope реализации closure/reopen;
- привязать его к существующим forum mutation, authorization, reply/publication, History и admin/public Quick actions boundaries;
- определить необходимые schema/migration/catalog/grant изменения только если они действительно требуются;
- определить concurrency/CAS/replay/error/privacy/localization/UI/test acceptance для этого пакета;
- не включать AP-09+, blocking, structural forum CRUD, production rollout или несвязанный рефакторинг.

Готовность плана: он должен быть достаточно конкретным, чтобы Лира могла реализовать AP-08 отдельным bounded implementation PR без дополнительных продуктовых решений.

Оперативное состояние: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).
