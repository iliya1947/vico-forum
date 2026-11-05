# Admin panel — current workflow

- Служебный PR: #251
- План: `ADMIN_PANEL_IMPLEMENTATION_PLAN.md`
- Текущий этап: AP-10 product design — restriction catalog и reason rules drafted; speculative access-manager lockout removed by owner decision
- AP-09 полностью завершён и merged
- AP-10 пока не передан Лёве на technical planning
- Approved owner model:
  - block не является фиксированным preset/type с единым набором последствий;
  - каждая block-запись содержит выбранный набор restrictions;
  - restrictions сгруппированы логически;
  - group checkbox выбирает весь блок, child checkboxes позволяют точечно снять/добавить ограничения;
  - temporary/permanent duration независим от restriction set;
  - expiry/lift снимает restrictions этой block-записи и не меняет roles/grants/overrides;
  - возможные presets в будущем — только shortcuts для предварительного выбора галочек, не отдельная policy model
- Approved appeal invariant: block appeal ≠ Complaint. Block appeal подаёт уже наказанный пользователь против exact administrative measure; до 3 апелляций на одну конкретную меру; он не является restriction и не отключается галочками; entry point на own account page рядом с соответствующей мерой; Complaint/Complaint Appeal остаются отдельным domain и не подменяют AP-10 appeal
- Own block-status/appeal surface должна оставаться достижимой независимо от restriction set
- Approved privileged-target rule: обычный block authority не может применять ограничения к модераторам/администраторам; это доступно только владельцу и старшему/главному админу через отдельную повышенную authority
- Техническая форма senior/head-admin authority пока не зафиксирована; не hard-code role name, сохранить permission-based model
- Owner invariant: владелец является верхней authority; senior/head admin не может применять block/restrictions к владельцу
- Следующий product step: owner review restriction catalog и reason rules; self-target и lifecycle target-authority уже закрыты
- Важная фактическая граница: публичное чтение нельзя надёжно запретить account-level block, потому что публичный контент доступен без авторизации; IP/device ban вне текущего ordinary-admin scope
- После catalog/grouping: завершить reason rules и оставшиеся реальные AP-10 product gaps; затем передать Лёве AP-10 technical planning

- Post-admin follow-up: redesign owner/authorization recovery model; current last-access-manager invariant (`AuthorizationLockoutError` / `managers_ever_existed` / manager count) owner признал ошибочной целевой архитектурой. Не менять до завершения админ-панели; затем отдельная задача.

- Self-target rule: actor не создаёт, не изменяет и не снимает меру относительно самого себя.
- Target-authority hierarchy действует на весь lifecycle меры: создание, изменение и снятие; это не отдельный открытый вопрос.

- Pending appeal lifecycle resolved: expiry/lift закрывает appeal как утратившую предмет; изменение restrictions/срока/reason не закрывает appeal — она остаётся привязана к той же measure, History сохраняет изменения.
