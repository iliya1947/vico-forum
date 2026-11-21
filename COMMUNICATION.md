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


## Конкретные симптомы текущей архитектуры #322

Непосредственно перед созданием этой задачи review #322 на exact head `e23c0e0ade79e786e29b4057af1dfd292814e34e` подтвердил два current-scope дефекта, характерных именно для дублированной preview-модели:

1. **Ownership drift.**
   Разные preview-проекции одной темы могли расходиться по `authorId`: UI показывал ordinary User author-only controls на чужой теме, тогда как action-layer знал фактического автора и затем отклонял действие. В Help preview роль User местами вообще превращала любую открываемую Help-тему в тему Alex.

2. **Route/runtime drift.**
   Переиспользуемый Complaint UI вызывает production activity endpoint, но preview-router/interceptor не имел соответствующей локальной реализации. В результате static preview пытался отправлять backend-like request в GitHub Pages origin, а ошибка тихо проглатывалась.

Эти findings не доказывают автоматически конкретное новое решение, но показывают цену поддержки второй реализации product contracts.

## Размер текущего дублирования

На сравнении reviewed #322 с тогдашним main основная preview-реализация добавляла примерно:

- `app/ui-preview/preview-app.tsx`: **+7 488 / -708 строк**;
- `app/ui-preview/preview-app.test.tsx`: **+3 928 / -67 строк**.

То есть preview уже содержит тысячи строк собственной route/action/state logic и соответствующих тестов. Это существенный фактор при сравнении стоимости дальнейшего латания с переходом на production logic + substituted infrastructure.

## Практический образ целевой структуры

Не как предписанный технический layout, а как концептуальный ориентир:

```text
ui-preview/
  fixtures/ or database.ts   # representative users/topics/posts/state
  infrastructure/            # test implementations of production capabilities
  runtime.ts                 # one composition root
  preview.tsx                # role/state/locale/viewport controller
```

Ключевой принцип: **fixture state может быть большим; вторая реализация forum behavior — нет**.
