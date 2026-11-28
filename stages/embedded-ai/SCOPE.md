Этот файл фиксирует единый planning scope встроенного AI-блока Vico Forum: пользовательский AI и AI для администрирования/модерации.

# Embedded AI — planning scope

Дата: 28.11.2026.

## Источники product scope

1. `research/user-ai-product-scope.md`.
2. `research/admin-moderation-ai-product-scope.md`.
3. Текущий `main`, `PROJECT.md`, `PROJECT_STATE.md`, translation/Complaints/Editor source-of-truth.

## Цель технического плана

Спроектировать один минимальный provider-neutral AI foundation для двух продуктовых направлений без второй копии forum/search/moderation логики и без зависимости базовой работы форума от AI.

## Planning baseline

### Пользовательский AI

1. UAI-01 — semantic/hybrid Search поверх существующего lexical Search.
2. UAI-02 — похожие темы/решения до публикации, на том же retrieval foundation.
3. UAI-03 — on-demand question-authoring helper в существующем Editor 2.0.
4. AI-chat, autonomous answers/posts и обязательные thread summaries в v1 не входят.

### Admin / Moderation AI

1. MAI-01 — advisory harmful-content signals без auto-enforcement.
2. MAI-02 — spam/duplicate candidates на общем retrieval foundation.
3. MAI-03 — on-demand Complaint case brief.
4. MAI-04 — on-demand evidence/checklist assistant.
5. Auto-hide, sanctions, priority changes, Complaint/Appeal decisions, Help outcomes и user risk scoring в v1 не входят.

## Неизменяемые границы

1. Дополнительные эксплуатационные расходы — $0; paid fallback запрещён.
2. Обязательный translation workload имеет приоритет над optional AI generation при общей квоте.
3. Базовые Search, Editor, publication, Attention и Complaints продолжают работать при полном AI outage.
4. Existing canonical forum/moderation/auth/permissions/History остаются authoritative.
5. AI output — untrusted advisory data; он не создаёт authority, command intent или domain mutation.
6. Public user-AI corpus не включает hidden/private/protected данные.
7. Protected Complaint material имеет отдельную data-policy/provider gate; reporter identity, private evidence, moderator notes, account/auth/secrets по умолчанию наружу не отправляются.
8. Архитектура generic по locale; hard-coded конечного списка EN/RU/HE нет.
9. Внешняя provider/Queue activation и реальные credentials — Stage 6 после отдельного разрешения владельца.
10. Текущий ChatGPT-control `PLAN.md` и `#399` не изменяются этой planning-задачей.

## Обязательные вопросы технического плана

Лёва должен самостоятельно выбрать минимальную корректную реализацию и обосновать:

1. Общую архитектуру AI foundation и границы между retrieval, generation/classification и forum domain.
2. Как semantic/hybrid retrieval переиспользует текущие Search/Help/solved/best-answer данные.
3. Где и как хранится индекс/embedding state; lifecycle create/edit/hide/restore/current revision/stale cleanup.
4. Нужна ли отдельная vector capability/extension/service или достаточно существующего PostgreSQL/другой бесплатной границы; сравнить реальные варианты, не фиксировать заранее.
5. Provider strategy по функциям: embeddings/retrieval representation, optional generation, harmful-content classification.
6. Текущие бесплатные лимиты, eligibility и data-handling каждого реально предлагаемого provider по актуальным первичным источникам.
7. Единый admission/budget policy: translation priority, quotas, concurrency, caching/dedup, bounded retries, hard stop без paid overage.
8. Multilingual retrieval/generation и representative EN/RU/HE + technical-code acceptance без locale ceiling.
9. Public vs protected data path и отдельный policy gate для Complaint/private content.
10. Prompt-injection/untrusted-content boundary без model-callable moderation writes.
11. Freshness/provenance/versioning AI outputs и поведение stale state.
12. Failure/degradation: lexical fallback, disabled authoring helper, moderation path без AI.
13. Как AI signals/briefs встраиваются в существующие Search/Editor/Attention/Complaints surfaces без второй queue/lifecycle.
14. Observability/monitoring, не превращающее AI observation в canonical moderation History.
15. Repository/local-CI fixtures и acceptance; какие live/provider checks действительно нужны только Stage 6.
16. Миграции/данные/очереди/фоновые jobs только в необходимом объёме.
17. Этапы реализации, зависимости, bounded acceptance каждого этапа и рекомендуемый delivery mode.

## Критерий готовности плана

`stages/embedded-ai/PLAN.md` считается готовым, когда:

1. покрывает UAI-01–03 и MAI-01–04 с указанными границами;
2. показывает, какие компоненты общие, а какие изолированы из-за privacy/authority;
3. не дублирует существующий Search, Editor, translation, Complaints или moderation backend;
4. подтверждает, что обязательный scope реально может работать при $0 extra cost либо явно фиксирует подтверждённый blocker;
5. отделяет repository/local implementation от Stage-6 provider activation;
6. задаёт полный порядок реализации и проверяемые acceptance criteria;
7. не начинает реализацию и не меняет `#399`.
