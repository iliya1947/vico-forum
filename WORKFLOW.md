# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

Moderation visibility — **plan review HOLD**. Implementation ещё не активирован.

## Baseline

- Current main: `6fa2a43b02c55515bbd46a0d74fe6cc0d4424caf`.
- #354 corrective package merged and closed.
- V-P1/V-P2/V-P3 — ранее приняты и не переоткрываются.
- V-T1/V-T2 — technical fit PASS на current main.
- Лёва завершил адаптацию V1–V9 к current main и разложил delivery на B1–B9.

## Mira plan review finding

**VIS-PLAN-R1 — delivery topology противоречит действующему AGENTS.md.**

Лёва зафиксировал: один Draft implementation PR для B1–B9, где B1–B9 названы bounded checkpoints и после каждого Лира должна STOP.

Действующий `AGENTS.md` требует:
- отдельный implementation PR для каждого завершённого bounded-этапа;
- coordinator whole-PR review stable exact head каждого завершённого bounded-этапа;
- после Mira PASS — independent review того же head;
- owner merge;
- только затем следующий bounded-этап стандартного цикла.

Для moderation visibility нет owner-исключения, аналогичного специальному решению для corrective #354.

Это реальный дефект текущего плана, потому что первый же B1 был бы выполнен в неправильной delivery/review topology.

## Что проверено и не является finding

Остальная адаптация V1–V9 по scope/fit не выявила нового подтверждённого конфликта:
- принятые V-P1/V-P2/V-P3 сохранены;
- schema/catalog/AP-10/History fit соответствует current main;
- lock ordering остаётся локальным и не вводит глобальный mutex;
- public/private projections, retained state, assets/translations/Complaints boundaries не расширяют принятый продуктовый scope;
- acceptance matrix покрывает реальные PG/browser/privacy/cache/race границы.

## Назначение и следующий шаг

**Лёва / Codex-6.1 Sol** — исправить только delivery/checkpoint topology плана так, чтобы она соответствовала действующему `AGENTS.md`, сохранив техническое содержание и зависимости V1–V9.

Не переоткрывать V-P1/V-P2/V-P3 и не перепроектировать техническую модель без нового фактического конфликта.

После исправления — STOP Мире для повторной проверки плана. Лиру к B1 пока не подключать.

## После moderation visibility

Forum structure/topic move → затем #320. #300/Stage6/general UI/UX не активированы.
