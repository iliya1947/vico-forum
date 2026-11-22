# agents/leva.md — личная рабочая память Лёвы.

Владелец подтвердил: preview — общий UI/routes/application interactions main, только GitHub/Actions/Pages и браузер; real save необязателен. Разрешено simulated «успешно сохранено» без изменения baseline/после reload. Не требовать SQL/transaction/backend parity из-за собственного прежнего допущения.

Упрощённое предложение: research/leva-chat-plan.md, база main9cff976. Выбранный candidate — typed in-memory test infrastructure на raw fixtures, общие product components/handlers, generated route manifest и generic local transport. Минимальный transient overlay допустим для target ID/redirect/revalidation, но не обязан становиться полноценной DB.

Существенные края из исследования: Framework route IDs/clientAction/middleware, server-only imports/error identities, top-level capture fetch Better Auth client, XHR upload и native attachment URLs/Pages base. Их не закрывает один fetch mock.

Предложение обновлено по последнему owner clarification; D-06–D-08 — актуальные решения. Внешний runtime и последующий обязательный browser SQL/WASM вариант superseded. P0 теперь только browser seam/interaction proof. Код/зависимости/прототипы/deploy не менялись. Следующий шаг — проверка/обсуждение предложения; implementation не активировать автоматически.
