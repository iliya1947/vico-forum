Этот файл хранит персональную рабочую память Миры по данной задаче.

# Мира

User journey v1 согласован владельцем и зафиксирован в `research/user-journey-v1.md`.

1. Отдельный ChatGPT Project — рабочая поверхность владельца.
2. Read-only запросы выполняются сразу.
3. Любой write: объяснить конкретную команду и последствия → запросить отдельное подтверждение → только после подтверждения dispatch.
4. Это conversational policy Project instructions; отдельный plugin/form/browser extension/cryptographic confirmation UI не требуется.
5. GitHub/Worker скрыты от обычного пользовательского потока.
6. Одноразовый Stage-6 setup допустим; ручная работа с GitHub на каждую команду недопустима.
7. Server-side canonical identity/permissions/resource/CAS/replay/History остаются обязательными и не заменяются Project instructions.
8. Предыдущий PLAN Лёвы требует нового plan/replan под этот UX.

Финальная сверка product contract завершена: PASS. Следующий отдельный подэтап после команды владельца — handoff Лёве на полный technical replan.

9. Последний product decision закрыт: обычная составная задача stop-on-first-failure; массовая задача продолжает остальные независимые targets; внутри составного target действует stop-on-first-failure.
10. Product contract сверён после D-20: противоречий между TASK, product scope, user journey, decisions и workflow не осталось; старый PLAN непринят и не является source of truth.
