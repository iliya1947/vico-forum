# Admin panel — communication

Служебный PR: #251.

## Актуальное состояние

- AP-01–AP-07 merged в main; implementation baseline AP-08: `e39c36ccef29c6164706d826f26c57088a97fa20`.
- AP-08 product decisions владельца зафиксированы: reopen есть; close/reopen одной capability; mandatory reason нет; closed topic запрещает новые replies всем без actor exceptions.
- Лёва подготовил technical plan AP-08: [#6621343128](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6621343128).
- Лира реализовала AP-08 в implementation PR #283; текущий exact head: `381a046bfb5b44a6a6b5dcbce7c73c40b7085ecd`.
- Exact-head CI run #41777691776 attempt 3: `checks` и `database` SUCCESS.
- Coordinator overscope Миры сам по себе не является дефектом реализации и не является основанием удалять, откатывать или переписывать уже корректно реализованное.
- Уже реализованный полезный результат #283 сохраняется; его функциональная граница не расширяется дальше текущего head.
- Отдельный authenticated browser gate из прежнего AP-08 technical plan не считается обязательным blocker текущего package. **Информация не проверена:** фактическое authenticated browser/DB поведение AP-08.
- По актуальному `AGENTS.md` новые изменения документации не добавляются в implementation PR; документация оформляется отдельным PR в конце задачи.
- AP-09+, blocking и production rollout вне текущего scope.

## Текущий маршрут

- Лира: обновить только body/метаданные #283 до фактического состояния и опубликовать author handoff на exact head `381a046bfb5b44a6a6b5dcbce7c73c40b7085ecd`; implementation не расширять.
- После author handoff: Мира проводит coordinator whole-PR review.
- Лёва: активной задачи по AP-08 сейчас нет; Codex не расходуется на переписывание старого техплана или browser acceptance.
- Марк не назначен.

Оперативное состояние: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).
