# Общий контекст

Цель задачи — не механически сжать инструкции, а снизить когнитивную нагрузку и число тупых решений агентов, сохранив необходимые защиты и разнеся их по правильным слоям.

Текущий User draft: 35 rules / 4999 chars, blob `ef1c0efd10d2e95a5481476d91b336884d7d9c61`.
Подтверждено:
- 52/52 retained guards;
- 15/15 current User rules;
- 17/17 executability stress PASS;
- critical EXEC RISK = 0.

Текущие Project и AGENTS drafts:
- Project blob `fd8153931a306eb7e7c65a0e14db28dc20b437fe`, 2713 chars;
- AGENTS blob `170ef5ed10715e416a376c75c3dae188ae0a3d24`.

Three-layer consistency — PASS, conflicts 0.

Повторный transfer-readiness текущих exact blobs — PASS:
- официальный Plus limit Custom Instructions: 5000, User = 4999;
- Project draft короче текущего активного Project instruction set: 2713 < 3341;
- актуальный `main:AGENTS.md` не drift’нул относительно #368 current snapshot;
- безопасный порядок: User → AGENTS → Project.

Подробности: `research/instruction-transfer-readiness.md`.

Следующий отдельный этап — transfer package. Реальные instruction sources без прямой команды разработчика не меняются.

Рабочий PR является временным аналитическим пространством и не предназначен для merge.
