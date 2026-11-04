# Admin panel — current workflow

- Служебный PR: #251
- План: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Текущий этап: AP-07 — coordinator whole-PR PASS, independent technical review pending
- Статус: два прежних current-scope defects AP07-ACC-01/02 исправлены; Мира завершила coordinator whole-PR review corrected stable exact head без новых confirmed current-scope defects
- Base/main: `d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea`
- Implementation PR: #282 (draft, mergeable)
- Corrected stable exact head: `985160867001fd42b3ad2614262927aab3edfb3e`
- Corrected exact-head CI #41755521661: SUCCESS (`checks`, `database`)
- Coordinator verdict: **PASS** на `985160867001fd42b3ad2614262927aab3edfb3e`; confirmed current-scope defects в проверенном code/documentation/CI scope: 0
- Ранее Лёва на old head `b0d5e74663cd57851225447e792ab4a9bf98322c` выполнил actual browser/Worker acceptance: 22 functional cases прошли; два defects были AP07-ACC-01/02 и затем исправлены Лирой
- AP07-ACC-01 correction: canonical topic route `headers()` переносит action/error `Cache-Control` и `Retry-After`, сохраняя public GET/parent semantics; exact corrected runtime HTTP envelope ещё требует проверки
- AP07-ACC-02 correction: admin-topic scoped wrap/min-inline-size CSS соответствует локальному diagnostic remedy; corrected 320/768 runtime layout ещё требует проверки
- По прямому решению владельца отдельный промежуточный browser re-test перед coordinator review не выполняется: необходимые runtime re-tests входят в финальную independent technical review Лёвы
- Следующий шаг: Лёва проводит **финальную independent technical whole-PR review** того же exact head `985160867001fd42b3ad2614262927aab3edfb3e`; внутри неё обязательно проверить corrected AP07-ACC-01 через actual built-Worker HTTP document/.data/fetcher envelope и AP07-ACC-02 через real Chromium 320/768 layout. Не повторять без необходимости уже закрытые unaffected browser cases. Implementation во время review не менять
- При PASS Лёвы следующий шаг владельца — merge #282. При confirmed current-scope defect — вернуть bounded correction Лире
- Owner visual acceptance не запрашивался; AP-08+/production rollout до завершения #282 не начинать
