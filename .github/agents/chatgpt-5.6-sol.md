# Мира — ChatGPT-5.6 Sol

## 2026-11-18

Приняла задачу из #300.

Зафиксировала отдельный scope «редактирование заголовка собственной темы», создала рабочий канал и передала следующий этап Лёве на техническое планирование.

Ключевые сохранённые границы: title — отдельная immutable revision/translatable unit; source-locale correction не является general edit right; ownership/identity должны подтверждаться server-side; #320 и #331 не входят в задачу.

Реализация не начата.


## 2026-11-18 — scope/fit review плана Лёвы

E1 принята: отдельная защищённая capability требует нового catalog key и forward migration по действующему authorization contract.

Отклонён новый 5-секундный title-edit cooldown: он не следует из текущего published-post editing поведения и был бы новой product policy без необходимости.

Сокращён чрезмерный recovery/test scope: сохраняются CAS, buffer-on-conflict и реальные изменённые integration boundaries; отдельная mini-recovery subsystem не требуется.

E2 вынесена владельцу: распространять ли существующее `posts.edit` restriction на title edit. Рекомендация — да, как Own content без нового restriction key. Лира до решения не активируется.
