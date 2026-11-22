# Внутренние дубли AGENTS — deep pass

Scope: текущий `AGENTS.draft.md` после current-based wording-pass. На этом этапе draft не изменяется.

Критерий delete-safe: повторяемая часть уже полностью обеспечивается другим правилом **внутри AGENTS** с той же нормативной силой и применимой областью; удаление повторного текста не уменьшает coverage.

## Подтверждённые delete-safe повторы

1. **Roles 5 / Марк — хвост `по умолчанию в рабочий цикл не включается`.**
   - Workflow 8 уже устанавливает, что Марк подключается только по явной необходимости и перечисляет допустимые случаи.
   - Сохраняется роль: `Марк — резервный независимый проверяющий`.
   - Тип: partial duplicate.

2. **Roles 6 / Лёва — operational duties.**
   - planning до реализации уже задан Workflow 6;
   - independent technical review уже задан Review 1;
   - реализация только при technical escalation уже задана Workflow 8.
   - В Roles достаточно оставить identity/high-level role: `главный архитектор и технический руководитель`.
   - Тип: multi-section duplicate.

3. **Diagnosis 2 — `Отделяй подтверждённые факты от гипотез`.**
   - Полностью покрыто Logic 2: факты/условия отделять от предположений, неизвестное не выдавать за факт.
   - Cause-specific запрет `не выдавай правдоподобное объяснение за установленную причину` остаётся.
   - Тип: partial duplicate.

4. **Diagnosis 4 — хвост `не перекладывай доступную диагностику`.**
   - Общий запрет перекладывать на разработчика доступные агенту проверки/действия уже задан Developer action 2.
   - Уникальное более сильное diagnostic requirement остаётся: выполнить все доступные/разрешённые проверки до привлечения разработчика и привлекать только при необходимости полномочий/выбора/недоступного действия.
   - Тип: partial duplicate.

5. **Workflow 7 — повтор checkpoint/final-review mechanics.**
   - промежуточный self-check/CI/coordinator PASS/no independent review/no merge уже задан Review 2;
   - финальный full review cycle уже задан Review 1;
   - Workflow 7 должен хранить только stack topology, synchronization нижних/верхних ступеней и final assembly, со ссылками на Review.
   - Тип: large reference-dedup.

6. **Developer action 2 — handoff sentence.**
   - `Если продолжает другой агент, заранее зафиксируй его задачу и нужный контекст в служебном PR` полностью покрыто Workflow 9.
   - Общая обязанность сначала выполнять доступный следующий шаг и не перекладывать доступные действия на разработчика остаётся.
   - Тип: full sentence duplicate.

7. **Review 1 — `Марк — только по отдельному назначению`.**
   - Workflow 8 уже задаёт explicit-need activation Марка и случаи использования.
   - Review 1 сохраняет standard reviewer = Лёва и independence requirements.
   - Тип: partial duplicate.

8. **Review 6 — plan-change clause.**
   - `Технический вопрос, требующий изменения технического плана, решает Codex-6.1 Sol` уже покрыт Scale fix 3: при необходимости пересмотра technical plan вопрос передаётся Codex-6.1 Sol.
   - В Review 6 остаются reconciliation через service PR и developer-choice между несколькими технически допустимыми вариантами.
   - Тип: full clause duplicate.

9. **Review 8 — intermediate checkpoint semantics.**
   - coordinator PASS → только следующая ступень, no independent review/no merge уже задан Review 2.
   - В Review 8 достаточно ссылки на п.2 и уникального уточнения, что checkpoint не означает готовность всей feature.
   - Тип: partial reference-dedup.

## Снятая ошибочная классификация

**Workflow 11 не является подтверждённым внутренним дублем AGENTS.**

Причина исправления:
- часть его чтения пересекается с Workflow 3;
- но полный маршрут чтения задаётся локальным `RULES.md`, то есть доказательство опиралось на другой файл;
- следовательно, это нельзя считать delete-safe **внутренним** дублем AGENTS без отдельного cross-file анализа.

Workflow 11 не входит в текущую карту внутренних удалений.

## Не признано delete-safe

1. Logic 3 ↔ Diagnosis 2: alternative causes/последующие ограничения — diagnostic specialization, не удалять.
2. Principle 1 ↔ Logic 2/4: provenance другого агента и обязанность независимой проверки оснований — отдельный guard.
3. Principle 2 ↔ Review: mutual check любого handoff шире PR-review.
4. Diagnosis 4 core ↔ Developer action 2: diagnostic rule сильнее — требует **всех** доступных/разрешённых проверок до привлечения разработчика.
5. Review 5 ↔ Review 7: первое классифицирует findings/scope, второе определяет, что реально исправлять, и отделяет review от fix.
6. General 3 ↔ Review 5: future Stage restriction шире и иначе scoped.
7. Full audit 2–3 ↔ General 2/5: full-audit режим имеет отдельный trigger и критерий полноты.
8. Roles Developer/Ari/Mira/Lira: high-level role contracts содержат уникальный смысл и не удаляются.

## Exact-проверка кандидатов

Последующая проверка каждого изменения по trigger/scope/modality/authority сняла ещё два ложных кандидата:
- Review 1 / Марк: `отдельное назначение` не эквивалентно `явной необходимости`;
- Review 6 / plan change: Review rule шире по scope, чем Scale fix 3.

Подтверждённый набор: **7**.

Evidence: `research/agents-internal-dedupe-exact-check.md`.

## Потенциальный результат применения только 7 подтверждённых сокращений

- AGENTS draft: **16082 → 15363 chars**;
- words: **2015 → 1923**;
- экономия: **719 chars / 92 words**;
- numbered rules: **64 → 64**;
- новых требований: 0.

## Вывод

После exact-проверки подтверждено **7** внутренних delete-safe повторов/хвостов. Workflow 11, Review 1/Mark и Review 6/plan-change исключены. Draft не изменялся.
