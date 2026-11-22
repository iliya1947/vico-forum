# Deep dedup pass — current-based drafts

Цель: после консервативного wording-pass проверить, есть ли ещё безопасное сокращение за счёт воды и межслойного дублирования без изменения самостоятельных требований.

## Применённые сокращения

1. User: удалён служебный заголовок `# Пользовательские инструкции`. Поле Custom Instructions уже задаёт контекст; требования не изменены.
2. Project: удалён служебный заголовок `# Инструкции проекта`.
3. Project: повтор exact mapping четырёх имён/моделей заменён ссылкой на раздел `Роли` актуального `AGENTS.md`.
   - Project rule 2 уже требует получить из `main` и полностью прочитать актуальный `AGENTS.md`;
   - само требование использовать закреплённые имена при идентификации/обращении/упоминании сохранено;
   - требование сохранять точное техническое обозначение модели сохранено;
   - источник mapping теперь один — `AGENTS.md`.

## Почему остальные похожие места не удалены

1. User factual/verification guards ↔ AGENTS Logic/Diagnosis: похожий смысл, но User действует глобально для ChatGPT, AGENTS — shared contract для ChatGPT/Codex. Удаление из AGENTS потеряет Codex coverage.
2. User самостоятельная диагностика ↔ AGENTS Diagnosis/Developer action: AGENTS содержит project-specific permissions, developer authority и diagnostic workflow; это specialization, не дубль.
3. Project current-Stage/future-work ↔ AGENTS Review finding classification: Project rule относится к проблемам, найденным ChatGPT в работе Codex вообще; AGENTS rule — к review findings. Scope не идентичен.
4. Project Codex prompt guards ↔ User «не добавляй ненужные инструкции»: Project правила задают более узкий contract для prompts и не являются полным дублем.
5. Project «рассуждай от цели» / context check ↔ AGENTS Logic 1: Project требует это всегда/перед ответом, AGENTS — перед существенным выводом или самостоятельно выбранным действием. Частота применения различается.
6. Project bounded STOP ↔ User `...`: это не дубль, а совместимые правила; `...` является явной командой продолжения.
7. AGENTS General verification guards ↔ User verification guards: AGENTS нужны Codex и не могут опираться только на User layer.

## Объём после deep pass

- User: 1159 chars / 164 words / 15 rules.
- Project: 2680 chars / 364 words / 18 rules.
- AGENTS: 16082 chars / 2015 words / 64 rules.
- Total: **19921 chars / 2543 words / 97 rules**.

От исходного current baseline:
- chars: 22363 → 19921 = **-2442 (-10.92%)**;
- words: 2837 → 2543 = **-294 (-10.36%)**;
- numbered requirements: 97 → 97;
- новых требований: 0.

## Вердикт

Подтверждённая безопасная дополнительная дедупликация исчерпана на текущем этапе. Дальнейшее сокращение уже потребует либо изменения области/модальности существующих правил, либо архитектурного решения о том, какие требования вообще нужны — это не conservative compression и относится к следующей задаче, а не к текущему pass.
