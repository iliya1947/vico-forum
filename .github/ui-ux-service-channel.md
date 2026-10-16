# Vico Forum — общий служебный канал

Этот файл содержит только актуальное утверждённое состояние команды по правилам текущего `AGENTS.md`. История прежнего рабочего журнала сохранена в Git history служебного PR и не дублируется здесь.

## Активная реализация

- Implementation PR: #215 — Editor 2.0.
- Stable exact head: `e47436e7506c4c42f91a16aed2005bd07bb39ab5`.
- Runtime/code head коррекции compact toolbar и security-only navigation: `1fed72195536bc3e51967a68a4248c2acb7d21a5`.
- `1fed721… → e47436e…` меняет только `PROJECT_STATE.md`; runtime не меняется.
- Exact current-head CI #38827940846: `checks` SUCCESS, `database` SUCCESS.

## Принятое техническое состояние

- Independent `forum.attachmentSecurity.read` сохраняется как отдельная code-backed capability.
- Security-only navigation на bare `/:locale/attention` исправлена: default route ведёт в разрешённый Security → Attachments, explicit forbidden Signals остаётся запрещённым.
- Compact in-page mobile toolbar correction прошла real Chromium technical re-test на EN/LTR и HE/RTL, 320px/390px, Simple/Advanced: overlap/interception не воспроизведены, обязательные controls доступны; fenced-code pointer Indent/Outdent работает, prose не изменяется.
- Предыдущая работа отдельного аудита тестовой системы не входит в PR #215; случайный test-only Package 3 был удалён, current head снова `e47436e…`.

## Pre-review readiness

Новый последовательный review-цикл по актуальному `AGENTS.md` **ещё не начат**.

До его старта нужно закрыть применимые pre-review gates:

1. Owner visual acceptance финального Editor 2.0 состояния.
2. Синхронизировать фактический `PROJECT_STATE.md`/acceptance evidence с уже выполненным browser re-test и итогом owner acceptance, не меняя runtime без отдельной причины.
3. Убедиться, что exact implementation head после этих действий остаётся стабильным и применимые CI/checks валидны.

## Последовательность проверки после readiness

Стабильный exact head проверяется строго по очереди:

1. ChatGPT-5.6 Sol.
2. ChatGPT-6.
3. Codex-5.6 Sol.
4. Codex-6.1 Sol.

Во время этого цикла implementation не исправляется. Первый finding не останавливает проверку. До завершения всех предусмотренных проверок findings не публикуются в этом общем файле и не передаются следующим проверяющим.

После завершения проверок разработчик отдельно даёт команду перенести результаты в служебный PR для согласования.

## Owner decisions / ограничения

- Не запускать отдельный GitHub `Codex Code Review` для PR #215. Проверки Codex-5.6 Sol и Codex-6.1 Sol выполняются как этапы четырёхагентного процесса, а не как старый финальный Code Review gate.
- Merge выполняет только разработчик.
- Stage 6 external infrastructure/deployment не возобновляется без отдельного указания владельца.
- Во время review-цикла проверка и исправление разделены: изменения implementation допускаются только после завершения проверки и подтверждения current-Stage defect.

## Следующий шаг

Закрыть pre-review readiness PR #215, начиная с owner visual acceptance финального Editor 2.0 состояния.
