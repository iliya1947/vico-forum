# Лёва — Codex-6.1 Sol

## Назначение

Подготовить короткий executable technical plan функционального preview-стенда.

## Требуемый результат

Определить минимальную корректную topology и delivery path, чтобы владелец через текущий GitHub Pages entry мог перейти к изолированному real-runtime Vico Forum и вручную проверять уже реализованные guest/user/privileged flows.

План должен определить:
- runtime/data/auth isolation от production;
- способ воспроизводимого обновления стенда из repository revision;
- Pages → functional runtime entry;
- test identities/fixtures для применимых ролей;
- какие реализованные функции включаются в первую рабочую версию;
- обязательные automated/browser checks и acceptance;
- границы implementation PR.

Не возобновлять Stage 6 production rollout, не подключать production private/write capability, реальные Google/provider/Queue integrations и не дублировать forum domain logic в static preview.

После публикации плана остановиться; implementation не начинать.
