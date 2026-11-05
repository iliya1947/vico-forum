# Admin panel — current workflow

- Служебный PR: #251; общий план: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Текущий этап: AP-10 — общий technical plan готов; coordinator review + одна product-развилка
- Current main / planning baseline: `5cf80f38cbc06ed733a0618e706eb80c5a7b3c7b`
- AP-09 полностью merged: implementation #287, test stabilization #289, docs #288
- Technical planner/reviewer: Лёва; coordinator: Мира; implementation после approval: Лира
- План: [#6667784146](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6667784146) и `.github/agents/codex-6.1-sol.md`
- Implementation AP-10 не начат; implementation PR не создавался
- Общая часть: configurable child restrictions; authority/reason/CAS/History; current code enforcement/replay/cleanup; own private status и exact-measure block appeals
- Предложены на technical review: blocks.manage + отдельная elevated capability, narrow trusted owner-ID binding, минимальные measure/restriction/appeal persistence и точки integration
- Одна выявленная развилка (§9): новое наложение при ещё активной мере — edit прежней с прежним appeal quota, новая мера с отдельным quota либо недоступность нового наложения. Модели single-active и multi-measure aggregation ранее отозваны; выбор молча не сделан
- Следующий шаг: Мира review общей части и вынос владельцу только конкретного сценария §9; после решения — локальное завершение active-state/enforcement части, затем approval/назначение реализации
- Закрытые catalog/reason/self-target/lifecycle hierarchy вопросы не открывать заново
- Last-manager принцип НЕ применяется к AP-10: никаких manager-count veto/recovery требований. Существующий код пока не менять; комплексная очистка после админ-панели отдельной задачей
- AP-10 own status/appeal всегда доступен; Complaint/Complaint Appeal — отдельный domain
- AP-11/Settings/Stage 6/production не начинались; Марк не назначен

- Coordinator review technical plan: REVISION REQUIRED — AP10-PLAN-MIRA-01..04. Не начинать implementation до исправленного плана и coordinator approval.

- Different violations create different measures; one pending appeal per measure at a time; up to 3 sequential appeals; accepted appeal may lift or modify the same measure.

- Admin actor/reviewer identity is internal-only: own measure/appeal UI never exposes concrete administrator identity; internal authorized History retains it.
