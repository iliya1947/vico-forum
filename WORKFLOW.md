# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

Moderation visibility — **plan review PASS**. Следующий bounded-этап: B1.

## Baseline

- Current main: `6fa2a43b02c55515bbd46a0d74fe6cc0d4424caf`.
- #354 corrective package merged and closed.
- V-P1/V-P2/V-P3 — ранее приняты и не переоткрываются.
- V-T1/V-T2 — technical fit PASS на current main.
- Лёва завершил адаптацию V1–V9 к current main и разложил delivery на B1–B9.

## Mira plan review

Технических дефектов плана не подтверждено.

Ранее отмеченный `VIS-PLAN-R1` был ошибочно классифицирован как технический finding. Фактически это было несоответствие delivery topology действующему `AGENTS.md`, то есть процессный вопрос в зоне ответственности Миры.

Мира самостоятельно исправила service plan:
- B1–B9 остаются теми же техническими bounded-этапами;
- каждый B-stage выполняется в отдельном implementation PR;
- каждый этап проходит author self-check → Mira whole-PR → Leva independent review → owner merge;
- только после merge предыдущего этапа начинается следующий;
- техническое содержание V1–V9 и принятые продуктовые решения не изменены.

## Следующий этап

**Лира / ChatGPT-6** — реализовать только **B1 — schema/catalog/History foundation** в отдельном implementation PR от актуального main.

B1 scope:
- forward migration;
- visibility fields/CHECK/partial indexes;
- `forum.content.visibility.manage` + initial grants;
- AP-10 `admin.forum` mapping;
- typed Admin History + schema constraint/labels/Owner classification;
- clean migration/default-visible/catalog/constraint/snapshot/manifest/ACL checks;
- никаких route-exposed Hide/Restore и никакой реализации B2+.

После B1 author self-check и applicable checks — STOP Мире для whole-PR review.

## После moderation visibility

Forum structure/topic move → затем #320. #300/Stage6/general UI/UX не активированы.
