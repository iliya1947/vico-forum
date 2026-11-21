# COMMUNICATION.md — общий актуальный контекст команды.

## Почему задача выделена отдельно

В ходе проверки #322 выяснилось, что preview вырос в крупную самостоятельную реализацию поведения форума. Это создаёт риск двойной product logic: production и preview должны вручную поддерживать одинаковые ownership, permissions, routes/actions и состояния.

Разработчик предложил альтернативную модель: подключать preview максимально напрямую к текущему `main`, хранить representative users/topics/posts/state в репозитории и подключать тестовую инфраструктуру через одну composition boundary.

## Проверенный технический ориентир

В current main уже используются React Router contexts как dependency-injection seams для ряда capabilities:

- `forumReaderContext` / `forumWriterContext`;
- auth runtime/session;
- authorization + trusted Owner binding;
- complaint submission;
- Owner profile/history/lifecycle.

Это подтверждает, что production-код уже не полностью жёстко связан с конкретной инфраструктурой.

Это **не доказывает**, что весь production router можно без изменений исполнять на static GitHub Pages. Server-only imports, runtime boundaries и внешние capabilities должны быть исследованы уже после/в рамках проверки концепции.

## Важная граница

Не превращать первый этап в преждевременный технический план. Сначала определить желаемую системную модель и её требования; только после решения разработчика проектировать конкретную реализацию.
