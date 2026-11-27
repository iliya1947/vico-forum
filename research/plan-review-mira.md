Этот файл фиксирует актуальную проверку Мирой технического плана Лёвы перед началом реализации.

# Проверка технического плана — 28.11.2026

## Итог

**PASS.**

Проверен полный `PLAN.md` на service head `bed01ed23d2c4b87faa2780ccc6e960d57f83b43` / blob `7cebc89d84c0908395a0d85da397cddac0ad9eb5` против `main` `c49897181388b4a78f8e8248dc6508551df576c4`, `TASK.md`, D-01–D-20, `research/product-scope-v1.md`, `research/user-journey-v1.md`, прежнего F-01 и актуальной официальной документации OpenAI/Better Auth.

Подтверждённых блокирующих дефектов текущей задачи не осталось.

## F-01 — закрыт

Прежний план зависел от цепочки Site plugin/component → `sendFollowUpMessage` → отдельный GitHub connector. Новый план этого не делает.

1. Один Site-hosted personal plugin экспонирует отдельные типизированные MCP tools.
2. Каждый tool самостоятельно завершает требуемую внешнюю зависимость через собственный server path; вызов другого plugin/connector моделью не требуется.
3. GitHub является внутренней транспортной зависимостью этого tool path.
4. Интерактивный component и `sendFollowUpMessage` из основного пути удалены.
5. Model-callable write operations остаются явно экспонированными отдельными tools; `prepare_task` только фиксирует неизменяемое описание уже экспонированных операций и не является generic executor скрытых capabilities.

Это соответствует текущему OpenAI requirement tool independence/exposure и текущей архитектуре plugins/MCP, где UI необязателен:
- https://developers.openai.com/plugins/plugin-guidelines
- https://developers.openai.com/plugins/concepts/plugins
- https://help.openai.com/en/articles/20001547-hosting-a-plugin-with-chatgpt-sites

## Product contract

План покрывает:

1. полный утверждённый read contour;
2. только существующие canonical writes без generic escape hatch;
3. ordinary conversational explain → confirm → dispatch без отдельного product UI confirmation;
4. exact Owner/session/AccountState/native permission/resource/AP-10/hierarchy/CAS/History boundaries;
5. untrusted forum/GitHub content isolation;
6. immutable task manifest и запрет расширять targets после confirmation;
7. составные задачи с stop-on-first-failure и сохранением уже committed effects;
8. массовые задачи с continue-per-target для независимых targets и per-target итогом;
9. replay/duplicate/stale/outcome-unknown semantics без автоматического повторного effect;
10. request-driven v1 и переиспользуемую read/analysis boundary для будущего scheduler/event trigger без реализации background monitoring сейчас;
11. private GitHub transport, Worker primary path, Actions как ограниченный дополнительный delivery path;
12. Stage-6 boundary и $0/no Work-Codex ordinary-use constraints.

## Внешняя платформа

Текущая официальная документация подтверждает:

1. Sites может хостить MCP server и давать tools через plugin.
2. Custom UI для MCP не обязателен.
3. Установленные plugins могут вызываться ChatGPT автоматически, когда релевантны запросу.
4. OAuth 2.1 + PKCE/S256 для authenticated MCP поддерживается; Better Auth OAuth Provider сейчас поддерживает необходимые OAuth 2.1/resource/introspection primitives.

Источники:
- https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites
- https://help.openai.com/en/articles/20001256-plugins-in-chatgpt
- https://developers.openai.com/plugins/build/auth
- https://better-auth.com/docs/plugins/oauth-provider

**Информация не проверена:** фактический режим конкретного аккаунта владельца — наличие нужного Site/plugin/OAuth permission set и отсутствие обязательной дополнительной approval-card для всех high-impact v1 tools. OpenAI прямо допускает account/app/action-dependent approval для write actions. Это не скрыто планом: раздел 9 делает эту проверку обязательным Stage-6 gate и запрещает выпуск, если утверждённый conversational UX не поддерживается. Поэтому это не defect текущего repository/local implementation stage.

## Режим поставки

Выбран **stacked mode A → I**.

Причина: этапы образуют одну зависимую вертикаль; промежуточный merge в `main` не даёт законченного v1 и создаёт лишнюю стоимость синхронизации. Первый implementation PR — существующий `#399`; следующие bounded stages строятся поверх предыдущих. После последнего этапа итоговый head собирается обратно в `#399`, промежуточные PR закрываются как superseded, затем выполняется final author self-check → whole-feature review Миры → независимый whole-feature review Лёвы на том же stable exact head → merge владельцем.

## Следующий этап

Первая реализация — Stage A из принятого `PLAN.md`. До активации исполнителя код `#399` остаётся неизменным.
