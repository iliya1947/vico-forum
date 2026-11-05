# Admin panel — communication

Служебный PR: #251.

## Актуальный baseline

- AP-01–AP-09 merged в main. AP-09 implementation #287, test stabilization #289 и documentation closeout #288 завершены; current main `5cf80f38cbc06ed733a0618e706eb80c5a7b3c7b`, migration head 0057.
- Actual authenticated browser/deployed AP-08/AP-09 flows не заявляются выполненными; production/release boundary остаётся отдельно.
- AP-10 technical planning назначен Лёве в #6667343744. Общая часть [плана опубликована](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6667784146); implementation не начат, code/DB/production не менялись.

## Решения владельца, обязательные для AP-10

- Мера — configurable child restriction set. Логические group checkboxes выбирают дочерние пункты; duration temporary/permanent независим от состава. Presets — только UI shortcuts.
- Catalog: create topics/Help, replies, new uploads, own published edits, public profile edits, Complaint reports, Help signals, translation generation. Для privileged target — соответствующие Forum/Help, Complaints, Security, Users/access administrative families с private reads и mutations.
- Public reading/login/session/notifications/own status и любые domain appeal submissions не входят в restriction catalog. Own solved/best answer и source-locale correction не выделяются отдельными punitive restrictions.
- Mandatory user-visible private reason: create, manual change restrictions/срока, explicit lift. Original reason не затирается; automatic expiry не создаёт synthetic reason/admin event.
- Self-target create/change/lift запрещён. Privileged moderator/admin target требует elevated authority; owner — верхняя authority и не target subordinate. Target/issuer hierarchy действует на create/change/lift, не hard-coded role names.
- Block appeal — отдельный domain exact measure, не Complaint/Complaint Appeal. До 3 submissions на measure. Право не отключается restrictions; own status/reason/appeal surface всегда доступна.
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
- Предлагаемый reviewer effect принятого block appeal — lift той же exact measure, rejected appeal не меняет restrictions; это technical proposal на review, не копия Complaint Appeal policy.
- Known limitation: ранее отозваны обе прежние модели active-measure multiplicity/aggregation. Они не внесены как approved schema constraints.

## Одна конкретная продуктовая развилка (§9 плана)

Есть действующая measure A с запретом replies, сроком и уже исчерпанным лимитом 3 appeals. До её окончания администратор хочет наложить меру с новым upload restriction/другим сроком/reason.

- Изменение A сохраняет её identity и исчерпанный quota.
- Новая B получает отдельный exact ID/appeal quota и требует определить совместный effect A/B.
- Недоступность нового наложения до окончания A тоже меняет наблюдаемое поведение и не должна появиться молча как UNIQUE active или скрытая форма.

Эта разница влияет на утверждённые appeal identity/quota, expiry/lift и enforcement. Лёва не выбрал single-active или aggregation модель; не начал multi-measure subsystem. Это единственная выделенная развилка, остальные закрытые product decisions не пересматриваются.

## Следующий шаг

- **Мира:** coordinator review common technical plan и только конкретный owner decision по повторному наложению из §9. После решения — локально завершить persistence/active-policy часть и финализировать approval, затем назначить Лиру.
- Implementation до plan approval не начинать. Лёва/агенты друг друга не вызывают; technical context передан в #251.
- Lasting docs/PROJECT_STATE — отдельным documentation PR после принятой реализации. Общая last-manager очистка — после завершения админ-панели.
- AP-11/Settings/Stage 6/production rollout не начинались; Марк не назначен.

Оперативное состояние: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).
