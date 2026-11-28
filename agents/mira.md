Этот файл хранит персональную рабочую память Миры по данной задаче.

# Мира

1. Product contract v1 согласован владельцем: `research/product-scope-v1.md`, `research/user-journey-v1.md`, D-01–D-20.
2. Полный технический replan Лёвы проверен на service head `bed01ed23d2c4b87faa2780ccc6e960d57f83b43`: **PASS**. F-01 закрыт. Актуальный review — `research/plan-review-mira.md`.
3. Принята архитектура одного Site-hosted personal plugin с отдельными текстовыми MCP tools; каждый tool самостоятельно использует внутренний Worker/private-GitHub transport и не зависит от отдельного GitHub connector ChatGPT.
4. Conversational confirmation остаётся Project policy; server независимо обеспечивает exact Owner/session/permissions/resource/AP-10/CAS/replay/History.
5. Составная задача: stop-on-first-failure без автоматического rollback committed шагов. Массовая: continue-per-target для независимых targets, per-target result.
6. V1 request-driven; background monitoring не реализуется, но reader boundary пригодна для будущего trigger.
7. Account-specific отсутствие обязательной дополнительной approval-card для всех write tools не проверено и остаётся Stage-6 gate.
8. Delivery mode: **stacked A → I**. `#399` — первый и финально собираемый PR.
9. Следующий подэтап после команды владельца — handoff Лене (GPT-6.2) на Stage A; до этого `#399` не изменять.


## Stage A PASS — 28.11.2026

#399 exact head `ce85db5f4ae7bc33992174cc6ae69b47da0bf2cd`.
Correction A-F01–A-F03 проверен. CI `46148681007` success; Stage-A OAuth Chromium acceptance `46149123687` success. Stage A закрыт PASS. Следующий возможный переход — Stage B, только после новой явной команды владельца.
