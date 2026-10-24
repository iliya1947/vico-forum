# Shared service channel

## Актуальное обновление общей сверки — часть 3 (2026-10-24)

Общая сверка **продолжается**, код baseline `d72b27ca762dd930f0e7ad614e5b00832a07ec0c` не менялся. 7 новых локальных тестов passed; вместе с частями 1–2 — 13 тестов. Это не число дефектов. Ниже прежние обновления сохранены как история; текущие статусы этих сценариев задаёт эта часть.

- **XR-STALE-SOLUTION / Мира HELP-MOD-01:** actual action/service/repository выбирает текущий answer-B для старого topic-level intent; expected best-answer identity отсутствует. Два SQL-capture теста подтверждают target selection, без native DB concurrency.
- **Мира HELP-DUP-01:** дополнительно подтверждён stale-remove вариант: текущая relationship-B снимается и её appeals принимаются старым intent. Actual action/service/repository + injected snapshots/SQL capture; прежний stale-appeal finding сохраняется с отдельными доказательствами.
- **XR-THROWN-ACTION-BUFFER / Лира F02:** actual TopicRoute/ErrorBoundary в jsdom теряет текст при injected unexpected permission exception; typed503 контроль сохраняет буфер. Условие ошибки задано тестом; не заявляются любой network failure, потеря вложений или production incident.
- **XR-CROSS-TAB-IDENTITY / Лира F04:** при injected server session A→B actual heartbeat204 на topic оставляет cached header=A; actual reply writer получает текст от имени разрешённого B. Denied-B контроль не пишет. Это identity/attribution mismatch, не обход authorization. Реальные две вкладки/cookies и DB persistence не проверялись.

Подробности и воспроизводимые условия: [личный отчёт Лёвы](agents/codex-6.1-sol.md), верхний раздел части 3. Чужие личные файлы не изменены, согласие других авторов не заявляется.

Остаются применимость lifecycle/ACL/upload cancellation к текущему Stage и остальные source-only/requirement вопросы матрицы. Upload UUID correlation requirement всё ещё не установлен как дефект. Окончательный общий реестр/счёт не готов; к исправлениям/merge не переходить. Реальные Cloudflare, Neon, Hyperdrive, R2, OAuth, backup/restore исключены.

---

## Обновление общей сверки — часть 2 (2026-10-24)

Общая сверка **продолжается**. Проверены три расхождения; выполнены 4 локальных теста (4 passed, 0 failed), без внешних сервисов, БД, браузера и stress inputs.

- **XR-ZIP-METADATA / ATTACH-STRUCT-01:** конкретная неполнота structural acceptance подтверждена. Два113-byte архива — local size mismatch и bit3 без обязательного descriptor — принимаются настоящим validator/private finalizer. Правильный ZIP принят; несовпадение flags отклонено. Требование descriptor сверено с PKWARE APPNOTE6.3.10 §4.3.9.1. Это не доказательство обхода антивируса или исполнения содержимого.
- **XR-UI-POLICY / I18N-UI-POLICY-01:** подтверждён локальный policy-hit/miss gap. Проверенный compiled bundle отдаёт текст v1 и обходит raw source, настроенный отвергать v1 при policy v2; на miss текст отбрасывается. Active locale-boundary также не передаёт required-policy в raw source. Реальный deployed policy-switch не проверялся.
- **XR-SECURITY-ID / ATTACH-SEC-01:** намеренный stable contextual hash и отсутствие отдельного client UUID подтверждены. Нарушение требования именно исходного UUID не установлено; это вопрос конкретной требуемой корреляции. Не включать автоматически в общий подтверждённый defect list.

Подробные условия/контроли/ограничения: [часть 2 в личном файле Лёвы](https://github.com/iliya1947/vico-forum/blob/eef6439305965941e246470e918da6cad465499f/.github/agents/codex-6.1-sol.md).

Следующий проход: stale solution/duplicate actions, thrown-action buffer/cross-tab identity и runtime/Stage applicability. Окончательный общий defect total пока не сформирован; исправления не назначены.

---

## Текущее состояние — общая сверка аудитов (2026-10-24)

- Владелец в текущем чате прямо разрешил общую сверку опубликованных аудитов и использование комментариев PR №236.
- Кодовый baseline: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Первый снимок личных отчётов для сверки: PR head `19f6a3ba78b2d2d57318ec2f4b35a40aa0a9dd25`.
- **Общая сверка продолжается.** Первый проход сопоставления опубликованных итоговых списков выполнен; окончательного общего числа подтверждённых дефектов и общего PASS нет.
- Сопоставлены 119 строк утверждений/групп четырёх отчётов. Это не 119 дефектов: пересекающиеся причины, подварианты, документальные расхождения, наблюдения и исключённые области различаются.
- Мира и Лира публикуют результаты для d72b27c. Мишаня указывает старый baseline 21386887 и отозванную независимость; его материал учитывается как исторические утверждения с отдельной проверкой актуальности. Отчёт Лёвы также не заявляет слепую независимость после ознакомления с чужими выводами.
- Числа покрытия 354/437/458 не сравниваются как проценты без одинакового набора путей: учитываются разные JSON/config/operational границы.
- Реальные Cloudflare, Neon, Hyperdrive, R2, OAuth, backup/restore, production acceptance остаются исключёнными. Внутренние контракты кода можно проверять локально.
- Реализация, зависимости, схема, PROJECT_STATE и implementation PR не изменялись. Этот служебный PR никогда не merge в main.

## Результаты, добавленные при общей сверке

1. **XR-EDIT-409** (Мира EDITOR-PUB-01/02, Лира F01): один успешный тест настоящих локальных Topic loader/view/action с заданным repository conflict. После409 loaderCalls=1, revision fence=r1, текст сохранён, rebase-кнопки нет. Явная revalidation даёт loaderCalls=2 и кнопку. Это дополняет прежний реестр Лёвы; реальная БД/браузер не использованы.
2. **XR-LITERAL** (literal-text finding Миры): один успешный тест настоящих escapeVisualMarkdownText и published parser. Строки `---`, `~~literal~~`, `&copy;` получают thematicBreak/delete/© вместо буквального значения. Малые обычные входы; стресс-опыты не выполнялись.
3. Точные/частичные соответствия зафиксированы: catch-all writer503 → ARCH-01; cookie order → AUTH-01; topic appeal → HELP-01; notification latest50 → CORE-02; partial-index manifest → DB-02; history loading copy → LOC-04; migration SOT → DOC-02.
4. Доказательства не голосуются: отсутствие PG-воспроизведения у Лиры не опровергает найденное прежнее native доказательство CORE-01, но не превращается в её собственный запуск.

## Открытые вопросы сверки

- ARCH-02: отделить факт не-вызова client.end/локальных PG idle connections от применимости к исключённому Hyperdrive runtime.
- DB-03 и production ACL: отделить внутренний grant-контракт от будущего Stage6 rollout.
- Отсутствие size/tag/pagination bounds: подтвердить применимые инварианты и последствия; не считать любой scalability debt текущим отказом.
- ZIP и UI-policy проверены в части 2 выше; upload ID требует уточнения конкретного контракта корреляции. Широкие stale-state варианты остаются открытыми.
- Thrown-action buffer и cross-tab identity: source-conditional выводы не выдаются за уже выполненные браузерные воспроизведения.
- OAuth linking из отчёта Миры находится вне согласованного объёма и не включается в общий текущий список.

## Реестр и следующий шаг

Матрица первого прохода, источники и границы результатов: [личный файл Лёвы](agents/codex-6.1-sol.md). Личные файлы других агентов не изменены.

Следующий шаг — точечно разрешить перечисленные расхождения и сформировать окончательную общую классификацию. Перезапуск всего аудита, реализация исправлений и реальные исключённые сервисы этим этапом не назначены.

---

<details>
<summary>Предыдущее состояние общего файла — сохранено как история</summary>

# Shared service channel

## Текущее состояние

- Источник истины проекта: `main`.
- Зафиксированный baseline нового поэтапного аудита AUD-20261022: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Remote main проверен read-only 2026-10-22 (Asia/Jerusalem); совпадает.
- Editor 2.0 и follow-up PR #232 merged; активного implementation PR сейчас нет.
- Владелец назначил поэтапный аудит приложения. Этап 0 завершён: зафиксирован объём и составлен полный manifest 491 файла.
- В новом цикле: 437 файлов включены в прикладной объём с оговорками по сервисным разделам; 42 сервисных operational-файла исключены; 12 архивных документов — справочный контекст.
- По прямому указанию владельца сервисы Cloudflare, Neon, Hyperdrive, R2, OAuth и backup/restore не входят в аудит. Их настройки, credentials, provisioning/deploy/rollout и live service acceptance не проверяются. Внутренние контракты соответствующего кода приложения остаются в объёме.
- Этапы 1–5 завершены. Findings до завершения всех предусмотренных проверок остаются только в текущем developer chat согласно AGENTS.md, кроме отдельно зафиксированного владельцем non-blocking requirement conflict по Attention Mixed pagination.
- Этап 6 начат. Часть 1 завершена: Simple/Advanced mode core, lossless Markdown document/history, visual protected-range editing, clipboard conversion, technical Markdown segmentation, rendering, mode persistence, Preview/Split/fullscreen и source-position mapping проверены.
- Подтверждено корректное сохранение exact source при mode/view switches, CRLF-aware span edits, Undo/Redo через переключение режимов, per-account Simple/Advanced preference, protected code/unsupported structures, Simple visual table editing, code-only Tab/Enter/pairing и безопасный published renderer.
- В clipboard/literal-text boundary установлен отдельный current-Stage finding; детали по правилам AGENTS.md остаются только в developer chat до окончания проверки. Root cause находится в общем literal-text escaping path, используемом Simple visual typing и explicit/plain paste.
- Test-quality completeness по этому finding будет отдельно оценена на этапе 12 и сейчас не дублируется.
- Этап 6, часть 2 завершена: quote/mention проверены end-to-end. Attributed quote хранится обычным Markdown blockquote с автором и permalink; whole/selected quote insertion использует общий editor buffer. Published collapse: 1–5 visible rows полностью, 6+ до первых трёх с expand/collapse; attribution остаётся видимой. Mention autocomplete работает в Simple/Advanced через authenticated private/no-store search stable id/name. Published recipients извлекаются из parsed internal profile links; bare @, blockquote/quotes, fenced/inline code, images, malformed/external links исключаются. Notification insertion transactional, self/duplicate reply+mention подавляются, edit использует durable per-post notified set. Новых independent current-Stage findings в части 2 не установлено.
- Следующая часть этапа 6: publish/edit — publication readiness, Ctrl+Enter/action boundaries, operation replay/idempotency, published editing revision CAS/history, failure paths и сохранение editor buffer при controlled errors. Attachment-specific lifecycle глубоко не проверять до этапа 7.
- Attention Mixed pagination остаётся audit problem / requirement conflict для финального списка; дальнейший аудит не блокирует.
- Cross-stage attachment/security storage/lifecycle — этап 7; localization — этап 8; database — этап 9; cross-cutting security/privacy — этап 10; browser/a11y/responsive — этап 11; test-quality/CI — этап 12.
- Предыдущие отчёты и самостоятельные проходы с другой нумерацией не засчитываются автоматически в AUD-20261022.
- Ограничение доступной среды: Node 24.19.0 / pnpm 11.25.0 вместо pinned Node 24.21.0 / pnpm 12.3.4. Toolchain проверить до применимых локальных прогонов.
- Исходники, зависимости, схема, PROJECT_STATE и implementation PR в ходе аудита не меняются. Этот служебный PR используется только для координации и никогда не merge в `main`.

## Реестр и порядок проверки

Полный manifest с первичными этапами и исходными статусами `NOT_REVIEWED / EXCLUDED / CONTEXT`, правилами evidence и порядком этапов 0–13 находится в разделе **AUD-20261022** файла [Лиры](agents/chatgpt-6.md).

## Текущий следующий шаг

Ожидать разрешения владельца продолжить этап 6, часть 2: quote/mention. Исходники не исправлять.


</details>
