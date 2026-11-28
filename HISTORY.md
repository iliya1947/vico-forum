Этот файл хранит значимые завершённые события задачи.

# История

1. 27.11.2026 — создан draft implementation PR `#399` от актуального `main`; при создании он содержит только пустой setup commit и зарезервирован для будущей реализации.
2. 27.11.2026 — создан служебный PR Миры `#400` с полным обязательным рабочим пространством; он не предназначен для merge в `main`.
3. 27.11.2026 — Мира завершила [scope v1](research/product-scope-v1.md) и его [проверку](research/scope-review.md). Лёва подготовил [полный технический план](PLAN.md) и передал его Мире для выбора режима поставки.
4. 27.11.2026 — Мира установила F-01 в прежнем плане. Владелец утвердил текстовый user journey, включая составные и массовые задачи. [Проверка плана](research/plan-review-mira.md) · [Сверка сценария](research/user-journey-gap-review.md)
5. 28.11.2026 — Лёва заменил технический план по актуальному контракту и передал его на проверку Мире. [PLAN.md](PLAN.md)

6. 28.11.2026 — полный replan Лёвы проверен Мирой: PASS; F-01 закрыт, выбран stacked delivery A → I, `#399` остаётся первой и финально собираемой ступенью. [Проверка](research/plan-review-mira.md)

7. 28.11.2026 — по прямому решению владельца Лена (GPT-6.2) заменяет Лиру как основной implementation-agent; подготовленный Stage A переназначен Лене.


8. 28.11.2026 — владелец назначил #400 общим служебным PR pre-release AI-блока; после ChatGPT-control здесь последовательно будут проработаны два следующих AI-направления: пользовательский AI и AI для администрирования/модерации.


9. 28.11.2026 — после product-scope проработки user-AI и Admin/Moderation-AI создан единый embedded-AI planning scope; Лёва назначен на отдельный technical plan в `stages/embedded-ai/PLAN.md` параллельно текущей реализации ChatGPT-control.


10. 28.11.2026 — Stage A #399 завершён coordinator PASS на exact head `ce85db5f4ae7bc33992174cc6ae69b47da0bf2cd`: correction A-F01–A-F03 подтверждён, основной CI `46148681007` — success, Stage-A-specific OAuth Chromium acceptance `46149123687` — success. Stage B не активирован.


11. 28.11.2026 — после PASS Stage A активирован Stage B. Создан stacked draft implementation PR `#402` от принятого head Stage A; Лена назначена реализатором. Stage C остаётся заблокирован до coordinator PASS Stage B.


12. 28.11.2026 — владелец разделил User AI и Admin/Moderation AI на самостоятельные задачи внутри #400. Business-Мира назначена координатором самостоятельной задачи №2; Лёве передан отдельный technical plan `stages/user-ai/PLAN.md`; Ада назначена будущим реализатором после принятия плана. Прежний общий embedded-AI planning отменён.

13. 28.11.2026 — Лёва завершил отдельный технический план User AI / Vico Consultant для проверки Business-Мирой. [План](stages/user-ai/PLAN.md)

14. 28.11.2026 — полный technical plan User AI Лёвы принят Business-Мирой: PASS; выбран stacked delivery U1 → U6. Создан draft implementation PR `#403` от актуального `main`; Ада назначена на U1, последующие этапы заблокированы до coordinator PASS.
