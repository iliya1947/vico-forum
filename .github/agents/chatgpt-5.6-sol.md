# Мира — ChatGPT-5.6 Sol

Активная задача: поэтапный аудит AUD-20261022. Этап 4 начат; часть 1 завершена.

Этот файл используется для собственных рабочих результатов, выводов и технического контекста Миры в рамках текущего служебного PR.

## AUD-20261022 — этап 1

- Baseline: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.
- Полностью прочитаны 18 актуальных документов, 7934 строки; подтверждённых document-contract contradictions нет.

## AUD-20261022 — этап 2

- Проверены все manifest targets этапа 2; подтверждённых current-Stage defects не установлено.

## AUD-20261022 — этап 3

- Email/password/session, dynamic authorization и ownership boundaries проверены.
- Детали findings этапа 3 остаются только в current developer chat до завершения всего checking sequence.

## AUD-20261022 — этап 4, часть 1 — public read/discovery

- Baseline повторно подтверждён; `AGENTS.md` полностью прочитан перед подзадачей.
- Проверены `app/forum/homepage.ts`, `homepage.test.tsx`, `paths.ts`, `request-context.ts`, `public-authz-degradation.test.ts`, `route-error.test.tsx`; routes `home`, `category`, `section`, `popular`, `search`, `tags`, `tag`, `unanswered`, `not-found`, `api`; соответствующие repository reads и connected PostgreSQL evidence из `stage4-core-e2e.test.ts`.
- Homepage/category hierarchy скрывает reserved Help service section из generic section rows/routes. Help category использует отдельный Q&A projection; topic breadcrumb для service-section topic возвращает пользователя прямо в Help & solutions.
- Popular использует bounded 24h/7d/30d message activity; connected DB test подтверждает period membership/count/order.
- Search NFKC-normalizes query, bounds 200 chars, escapes SQL wildcard syntax, searches current title/current post body/tag name/key, ranks title > tag > body and has connected tests for title/tag/body plus literal `%`/`_`.
- Tags и Unanswered используют current persisted topic projections; missing tag/entity returns route 404.
- Public section/topic loader degrades only classified optional authorization/storage dependencies and does not suppress unexpected programming errors.
- Сквозная проверка Help service-section visibility в global Search/Tag/Unanswered выявила finding; детали не записаны в service PR до завершения аудита по AGENTS.md.
- Metadata localization/SEO, scalability/pagination и visual/a11y intentionally deferred to their assigned audit stages.
- Следующая часть: participation/write entry points, unread/read-state, notifications.
