# WORKFLOW.md — текущее оперативное состояние задачи.

## Current state

- Service #369, не merge; проверенный main 9cff976a9621d9fe5dfef28ea5367e390ff435b1.
- Владелец уточнил цель и подтвердил: общие UI/routes/application interactions main, GitHub + браузер, без внешней среды. Реальная запись необязательна; simulated success, включая «успешно сохранено», разрешён.
- Эти owner decisions записаны в DECISIONS.md D-06–D-08.
- **Лёва обновил упрощённое предложение:** research/leva-chat-plan.md. Обязательные browser SQL/WASM, migrations, transactions и database-compatibility gate сняты.
- Выбранный базовый вариант предложения: production route modules/UI/application handlers + raw test data + typed in-memory infrastructure adapters. Storage может подтвердить операцию без изменения baseline; минимальный transient state используется только для согласованной навигации/result UI.
- Автоматическое обновление main обеспечивается общими imports и generated route manifest, а не синхронизацией второй preview-копии.
- Старые выводы WORKFLOW о необходимости SQL parity/проверки browser SQL candidate superseded последним owner clarification. Не возвращать требование полноценной системы записи без новой причины.
- Research/concept.md — предшествующее исследование. Новая техническая детализация находится в предложении Лёвы; общая архитектура не объявлена принятой владельцем автоматически.
- P0 теперь проверяет browser route/context/handler seams и simulated-save vertical path, а не совместимость SQL engine.
- Канонический PLAN.md не активирован как approved implementation plan. Product/preview code, #322, dependencies и deployment не менялись; P0/реализация не начинались.

## Next transition

**Лёва завершил авторскую проверку полноты предложения — STOP. Следующая Мира.**

Мира выполняет scope/fit review всего research/leva-chat-plan.md (§1–16) против D-06–D-08: один product source и автоматический main update, общие handlers/application validation, допустимые test storage acknowledgements, links/buttons/forms/pending/error/success, raw state/identity/resource coherence и Pages/browser boundaries. Отдельно проверить, что proposed neutral seams минимальны и adapters не становятся вторым UI/application layer.

Результат — подтверждённые замечания либо scope/fit вывод в #369. Не требовать SQL/write parity и не возвращать запрет simulated «успешно сохранено». Не выдавать author self-check за независимую проверку, acceptance владельца либо runtime proof.

PLAN.md ссылается на актуальное предложение; author check и оставшиеся implementation-unknowns — §16. P0 и реализация не запускались. После Mira review остаётся решение владельца; implementation назначается отдельно. #369 не merge, #322 не менять.
