# WORKFLOW.md — текущее оперативное состояние задачи.

## Current state

- Задача: переосмысление архитектуры UI progress preview.
- Service workspace создан от main `9cff976a9621d9fe5dfef28ea5367e390ff435b1`; перед подэтапом 6 подтверждено, что `main` остаётся на этом exact head.
- Активный этап: **концептуальное проектирование до технического плана**.
- Исполнитель: **Мира-3 (GPT-5.6 Sol)**.
- Реализация: **не авторизована**.
- Изменения старых implementation PR: **не входят в текущую задачу**.
- Подэтапы 1–5 завершены: dependency/runtime boundary, browser-safe route graph, единый route source, local transport и native attachment byte presentation.
- Подэтап 6 завершён: определена единая deterministic test-state/control model.
- Результат: `research/concept.md`, разделы 1–21.
- Current preview содержит 72 scenario definitions, 21 unique `scenario.variant` ветку и вручную формирует множество готовых UI states; это в целевую модель не переносится.
- Целевая модель: one canonical base state + small raw overlays + capability fault profiles + production route/action/presentation.
- Scenario задаёт route/default actor/raw overlay/fault/setup transition, но не view/component props/permission booleans/direction/готовые result arrays.
- Identity становится отдельным concrete account/session control; Guest/User/Manager/Owner не переписывают ownership или persisted roles/grants. Owner authority остаётся exact trusted binding.
- Locale идёт через production locale routing/registry; direction и translations не задаются scenario вручную.
- Viewport остаётся только внешним размером preview frame.
- Empty/401/403/409/429/503/pending/success должны возникать из реальных data/auth/fault/action причин, а не из fabricated view variants.
- Test state хранит current accounts/authz/forum/personal/moderation/settings/attachments/localization/Admin/Owner facts, но browser-local preferences остаются отдельным device-state layer.
- `ForumReader` сейчас имеет 44 product-specific read methods; сложные SQL ranking/filter/fanout semantics не должны второй раз реализовываться ради Pages. Preview adapters — representative infrastructure, не DB-query acceptance.
- Browser SQL/PGlite/WASM по-прежнему не выбран как несоразмерный visual-preview цели.
- Для deterministic user-visible relative time требуется минимальная injectable clock boundary: current `category.tsx` и `attention.tsx` напрямую используют `new Date()`.
- Mutable preview state должен быть resettable к исходному `base + overlay`.
- Реализация этих выводов не начиналась.

## Next transition

STOP по правилу декомпозиции. После команды разработчика следующий conceptual block — описать **миграцию с нынешнего preview и критерии готовности всей концепции**: что сохраняется, что удаляется/заменяется, как избежать временного второго продукта и какие вопросы передать Лёве уже в технический план.
