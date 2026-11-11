# Functional preview runtime — implementation plan

## Статус

Scope зафиксирован. Техническое планирование назначено Codex-6.1 Sol. Реализация не начата.

## Цель

Дать владельцу Vico Forum постоянный браузерный стенд, где можно проверять не только визуальное состояние, но и реальное поведение уже реализованных функций форума без production-данных и production-write capability.

## Зафиксированная модель

1. Текущий GitHub Pages URL остаётся постоянной точкой входа и лёгким visual-preview.
2. Реальные SSR, Better Auth, route actions/loaders и PostgreSQL-backed функции выполняются отдельным изолированным non-production runtime.
3. Стенд использует текущую реализацию приложения из repository, а не вторую preview-only реализацию domain logic.
4. Preview runtime не получает production private data, production write bindings, production secrets или production traffic.
5. Stage 6 external integration остаётся paused. Реальный Google OAuth, production Neon/Hyperdrive, production Owner binding, translation providers/Queues и production rollout в эту задачу не входят.
6. Проверяются только уже реализованные функции текущего проекта; незавершённые функции остаются честными Under development surfaces.
7. Дополнительные внешние preview resources допустимы только если они действительно нужны для функциональной проверки и изолированы от production. Необязательная инфраструктура не должна блокировать первый рабочий стенд.

## Требуемый результат

Функциональный стенд должен позволять владельцу вручную проверять применимые уже реализованные сценарии: guest reading/navigation, email/password test authentication, user participation, Editor, solved/best-answer, profiles/discovery/settings и доступные privileged Admin/Super-admin flows в безопасной test-only конфигурации.

GitHub Pages должен давать понятный переход к этому runtime, при этом существующий mock/representative visual preview может сохраняться для специальных UI states.

## Последовательность

1. Codex-6.1 Sol готовит короткий executable technical plan: runtime topology, isolated data/auth model, Pages→runtime entry, deployment/update path, test identities/fixtures и acceptance.
2. После принятия плана ChatGPT-6 выполняет bounded implementation в отдельном implementation PR.
3. ChatGPT-5.6 Sol проводит coordinator whole-PR review stable exact head.
4. После coordinator PASS Codex-6.1 Sol выполняет независимый technical review того же head.
5. После реализации и acceptance отдельным docs PR обновляется фактическое состояние проекта при необходимости.

## Критерии готовности всей задачи

1. Владелец из опубликованного Pages-стенда может открыть функциональный runtime без локального клона.
2. Реальные уже реализованные user flows выполняются через настоящий Worker/runtime и отдельные test data/resources.
3. Production/private/write isolation доказана, а production topology не изменена этой задачей.
4. Стенд обновляется воспроизводимо из принятой repository revision и не требует дублирования forum logic в app/ui-preview.
5. Применимые browser checks подтверждают guest/user/privileged сценарии и основные write flows.
6. Никакая отсутствующая функция не изображается работающей.
