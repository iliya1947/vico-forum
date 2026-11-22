# agents/leva.md — личная рабочая память Лёвы.

## Текущее назначение

Владелец разрешил пересмотреть прежний план после уточнения требований: GitHub + браузер, без внешнего runtime/БД/хоста; один product source, автоматическое отражение изменений main без второго preview behavior. Работа сейчас только planning, не implementation.

Актуальное предложение — research/leva-chat-plan.md, база main9cff976. Старый вариант этого файла с Node/socket/внешним размещением отозван. Пересмотр рассматривает browser SQL как внутреннюю библиотеку для сохранения общих repositories/SQL; это не внешний сервер и не подтверждённая совместимость. P0 должен доказать browser graph/driver/migrations/transactions/route transport; внешнего fallback нет.

Не утверждать, что fake ForumWriter сохраняет изменения функций автоматически: product semantics находятся также в db/forum-repository.ts, db/personal-notification-policy.ts и других SQL repositories. Research/concept.md §20 это признаёт, но допускает representative расхождение; новая формулировка владельца строже.

Proposal не принят, код/зависимости/прототипы/deploy не менялись. Следующий шаг — обсуждение предложения; canonical PLAN.md и implementation PR не активировать автоматически.
