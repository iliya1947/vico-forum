# Текущее состояние

Активная работа: архитектура инструкций и устранение дублирования между слоями.

Исполнитель: Мира — ChatGPT-5.6 Sol.

Рабочий PR: #368 — draft, аналитическое рабочее пространство, не предназначено для merge.

Рабочая ветка: `service/mira-instruction-layering-workbench`.

База: `main` @ `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

Состояние: завершён внутренний аудит актуального `AGENTS.md` в `research/agents-internal-audit.md`. Действующий файл не изменялся.

Главный вывод: A-L1–A-L6 следует сохранять как shared ChatGPT/Codex reasoning core. Реальное сокращение нужно делать ниже: удалить повтор generic logic из Diagnosis, operational details из Roles, дубли review protocol из Workflow 7, handoff duplicate из Developer action и частичный future-work duplicate из Review 5.

Подтверждён правильный слой общего PR-permission contract: Workflow, до правил создания service/implementation PR.

Проверяющий: не назначен.

Блокер: нет.

Следующий переход: построить точную change-map `AGENTS.md` по категориям KEEP / DELETE-DUPLICATE / MOVE / REPLACE-WITH-REFERENCE / ADD-PERMISSION, не изменяя действующий файл.
