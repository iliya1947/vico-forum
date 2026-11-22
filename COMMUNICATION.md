# Общий контекст

Цель задачи — снизить когнитивную нагрузку и число тупых решений агентов, сохранив необходимые защиты и распределив их по правильным слоям.

Финальные exact drafts:
- User `ef1c0efd...`: 35 rules / 4999 chars / 52/52 guards / 15/15 current / 17/17 EXEC PASS;
- Project `fd815393...`: 16 rules / 2713 chars;
- AGENTS `170ef5ed...`: 58 rules / 16186 chars.

Three-layer consistency — PASS.
Transfer-readiness — PASS.

Подготовлен `research/instruction-transfer-package.md`, blob `e14aebdf362e6949caaf47131abe0f2de389bc44`.
Он содержит:
- exact User text;
- exact AGENTS text;
- exact Project text;
- порядок User → AGENTS → Project;
- отдельную постановку для mergeable AGENTS PR;
- invalidation rules;
- post-transfer completion condition.

Exact тексты внутри package сверены с тремя draft-файлами: совпадение полное.

Реальные User/Project instructions и `main:AGENTS.md` пока не менялись.

#368 остаётся аналитическим workspace и не предназначен для merge.
