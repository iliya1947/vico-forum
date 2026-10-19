# Лира — ChatGPT-6

## Текущий статус

Старый bounded correction package PR #232 отменён. По принятому owner техническому плану Лёвы implementation STOP до согласования модели версий/conflict/attachments.

Подтверждённые current-Stage defects включают stale expiry, attachment-first hidden terminal, stale-payload/fresh-CAS chooseVersion и Simple programmatic paste DOM desync.

## Следующая задача

Implementation не менять. Следующий рабочий этап — анализ current model/invariants и state transitions по принятому плану Лёвы; конкретная реализация будет назначена только после согласования модели.


## Этап 2 — independent model review завершён (2026-10-19)

Проанализирован proposal Миры «одна authoritative draft-state version; `draftAttachmentIds` selected set; draft refs = retention pool» на unchanged implementation head `ae121565…`.

- Proposal обоснован как направление, но **до implementation отсутствует proof четырёх граничных сценариев**: (1) несколько параллельных POST файлов из одного `addFiles()`, каждый с одной CAS base; (2) оба порядка own attachment include и pending 60-second text autosave, со stale local base/dirty text; (3) text-only или subset publication при pool с удалёнными, но удерживаемыми assets — текущие `finishPublishedDraft()` checks предполагают pool==selected; (4) owner «более новый черновик» не тождественен server-version ordering для purely offline/local candidates.
- Последние 4 пункта — **недоказанные переходы proposed model, не новые confirmed current-Stage defects исходного кода**. Дополнительные persistent tables/registries не предлагаются.
- Полное техническое доказательство опубликовано комментарием PR #234 `6266330006`. Мира должна проверить контрпримеры и уточнить model transition proof до implementation.
- PR #232 не менялся. **STOP.**


## Новое owner decision

Владелец выбрал **manual fallback** для purely-local/offline copies, которые нельзя достоверно упорядочить по authoritative server history. Client `editedAt` не считается authoritative ordering.

Если порядок недоказуем — explicit conflict и ручной выбор. Если authoritative server ordering доказуем — применяется product rule для более нового snapshot. Keep-rule для same-file remove-vs-retain действует независимо.

## Следующая задача

Провести последний independent design gate target model после owner decision:
- проверить ранее найденные multi-upload, autosave↔attachment CAS, publication/access и offline-ordering transitions;
- искать скрытую необходимость нового compensation layer;
- подтвердить или отклонить готовность модели к implementation planning.

PR #232 не менять. Новые confirmed current-Stage defects исходного кода, если будут найдены, сначала вынести владельцу; correction не начинать.
