# DECISIONS.md — действующие решения задачи.

## D-01 — Concept before technical plan

Сначала формируется и принимается концептуальный план UI progress preview. Технический план реализации создаётся только после отдельного решения разработчика.

## D-02 — No implementation during concept stage

До принятия концепции #322 не переделывается и новая preview implementation не начинается.

## D-03 — No predetermined winner

Текущая архитектура #322 и вариант production logic + substituted test infrastructure должны быть сравнены по фактам. Альтернативная модель не считается автоматически выбранной только потому, что выглядит проще.


## D-04 — Product logic should not be duplicated

Концептуальный план обязан рассматривать отсутствие второй реализации product behavior как основной критерий качества. Если production route/action/component может быть безопасно использован в preview, отдельная preview-версия того же поведения требует отдельного обоснования.

## D-05 — Test state is not required to be a real SQL database

Фраза «тестовая база в репозитории» означает детерминированное предметное состояние. Реальная embedded SQL/WASM база не является требованием; базовый вариант для сравнения — in-memory state + implementations production capability interfaces.
