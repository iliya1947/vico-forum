# Сравнение current AGENTS.md и proposed draft

Источник current: `main@9cff976a9621d9fe5dfef28ea5367e390ff435b1`, blob `9037fc15fd2b5fbf8c86ee677d00198dfcfbe442`.

Proposed: `research/AGENTS.proposed.md` в рабочем PR #368.

## 1. Размер

| Метрика | Current | Proposed | Изменение |
|---|---:|---:|---:|
| Символы | 17720 | 17228 | -492 (-2.8%) |
| Слова/токены по whitespace | 2209 | 2143 | -66 (-3%) |
| Строки | 160 | 161 | 1 (0.6%) |

Метрика слов — простой whitespace count, не tokenizer модели; используется только для относительного сравнения текста.

## 2. Что удалено как повтор

1. Из Role Миры убран частный PR-запрет; его смысл перенесён в общий Workflow permission gate.
2. Из Role Лиры убрана independent-review eligibility; она остаётся в Review как общее правило независимости.
3. Из Role Лёвы убраны plan/review/escalation sequence; эти обязанности остаются в Workflow/Review.
4. Из Role Марка убрана operational формулировка «по умолчанию вне цикла»; условия подключения остаются в Workflow 9.
5. Из Diagnosis 2 удалён generic fact/hypothesis guard; он остаётся в `Логике`.
6. Из Workflow stacked mode удалено повторное полное описание intermediate/final review protocol; вместо него ссылки на `Проверка PR`.
7. Из Developer action 2 удалён handoff-повтор; нормативный handoff остаётся в Workflow 10.
8. Из Review 5 удалена повторная фраза о future work как основании для изменения; общий запрет остаётся в General 3.

## 3. Что добавлено

Добавлен один новый repository-level contract:

- новый PR любого типа — только после прямого разрешения разработчика;
- task/workflow/need/capability сами по себе permission не дают;
- назначенный service PR не меняется без прямой команды;
- после permission тип PR определяется Workflow.

Это закрывает реальную ошибку permission inference и заменяет частный запрет роли Миры.

## 4. Смысловые гарантии, которые не потеряны

- Shared reasoning A-L1–A-L6 сохранён полностью.
- Все пять Principles сохранены.
- Causal diagnosis сохранена.
- Sufficient-evidence stop for technical diagnosis сохранён.
- Fix-scope rules сохранены.
- Service/implementation/docs PR topology сохранена.
- Standard и stacked delivery semantics сохранены.
- Handoff contract сохранён.
- Current assignment precedence сохранён.
- Source-of-truth/doc-state architecture сохранена.
- CI labels/manual policy сохранена.
- Full review cycle и stacked checkpoint сохранены.
- Exact-head semantics сохранены.
- Finding classification сохранена.
- Review-vs-fix separation сохранена.
- Full documentation audit сохранён.

## 5. Смысловые изменения, а не только дедупликация

1. **PR permission становится строже и общим для всех агентов.** Current прямо запрещает Мире смену service PR и отдельно требует permission только для production/irreversible действий. Proposed вводит явный gate на создание любого PR.
2. **Role descriptions становятся декларативными.** Operational triggers теперь нормативно живут в Workflow/Review.
3. **Workflow становится ссылочным к Review.** Verification protocol не определяется дважды.

## 6. Риски draft

1. Формулировка общего PR gate может быть слишком широкой, если разработчик хочет, чтобы implementation PR после уже разрешённой задачи создавались автоматически без отдельного разрешения на каждый PR. Current instructions это явно не определяют. Поэтому final wording PR gate требует решения владельца.
2. Удаление «по умолчанию Марк вне цикла» из Role безопасно только пока Workflow 9 действительно однозначно говорит «Марк подключается только по явной необходимости». В proposed это сохранено.
3. Удаление future-work фразы из Review 5 сохраняет общий запрет в General 3, но делает review classification менее самодостаточной. Это допустимо по change-map, однако можно оставить короткую ссылку на General 3 вместо полного повтора.
4. Proposed не решает U↔A duplicate load для ChatGPT; это сознательно, потому что A-L нужен Codex.

## 7. Вывод

Draft действительно сокращает внутреннее дублирование `AGENTS.md` и одновременно добавляет один отсутствующий permission contract. Он не является радикальным переписыванием файла.

Но PR-gate пока нельзя считать готовым к применению без решения разработчика о **гранулярности разрешения**: отдельное разрешение на каждый новый PR или одно разрешение на задачу/цепочку PR.

Действующий `AGENTS.md` не изменён.
