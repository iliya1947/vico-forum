# Transfer readiness — final instruction drafts

## Exact frozen candidates

1. `USER_INSTRUCTIONS.draft.md`
   - blob: `df24c04fea7da5ceb0dc6fd7869e25485fae15c6`
   - 42 numbered rules
   - 1066 whitespace words
   - 8364 characters

2. `PROJECT_INSTRUCTIONS.draft.md`
   - blob: `fd8153931a306eb7e7c65a0e14db28dc20b437fe`
   - 16 numbered rules
   - 347 whitespace words
   - 2713 characters

3. `AGENTS.draft.md`
   - blob: `170ef5ed10715e416a376c75c3dae188ae0a3d24`
   - 58 numbered rules
   - 2017 whitespace words
   - 16186 characters

Финальная consistency-проверка этих трёх drafts: PASS.

## User Custom Instructions — BLOCKED

Официальный OpenAI Help Center указывает лимит global Custom Instructions:
- Free/Go: 1500 characters;
- Plus/Pro/Enterprise/Business/Education: 5000 characters.

Текущий User draft: **8364 characters**.

Следовательно, этот draft **не помещается** в global Custom Instructions и не готов к прямому переносу.

Нельзя просто обрезать текст: User draft содержит 52 semantic guards, и сокращение должно пройти новый coverage/consistency pass.

## Project Instructions

Официальный OpenAI Help Center подтверждает маршрут:
`Project → ••• → Project settings → instructions`.

Project instructions действуют только внутри проекта и override global custom instructions.

Найденная официальная документация не указывает точный character limit Project Instructions.

**Информация не проверена:** максимальный размер поля Project Instructions.

Текущий Project draft: 2713 characters.

## AGENTS.md

`AGENTS.draft.md` переносится не через ChatGPT settings, а в repository `main:AGENTS.md`.

Рабочий PR #368 — аналитическое workspace и **не предназначен для merge**.

Поэтому финальный AGENTS должен переноситься отдельным repository change из актуального `main`, сохраняя обычный review/merge process проекта. Создавать такой PR до прямой команды разработчика не нужно.

## Безопасный порядок переноса

### 1. User layer — первым
Сначала довести User draft до фактического лимита Custom Instructions и установить его как global User instructions.

Причина: Project draft уже удалил несколько общих guards, рассчитывая на User layer. Установка Project draft поверх старого User layer создаст временный semantic gap.

### 2. AGENTS layer — вторым
После User layer перенести финальный `AGENTS.draft.md` в repository `AGENTS.md` отдельным mergeable PR от актуального `main`.

Current AGENTS уже содержит Stage classification и Roles mapping, поэтому это не блокирует первый шаг, но финальная версия должна быть в `main` до окончательной фиксации Project layer.

### 3. Project layer — последним
После установки User layer и merge финального AGENTS заменить Project Instructions на `PROJECT_INSTRUCTIONS.draft.md`.

Это гарантирует, что все вынесенные из Project дубли уже реально существуют в слоях, на которые Project draft ссылается.

## Технический маршрут UI

### Global Custom Instructions
OpenAI: `Settings → Personalization → Custom Instructions`.

### Project Instructions
OpenAI: открыть проект → `••• → Project settings` → instructions.

Эти два account/project settings я из этого рабочего окружения изменить не могу.

## Итог

1. User transfer readiness — **BLOCKED**: 8364 > 5000 characters.
2. Project semantic readiness — **PASS**, точный UI limit не подтверждён официальным источником.
3. AGENTS semantic readiness — **PASS**, перенос требует отдельного repo PR.
4. Реальные sources не изменены.
5. Следующая обязательная подзадача: сократить User draft до ≤5000 characters без потери 52 semantic guards, затем повторить User coverage + three-layer consistency.
