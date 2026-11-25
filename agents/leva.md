# agents/leva.md — личная рабочая память Лёвы по authentication lifecycle

## Текущий результат

AUTH-01 реализован Лёвой в #388 и принят coordinator checkpoint. AUTH-02a реализует Лена / GPT-6.2 в #389 на базе AUTH-01; независимую final review всей feature Лёва не выполняет из-за участия в AUTH-01.

2026-11-25 разрешён переданный вопрос технического плана A-01 на #389 head `ab2f09fc916279455d78bc2ca8a78c27eca72128`: native rate_limit cleanup несовместим с независимыми длинными Vico windows при обычном lastRequest. Исходное требование общего storage было ошибкой плана; введён explicit-expiry `auth_lifecycle_budget`, native limiter сохраняется. PLAN и stage PLAN исправлены. Полное bounded решение/основания/acceptance — `stages/AUTH-02a/STORAGE-DECISION.md`.

Это plan correction, не implementation или независимая acceptance. Native cleanup воспроизведён локально на unmodified 1.7.7 с controlled clock/in-memory adapter; PostgreSQL tests нового решения ещё не запускались. Реализация #389 не изменена, CI не повторялся.

## Следующий пакет по прямому решению владельца

После coordinator PASS текущего AUTH-02a Лёва становится исполнителем **AUTH-02b — mandatory verification/UI**. До PASS AUTH-02a этот пакет не активирован: не начинать его реализацию и не менять текущую работу Лены. При активации base будет stable head принятого AUTH-02a по stacked workflow.

## Продолжение

Лена продолжает своё назначение: A-01–A-04 единым пакетом и воспроизводимая диагностика preimage-read sequencing risk, затем stable head/author checks и checkpoint Миры. AUTH-02b/merge/external resources не разрешены. При новой технической эскалации нужен конкретный reproducer; не продолжать workaround chain и не подменять цель green CI.
