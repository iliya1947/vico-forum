# Admin panel — communication

Служебный PR: #251.

## Актуальный baseline

- AP-01–AP-09 merged в main. AP-09 implementation #287, test stabilization #289 и documentation closeout #288 завершены; current main `5cf80f38cbc06ed733a0618e706eb80c5a7b3c7b`, migration head 0057.
- Actual authenticated browser/deployed AP-08/AP-09 flows не заявляются выполненными; production/release boundary остаётся отдельно.
- AP-10 technical planning назначен Лёве в #6667343744. [Исходный план](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6667784146) локально исправлен по coordinator review #6667923255 и owner decisions #6669655343/#6669734702; [revision delta](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6670064497). Требуется повторный coordinator review; implementation не начат, code/DB/production не менялись.

## Решения владельца, обязательные для AP-10

- Мера — configurable child restriction set. Логические group checkboxes выбирают дочерние пункты; duration temporary/permanent независим от состава. Presets — только UI shortcuts.
- Catalog: create topics/Help, replies, new uploads, own published edits, public profile edits, Complaint reports, Help signals, translation generation. Для privileged target — соответствующие Forum/Help, Complaints, Security, Users/access administrative families с private reads и mutations.
- Public reading/login/session/notifications/own status и любые domain appeal submissions не входят в restriction catalog. Own solved/best answer и source-locale correction не выделяются отдельными punitive restrictions.
- Mandatory user-visible private reason: create, manual change restrictions/срока, explicit lift. Original reason не затирается; automatic expiry не создаёт synthetic reason/admin event.
- Self-target create/change/lift запрещён. Privileged moderator/admin target требует elevated authority; owner — верхняя authority и не target subordinate. Target/issuer hierarchy действует на create/change/lift, не hard-coded role names.
- Block appeal — отдельный domain exact measure, не Complaint/Complaint Appeal. До 3 последовательных submissions на measure, одновременно только одна pending. Право не отключается restrictions; own status/reason/appeal surface всегда доступна.
- Edit measure не меняет её identity/quota и не закрывает pending appeal; expiry/lift делают pending appeal утратившей предмет.
- Expiry/lift не изменяют role grants/overrides и возвращают только возможности, разрешённые актуальным RBAC/resource state.

## Последний управляющий — решение владельца

- Принцип сохранения хотя бы одного доступного access manager не применяется при дальнейших planning/review/enforcement админ-панели. В AP-10 нет manager-count veto, специального recovery/lockout слоя или требования сохранить доступного управляющего.
- Existing `AuthorizationLockoutError` / `managers_ever_existed` / counts до завершения админ-панели не переделывать. Затем отдельная очистка кода/схемы/тестов/контрактов и owner-role design.
- Старые условные формулировки source-of-truth не становятся AP-10 requirement вопреки прямому решению владельца.
- Не смешивать block appeal с Complaint-подобным пересмотром violation или отдельным owner recovery subsystem.

## Результат технического планирования

- Лёва подготовил common schema/domain/repository/service/route/UI/catalog/History points и dependencies; full text — comment #6667784146 и личный файл.
- Proposals для review: обычная blocks.manage, отдельная elevated capability без автоматического built-in grant, narrow trusted owner-ID binding для необходимой owner target boundary, отдельный raw authority snapshot и action-restriction policy.
- Enforcement охватывает direct APIs/child private reads/active sessions; publication receipts и committed retries проверяются до fresh-action restriction, Cancel/cleanup сохраняются.
- Минимальные persistence proposals: measures, child restrictions и exact-measure appeals; new forward migrations/manifest/runtime least privilege. Никакой implementation/прошедших AP-10 tests не заявлено.
- Accepted appeal поддерживает full lift или изменение restrictions/срока той же measure; remedy/reason/resolution/History атомарны через общий transition primitive. Reject меру не меняет.
- Own timeline — отдельная allowlist projection без actor/issuer/reviewer identity или raw private History context. Identity сохраняется во внутренней authorized History.

## AP-10 revision AP10-PLAN-MIRA-01..04

- Owner decision закрыл прежнюю §9 развилку: разные нарушения создают разные меры. Single-active модель не применяется; повторного owner вопроса нет.
- Отдельные measures имеют независимые identity/reason/restrictions/expiry/lift/version/issuer floor/history/quota. Enforcement — EXISTS действующей меры с нужным restriction key; снятие/истечение A не убирает effect B. Без aggregation store/precedence engine/current-head/UNIQUE active target.
- Последовательность appeals обеспечивается measure lock, unique ordinal и partial UNIQUE pending по measure ID. Replay не расходует слот; pending A не блокирует B; обычный edit не закрывает pending. Expired appeal при продлении меры не возобновляется.
- Accepted + change сохраняет identity/quota; accepted + lift не перезаписывается как moot. Fresh current version/authority, CAS, transactional History и rollback обязательны.
- Raw own document/.data/action/fetcher/errors проверяются на отсутствие admin identity; одного сокрытия в UI недостаточно.
- Delta для Миры: https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6670064497. Полный актуальный technical plan — личный файл Лёвы; unchanged scope исходного плана сохраняется.

## Следующий шаг

- **Мира:** повторный coordinator review revision AP10-PLAN-MIRA-01..04 и актуального личного плана. Owner решения уже получены; новых owner product blockers нет. После approval назначить Лиру на реализацию.
- Implementation до plan approval не начинать. Лёва/агенты друг друга не вызывают; technical context передан в #251.
- Lasting docs/PROJECT_STATE — отдельным documentation PR после принятой реализации. Общая last-manager очистка — после завершения админ-панели.
- AP-11/Settings/Stage 6/production rollout не начинались; Марк не назначен.

Оперативное состояние: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).


## AP-10 owner decision — distinct violations, sequential appeals, flexible remedy

1. Два разных нарушения = две разные administrative measures.
2. Каждая measure имеет собственные reason/restrictions/expiry/lift/history и собственный лимит до 3 appeals.
3. Для одной measure одновременно может быть только одна pending appeal; до 3 appeals рассматриваются последовательно.
4. Удовлетворение appeal может привести как к full lift, так и к смягчению/изменению restrictions или срока той же measure.
5. Такое изменение не создаёт новую measure identity; appeal/history остаются связаны с исходной measure.


## AP-10 owner decision — admin identity is internal-only

1. Наказанный пользователь не должен видеть, какой конкретно администратор/модератор назначил, изменил или снял меру либо рассмотрел appeal.
2. User-facing measure timeline содержит только саму меру, reason, restrictions, сроки, изменения и результаты appeal.
3. Actor/reviewer identity и другая служебная информация доступны только владельцу и администраторам с соответствующим доступом во внутренней administrative History.


## AP-10 owner decision — no default block-management grants

1. AP-10 block-management capability не выдаётся автоматически ни одной built-in role.
2. Built-in admin и moderator по умолчанию не получают право создавать/изменять/снимать measures или review block appeals.
3. Доступ выдаётся только явным grant через существующую dynamic authorization model.
4. Privileged-target elevated capability также без initial grants.
5. Expired/lifted measure terminal; повторное наказание = новая measure.
