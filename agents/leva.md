# agents/leva.md — рабочая память Лёвы

Владелец прямо принял концепцию и назначил финальный технический PLAN (D-09). Назначение выполнено: канонический PLAN.md в #369, проверенный main `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.

Не возвращать отменённые требования: только GitHub/браузер; общий UI/routes/application handlers main; сохранение необязательно, simulated «успешно сохранено» допустим без записи. Fixture database + typed capabilities, минимальный transient overlay, без обязательных SQL/WASM/migrations/transaction parity.

PLAN определяет generated manifest/route IDs, Framework→Data Router wrappers, browser import barriers, fresh contexts, раннюю установку fetch/XHR, Pages codec/history, mode-aware attachment Blob URLs, P0→P6 и final gates. Resource suffix `&view=...` нельзя добавлять после Blob resolution.

P0/browser runtime не запускался. Авторский self-check документа не является независимым review или implementation PASS. Product/preview code, dependencies, #322 и deployment не менялись.

Следующая — Мира: scope/fit финального PLAN, delivery mode и отдельное bounded назначение P0. Handoff в WORKFLOW.md. Повторное принятие концепции не требуется. Лёва не начинает реализацию сам.
