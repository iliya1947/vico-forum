# Общий контекст

Цель задачи — не механически сжать инструкции, а снизить когнитивную нагрузку и число тупых решений агентов, сохранив все необходимые защиты и разнеся их по правильным слоям.

Текущий User draft: 35 rules / 4999 chars, blob `ef1c0efd10d2e95a5481476d91b336884d7d9c61`.
Подтверждено:
- 52/52 retained guards;
- 15/15 current User rules;
- 17/17 executability stress PASS;
- critical EXEC RISK = 0.

Текущие Project и AGENTS drafts не менялись:
- Project blob `fd8153931a306eb7e7c65a0e14db28dc20b437fe`;
- AGENTS blob `170ef5ed10715e416a376c75c3dae188ae0a3d24`.

Повторная three-layer consistency-проверка этих exact blobs дала PASS:
- межслойных противоречий 0;
- новых DELETE-SAFE inter-layer дублей 0;
- permission/authority/continuation blockers 0.

Подробности: `research/three-layer-35-final-consistency.md`.

Transfer package пока не готовится: следующий gate — повторный transfer-readiness именно текущих exact blobs.

Рабочий PR является временным аналитическим пространством и не предназначен для merge.
