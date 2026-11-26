# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; затем AUTH-07 final gate.
3. AUTH-01–AUTH-04 — coordinator PASS на ранее зафиксированных exact heads.
4. AUTH-05 / PR #394 corrected exact `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6` — **AUTHOR PASS + COORDINATOR PASS**. F01 registration-challenge email enumeration закрыт; CI #45882443114 PASS и 20/20 applicable connected acceptance PASS.
5. Прежний AUTH-05 exact `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0` superseded corrected head.
6. **AUTH-06 / PR #395 синхронизирован с принятым исправлением AUTH-05.** Текущий head `615d93598daf78945a86fbdc4255bc778ae3403f`, base `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6`. Первоначальный пакет из 22 файлов сохранён побайтово.
7. **Лёва завершил авторскую проверку. AUTHOR PASS по локальным результатам.** 228 модульных и маршрутных тестов, 395 проверок PostgreSQL и оба сценария Worker/Chromium прошли. Подтверждённых блокеров нет. Протокол и матрица находятся в `stages/AUTH-06/RESULT.md`.
8. По прямому указанию владельца Лёва впредь передаёт результат без ожидания и проверки CI. Команды `run:ci` и `run:acceptance` выставлены на текущем head.
9. **Текущий переход — повторное whole-feature coordinator review Миры.** После него независимый финальный reviewer назначается отдельно. Лёва участвовал в AUTH-06, Ада в исправлении AUTH-05.
10. AUTH-07, сборка цепочки, merge в main и внешняя активация требуют дальнейшего перехода по существующему плану.

## Следующий переход

Мира проверяет всю цепочку AUTH-01–AUTH-06 на head #395 `615d93598daf78945a86fbdc4255bc778ae3403f`. Вход — `stages/AUTH-06/RESULT.md`, root `PLAN.md` §9 и повторный checkpoint F01 в `stages/AUTH-05/RESULT.md`. При подтверждённом дефекте действует отдельный correction route. Лёва завершил handoff.
