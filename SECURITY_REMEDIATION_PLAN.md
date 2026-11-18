# Security remediation plan — confirmed current findings

## Статус

1. Security audit areas A–L завершены на current `main` `9c4639d23ca075c8bb92fbb909b96593d7bee127`.
2. Подтверждено **34 current findings: 13 Moderate/P2 + 21 Low/P3; current P0/P1 нет**.
3. Отдельно сохранены **4 deferred Stage-6 blockers: 2 Moderate/P2 + 2 Low/P3**. Они не входят в current-remediation очередь и активируются только на соответствующих external boundaries.
4. Этот файл задаёт bounded decomposition и порядок remediation. Конкретный технический способ реализации каждого пакета определяет Лёва на его technical-planning шаге.
5. Implementation не начинается, пока для текущего пакета не завершён technical plan и не выполнен обычный bounded handoff.

## Принцип декомпозиции

1. Один finding входит ровно в один remediation-пакет.
2. Findings объединяются только когда используют один механизм исправления или один regression boundary; совпадение тематики само по себе недостаточно.
3. Сначала закрывается trust boundary, от которого зависит достоверность последующих изменений/acceptance; затем P2 и их технические зависимости; после этого P3 hardening.
4. Package не должен попутно исправлять deferred Stage-6 blocker или будущую функцию.
5. После каждого package выполняется отдельный implementation/review cycle; следующий package не начинается автоматически.

## Очередь current remediation

### R01 — Repository main trust gate

**Findings:** `REPO-MAIN-GATE-01 Moderate/P2`.

**Требуемый результат:** release-authoritative `main` не может обходить утверждённый PR/check gate через обычный direct update; действующий developer merge path сохраняется.

**Граница:** GitHub repository/ruleset state. Никакого Stage-6 production dispatch/deploy.

**Готово, когда:** технический план определяет точные current controls, необходимое owner-controlled изменение и проверяемый end-state; после отдельного разрешения и выполнения finding должен быть доказанно закрыт повторным state read.

**Зависимости:** нет. Выполняется первым, потому что защищает source-of-truth последующих remediation.

### R02 — CI / acceptance provenance

**Findings:** `CI-PYPI-PROVENANCE-01 Low/P3`, `CI-POSTGRES-IMAGE-PROVENANCE-01 Low/P3`, `PAGES-ACCEPTANCE-PROVENANCE-01 Low/P3`.

**Требуемый результат:** browser/database acceptance использует repository-reviewed immutable dependency/image identity, а visual acceptance однозначно относится к stable exact head.

**Граница:** CI/Pages provenance only; не менять продуктовую функциональность.

**Зависимости:** R01.

### R03 — Better Auth upstream correction baseline

**Findings:** `AUTH-LINK-01 Moderate/P2`, `AUTH-SESSION-01 Moderate/P2`.

**Требуемый результат:** OAuth linking не завершается после утраты исходной session authority, а logout не сообщает success при сохранившейся валидной persisted session.

**Граница:** Better Auth/runtime integration baseline. Перед планом перепроверить current supported correction version и official guidance; не закреплять исторический target версии как факт.

**Зависимости:** R01–R02.

### R04 — Registration correctness

**Findings:** `AUTH-ENUM-01 Moderate/P2`, `AUTH-REG-01 Moderate/P2`.

**Требуемый результат:** signup не создаёт различимый existing/new-email oracle в текущем продукте, а committed registration-close не допускает позже коммитящуюся регистрацию, прошедшую stale admission.

**Граница:** registration admission/configuration only; email verification/recovery не добавлять.

**Зависимости:** R03.

### R05 — Direct session API boundary

**Findings:** `AUTH-SESSION-02 Low/P3`, `AUTH-SESSION-03 Moderate/P2`.

**Требуемый результат:** direct auth surface не раскрывает raw server-side session handle сверх утверждённой projection и не позволяет stale-but-valid session обходить Vico freshness boundary для revocation.

**Зависимости:** R03.

### R06 — Private cache boundary

**Findings:** `AUTH-CACHE-01 Low/P3`, `READSTATE-CACHE-01 Low/P3`.

**Требуемый результат:** authenticated/session/read-state GET responses с private per-user data имеют единый явно private/no-store cache contract на всех затронутых surfaces.

**Зависимости:** R03; выполнять после R05, чтобы не переделывать те же auth endpoints дважды.

### R07 — Request/content admission bounds

**Findings:** `FORUM-PUB-01 Moderate/P2`, `FORM-BODY-BOUNDS-01 Moderate/P2`, `SEARCH-CONTROL-01 Low/P3`.

**Требуемый результат:** ordinary public/member requests получают server-side byte/content/control-character ceilings до дорогостоящей parsing/DB/domain работы; валидные текущие use cases сохраняются.

**Граница:** request/content admission; не превращать пакет в общий anti-DDoS layer.

**Зависимости:** R01–R02.

### R08 — Public read pagination/cardinality

**Findings:** `DISCOVERY-BOUNDS-01 Low/P3`, `FORUM-READ-BOUNDS-01 Moderate/P2`.

**Требуемый результат:** canonical forum/discovery reads имеют bounded page/result cardinality и стабильную навигацию без загрузки неограниченного corpus-sized результата.

**Граница:** response/read-set size. Backend-cost finding R09 остаётся отдельным.

**Зависимости:** R07.

### R09 — Public read backend cost

**Findings:** `PUBLIC-READ-COST-01 Moderate/P2`.

**Требуемый результат:** Homepage/Popular/Search не имеют неограниченно corpus-proportional повторяемой unauthenticated работы при bounded output.

**Граница:** query/caching/admission cost; не дублировать R08 response pagination.

**Зависимости:** R08, потому что R08 может изменить query shapes.

### R10 — Publication abuse bounds

**Findings:** `FORUM-EDIT-SPAM-01 Moderate/P2`, `MENTION-FANOUT-01 Moderate/P2`.

**Требуемый результат:** repeated successful edits имеют bounded admission, а одна publication не может создавать unbounded distinct-recipient notification fan-out.

**Граница:** publication/edit abuse only; content/request sizes остаются R07.

**Зависимости:** R07.

### R11 — Attachment security-event abuse

**Findings:** `ATTACH-SECURITY-EVENT-SPAM-01 Moderate/P2`.

**Требуемый результат:** repeated suspicious rejected upload attempts не могут без bound постоянно наращивать durable security-event/index state и monitoring noise.

**Граница:** security-event admission/retention only; общая per-user file quota не вводится.

**Зависимости:** R01–R02.

### R12 — Attachment content classification integrity

**Findings:** `ATTACH-TEXT-TAIL-01 Low/P3`.

**Требуемый результат:** publishable/type-checked text classification не подтверждается только безопасным prefix при бинарном/невалидном tail.

**Граница:** attachment content classification; не менять unrelated object-access/storage model.

**Зависимости:** R11 не обязательна технически, но выполняется после неё, чтобы один upload security path не менялся параллельно.

### R13 — Privileged/public projection privacy

**Findings:** `COMPLAINT-PRIV-01 Low/P3`, `HELP-SIGNAL-PRIV-01 Low/P3`, `HISTORY-PRIV-01 Low/P3`, `PUBLIC-PROJECTION-01 Low/P3`.

**Требуемый результат:** менее привилегированный loader/route не сериализует internal/private moderation metadata и не создаёт pre-permission existence oracle.

**Граница:** projection/admission privacy; mutation authority не расширять и не объединять Admin/Attention permissions.

**Зависимости:** R01–R02.

### R14 — Locale degraded-write admission

**Findings:** `LOCALE-DEGRADED-WRITE-01 Low/P3`.

**Требуемый результат:** localized state-changing actions не выполняют mutation через degraded LocaleRegistry state, когда canonical locale authority недоступна.

**Зависимости:** R07, чтобы общий request-admission слой уже был стабилен.

### R15 — Auth error / monitoring semantics

**Findings:** `AUTH-OAUTH-01 Low/P3`, `MON-AUTH-OUTCOME-01 Low/P3`.

**Требуемый результат:** provider-controlled OAuth error detail не остаётся в client-visible URL/history сверх необходимого, а security telemetry классифицирует canonical stale-identity 409 как denied, не failed.

**Граница:** error projection + monitoring semantics; underlying auth denial correctness не менять.

**Зависимости:** R03–R05.

### R16 — Database schema / least-privilege hardening

**Findings:** `DB-SEARCHPATH-01 Low/P3`, `DB-ACL-USER-DELETE-01 Low/P3`.

**Требуемый результат:** Complaint predecessor validation не зависит от caller-shadowable search path, а web runtime не сохраняет неиспользуемую destructive DELETE authority на `public.user`.

**Граница:** current repository/local-CI schema/runtime privilege contract. Production grants не менять в этом package; Stage-6 external application остаётся отдельным gate.

**Зависимости:** R01–R02.

### R17 — Destructive DB test target isolation

**Findings:** `DB-TEST-TARGET-01 Low/P3`.

**Требуемый результат:** destructive DB tooling проверяет тот же фактический connection target, который затем использует node-postgres, без query-level host override обхода local-only guard.

**Зависимости:** R02.

### R18 — Request-scoped DB cleanup lifetime

**Findings:** `DB-CLEANUP-FLOAT-01 Low/P3`.

**Требуемый результат:** request-scoped client/pool shutdown completion привязан к Worker invocation lifetime или иным образом гарантированно не остаётся floating async cleanup.

**Граница:** shared DB cleanup primitive only; не менять retry/deadline policy без подтверждённой необходимости.

**Зависимости:** R03 и R16 не обязательны, но package выполняется после них, чтобы shared DB wrappers планировались на стабилизированном runtime/ACL baseline.

### R19 — Authorization failure-cause preservation

**Findings:** `AUTHZ-FAIL-01 Low/P3`.

**Требуемый результат:** rollback cleanup failure не заменяет исходную authoritative authorization/domain/commit error и не превращает её ложно в controlled availability failure.

**Зависимости:** R18, если technical plan R18 затронет shared cleanup/error helpers; иначе независим.

## Deferred Stage-6 blockers — вне current-remediation очереди

1. `DB-RUNTIME-EVIDENCE-01 Low/P3` — correction gate до schema-dependent Worker rollout.
2. `WORKER-VERSION-URL-01 Moderate/P2` — correction gate до private/write-capable Worker version upload.
3. `WORKER-ROLLBACK-FINALIZER-01 Moderate/P2` — correction gate до production traffic promotion.
4. `GOOGLE-OAUTH-SCOPE-01 Low/P3` — correction gate до real Google OAuth activation.

Эти четыре blockers не должны быть «заодно» исправлены current-remediation package. При возобновлении Stage 6 для них формируется отдельная bounded sequence с актуальным external-state recheck.

## Handoff — первый пакет

Следующий bounded technical-planning шаг: **R01 — Repository main trust gate**.

Лёва должен подготовить технический план закрытия только `REPO-MAIN-GATE-01` против актуального `main` и текущего GitHub repository/ruleset state. Нужный результат — enforceable PR/check gate для release-authoritative `main` без нарушения обычного developer merge path. На planning-шаге не выполнять repository settings mutation, implementation или Stage-6 действия. План должен определить проверяемый end-state и необходимые owner-controlled действия; после этого остановиться.
