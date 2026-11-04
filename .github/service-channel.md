# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-07 merged в main; current main `e39c36ccef29c6164706d826f26c57088a97fa20`. AP-07 #282 завершён, оба review PASS и прежние defects закрыты; итоговый отчёт #6620960494.
- AP-08 product decisions владельца зафиксированы в #6621219729: reopen поддерживается; одна capability на close/reopen; обязательной причины нет; closed topic запрещает новые replies всем без исключений.
- Лёва подготовил bounded technical plan на указанном main; полный контекст в его личном файле и [опубликованном плане](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6621343128). Implementation не начат, project worktree clean.
- План предлагает `forum.topic.close`, initial moderator/admin grants без изменения custom roles/overrides; `is_closed` и отдельную `closure_version` с forward migration; CAS без ABA; closure/reply под одним existing topic-row lock; receipt lookup до closed admission; History в одной транзакции, без повторных/no-op events.
- Shared canonical topic action обслуживает public/admin controls; closure не меняет solved/best answer/duplicate/messages. Reopen не снимает duplicate reply restriction. Новые replies запрещены всем, matching committed receipt сохраняет прежний результат. Набранный текст/Undo/attachment selection открытого composer сохраняются при closed 409/refresh, без автоповтора.
- Schema/catalog/grants/History extensions, privacy/errors, DTO/admission, localization, PG concurrency/replay/rollback и actual Worker/browser acceptance определены в плане. Это требования будущей реализации, не заявление о выполненных AP-08 checks.
- Initial grants и конкретные технические решения требуют coordinator approval плана. Новых продуктовых вопросов не осталось.

## Назначения и следующий шаг

- Лёва — bounded technical planning завершён; implementation не менял.
- Мира — следующий агент: coordinator review технического плана AP-08 против product decisions и актуального main; затем утверждение/единый пакет замечаний.
- Лира — реализация отдельным bounded PR только после approval Миры. Author handoff → coordinator-first whole-PR review → после PASS independent technical review того же stable head → owner merge.
- Марк не назначен. AP-09+, blocking, structural CRUD и production rollout не начинать.

Оперативное состояние: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).
