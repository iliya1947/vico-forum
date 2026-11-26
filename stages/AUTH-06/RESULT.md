# AUTH-06. Повторная авторская проверка после исправления AUTH-05

**AUTHOR PASS по локальной проверке.** На коммите `615d93598daf78945a86fbdc4255bc778ae3403f` подтверждённых блокеров нет. Лёва передал Мире повторное coordinator review всей цепочки AUTH-01–AUTH-06. [PR #395](https://github.com/iliya1947/vico-forum/pull/395)

## Проверенная версия

В существующую ветку PR #395 включён принятый коммит AUTH-05 `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6`. Git сохранил историю обеих веток. Diff от исправленного основания побайтово совпал с первоначальным diff AUTH-06 во всех 22 файлах. Проверка в обратном направлении также подтвердила, что изменение относительно старого head #395 точно соответствует исправлению AUTH-05. В пакет входят 20 фильтров запуска, сценарий Chromium и набор из 62 проверок PostgreSQL. [Исправление #394](https://github.com/iliya1947/vico-forum/pull/394) · [Diff AUTH-06](https://github.com/iliya1947/vico-forum/compare/dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6...615d93598daf78945a86fbdc4255bc778ae3403f)

Прежний AUTHOR PASS и прежние прогоны относятся к `2eb3f9c303ad1b67d5348664267eca665f079cf7`. [Протокол прежней версии](https://github.com/iliya1947/vico-forum/blob/027e35a0c880e1db26d0f6a4f980089001448209/stages/AUTH-06/RESULT.md)

## Локальное исполнение на новом коммите

| Проверка | Фактический результат |
|---|---|
| Модульные, компонентные и маршрутные проверки auth, Settings и Owner Integrations | 228 тестов в 21 файле прошли |
| Better Auth и PostgreSQL 17 на изолированной loopback БД | 395 тестов в 25 файлах прошли, в том числе все 62 из `auth-whole-lifecycle.test.ts` и регрессии F01 из исправленного основания |
| Собранный Worker и Chromium, `tests/browser/auth-05/check.py` | Прошёл полный сценарий F01 и anti-abuse с закрытой тестовой почтой и синтетической проверкой регистрации |
| Собранный Worker и Chromium, `tests/browser/auth-02b/check.py` | Прошёл полный сценарий AUTH-06 от регистрации и подтверждения почты до смены email и пароля, отзыва сессий и повторного входа. Проверены refresh/back, клавиатура и EN/RU/HE с LTR/RTL |
| Структура и сборка | TypeScript прошёл. На чистую PostgreSQL 17 применены 79 миграций. Schema manifest совпал для 76 таблиц. Положительные и отрицательные пробы runtime privileges прошли. В 143 файлах клиентской сборки совпадений с проверенными приватными маркерами и тестовым значением секрета нет |

## Матрица из раздела 9 плана

Ссылки указывают на код проверенной версии. Имена в таблице относятся к одноимённым тестовым файлам. [Наборы PostgreSQL](https://github.com/iliya1947/vico-forum/tree/615d93598daf78945a86fbdc4255bc778ae3403f/tests/database) · [Сценарий AUTH-06](https://github.com/iliya1947/vico-forum/blob/615d93598daf78945a86fbdc4255bc778ae3403f/tests/browser/auth-02b/check.py) · [Сценарий F01](https://github.com/iliya1947/vico-forum/blob/615d93598daf78945a86fbdc4255bc778ae3403f/tests/browser/auth-05/check.py)

| Группа | Локальное покрытие |
|---|---|
| 1. Регистрация, вход, явная привязка Google, дубликаты и return URL | `auth-runtime`, `auth-link-identity`, `registration-auth-admission`, credential path/view и оба Chromium-сценария |
| 2. Состояния аккаунта, pending без сессии и SET-02 | `auth-lifecycle-state`, `registration-settings`, `registration-auth-admission`, `forum-email-registration` и регрессии F01 в `auth-registration-challenge`. Для открытой регистрации проверено одинаковое публичное поведение при разных состояниях адреса |
| 3. Срок, поколение, фаза, replay и повторное использование адреса | `credential-lifecycle-proof`, `auth-lifecycle-state`, `auth-whole-lifecycle` и Chromium refresh/back |
| 4. Сброс и создание пароля, SET-05, свежесть и отзыв сессий | `account-security`, `auth-lifecycle-state`, `sa04-session-atomic`, `sa02-auth-password-change`, `sa02-auth-session-deletion`, Settings и Chromium |
| 5. Смена email в две фазы, занятый адрес, перезапуск, смена аккаунта и сохранение Google identity | `auth-lifecycle-state`, `auth-whole-lifecycle`, `auth-link-identity` и Chromium с отдельными сессиями |
| 6. Сохранение последнего способа входа при конкурирующих операциях | `auth-lifecycle-state` проверяет пустой hash и конкурентное удаление через адаптер. В `auth-whole-lifecycle` исполняются шесть гонок создания, сброса и смены пароля с HTTP unlink |
| 7. Деактивация и операции авторизации | `auth-whole-lifecycle` проверяет оба порядка блокировки для 12 операций с настоящей командой Owner. `sa04-session-atomic`, `auth-runtime` и `sa05-owner-account-lifecycle` проверяют account state и собственный sign-out |
| 8. Ошибки транзакции и наблюдения | 31 сценарий в `auth-whole-lifecycle`, включая потерю подтверждения COMMIT, реальные lock/statement timeout и обрыв PG-соединения. Ошибки транспорта почты и наблюдателя покрыты `auth-lifecycle-state`, `auth-mail-transports`, `sa02-auth-oauth-rollback` и `sa02-auth-observer` |
| 9. Лимиты и приватность challenge, HTTP/direct/Settings | `auth-lifecycle-budget`, `auth-rate-limit-concurrency`, `auth-registration-challenge`, `account-security`. Оба Chromium-сценария проверили обработку 429 и явную повторную попытку |
| 10. Owner/RBAC, SET-02/05, сохранённые данные, History и чтение Integrations | `authorization-snapshot`, `sa05-owner-read-projections`, `sa02-owner-history`, `owner-system-history`, `owner-attempt-telemetry`, `sa07-integration-monitoring` и маршрут `super-admin-integrations` |

## Границы результата и передача

На новом head выставлены предусмотренные `run:ci` и `run:acceptance`. По прямому указанию владельца Лёва передаёт работу без ожидания и проверки статуса GitHub Actions. Таблица выше отражает собственные локальные прогоны.

В обоих сценариях использованы приватные фикстуры и локальная почта. В браузере Google-only аккаунт подготовлен как тестовая фикстура. Реальные OAuth, доставка провайдером и deployed challenge относятся к внешней проверке Stage 6.

Следующий шаг Миры — повторно проверить всю цепочку AUTH-01–AUTH-06 на `615d93598daf78945a86fbdc4255bc778ae3403f` с учётом исправления F01. AUTH-07 ожидает отдельного назначения после coordinator PASS. Лёва и Ада участвовали в реализации, независимый финальный reviewer назначается отдельно.

## Exact-head GitHub evidence после авторского handoff

После остановки Лёвы предусмотренные workflows завершились на head `615d93598daf78945a86fbdc4255bc778ae3403f`.

- CI #45897164115 — SUCCESS: checks 252 files / 3342 tests; database 123 files / 1998 tests; `auth-whole-lifecycle` 62/62; schema manifest 76 tables; runtime/split-authority probes PASS. Pull-request merge-ref `fa33fc59a4de57ccb78902812fca9c942b2f6a24` имеет тот же tree SHA, что и implementation head.
- 20/20 applicable connected acceptance — SUCCESS, attempt 1, без failures/cancelled/in-progress:
  - #45897171720 Own topic title
  - #45897171864 AUTH-05 anti-abuse Worker/Chromium
  - #45897171613 SA04-M2
  - #45897171727 Topic Watch
  - #45897171538 SA04-J12
  - #45897171484 SA04-L3
  - #45897171890 SA05 Owner deactivation
  - #45897171840 SA04-S
  - #45897171629 Topic Bookmarks
  - #45897171812 Forum structure
  - #45897171489 SA06
  - #45897171879 Personal Mute/Block
  - #45897171586 SA-03
  - #45897171837 SA-01
  - #45897171522 AUTH-02b email verification
  - #45897171852 SA04-N
  - #45897171830 SA04-K5
  - #45897172006 SA07
  - #45897171549 SA08
  - #45897171987 AP-10

AUTH-05 log на exact head исполнил F01 differential challenge case; AUTH-02b log исполнил AUTH-06 refresh/back, SET-05 password/session, EN/RU/HE responsive LTR/RTL и explicit relogin сценарии.

Coordinator review результата: `stages/AUTH-06/REVIEW.md`.
