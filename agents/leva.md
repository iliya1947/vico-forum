Этот файл хранит персональную рабочую память Лёвы по данной задаче.

# Лёва

Активная задача: подготовить полный новый технический план v1 по актуальному product contract.

Изменившийся product contract уже зафиксирован:

1. `research/user-journey-v1.md`;
2. обновлённый `TASK.md`;
3. обновлённый `research/product-scope-v1.md`;
4. `DECISIONS.md` D-13–D-20.

Ключевая граница: обычная эксплуатация — отдельный ChatGPT Project и обычный текстовый разговор. Любой write объясняется и отдельно подтверждается владельцем в разговоре; отдельный plugin/form/browser extension/cryptographic confirmation UI не является продуктовым требованием. GitHub/Worker должны быть невидимой транспортной инфраструктурой.

Единицей подтверждения является пользовательская задача, а не внутренний вызов. Составная задача может использовать несколько существующих canonical mutations; массовая — фиксированный заранее показанный набор targets. Обычная составная задача stop-on-first-failure, массовая продолжает остальные независимые targets с per-target итогом. V1 request-driven; background monitoring не реализуется, но read/analysis path не должен без необходимости закрывать будущий scheduler/event trigger.

Требуемый результат: заменить непринятый старый `PLAN.md` полным техническим планом, который реализует утверждённый user journey и весь v1 scope без дополнительного обязательного UI в обычной эксплуатации.

Границы задачи:
1. Исходить из актуальных `TASK.md`, `research/product-scope-v1.md`, `research/user-journey-v1.md`, `DECISIONS.md` и текущего кода/main.
2. Самостоятельно выбрать минимальную технически корректную архитектуру; старое решение Site/plugin/form/preview→confirm не считать заданным.
3. Сохранить $0 extra operating cost, ordinary ChatGPT without Work/Codex usage, private GitHub transport, canonical server authority/History и Stage-6 activation boundary.
4. Учесть составные и массовые пользовательские задачи, утверждённые partial-failure semantics и request-driven v1 с пригодной точкой расширения для будущего monitoring.
5. Не начинать реализацию и не изменять `#399`.

Готово, когда `PLAN.md` задаёт полный end-to-end путь, security/authority boundaries, delivery/result/replay semantics, этапы реализации с зависимостями и проверяемые acceptance criteria для всего утверждённого v1 scope. После этого передать план Мире на проверку через `#400`.
