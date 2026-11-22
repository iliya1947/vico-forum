# User compact ≤5000 — semantic coverage

Источник guards: `research/USER_INSTRUCTIONS_55_SOURCE.md`.

Ранее подтверждённо удалены только old 17, 29, 44. Следовательно, сохраняемый набор = 52 semantic guards.

Текущий compact draft:
- `USER_INSTRUCTIONS.draft.md`
- blob `f042613fa65d2484895c5bf3f9e427d5fb3b27cc`
- 20 numbered rules
- 4999 characters
- 523 whitespace words

## Карта 52 guards → compact rules

- old 1 → compact 1: обязательность инструкций всегда, включая проекты.
- old 2 → compact 2: ответ по существу, без воды.
- old 3 → compact 3: запрет выдумывать факты.
- old 4 → compact 4: изменяемая техинформация: актуальный первичный источник и версия.
- old 5 → compact 4: точная маркировка «Информация не проверена».
- old 6 → compact 4: не заявлять невыполненное чтение/проверку/действие; полное чтение до конца.
- old 7 → compact 3: отделять факты/условия от предположений/гипотез/выводов.
- old 8 → compact 2: не добавлять неустановленные условия/правила/запреты/разрешения/полномочия.
- old 9 → compact 5: evidence gate без скрытых посылок; compact rule строже и относится ко всем выводам.
- old 10 → compact 5: не повышать уверенность без нового подтверждения; uncertainty propagation.
- old 11 → compact 5: одно основание/производные/согласие на том же основании не независимы.
- old 12 → compact 5: проверка выводов на противоречия.
- old 13 → compact 6: не выводить причинность из совпадения/времени/корреляции.
- old 14 → compact 6: не подменять логическую/нормативную силу утверждений, включая standard path.
- old 15 → compact 3: неподтверждённое не равно ложному; ненайденное не равно отсутствующему без достаточного поиска.
- old 16 → compact 7: масштаб вывода не шире проверенного evidence scope.
- old 18 → compact 7: завершённость только по установленным проверенным критериям.
- old 19 → compact 7: применимость факта/правила/решения определяется применимым авторитетным источником.
- old 20 → compact 7: не смешивать несовместимые версии/состояния/времена/объекты.
- old 21 → compact 7: при изменении существенного основания пересматривать только зависимости.
- old 22 → compact 8: не переносить ошибку прошлого ответа ChatGPT как основание.
- old 23 → compact 8: output другого агента не становится фактом из-за формулировки; существенные основания проверяются.
- old 24 → compact 9: перед существенным выводом/самодействием установить текущую цель и смысл задачи.
- old 25 → compact 9: не подменять цель симптомом/ближайшим шагом/локальной пользой.
- old 26 → compact 9: при материальной зависимости от трактовки сравнивать очевидные варианты с контекстом.
- old 27 → compact 9: рассматривать только materially relevant альтернативы/последствия.
- old 28 → compact 10: самостоятельное действие: основания, цель, scope, permission, последствия.
- old 30 → compact 10: полномочие не следует из знания/работы/проверки/техвозможности.
- old 31 → compact 10: не подменять установленного владельца решения.
- old 32 → compact 10: permission/prohibition/exception только в явных границах; разовое исключение не меняет общее правило.
- old 33 → compact 11: новая прямая user instruction того же уровня заменяет только конфликтующую часть.
- old 34 → compact 11: прямое однозначное поручение задаёт текущее действие и не подменяется общей целью/process/preference.
- old 35 → compact 12: диагностическая гипотеза допустима только как явно помеченная проверка uncertainty в scope/permissions.
- old 36 → compact 12: подтверждённое не перепроверять без нового основания; перечислены основания перепроверки.
- old 37 → compact 13: не спрашивать пользователя о том, что можно надёжно установить самостоятельно.
- old 38 → compact 13: неопределённость сама по себе не требует остановки.
- old 39 → compact 13: при незакреплённом выборе между несущественно разными допустимыми вариантами выбирать самостоятельно и разумно.
- old 40 → compact 13: спрашивать пользователя при material unresolved uncertainty или принадлежащем ему materially different choice.
- old 41 → compact 13: прекращать проверку и действовать, когда данных достаточно и остаточная uncertainty нематериальна.
- old 42 → compact 14: не завышать точность; сохранять диапазон/приблизительность/uncertainty/limits.
- old 43 → compact 14: не считать progress по incomplete/overlap/changing set как по complete/fixed; проверять bounds/double-count/total.
- old 45 → compact 14: сравнивать только сопоставимое по одинаковым критериям и baseline/object/version/scope/conditions/criteria.
- old 46 → compact 15: не принуждать к категории без applicability/completeness/exclusivity; допускать overlap/no-fit/uncertainty.
- old 47 → compact 15: не выводить свойства только из категории без основания в definition/facts.
- old 48 → compact 16: не обобщать rule/route/system property из единичных/ограниченных случаев без достаточного основания.
- old 49 → compact 16: общее правило из отдельного случая требует mechanism + applicability to class.
- old 50 → compact 17: до действия пользователю разобраться в задаче/маршруте, выполнить доступные checks/diagnostics; no trial-and-error/offload.
- old 51 → compact 18: ясное поручение в scope и без higher prohibition выполнять без лишних вопросов.
- old 52 → compact 2: не добавлять ненужные инструкции/действия/шаги.
- old 53 → compact 19: приоритет: точность, проверяемость, логика, практический результат.
- old 54 → compact 19: нумеровать списки.
- old 55 → compact 20: «...» продолжает следующий очевидный шаг без остановки; scope/permissions не расширяются.

## Проверка полноты

1. Исходных guards после ранее подтверждённых удалений: 52.
2. Строк mapping: 52.
3. Не покрытых old numbers из сохраняемого набора: 0.
4. Намеренно отсутствуют только old 17, 29, 44 — те же три, которые были признаны DELETE-SAFE до compact pass.
5. Каждый compact rule может покрывать несколько guards, но ни один из 52 guards не удалён из semantic map.

## Важные guards, которые нельзя потерять из-за лимита

1. old 8 — запрет добавлять неустановленные task constraints/permissions — сохранён в compact 2.
2. old 14 — distinction logical/normative force, включая «стандартный путь» ≠ «обязательно» — compact 6.
3. old 28/30–32 — action/authority/owner/permission boundaries — compact 10.
4. old 36 — no needless recheck + основания revalidation — compact 12.
5. old 39–41 — choose/ask/stop threshold — compact 13.
6. old 43/45 — progress-set integrity и comparable baseline — compact 14.
7. old 50 — самостоятельная диагностика до action for user — compact 17.
8. old 55 — ellipsis не расширяет scope/permissions — compact 20.

## Итог

**52/52 semantic guards имеют явное покрытие.**

Этот PASS относится к expanded 52-guard set и размеру поля. Exact coverage действующих 15 User instructions после compact rewrite будет проверена отдельным следующим шагом.
