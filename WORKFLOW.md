# WORKFLOW.md — текущее оперативное состояние аудита stale/legacy хвостов.

## Current state

- Service task: stale/legacy consistency audit.
- Current main at service creation: `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.
- Assigned agent: **Мира-2**.
- Active stage: **systematic audit only**.
- Implementation: **not authorized**.
- Current blocker: none.

## Next action

Мира-2:
1. сверяет актуальный `main`;
2. полностью читает актуальный `AGENTS.md` и локальный `RULES.md`;
3. читает `TASK.md`, этот `WORKFLOW.md`, затем `PLAN.md` и `COMMUNICATION.md`;
4. выполняет полный first-stage audit по `TASK.md`;
5. сохраняет единый реестр в `research/stale-registry.md` и краткий итог в `WORKFLOW.md`;
6. STOP без исправлений и implementation PR.

Developer receives only short status; technical context stays in this service PR.
