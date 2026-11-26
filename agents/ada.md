# agents/ada.md — личная рабочая память Ады по authentication lifecycle

## Завершённое назначение

AUTH-05 correction F01 в PR #394 завершена и принята.

Accepted exact: `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6`, base AUTH-04 `e9f8bad85694321f3279a72b604546a813a856b8`.

Статус: **AUTHOR PASS + COORDINATOR PASS**. F01 registration-challenge email enumeration закрыт; exact-head CI и 20/20 applicable connected acceptance PASS. Подробности — `stages/AUTH-05/RESULT.md`.

F02 не требует correction: permanent SA-02 contract допускает canonical trusted ingress IP/source quality в exact-Owner-only telemetry; correction telemetry не меняла.

## Следующий возможный handoff

По прямому решению владельца дальнейшая техническая работа остаётся за Адой, но новый handoff **ещё не активирован**.

Следующая подзадача после отдельной команды: AUTH-06 #395 sync/reverification поверх corrected AUTH-05 exact `dbbfe1c05...`. Нужно сохранить bounded AUTH-06 как test/evidence package, синхронизировать его branch с новым accepted base, затем заново выполнить author self-check и применимые exact-head CI/acceptance и STOP для Миры.

Не начинать AUTH-06 sync, AUTH-07, merge или external activation без нового handoff. Поскольку Ада участвовала в correction implementation, independent final reviewer этой feature должен быть другим агентом.
